import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthArtComponent } from '../../shared/components/auth-art.component';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-invite-code',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, AuthArtComponent],
  template: `
    <div class="auth-shell">
      <app-auth-art></app-auth-art>
      <main class="auth-main"><div class="w-full max-w-md auth-rise">
        <div class="mb-8"><span class="auth-chip" aria-hidden="true">CM</span><h1 class="font-display text-4xl font-extrabold tracking-tight mt-4" style="color: var(--cmm-ink);">Código de convite</h1><p class="mt-2 text-sm" style="color: var(--cmm-muted);">Digite o código de 6 dígitos enviado por email</p></div>

        <div class="auth-card">
          @if (errorMessage()) {
            <div class="mb-5 p-3 rounded-lg text-sm" style="background: color-mix(in srgb, var(--cmm-danger) 11%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-danger) 35%, transparent); color: var(--cmm-danger);">
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="validateCode()" class="space-y-5">
            <div>
              <label for="code" class="block text-sm font-medium text-cmm-ink/80 mb-2 text-center">
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
                style="background: var(--cmm-panel); border: 1px solid var(--cmm-border); color: var(--cmm-ink);"
                placeholder="000000"
                (input)="onCodeInput($event)"
              />
              <p class="text-xs text-cmm-ink/45 mt-3 text-center">
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

          <div class="mt-6 text-center text-sm text-cmm-muted">
            Não recebeu o convite?
            <button type="button" class="auth-link ml-1" (click)="goToLogin()">
              Voltar ao login
            </button>
          </div>

          <div class="mt-5 p-3 rounded-lg text-sm text-cmm-muted" style="background: color-mix(in srgb, var(--cmm-border) 35%, var(--cmm-panel)); border: 1px solid var(--cmm-border);">
            Verifique também a pasta de spam do email.
          </div>
        </div>

        <p class="text-center text-cmm-ink/35 text-sm mt-8">
          <a routerLink="/login" class="hover:text-cmm-accent/70">← Login</a>
        </p>
      </div></main>
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
