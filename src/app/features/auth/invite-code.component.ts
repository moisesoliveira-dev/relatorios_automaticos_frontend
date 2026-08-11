import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-invite-code',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <div class="auth-shell">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-14 h-14 rounded-xl mb-4" style="background: var(--cmm-accent); color: #042f2e;">
            <span class="text-lg font-semibold">CM</span>
          </div>
          <h1 class="text-2xl font-semibold text-white tracking-tight">Código de convite</h1>
          <p class="text-white/55 mt-1 text-sm">Digite o código de 6 dígitos enviado por email</p>
        </div>

        <div class="auth-card">
          @if (errorMessage()) {
            <div class="mb-5 p-3 rounded-lg text-sm" style="background: rgba(180,35,24,0.2); border: 1px solid rgba(252,165,165,0.35); color: #fecaca;">
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="validateCode()" class="space-y-5">
            <div>
              <label for="code" class="block text-sm font-medium text-white/80 mb-2 text-center">
                Código
              </label>
              <input
                type="text"
                id="code"
                [(ngModel)]="code"
                name="code"
                maxlength="6"
                required
                autofocus
                class="w-full px-4 py-4 rounded-lg text-center text-2xl font-semibold tracking-[0.45em] outline-none"
                style="background: rgba(255,255,255,0.05); border: 1px solid rgba(231,238,246,0.16); color: #e7eef6;"
                placeholder="000000"
                (input)="onCodeInput($event)"
              />
              <p class="text-xs text-white/45 mt-3 text-center">
                Válido por 10 minutos
              </p>
            </div>

            <button
              type="submit"
              [disabled]="isLoading() || code.length !== 6"
              class="btn btn-accent w-full"
            >
              @if (isLoading()) {
                Validando...
              } @else {
                Validar código
              }
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-white/55">
            Não recebeu o convite?
            <button type="button" class="text-teal-300 hover:text-white font-medium ml-1" (click)="goToLogin()">
              Voltar ao login
            </button>
          </div>

          <div class="mt-5 p-3 rounded-lg text-sm text-white/60" style="background: rgba(255,255,255,0.04); border: 1px solid rgba(231,238,246,0.1);">
            Verifique também a pasta de spam do email.
          </div>
        </div>

        <p class="text-center text-white/35 text-sm mt-8">
          <a routerLink="/login" class="hover:text-white/70">← Login</a>
        </p>
      </div>
    </div>
  `
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
    input.value = input.value.replace(/\D/g, '');
    this.code = input.value;
  }

  async validateCode() {
    if (this.code.length !== 6) return;

    this.isLoading.set(true);
    this.errorMessage.set('');

    try {
      const response = await this.authService.validateInviteCode(this.code);

      if (response.valid && response.email) {
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
