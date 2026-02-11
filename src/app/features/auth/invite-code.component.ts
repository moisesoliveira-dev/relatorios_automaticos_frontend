import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
    selector: 'app-invite-code',
    standalone: true,
    imports: [CommonModule, FormsModule],
    template: `
    <div class="min-h-screen bg-gradient-to-br from-purple-100 via-white to-purple-50 flex items-center justify-center px-4">
      <div class="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div class="text-center mb-8">
          <div class="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg class="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
            </svg>
          </div>
          <h1 class="text-3xl font-bold text-gray-900 mb-2">Código de Convite</h1>
          <p class="text-gray-600">Digite o código de 6 dígitos que você recebeu por email</p>
        </div>

        @if (errorMessage()) {
          <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 animate-shake">
            <svg class="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
            <span class="text-red-800 text-sm">{{ errorMessage() }}</span>
          </div>
        }

        <form (ngSubmit)="validateCode()" class="space-y-6">
          <div>
            <label for="code" class="block text-sm font-medium text-gray-700 mb-3 text-center">
              🔢 Digite seu código de convite
            </label>
            <input
              type="text"
              id="code"
              [(ngModel)]="code"
              name="code"
              maxlength="6"
              required
              autofocus
              class="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-center text-3xl font-bold tracking-[0.5em] focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
              placeholder="000000"
              (input)="onCodeInput($event)"
            />
            <p class="text-xs text-gray-500 mt-3 text-center">
              ⏱️ Código válido por <strong>10 minutos</strong>
            </p>
          </div>

          <button
            type="submit"
            [disabled]="isLoading() || code.length !== 6"
            class="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-4 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
          >
            @if (isLoading()) {
              <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Validando...</span>
            } @else {
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span>Validar Código</span>
            }
          </button>
        </form>

        <div class="mt-8 text-center">
          <p class="text-sm text-gray-600">
            Não recebeu o convite?
            <button 
              type="button"
              class="text-purple-600 hover:text-purple-700 font-semibold ml-1 transition-colors"
              (click)="goToLogin()"
            >
              Contate o administrador
            </button>
          </p>
        </div>

        <div class="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
          <div class="flex items-start gap-3">
            <svg class="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
            </svg>
            <div class="text-sm text-purple-800">
              <p class="font-semibold mb-1">💡 Dica:</p>
              <p>O código foi enviado para seu email. Verifique também a pasta de spam.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
    styles: [`
    input::-webkit-outer-spin-button,
    input::-webkit-inner-spin-button {
      -webkit-appearance: none;
      margin: 0;
    }
    input[type=number] {
      -moz-appearance: textfield;
    }
    @keyframes shake {
      0%, 100% { transform: translateX(0); }
      25% { transform: translateX(-10px); }
      75% { transform: translateX(10px); }
    }
    .animate-shake {
      animation: shake 0.4s ease-in-out;
    }
  `]
})
export class InviteCodeComponent {
    code = '';
    isLoading = signal(false);
    errorMessage = signal('');

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    onCodeInput(event: Event) {
        const input = event.target as HTMLInputElement;
        // Remove caracteres não numéricos
        input.value = input.value.replace(/\D/g, '');
        this.code = input.value;
    }

    async validateCode() {
        if (this.code.length !== 6) {
            return;
        }

        this.isLoading.set(true);
        this.errorMessage.set('');

        try {
            const response = await this.authService.validateInviteCode(this.code);

            if (response.valid && response.email) {
                // Redireciona para a página de registro com o email e token
                this.router.navigate(['/register'], {
                    queryParams: {
                        email: response.email,
                        token: response.token
                    }
                });
            } else {
                this.errorMessage.set(response.message || 'Código inválido');
            }
        } catch (error: any) {
            console.error('Erro ao validar código:', error);
            this.errorMessage.set(
                error?.error?.message || 'Erro ao validar código. Tente novamente.'
            );
        } finally {
            this.isLoading.set(false);
        }
    }

    goToLogin() {
        this.router.navigate(['/login']);
    }
}
