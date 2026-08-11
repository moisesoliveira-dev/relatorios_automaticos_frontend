import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';
import { ModalService } from '../../shared/services/modal.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-4xl mx-auto space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Meu Perfil</h1>
          <p class="page-subtitle">Gerencie suas informações pessoais e segurança da conta</p>
        </div>
      </div>

      <div class="panel panel-pad">
        <div class="flex items-center gap-6">
          <div
            class="w-20 h-20 rounded-xl flex items-center justify-center text-2xl font-semibold"
            style="background: var(--cmm-ink); color: var(--cmm-panel);"
          >
            {{ authService.userInitials() }}
          </div>
          <div class="flex-1 min-w-0">
            <h2 class="text-lg font-semibold" style="color: var(--cmm-ink);">{{ authService.user()?.name }}</h2>
            <p class="text-sm" style="color: var(--cmm-muted);">{{ authService.user()?.email }}</p>
            <div class="mt-2">
              <span class="badge badge-neutral">{{ getRoleLabel() }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="panel panel-pad">
        <h2 class="text-base font-semibold mb-4" style="color: var(--cmm-ink);">Informações Pessoais</h2>

        @if (nameSuccessMessage()) {
          <div
            class="mb-4 p-4 rounded-lg text-sm"
            style="background: color-mix(in srgb, var(--cmm-success) 12%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-success) 30%, transparent); color: var(--cmm-success);"
          >
            {{ nameSuccessMessage() }}
          </div>
        }

        @if (nameErrorMessage()) {
          <div
            class="mb-4 p-4 rounded-lg text-sm"
            style="background: color-mix(in srgb, var(--cmm-danger) 12%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-danger) 30%, transparent); color: var(--cmm-danger);"
          >
            {{ nameErrorMessage() }}
          </div>
        }

        <form (ngSubmit)="updateName()" class="space-y-4">
          <div>
            <label class="form-label">Nome Completo</label>
            <input
              type="text"
              [(ngModel)]="newName"
              name="name"
              required
              class="form-input"
              placeholder="Seu nome completo"
            />
          </div>

          <button type="submit" [disabled]="isUpdatingName()" class="btn btn-primary">
            @if (isUpdatingName()) {
              Salvando...
            } @else {
              Salvar Nome
            }
          </button>
        </form>
      </div>

      <div class="panel panel-pad">
        <h2 class="text-base font-semibold mb-4" style="color: var(--cmm-ink);">Segurança</h2>

        @if (passwordSuccessMessage()) {
          <div
            class="mb-4 p-4 rounded-lg text-sm"
            style="background: color-mix(in srgb, var(--cmm-success) 12%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-success) 30%, transparent); color: var(--cmm-success);"
          >
            {{ passwordSuccessMessage() }}
          </div>
        }

        @if (passwordErrorMessage()) {
          <div
            class="mb-4 p-4 rounded-lg text-sm"
            style="background: color-mix(in srgb, var(--cmm-danger) 12%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-danger) 30%, transparent); color: var(--cmm-danger);"
          >
            {{ passwordErrorMessage() }}
          </div>
        }

        <form (ngSubmit)="updatePassword()" class="space-y-4">
          <div>
            <label class="form-label">Senha Atual</label>
            <input
              type="password"
              [(ngModel)]="currentPassword"
              name="currentPassword"
              required
              class="form-input"
              placeholder="Digite sua senha atual"
            />
          </div>

          <div>
            <label class="form-label">Nova Senha</label>
            <input
              type="password"
              [(ngModel)]="newPassword"
              name="newPassword"
              required
              minlength="6"
              class="form-input"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label class="form-label">Confirmar Nova Senha</label>
            <input
              type="password"
              [(ngModel)]="confirmNewPassword"
              name="confirmNewPassword"
              required
              class="form-input"
              placeholder="Repita a nova senha"
            />
          </div>

          <button type="submit" [disabled]="isUpdatingPassword()" class="btn btn-primary">
            @if (isUpdatingPassword()) {
              Alterando...
            } @else {
              Alterar Senha
            }
          </button>
        </form>
      </div>

      <div class="panel panel-pad">
        <h2 class="text-base font-semibold mb-4" style="color: var(--cmm-ink);">Informações da Conta</h2>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between py-2" style="border-bottom: 1px solid var(--cmm-border);">
            <span style="color: var(--cmm-muted);">Perfil:</span>
            <span class="font-medium" style="color: var(--cmm-ink);">{{ getRoleLabel() }}</span>
          </div>
          <div class="flex justify-between py-2" style="border-bottom: 1px solid var(--cmm-border);">
            <span style="color: var(--cmm-muted);">Status:</span>
            <span class="badge badge-success">Ativo</span>
          </div>
          <div class="flex justify-between py-2">
            <span style="color: var(--cmm-muted);">Membro desde:</span>
            <span class="font-medium" style="color: var(--cmm-ink);">{{ formatDate(authService.user()?.createdAt) }}</span>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ProfileComponent {
  authService = inject(AuthService);
  private http = inject(HttpClient);
  private modalService = inject(ModalService);
  private apiUrl = environment.apiUrl;

  newName = this.authService.user()?.name || '';
  currentPassword = '';
  newPassword = '';
  confirmNewPassword = '';

  isUpdatingName = signal(false);
  isUpdatingPassword = signal(false);
  nameSuccessMessage = signal('');
  nameErrorMessage = signal('');
  passwordSuccessMessage = signal('');
  passwordErrorMessage = signal('');

  getRoleLabel(): string {
    const role = this.authService.user()?.role;
    switch (role) {
      case 'master': return 'Master';
      case 'admin': return 'Administrador';
      case 'manager': return 'Gerente';
      case 'user': return 'Usuário';
      default: return 'Usuário';
    }
  }

  formatDate(date: any): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR');
  }

  async updateName() {
    if (!this.newName || this.newName.length < 2) {
      this.nameErrorMessage.set('Nome deve ter no mínimo 2 caracteres');
      setTimeout(() => this.nameErrorMessage.set(''), 3000);
      return;
    }

    this.isUpdatingName.set(true);
    this.nameErrorMessage.set('');
    this.nameSuccessMessage.set('');

    this.http.patch<any>(`${this.apiUrl}/users/profile/name`, {
      name: this.newName
    }).subscribe({
      next: (response) => {
        this.isUpdatingName.set(false);
        this.authService.updateUserName(this.newName);
        this.modalService.success('Nome atualizado com sucesso!');
        this.nameSuccessMessage.set('Nome atualizado com sucesso!');
        setTimeout(() => this.nameSuccessMessage.set(''), 3000);
      },
      error: (error) => {
        this.isUpdatingName.set(false);
        const message = error.error?.message || 'Erro ao atualizar nome';
        this.nameErrorMessage.set(message);
        this.modalService.error(message);
        setTimeout(() => this.nameErrorMessage.set(''), 5000);
      }
    });
  }

  async updatePassword() {
    if (!this.currentPassword || !this.newPassword || !this.confirmNewPassword) {
      this.passwordErrorMessage.set('Preencha todos os campos');
      setTimeout(() => this.passwordErrorMessage.set(''), 3000);
      return;
    }

    if (this.newPassword.length < 6) {
      this.passwordErrorMessage.set('Nova senha deve ter no mínimo 6 caracteres');
      setTimeout(() => this.passwordErrorMessage.set(''), 3000);
      return;
    }

    if (this.newPassword !== this.confirmNewPassword) {
      this.passwordErrorMessage.set('As senhas não conferem');
      setTimeout(() => this.passwordErrorMessage.set(''), 3000);
      return;
    }

    this.isUpdatingPassword.set(true);
    this.passwordErrorMessage.set('');
    this.passwordSuccessMessage.set('');

    this.http.patch<any>(`${this.apiUrl}/users/profile/password`, {
      currentPassword: this.currentPassword,
      newPassword: this.newPassword
    }).subscribe({
      next: (response) => {
        this.isUpdatingPassword.set(false);
        this.modalService.success('Senha alterada com sucesso!');
        this.passwordSuccessMessage.set('Senha alterada com sucesso!');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmNewPassword = '';
        setTimeout(() => this.passwordSuccessMessage.set(''), 3000);
      },
      error: (error) => {
        this.isUpdatingPassword.set(false);
        const message = error.error?.message || 'Erro ao alterar senha';
        this.passwordErrorMessage.set(message);
        this.modalService.error(message);
        setTimeout(() => this.passwordErrorMessage.set(''), 5000);
      }
    });
  }
}
