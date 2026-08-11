import { Component, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { User, UserRole, UserStatus } from '../../core/models/user.model';
import { AuthService } from '../../core/services/auth.service';
import { ModalService } from '../../shared/services/modal.service';

interface Invite {
  id: string;
  email: string;
  role: UserRole;
  inviteToken: string;
  inviteExpiresAt: string;
  invitedBy: User;
  createdAt: string;
}

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Gerenciamento de Usuários</h1>
          <p class="page-subtitle">Gerencie usuários e envie convites para novos membros</p>
        </div>
        @if (canManageUsers()) {
          <button type="button" (click)="openInviteModal()" class="btn btn-primary">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
            </svg>
            Convidar Usuário
          </button>
        }
      </div>

      <div style="border-bottom: 1px solid var(--cmm-border);">
        <nav class="flex gap-4">
          <button
            type="button"
            (click)="activeTab.set('users')"
            class="px-4 py-2 font-medium text-sm border-b-2 transition-colors"
            [style.border-color]="activeTab() === 'users' ? 'var(--cmm-ink)' : 'transparent'"
            [style.color]="activeTab() === 'users' ? 'var(--cmm-ink)' : 'var(--cmm-muted)'"
          >
            Usuários ({{ users().length }})
          </button>
          @if (canManageUsers()) {
            <button
              type="button"
              (click)="activeTab.set('invites')"
              class="px-4 py-2 font-medium text-sm border-b-2 transition-colors"
              [style.border-color]="activeTab() === 'invites' ? 'var(--cmm-ink)' : 'transparent'"
              [style.color]="activeTab() === 'invites' ? 'var(--cmm-ink)' : 'var(--cmm-muted)'"
            >
              Convites Pendentes ({{ pendingInvites().length }})
            </button>
            <button
              type="button"
              (click)="activeTab.set('registrations')"
              class="px-4 py-2 font-medium text-sm border-b-2 transition-colors"
              [style.border-color]="activeTab() === 'registrations' ? 'var(--cmm-ink)' : 'transparent'"
              [style.color]="activeTab() === 'registrations' ? 'var(--cmm-ink)' : 'var(--cmm-muted)'"
            >
              Aprovações ({{ pendingRegistrations().length }})
            </button>
          }
        </nav>
      </div>

      @if (activeTab() === 'users') {
        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Email</th>
                <th>Função</th>
                <th>Status</th>
                <th>Criado em</th>
                @if (canManageUsers()) {
                  <th style="text-align: right;">Ações</th>
                }
              </tr>
            </thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td>
                    <div class="flex items-center gap-3">
                      <div
                        class="w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm"
                        [style.background]="user.role === 'master' ? 'color-mix(in srgb, var(--cmm-warning) 14%, var(--cmm-panel))' : 'color-mix(in srgb, var(--cmm-border) 55%, var(--cmm-panel))'"
                        [style.color]="user.role === 'master' ? 'var(--cmm-warning)' : 'var(--cmm-muted)'"
                      >
                        @if (user.role === 'master') {
                          <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                          </svg>
                        } @else {
                          {{ getInitials(user.name) }}
                        }
                      </div>
                      <div>
                        <span class="font-medium" style="color: var(--cmm-ink);">{{ user.name }}</span>
                        @if (user.role === 'master') {
                          <span class="badge badge-warning ml-2">Master</span>
                        }
                      </div>
                    </div>
                  </td>
                  <td style="color: var(--cmm-muted);">{{ user.email }}</td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-warning]="user.role === 'master'"
                      [class.badge-accent]="user.role === 'admin' || user.role === 'manager'"
                      [class.badge-neutral]="user.role === 'user'"
                    >
                      {{ getRoleLabel(user.role) }}
                    </span>
                  </td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-success]="user.status === 'active' || !user.status"
                      [class.badge-warning]="user.status === 'pending'"
                      [class.badge-danger]="user.status === 'inactive'"
                    >
                      {{ getStatusLabel(user.status) }}
                    </span>
                  </td>
                  <td class="text-sm" style="color: var(--cmm-muted);">
                    {{ formatDate(user.createdAt) }}
                  </td>
                  @if (canManageUsers()) {
                    <td style="text-align: right;">
                      <div class="flex items-center justify-end gap-1">
                        @if (user.role !== 'master') {
                          <button
                            type="button"
                            (click)="editUser(user)"
                            class="btn btn-ghost btn-sm"
                            title="Editar"
                          >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                            </svg>
                          </button>
                        }
                        @if (user.id !== authService.user()?.id && user.role !== 'master') {
                          <button
                            type="button"
                            (click)="deleteUser(user)"
                            class="btn btn-ghost btn-sm"
                            style="color: var(--cmm-danger);"
                            title="Excluir"
                          >
                            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                            </svg>
                          </button>
                        }
                      </div>
                    </td>
                  }
                </tr>
              } @empty {
                <tr>
                  <td [attr.colspan]="canManageUsers() ? 6 : 5">
                    <div class="empty-state">Nenhum usuário encontrado</div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (activeTab() === 'invites' && canManageUsers()) {
        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Função</th>
                <th>Convidado por</th>
                <th>Expira em</th>
                <th>Link</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (invite of pendingInvites(); track invite.id) {
                <tr>
                  <td class="font-medium">{{ invite.email }}</td>
                  <td>
                    <span
                      class="badge"
                      [class.badge-accent]="invite.role === 'admin' || invite.role === 'manager'"
                      [class.badge-neutral]="invite.role === 'user'"
                    >
                      {{ getRoleLabel(invite.role) }}
                    </span>
                  </td>
                  <td style="color: var(--cmm-muted);">{{ invite.invitedBy?.name || '-' }}</td>
                  <td class="text-sm" style="color: var(--cmm-muted);">
                    {{ formatDate(invite.inviteExpiresAt) }}
                  </td>
                  <td>
                    <button
                      type="button"
                      (click)="copyInviteLink(invite)"
                      class="btn btn-ghost btn-sm"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                      </svg>
                      Copiar Link
                    </button>
                  </td>
                  <td style="text-align: right;">
                    <button
                      type="button"
                      (click)="cancelInvite(invite)"
                      class="btn btn-ghost btn-sm"
                      style="color: var(--cmm-danger);"
                      title="Cancelar convite"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6">
                    <div class="empty-state">Nenhum convite pendente</div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (activeTab() === 'registrations' && canManageUsers()) {
        <div class="table-shell">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Data</th>
                <th>Função</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (reg of pendingRegistrations(); track reg.id) {
                <tr>
                  <td class="font-medium">{{ reg.name || '—' }}</td>
                  <td style="color: var(--cmm-muted);">{{ reg.email }}</td>
                  <td class="text-sm" style="color: var(--cmm-muted);">{{ formatDate(reg.createdAt) }}</td>
                  <td>
                    <select
                      [(ngModel)]="approvalRoles[reg.id]"
                      [name]="'role_' + reg.id"
                      class="form-input"
                      style="min-height: 2rem; width: auto;"
                    >
                      <option value="user">Usuário</option>
                      <option value="manager">Gerente</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </td>
                  <td style="text-align: right;">
                    <div class="flex items-center justify-end gap-2">
                      <button type="button" (click)="approveRegistration(reg)" class="btn btn-sm btn-accent">
                        Aprovar
                      </button>
                      <button type="button" (click)="rejectRegistration(reg)" class="btn btn-sm btn-danger">
                        Rejeitar
                      </button>
                    </div>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5">
                    <div class="empty-state">Nenhum cadastro pendente de aprovação</div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

      @if (showInviteModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
          <div class="panel panel-pad max-w-md w-full">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold" style="color: var(--cmm-ink);">Convidar Novo Usuário</h3>
              <button type="button" (click)="closeInviteModal()" class="btn btn-ghost btn-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            @if (inviteSuccess()) {
              <div class="py-2">
                @if (inviteEmailSent()) {
                  <div class="text-center mb-4">
                    <div
                      class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"
                      style="background: color-mix(in srgb, var(--cmm-success) 14%, var(--cmm-panel)); color: var(--cmm-success);"
                    >
                      <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                      </svg>
                    </div>
                    <h4 class="text-lg font-medium mb-1" style="color: var(--cmm-ink);">Convite Enviado!</h4>
                    <p class="text-sm" style="color: var(--cmm-muted);">O email foi entregue com sucesso.</p>
                  </div>
                } @else {
                  <div
                    class="mb-4 p-4 rounded-lg"
                    style="background: color-mix(in srgb, var(--cmm-warning) 12%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-warning) 30%, transparent);"
                  >
                    <div class="flex items-start gap-3">
                      <svg class="w-5 h-5 flex-shrink-0 mt-0.5" style="color: var(--cmm-warning);" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                      </svg>
                      <div>
                        <p class="text-sm font-medium" style="color: var(--cmm-warning);">Email não entregue</p>
                        @if (inviteEmailError()) {
                          <p class="text-xs mt-1" style="color: var(--cmm-muted);">{{ inviteEmailError() }}</p>
                        }
                        <p class="text-xs mt-1" style="color: var(--cmm-muted);">Compartilhe o código ou link abaixo manualmente.</p>
                      </div>
                    </div>
                  </div>
                  <div class="mb-4 p-3 rounded-lg text-center" style="background: var(--cmm-surface); border: 1px solid var(--cmm-border);">
                    <p class="text-xs mb-1" style="color: var(--cmm-muted);">Código de convite</p>
                    <p class="text-2xl font-semibold tracking-widest" style="color: var(--cmm-ink);">{{ inviteCodeResult() }}</p>
                  </div>
                }
                <p class="text-sm p-3 rounded-lg break-all mb-4" style="background: var(--cmm-surface); color: var(--cmm-muted);">{{ inviteLink() }}</p>
                <button type="button" (click)="closeInviteModal()" class="btn btn-primary w-full">
                  Fechar
                </button>
              </div>
            } @else {
              <form (ngSubmit)="sendInvite()" class="space-y-4">
                @if (inviteError()) {
                  <div
                    class="p-3 rounded-lg text-sm"
                    style="background: color-mix(in srgb, var(--cmm-danger) 12%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-danger) 30%, transparent); color: var(--cmm-danger);"
                  >
                    {{ inviteError() }}
                  </div>
                }

                <div>
                  <label class="form-label">Email</label>
                  <input
                    type="email"
                    [(ngModel)]="inviteData.email"
                    name="email"
                    required
                    class="form-input"
                    placeholder="usuario@email.com"
                  />
                </div>

                <div>
                  <label class="form-label">Função</label>
                  <select [(ngModel)]="inviteData.role" name="role" class="form-input">
                    <option value="user">Usuário</option>
                    <option value="manager">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div class="flex gap-3 pt-2">
                  <button type="button" (click)="closeInviteModal()" class="btn btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button type="submit" [disabled]="isLoading()" class="btn btn-primary flex-1">
                    {{ isLoading() ? 'Enviando...' : 'Enviar Convite' }}
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      }

      @if (showEditModal()) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
          <div class="panel panel-pad max-w-md w-full">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold" style="color: var(--cmm-ink);">Editar Usuário</h3>
              <button type="button" (click)="closeEditModal()" class="btn btn-ghost btn-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form (ngSubmit)="saveUser()" class="space-y-4">
              <div>
                <label class="form-label">Nome</label>
                <input type="text" [(ngModel)]="editData.name" name="name" required class="form-input" />
              </div>

              <div>
                <label class="form-label">Email</label>
                <input type="email" [(ngModel)]="editData.email" name="email" required class="form-input" />
              </div>

              <div>
                <label class="form-label">Função</label>
                <select [(ngModel)]="editData.role" name="role" class="form-input">
                  <option value="user">Usuário</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label class="form-label">Status</label>
                <select [(ngModel)]="editData.status" name="status" class="form-input">
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div class="flex gap-3 pt-2">
                <button type="button" (click)="closeEditModal()" class="btn btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" [disabled]="isLoading()" class="btn btn-primary flex-1">
                  {{ isLoading() ? 'Salvando...' : 'Salvar' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      }
    </div>
  `
})
export class UsersComponent implements OnInit {
  users = signal<User[]>([]);
  pendingInvites = signal<Invite[]>([]);
  pendingRegistrations = signal<User[]>([]);
  approvalRoles: Record<string, string> = {};
  activeTab = signal<'users' | 'invites' | 'registrations'>('users');

  showInviteModal = signal(false);
  showEditModal = signal(false);
  isLoading = signal(false);
  inviteSuccess = signal(false);
  inviteLink = signal('');
  inviteError = signal('');
  inviteEmailSent = signal(true);
  inviteEmailError = signal('');
  inviteCodeResult = signal('');

  editingUser = signal<User | null>(null);

  inviteData = {
    email: '',
    role: 'user' as UserRole
  };

  editData = {
    name: '',
    email: '',
    role: 'user' as UserRole,
    status: 'active' as UserStatus
  };

  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    public authService: AuthService,
    private modalService: ModalService
  ) { }

  ngOnInit() {
    this.loadUsers();
    if (this.canManageUsers()) {
      this.loadPendingInvites();
      this.loadPendingRegistrations();
    }
  }

  canManageUsers(): boolean {
    const role = this.authService.user()?.role;
    return role === 'master' || role === 'admin';
  }

  loadUsers() {
    this.http.get<User[]>(`${this.apiUrl}/users`).subscribe({
      next: (users) => this.users.set(users),
      error: (err) => console.error('Erro ao carregar usuários:', err)
    });
  }

  loadPendingInvites() {
    this.http.get<Invite[]>(`${this.apiUrl}/users/invites/pending`).subscribe({
      next: (invites) => this.pendingInvites.set(invites),
      error: (err) => console.error('Erro ao carregar convites:', err)
    });
  }

  loadPendingRegistrations() {
    this.http.get<User[]>(`${this.apiUrl}/users/registrations/pending`).subscribe({
      next: (users) => {
        this.pendingRegistrations.set(users);
        users.forEach(u => {
          if (!this.approvalRoles[u.id]) this.approvalRoles[u.id] = 'user';
        });
      },
      error: (err) => console.error('Erro ao carregar cadastros pendentes:', err)
    });
  }

  approveRegistration(user: User) {
    const role = (this.approvalRoles[user.id] || 'user') as UserRole;
    this.http.post(`${this.apiUrl}/users/registrations/${user.id}/approve`, { role }).subscribe({
      next: () => {
        this.loadPendingRegistrations();
        this.loadUsers();
        this.modalService.success(`Usuário "${user.name}" aprovado com sucesso!`);
      },
      error: (err) => {
        this.modalService.error(err.error?.message || 'Erro ao aprovar usuário');
      }
    });
  }

  async rejectRegistration(user: User) {
    const confirmed = await this.modalService.confirm(
      'Rejeitar Cadastro',
      `Deseja rejeitar o cadastro de "${user.name || user.email}"?`,
      'Sim, rejeitar',
      'Cancelar'
    );
    if (confirmed) {
      this.http.delete(`${this.apiUrl}/users/registrations/${user.id}`).subscribe({
        next: () => {
          this.loadPendingRegistrations();
          this.modalService.success('Cadastro rejeitado.');
        },
        error: (err) => {
          this.modalService.error(err.error?.message || 'Erro ao rejeitar cadastro');
        }
      });
    }
  }

  openInviteModal() {
    this.inviteData = { email: '', role: 'user' };
    this.inviteSuccess.set(false);
    this.inviteError.set('');
    this.inviteLink.set('');
    this.showInviteModal.set(true);
  }

  closeInviteModal() {
    this.showInviteModal.set(false);
    if (this.inviteSuccess()) {
      this.loadPendingInvites();
    }
  }

  sendInvite() {
    if (!this.inviteData.email) {
      this.inviteError.set('Informe o email');
      return;
    }

    this.isLoading.set(true);
    this.inviteError.set('');

    this.http.post<{ user: User; inviteLink: string; inviteCode: string; emailSent: boolean; emailError?: string }>(`${this.apiUrl}/users/invite`, this.inviteData).subscribe({
      next: (response) => {
        this.inviteLink.set(response.inviteLink);
        this.inviteEmailSent.set(response.emailSent !== false);
        this.inviteEmailError.set(response.emailError || '');
        this.inviteCodeResult.set(response.inviteCode || '');
        this.inviteSuccess.set(true);
        this.isLoading.set(false);
        navigator.clipboard.writeText(response.inviteLink);
      },
      error: (err) => {
        this.inviteError.set(err.error?.message || 'Erro ao enviar convite');
        this.isLoading.set(false);
      }
    });
  }

  copyInviteLink(invite: Invite) {
    const link = `${window.location.origin}/invite`;
    navigator.clipboard.writeText(link);
    this.modalService.success('Link copiado para a área de transferência!', 'Sucesso');
  }

  async cancelInvite(invite: Invite) {
    const confirmed = await this.modalService.confirm(
      'Cancelar Convite',
      `Tem certeza que deseja cancelar o convite para "${invite.email}"?`,
      'Sim, cancelar',
      'Não'
    );

    if (confirmed) {
      this.http.delete(`${this.apiUrl}/users/invites/${invite.id}`).subscribe({
        next: () => {
          this.loadPendingInvites();
          this.modalService.success('Convite cancelado com sucesso!');
        },
        error: (err) => {
          console.error('Erro ao cancelar convite:', err);
          this.modalService.error(err.error?.message || 'Erro ao cancelar convite');
        }
      });
    }
  }

  editUser(user: User) {
    this.editingUser.set(user);
    this.editData = {
      name: user.name,
      email: user.email,
      role: user.role === 'master' ? 'admin' : user.role,
      status: user.status || 'active'
    };
    this.showEditModal.set(true);
  }

  closeEditModal() {
    this.showEditModal.set(false);
    this.editingUser.set(null);
  }

  saveUser() {
    const editing = this.editingUser();
    if (!editing) return;

    this.isLoading.set(true);

    this.http.patch<User>(`${this.apiUrl}/users/${editing.id}`, {
      name: this.editData.name,
      email: this.editData.email,
      role: this.editData.role,
      status: this.editData.status
    }).subscribe({
      next: () => {
        this.loadUsers();
        this.closeEditModal();
        this.isLoading.set(false);
      },
      error: (err) => {
        console.error('Erro ao atualizar:', err);
        this.isLoading.set(false);
      }
    });
  }

  async deleteUser(user: User) {
    if (user.role === 'master') {
      this.modalService.warning('O usuário master não pode ser excluído');
      return;
    }

    const confirmed = await this.modalService.confirm(
      'Excluir Usuário',
      `Tem certeza que deseja excluir o usuário "${user.name}"?`,
      'Sim, excluir',
      'Cancelar'
    );

    if (confirmed) {
      this.http.delete(`${this.apiUrl}/users/${user.id}`).subscribe({
        next: () => {
          this.loadUsers();
          this.modalService.success('Usuário excluído com sucesso!');
        },
        error: (err) => {
          console.error('Erro ao excluir:', err);
          this.modalService.error(err.error?.message || 'Erro ao excluir usuário');
        }
      });
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  getRoleLabel(role: UserRole): string {
    const labels: Record<UserRole, string> = {
      master: 'Master',
      admin: 'Administrador',
      manager: 'Gerente',
      user: 'Usuário'
    };
    return labels[role] || role;
  }

  getStatusLabel(status?: UserStatus): string {
    if (!status) return 'Ativo';
    const labels: Record<UserStatus, string> = {
      pending: 'Pendente',
      active: 'Ativo',
      inactive: 'Inativo'
    };
    return labels[status] || status;
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }
}
