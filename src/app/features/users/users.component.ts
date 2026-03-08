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
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Gerenciamento de Usuários</h1>
          <p class="text-slate-500 mt-1">Gerencie usuários e envie convites para novos membros</p>
        </div>
        @if (canManageUsers()) {
          <button
            (click)="openInviteModal()"
            class="px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
            </svg>
            Convidar Usuário
          </button>
        }
      </div>

      <!-- Tabs -->
      <div class="border-b border-slate-200">
        <nav class="flex gap-4">
          <button
            (click)="activeTab.set('users')"
            class="px-4 py-2 font-medium text-sm border-b-2 transition-colors"
            [class.border-slate-700]="activeTab() === 'users'"
            [class.text-slate-800]="activeTab() === 'users'"
            [class.border-transparent]="activeTab() !== 'users'"
            [class.text-slate-500]="activeTab() !== 'users'"
          >
            Usuários ({{ users().length }})
          </button>
          @if (canManageUsers()) {
            <button
              (click)="activeTab.set('invites')"
              class="px-4 py-2 font-medium text-sm border-b-2 transition-colors"
            [class.border-slate-700]="activeTab() === 'invites'"
            [class.text-slate-800]="activeTab() === 'invites'"
              [class.border-transparent]="activeTab() !== 'invites'"
              [class.text-slate-500]="activeTab() !== 'invites'"
            >
              Convites Pendentes ({{ pendingInvites().length }})
            </button>
          }
        </nav>
      </div>

      <!-- Users Tab -->
      @if (activeTab() === 'users') {
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuário</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Função</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Criado em</th>
                  @if (canManageUsers()) {
                    <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                  }
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                @for (user of users(); track user.id) {
                  <tr class="hover:bg-slate-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                      <div class="flex items-center gap-3">
                        <div 
                          class="w-10 h-10 rounded-full flex items-center justify-center font-medium"
                          [class.bg-yellow-100]="user.role === 'master'"
                          [class.text-yellow-700]="user.role === 'master'"
                          [class.bg-slate-100]="user.role !== 'master'"
                          [class.text-slate-600]="user.role !== 'master'"
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
                          <span class="font-medium text-slate-800">{{ user.name }}</span>
                          @if (user.role === 'master') {
                            <span class="ml-2 text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Master</span>
                          }
                        </div>
                      </div>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-slate-600">{{ user.email }}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span 
                        class="px-2 py-1 text-xs font-medium rounded-full"
                        [class.bg-yellow-100]="user.role === 'master'"
                        [class.text-yellow-700]="user.role === 'master'"
                        [class.bg-slate-100]="user.role === 'admin'"
                        [class.text-slate-700]="user.role === 'admin'"
                        [class.bg-blue-100]="user.role === 'manager'"
                        [class.text-blue-700]="user.role === 'manager'"
                        [class.bg-slate-100]="user.role === 'user'"
                        [class.text-slate-700]="user.role === 'user'"
                      >
                        {{ getRoleLabel(user.role) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span 
                        class="px-2 py-1 text-xs font-medium rounded-full"
                        [class.bg-green-100]="user.status === 'active'"
                        [class.text-green-700]="user.status === 'active'"
                        [class.bg-yellow-100]="user.status === 'pending'"
                        [class.text-yellow-700]="user.status === 'pending'"
                        [class.bg-red-100]="user.status === 'inactive'"
                        [class.text-red-700]="user.status === 'inactive'"
                      >
                        {{ getStatusLabel(user.status) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                      {{ formatDate(user.createdAt) }}
                    </td>
                    @if (canManageUsers()) {
                      <td class="px-6 py-4 whitespace-nowrap text-right">
                        <div class="flex items-center justify-end gap-2">
                          @if (user.role !== 'master') {
                            <button
                              (click)="editUser(user)"
                              class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Editar"
                            >
                              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                              </svg>
                            </button>
                          }
                          @if (user.id !== authService.user()?.id && user.role !== 'master') {
                            <button
                              (click)="deleteUser(user)"
                              class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                    <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                      Nenhum usuário encontrado
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Invites Tab -->
      @if (activeTab() === 'invites' && canManageUsers()) {
        <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Função</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Convidado por</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Expira em</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Link</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                @for (invite of pendingInvites(); track invite.id) {
                  <tr class="hover:bg-slate-50">
                    <td class="px-6 py-4 whitespace-nowrap text-slate-800 font-medium">{{ invite.email }}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <span 
                        class="px-2 py-1 text-xs font-medium rounded-full"
                        [class.bg-slate-100]="invite.role === 'admin'"
                        [class.text-slate-700]="invite.role === 'admin'"
                        [class.bg-blue-100]="invite.role === 'manager'"
                        [class.text-blue-700]="invite.role === 'manager'"
                        [class.bg-slate-100]="invite.role === 'user'"
                        [class.text-slate-700]="invite.role === 'user'"
                      >
                        {{ getRoleLabel(invite.role) }}
                      </span>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-slate-600">{{ invite.invitedBy?.name || '-' }}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-slate-500 text-sm">
                      {{ formatDate(invite.inviteExpiresAt) }}
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap">
                      <button
                        (click)="copyInviteLink(invite)"
                        class="text-slate-600 hover:text-slate-800 text-sm flex items-center gap-1"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path>
                        </svg>
                        Copiar Link
                      </button>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        (click)="cancelInvite(invite)"
                        class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                    <td colspan="6" class="px-6 py-12 text-center text-slate-500">
                      Nenhum convite pendente
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }

      <!-- Invite Modal -->
      @if (showInviteModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl max-w-md w-full p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-slate-800">Convidar Novo Usuário</h3>
              <button (click)="closeInviteModal()" class="text-slate-400 hover:text-slate-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            @if (inviteSuccess()) {
              <div class="text-center py-4">
                <div class="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg class="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                </div>
                <h4 class="text-lg font-medium text-slate-800 mb-2">Convite Enviado!</h4>
                <p class="text-slate-500 mb-4">O link de convite foi copiado para a área de transferência.</p>
                <p class="text-sm bg-slate-100 p-3 rounded-lg break-all text-slate-600">{{ inviteLink() }}</p>
                <button
                  (click)="closeInviteModal()"
                  class="mt-4 px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors"
                >
                  Fechar
                </button>
              </div>
            } @else {
              <form (ngSubmit)="sendInvite()" class="space-y-4">
                @if (inviteError()) {
                  <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    {{ inviteError() }}
                  </div>
                }

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    [(ngModel)]="inviteData.email"
                    name="email"
                    required
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                    placeholder="usuario@email.com"
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-1">Função</label>
                  <select
                    [(ngModel)]="inviteData.role"
                    name="role"
                    class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    <option value="user">Usuário</option>
                    <option value="manager">Gerente</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div class="flex gap-3 pt-4">
                  <button
                    type="button"
                    (click)="closeInviteModal()"
                    class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    [disabled]="isLoading()"
                    class="flex-1 px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                  >
                    {{ isLoading() ? 'Enviando...' : 'Enviar Convite' }}
                  </button>
                </div>
              </form>
            }
          </div>
        </div>
      }

      <!-- Edit User Modal -->
      @if (showEditModal()) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl max-w-md w-full p-6">
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-lg font-semibold text-slate-800">Editar Usuário</h3>
              <button (click)="closeEditModal()" class="text-slate-400 hover:text-slate-600">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <form (ngSubmit)="saveUser()" class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  [(ngModel)]="editData.name"
                  name="name"
                  required
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  [(ngModel)]="editData.email"
                  name="email"
                  required
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Função</label>
                <select
                  [(ngModel)]="editData.role"
                  name="role"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="user">Usuário</option>
                  <option value="manager">Gerente</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  [(ngModel)]="editData.status"
                  name="status"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              <div class="flex gap-3 pt-4">
                <button
                  type="button"
                  (click)="closeEditModal()"
                  class="flex-1 px-4 py-2 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  [disabled]="isLoading()"
                    class="flex-1 px-4 py-2 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
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
  activeTab = signal<'users' | 'invites'>('users');

  showInviteModal = signal(false);
  showEditModal = signal(false);
  isLoading = signal(false);
  inviteSuccess = signal(false);
  inviteLink = signal('');
  inviteError = signal('');

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

    this.http.post<{ user: User; inviteLink: string }>(`${this.apiUrl}/users/invite`, this.inviteData).subscribe({
      next: (response) => {
        this.inviteLink.set(response.inviteLink);
        this.inviteSuccess.set(true);
        this.isLoading.set(false);

        // Copiar para clipboard
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
