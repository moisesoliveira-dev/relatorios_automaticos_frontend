import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthArtComponent } from '../../shared/components/auth-art.component';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, AuthArtComponent],
  template: `
    <div class="auth-shell">
      <app-auth-art></app-auth-art>
      <main class="auth-main"><div class="w-full max-w-md auth-rise">
        <div class="mb-8"><span class="auth-chip" aria-hidden="true">CM</span><h1 class="font-display text-4xl font-extrabold tracking-tight mt-4" style="color: var(--cmm-ink);">Complete seu cadastro</h1><p class="mt-2 text-sm" style="color: var(--cmm-muted);">Use o código de convite recebido por email</p></div>

        <div class="auth-card">
          @if (inviteEmail()) {
            <div class="mb-6 p-3 rounded-lg text-sm flex items-center gap-3" style="background: var(--cmm-accent-soft); border: 1px solid color-mix(in srgb, var(--cmm-accent) 35%, transparent); color: var(--cmm-ink);">
              <span>Código válido para: {{ inviteEmail() }}</span>
            </div>
          }

          @if (errorMessage()) {
            <div class="mb-6 auth-alert auth-alert-error" role="alert">
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-5">
            <div>
              <label class="auth-label">
                Código de Convite
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-cmm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  [(ngModel)]="inviteCode"
                  name="inviteCode"
                  required
                  maxlength="6"
                  (input)="validateCode()"
                  class="auth-input pl-10 pr-4"
                  placeholder="000000"
                />
              </div>
              <p class="text-cmm-muted text-xs mt-2 flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Válido por 10 minutos
              </p>
            </div>

            <div>
              <label class="auth-label">
                Nome Completo
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-cmm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="name"
                    name="name"
                    required
                    class="auth-input pl-10 pr-4"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>

              <div>
                <label class="auth-label">
                  Senha
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-cmm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    [(ngModel)]="password"
                    name="password"
                    required
                    minlength="8"
                    class="auth-input pl-10 pr-12"
                    placeholder="Mínimo 8 caracteres"
                  />
                  <button
                    type="button"
                    (click)="showPassword.set(!showPassword())"
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-cmm-muted hover:text-cmm-accent transition"
                  >
                    @if (showPassword()) {
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"></path>
                      </svg>
                    } @else {
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
                      </svg>
                    }
                  </button>
                </div>
              </div>

              <div>
                <label class="auth-label">
                  Confirmar Senha
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-cmm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    [(ngModel)]="confirmPassword"
                    name="confirmPassword"
                    required
                    class="auth-input pl-10 pr-4"
                    placeholder="Repita a senha"
                  />
                </div>
              </div>

              <button
                type="submit"
                [disabled]="isLoading()"
                class="btn btn-accent btn-static w-full mt-6"
              >
                @if (isLoading()) {
                  <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Criando conta...
                } @else {
                  Completar Cadastro
                }
              </button>
            </form>
          </div>

          <div class="text-center mt-6">
            <button
              (click)="goToLogin()"
              class="text-cmm-muted hover:text-cmm-accent transition"
            >
              ← Voltar para Login
            </button>
          </div>

        <p class="text-center text-cmm-muted text-sm mt-8">
          CMM System © 2026
        </p>
      </div></main>
    </div>
  `
})
export class RegisterComponent implements OnInit {
  inviteCode = '';
  name = '';
  password = '';
  confirmPassword = '';
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');
  inviteEmail = signal('');

  private http = inject(HttpClient);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private apiUrl = environment.apiUrl;

  ngOnInit() {
    const email = this.route.snapshot.queryParamMap.get('email');
    if (email) {
      this.inviteEmail.set(email);
    }
  }

  validateCode() {
    // Remove caracteres não numéricos
    this.inviteCode = this.inviteCode.replace(/\D/g, '');

    if (this.inviteCode.length === 6) {
      // Valida o código quando atingir 6 dígitos
      this.http.post<any>(`${this.apiUrl}/auth/validate-invite-code`, {
        code: this.inviteCode
      }).subscribe({
        next: (response) => {
          if (response.valid) {
            this.inviteEmail.set(response.email);
            this.errorMessage.set('');
          }
        },
        error: (error) => {
          this.inviteEmail.set('');
          this.errorMessage.set(error.error?.message || 'Código inválido ou expirado');
        }
      });
    } else {
      this.inviteEmail.set('');
    }
  }

  onSubmit() {
    if (!this.inviteCode || !this.name || !this.password || !this.confirmPassword) {
      this.errorMessage.set('Por favor, preencha todos os campos');
      return;
    }

    if (this.inviteCode.length !== 6) {
      this.errorMessage.set('O código deve ter 6 dígitos');
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage.set('A senha deve ter no mínimo 8 caracteres');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('As senhas não conferem');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.http.post<any>(`${this.apiUrl}/auth/complete-registration`, {
      code: this.inviteCode,
      name: this.name,
      password: this.password
    }).subscribe({
      next: (response) => {
        // Atualiza o token e user através do AuthService
        localStorage.setItem('access_token', response.access_token);
        this.authService.setUser(response.user);

        this.router.navigate(['/ia']);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Erro ao completar cadastro');
      }
    });
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
