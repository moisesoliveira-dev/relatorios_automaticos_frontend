import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { UsersFacade } from '../facade/users.facade';
import { UserTabPickerComponent } from './user-tab-picker.component';

@Component({
  selector: 'app-users-modals',
  standalone: true,
  imports: [FormsModule, UserTabPickerComponent],
  template: `
    @if (facade.showCreateModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
        <div class="panel panel-pad max-w-lg w-full" style="max-height: 90vh; overflow-y: auto;">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold" style="color: var(--cmm-ink);">Cadastrar Usuário</h3>
            <button type="button" (click)="facade.closeCreateModal()" class="btn btn-ghost btn-sm">✕</button>
          </div>
          <form (ngSubmit)="facade.createUser()" class="space-y-4">
            @if (facade.createError()) {
              <div class="p-3 rounded-lg text-sm" style="background: color-mix(in srgb, var(--cmm-danger) 12%, var(--cmm-panel)); color: var(--cmm-danger);">
                {{ facade.createError() }}
              </div>
            }
            <div>
              <label class="form-label">Nome</label>
              <input type="text" [(ngModel)]="facade.createData.name" name="createName" required class="form-input" />
            </div>
            <div>
              <label class="form-label">Email</label>
              <input type="email" [(ngModel)]="facade.createData.email" name="createEmail" required class="form-input" />
            </div>
            <div>
              <label class="form-label">Senha</label>
              <input type="password" [(ngModel)]="facade.createData.password" name="createPassword" required minlength="6" class="form-input" autocomplete="new-password" />
            </div>
            <div>
              <label class="form-label">Confirmar senha</label>
              <input type="password" [(ngModel)]="facade.createData.confirmPassword" name="createConfirmPassword" required minlength="6" class="form-input" autocomplete="new-password" />
            </div>
            <app-user-tab-picker />
            <div class="flex gap-3 pt-2">
              <button type="button" (click)="facade.closeCreateModal()" class="btn btn-secondary flex-1">Cancelar</button>
              <button type="submit" [disabled]="facade.isLoading()" class="btn btn-primary flex-1">
                {{ facade.isLoading() ? 'Cadastrando...' : 'Cadastrar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (facade.showInviteModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
        <div class="panel panel-pad max-w-lg w-full" style="max-height: 90vh; overflow-y: auto;">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold" style="color: var(--cmm-ink);">Convidar Novo Usuário</h3>
            <button type="button" (click)="facade.closeInviteModal()" class="btn btn-ghost btn-sm">✕</button>
          </div>
          @if (facade.inviteSuccess()) {
            <div class="py-2 space-y-4">
              @if (facade.inviteEmailSent()) {
                <p class="text-sm text-center" style="color: var(--cmm-muted);">Convite enviado por email com sucesso.</p>
              } @else {
                <p class="text-sm" style="color: var(--cmm-warning);">Email não entregue — compartilhe manualmente.</p>
                @if (facade.inviteCodeResult()) {
                  <p class="text-2xl font-semibold tracking-widest text-center">{{ facade.inviteCodeResult() }}</p>
                }
              }
              <p class="text-sm p-3 rounded-lg break-all" style="background: var(--cmm-surface);">{{ facade.inviteLink() }}</p>
              <button type="button" (click)="facade.closeInviteModal()" class="btn btn-primary w-full">Fechar</button>
            </div>
          } @else {
            <form (ngSubmit)="facade.sendInvite()" class="space-y-4">
              @if (facade.inviteError()) {
                <div class="p-3 rounded-lg text-sm" style="color: var(--cmm-danger);">{{ facade.inviteError() }}</div>
              }
              <div>
                <label class="form-label">Email</label>
                <input type="email" [(ngModel)]="facade.inviteEmail" name="email" required class="form-input" />
              </div>
              <app-user-tab-picker />
              <div class="flex gap-3 pt-2">
                <button type="button" (click)="facade.closeInviteModal()" class="btn btn-secondary flex-1">Cancelar</button>
                <button type="submit" [disabled]="facade.isLoading()" class="btn btn-primary flex-1">
                  {{ facade.isLoading() ? 'Enviando...' : 'Enviar Convite' }}
                </button>
              </div>
            </form>
          }
        </div>
      </div>
    }

    @if (facade.showEditModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
        <div class="panel panel-pad max-w-lg w-full" style="max-height: 90vh; overflow-y: auto;">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold" style="color: var(--cmm-ink);">Editar Usuário</h3>
            <button type="button" (click)="facade.closeEditModal()" class="btn btn-ghost btn-sm">✕</button>
          </div>
          <form (ngSubmit)="facade.saveUser()" class="space-y-4">
            @if (facade.editError()) {
              <div class="p-3 rounded-lg text-sm" style="color: var(--cmm-danger);">{{ facade.editError() }}</div>
            }
            <div>
              <label class="form-label">Nome</label>
              <input type="text" [(ngModel)]="facade.editData.name" name="name" required class="form-input" />
            </div>
            <div>
              <label class="form-label">Email</label>
              <input type="email" [value]="facade.editData.email" disabled class="form-input" />
            </div>
            <div>
              <label class="form-label">Status</label>
              <select [(ngModel)]="facade.editData.status" name="status" class="form-input">
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
              </select>
            </div>
            @if (facade.isMaster()) {
              <div class="rounded-lg p-3 space-y-3" style="background: var(--cmm-surface); border: 1px solid var(--cmm-border);">
                <p class="text-sm font-medium">Alterar senha (opcional)</p>
                <input type="password" [(ngModel)]="facade.editData.password" name="password" class="form-input" minlength="6" autocomplete="new-password" placeholder="Nova senha" />
                <input type="password" [(ngModel)]="facade.editData.confirmPassword" name="confirmPassword" class="form-input" minlength="6" autocomplete="new-password" placeholder="Confirmar senha" />
              </div>
            }
            <app-user-tab-picker />
            <div class="flex gap-3 pt-2">
              <button type="button" (click)="facade.closeEditModal()" class="btn btn-secondary flex-1">Cancelar</button>
              <button type="submit" [disabled]="facade.isLoading()" class="btn btn-primary flex-1">
                {{ facade.isLoading() ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    @if (facade.showApproveModal()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
        <div class="panel panel-pad max-w-lg w-full" style="max-height: 90vh; overflow-y: auto;">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold" style="color: var(--cmm-ink);">Definir abas e aprovar</h3>
            <button type="button" (click)="facade.closeApproveModal()" class="btn btn-ghost btn-sm">✕</button>
          </div>
          @if (facade.approvingUser(); as reg) {
            <p class="text-sm mb-4" style="color: var(--cmm-muted);">
              Selecione as abas para <span class="font-medium" style="color: var(--cmm-ink);">{{ reg.name || reg.email }}</span>
            </p>
          }
          @if (facade.approveError()) {
            <div class="mb-4 p-3 rounded-lg text-sm" style="color: var(--cmm-danger);">{{ facade.approveError() }}</div>
          }
          <app-user-tab-picker />
          <div class="flex gap-3 pt-4">
            <button type="button" (click)="facade.closeApproveModal()" class="btn btn-secondary flex-1">Cancelar</button>
            <button type="button" (click)="facade.confirmApproveRegistration()" [disabled]="facade.isLoading()" class="btn btn-accent flex-1">
              {{ facade.isLoading() ? 'Aprovando...' : 'Aprovar' }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class UsersModalsComponent {
  readonly facade = inject(UsersFacade);
}
