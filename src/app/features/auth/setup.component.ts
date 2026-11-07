import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthArtComponent } from '../../shared/components/auth-art.component';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [FormsModule, AuthArtComponent],
  template: `
    <div class="auth-shell">
      <app-auth-art></app-auth-art>
      <main class="auth-main"><div class="w-full max-w-md auth-rise">
        <div class="mb-8"><span class="auth-chip" aria-hidden="true">CM</span><h1 class="font-display text-4xl font-extrabold tracking-tight mt-4" style="color: var(--cmm-ink);">Configuração inicial</h1><p class="mt-2 text-sm" style="color: var(--cmm-muted);">Crie a conta master do sistema</p></div>

        <div class="auth-card">
          <div class="mb-6 p-4 rounded-lg" style="background: color-mix(in srgb, var(--cmm-border) 35%, var(--cmm-panel)); border: 1px solid var(--cmm-border);">
            <div class="flex gap-3">
              <div class="text-sm text-cmm-ink">
                <p class="font-semibold mb-1 text-cmm-ink">Usuário master</p>
                <p class="text-cmm-muted">O primeiro usuário será o administrador principal. Esta conta não pode ser removida e convida os demais.</p>
              </div>
            </div>
          </div>

          @if (errorMessage()) {
            <div class="mb-6 auth-alert auth-alert-error" role="alert">
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-5">
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
                Email
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-cmm-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                  </svg>
                </div>
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  class="auth-input pl-10 pr-4"
                  placeholder="seu@email.com"
                />
              </div>
            </div>

            <div>
              <label class="auth-label">
                Token de configuração (se exigido pelo servidor)
              </label>
              <input
                type="password"
                [(ngModel)]="setupToken"
                name="setupToken"
                autocomplete="off"
                class="auth-input"
                placeholder="MASTER_SETUP_TOKEN"
              />
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
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
                Criar Conta Master
              }
            </button>
          </form>
        </div>

        <p class="text-center text-cmm-muted text-sm mt-8">
          CMM System © 2026
        </p>
      </div></main>
    </div>
  `
})
export class SetupComponent implements OnInit {
  name = '';
  email = '';
  password = '';
  setupToken = '';
  confirmPassword = '';
  showPassword = signal(false);
  isLoading = signal(false);
  errorMessage = signal('');

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient, private router: Router) { }

  ngOnInit() {
    // Verifica se já existe um master
    this.http.get<{ hasMaster: boolean }>(`${this.apiUrl}/auth/check-master`).subscribe({
      next: (response) => {
        if (response.hasMaster) {
          this.router.navigate(['/login']);
        }
      },
      error: () => {
        // Se houver erro, provavelmente o backend não está rodando
        this.errorMessage.set('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
      }
    });
  }

  onSubmit() {
    if (!this.name || !this.email || !this.password || !this.confirmPassword) {
      this.errorMessage.set('Por favor, preencha todos os campos');
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

    this.http.post<any>(`${this.apiUrl}/auth/register-master`, {
      name: this.name,
      email: this.email,
      password: this.password,
      ...(this.setupToken ? { setupToken: this.setupToken } : {})
    }).subscribe({
      next: (response) => {
        localStorage.setItem('access_token', response.access_token);
        localStorage.setItem('user', JSON.stringify(response.user));
        this.router.navigate(['/ia']);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Erro ao criar conta. Tente novamente.');
      }
    });
  }
}
