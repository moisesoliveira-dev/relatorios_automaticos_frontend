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
      <!-- Header -->
      <div class="bg-white rounded-xl p-6 border border-slate-200">
        <div class="flex items-center gap-6">
          <div class="w-20 h-20 bg-slate-700 rounded-xl flex items-center justify-center text-white text-2xl font-semibold">
            {{ authService.userInitials() }}
          </div>
          <div class="flex-1">
            <h1 class="text-2xl font-bold text-slate-800">{{ authService.user()?.name }}</h1>
            <p class="text-slate-500">{{ authService.user()?.email }}</p>
            <div class="mt-2">
              <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
                    class="bg-slate-100 text-slate-700">
                {{ getRoleLabel() }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Editar Nome -->
      <div class="bg-white rounded-xl p-6 border border-slate-200">
        <h2 class="text-lg font-semibold text-slate-800 mb-4">Informações Pessoais</h2>
        
        @if (nameSuccessMessage()) {
          <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {{ nameSuccessMessage() }}
          </div>
        }
        
        @if (nameErrorMessage()) {
          <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {{ nameErrorMessage() }}
          </div>
        }

        <form (ngSubmit)="updateName()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Nome Completo</label>
            <input
              type="text"
              [(ngModel)]="newName"
              name="name"
              required
              class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Seu nome completo"
            />
          </div>
          
          <button
            type="submit"
            [disabled]="isUpdatingName()"
            class="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            @if (isUpdatingName()) {
              Salvando...
            } @else {
              Salvar Nome
            }
          </button>
        </form>
      </div>

      <!-- Alterar Senha -->
      <div class="bg-white rounded-xl p-6 border border-slate-200">
        <h2 class="text-lg font-semibold text-slate-800 mb-4">Segurança</h2>
        
        @if (passwordSuccessMessage()) {
          <div class="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {{ passwordSuccessMessage() }}
          </div>
        }
        
        @if (passwordErrorMessage()) {
          <div class="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {{ passwordErrorMessage() }}
          </div>
        }

        <form (ngSubmit)="updatePassword()" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Senha Atual</label>
            <input
              type="password"
              [(ngModel)]="currentPassword"
              name="currentPassword"
              required
              class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Digite sua senha atual"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Nova Senha</label>
            <input
              type="password"
              [(ngModel)]="newPassword"
              name="newPassword"
              required
              minlength="6"
              class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">Confirmar Nova Senha</label>
            <input
              type="password"
              [(ngModel)]="confirmNewPassword"
              name="confirmNewPassword"
              required
              class="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
              placeholder="Repita a nova senha"
            />
          </div>
          
          <button
            type="submit"
            [disabled]="isUpdatingPassword()"
            class="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white font-medium rounded-lg transition disabled:opacity-50"
          >
            @if (isUpdatingPassword()) {
              Alterando...
            } @else {
              Alterar Senha
            }
          </button>
        </form>
      </div>

      <!-- Informações da Conta -->
      <div class="bg-white rounded-xl p-6 border border-slate-200">
        <h2 class="text-lg font-semibold text-slate-800 mb-4">Informações da Conta</h2>
        <div class="space-y-3 text-sm">
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Perfil:</span>
            <span class="text-slate-800 font-medium">{{ getRoleLabel() }}</span>
          </div>
          <div class="flex justify-between py-2 border-b border-slate-100">
            <span class="text-slate-500">Status:</span>
            <span class="text-green-600 font-medium">Ativo</span>
          </div>
          <div class="flex justify-between py-2">
            <span class="text-slate-500">Membro desde:</span>
            <span class="text-slate-800 font-medium">{{ formatDate(authService.user()?.createdAt) }}</span>
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
