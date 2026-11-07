import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { AuthArtComponent } from '../../shared/components/auth-art.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink, AuthArtComponent],
  template: `
    <div class="auth-shell">
      <app-auth-art></app-auth-art>

      <main class="auth-main">
        @if (isCheckingMaster()) {
          <div class="text-center" role="status" aria-live="polite">
            <div class="spinner mx-auto mb-4"></div>
            <p style="color: var(--cmm-muted);">Verificando o sistema…</p>
          </div>
        } @else {
          <div class="auth-card auth-rise">
            <div class="mb-8">
              <span class="auth-chip" aria-hidden="true">CM</span>
              <h1 class="font-display text-4xl font-extrabold tracking-tight mt-4" style="color: var(--cmm-ink);">
                @if (!showRegister()) { Entrar } @else { Criar conta }
              </h1>
              <p class="mt-2 text-sm" style="color: var(--cmm-muted);">
                @if (!showRegister()) { Acesse o console do CMM System. } @else { O administrador precisa aprovar o seu acesso. }
              </p>
            </div>

            @if (!showRegister()) {
              @if (errorMessage()) {
                <div class="mb-6 auth-alert auth-alert-error" role="alert">{{ errorMessage() }}</div>
              }
              @if (infoMessage()) {
                <div class="mb-6 auth-alert auth-alert-info" role="status">{{ infoMessage() }}</div>
              }

              <form (ngSubmit)="onSubmit()" class="space-y-5" novalidate>
                <div class="field-in" style="--i: 0">
                  <label for="login-email" class="auth-label">E-mail</label>
                  <input
                    id="login-email"
                    type="email"
                    [(ngModel)]="email"
                    name="email"
                    required
                    autocomplete="username"
                    inputmode="email"
                    autofocus
                    class="auth-input"
                    [attr.aria-invalid]="errorMessage() && !email ? 'true' : null"
                    placeholder="voce@empresa.com"
                  />
                </div>

                <div class="field-in" style="--i: 1">
                  <label for="login-password" class="auth-label">Senha</label>
                  <div class="relative">
                    <input
                      id="login-password"
                      [type]="showPassword() ? 'text' : 'password'"
                      [(ngModel)]="password"
                      name="password"
                      required
                      autocomplete="current-password"
                      class="auth-input !pr-12"
                      [attr.aria-invalid]="errorMessage() && !password ? 'true' : null"
                      placeholder="Sua senha"
                    />
                    <button
                      type="button"
                      (click)="showPassword.set(!showPassword())"
                      class="absolute inset-y-0 right-0 px-3.5 flex items-center auth-link"
                      [attr.aria-label]="showPassword() ? 'Ocultar senha' : 'Mostrar senha'"
                      [attr.aria-pressed]="showPassword()"
                    >
                      @if (showPassword()) {
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg>
                      } @else {
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      }
                    </button>
                  </div>
                </div>

                <div class="field-in" style="--i: 2">
                  <button type="submit" [disabled]="isLoading()" class="btn btn-accent btn-static w-full !min-h-[3rem] !text-base">
                    @if (isLoading()) {
                      <span class="spinner" style="width: 1.1rem; height: 1.1rem; border-color: rgba(28,9,0,0.25); border-top-color: #1c0900;"></span>
                      Entrando…
                    } @else {
                      Entrar
                    }
                  </button>
                </div>
              </form>

              <div class="mt-8 flex flex-col gap-3.5 field-in" style="--i: 3">
                <a routerLink="/invite" class="auth-link">Tenho um código de convite →</a>
                <button type="button" (click)="showRegister.set(true)" class="auth-link text-left">Ainda não tem conta? Cadastre-se</button>
                <button type="button" (click)="checkAndGoToSetup()" class="auth-link text-left !text-xs !font-medium">Primeira vez aqui? Configure o sistema</button>
              </div>
            } @else {
              @if (registerSuccess()) {
                <div class="text-center py-6" role="status">
                  <div class="success-badge mx-auto mb-5" aria-hidden="true">
                    <svg class="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path class="check-path" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/></svg>
                  </div>
                  <h2 class="font-display text-2xl font-bold" style="color: var(--cmm-ink);">Cadastro enviado</h2>
                  <p class="mt-2 mb-6 text-sm" style="color: var(--cmm-muted);">Assim que o administrador aprovar, você poderá entrar.</p>
                  <button type="button" (click)="showRegister.set(false); registerSuccess.set(false)" class="btn btn-secondary">Voltar ao login</button>
                </div>
              } @else {
                @if (registerError()) {
                  <div class="mb-6 auth-alert auth-alert-error" role="alert">{{ registerError() }}</div>
                }
                <form (ngSubmit)="onRegisterSubmit()" class="space-y-5" novalidate>
                  <div class="field-in" style="--i: 0">
                    <label for="reg-name" class="auth-label">Nome completo</label>
                    <input id="reg-name" type="text" [(ngModel)]="registerName" name="registerName" required autocomplete="name" class="auth-input" placeholder="Seu nome" />
                  </div>
                  <div class="field-in" style="--i: 1">
                    <label for="reg-email" class="auth-label">E-mail</label>
                    <input id="reg-email" type="email" [(ngModel)]="registerEmail" name="registerEmail" required autocomplete="email" inputmode="email" class="auth-input" placeholder="voce@empresa.com" />
                  </div>
                  <div class="field-in" style="--i: 2">
                    <label for="reg-password" class="auth-label">Senha</label>
                    <input id="reg-password" type="password" [(ngModel)]="registerPassword" name="registerPassword" required minlength="8" autocomplete="new-password" class="auth-input" aria-describedby="reg-password-help" placeholder="Mínimo de 8 caracteres" />
                    <p id="reg-password-help" class="mt-1.5 text-xs" style="color: var(--cmm-muted);">Use pelo menos 8 caracteres.</p>
                  </div>
                  <div class="field-in" style="--i: 3">
                    <button type="submit" [disabled]="isRegisterLoading()" class="btn btn-accent btn-static w-full !min-h-[3rem] !text-base">
                      @if (isRegisterLoading()) {
                        <span class="spinner" style="width: 1.1rem; height: 1.1rem; border-color: rgba(28,9,0,0.25); border-top-color: #1c0900;"></span>
                        Enviando…
                      } @else {
                        Criar conta
                      }
                    </button>
                  </div>
                </form>
                <div class="mt-6">
                  <button type="button" (click)="showRegister.set(false)" class="auth-link">← Já tenho conta. Voltar ao login</button>
                </div>
              }
            }
          </div>
        }
      </main>
    </div>
  `,
  styles: [
    `
      .field-in { animation: field-in 800ms var(--ease-out-expo) both; animation-delay: calc(var(--i, 0) * 90ms + 350ms); }
      @keyframes field-in { from { opacity: 0; transform: translateY(26px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
      .success-badge {
        width: 5rem; height: 5rem; border-radius: 999px; display: grid; place-items: center;
        color: var(--cmm-success); background: color-mix(in srgb, var(--cmm-success) 16%, var(--cmm-panel));
        animation: badge-pop 900ms var(--ease-out-expo) both;
      }
      @keyframes badge-pop { from { transform: scale(0) rotate(-120deg); } to { transform: scale(1) rotate(0); } }
      .check-path { stroke-dasharray: 30; stroke-dashoffset: 30; animation: draw 700ms var(--ease-out-expo) 400ms forwards; }
      @keyframes draw { to { stroke-dashoffset: 0; } }
    `,
  ],
})
export class LoginComponent implements OnInit {
  email = '';
  password = '';
  showPassword = signal(false);
  isLoading = signal(false);
  isCheckingMaster = signal(false);
  errorMessage = signal('');
  infoMessage = signal('');

  showRegister = signal(false);
  registerSuccess = signal(false);
  registerError = signal('');
  isRegisterLoading = signal(false);
  registerName = '';
  registerEmail = '';
  registerPassword = '';

  private apiUrl = environment.apiUrl;

  constructor(
    private authService: AuthService,
    private router: Router,
    private http: HttpClient,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    const expired = this.route.snapshot.queryParamMap.get('expired');
    if (expired) {
      this.infoMessage.set('Sua sessão expirou. Por favor, faça login novamente.');
    }
  }

  async checkAndGoToSetup() {
    this.infoMessage.set('');
    this.errorMessage.set('');

    try {
      const response = await this.authService.checkMaster().toPromise();

      if (response?.hasMaster) {
        this.infoMessage.set('Já existe uma conta principal no sistema. Entre em contato com o administrador para receber um convite de acesso.');
      } else {
        this.router.navigate(['/setup']);
      }
    } catch (error) {
      console.error('Erro ao verificar master:', error);
      this.errorMessage.set('Erro ao verificar o sistema. Tente novamente.');
    }
  }

  onSubmit() {
    if (!this.email || !this.password) {
      this.errorMessage.set('Por favor, preencha todos os campos');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        this.router.navigate(['/ia']);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(error.error?.message || 'Credenciais inválidas');
      }
    });
  }

  onRegisterSubmit() {
    if (!this.registerName || !this.registerEmail || !this.registerPassword) {
      this.registerError.set('Por favor, preencha todos os campos');
      return;
    }
    if (this.registerPassword.length < 8) {
      this.registerError.set('A senha deve ter pelo menos 8 caracteres');
      return;
    }

    this.isRegisterLoading.set(true);
    this.registerError.set('');

    this.http.post<{ message: string }>(`${this.apiUrl}/auth/self-register`, {
      name: this.registerName,
      email: this.registerEmail,
      password: this.registerPassword,
    }).subscribe({
      next: () => {
        this.isRegisterLoading.set(false);
        this.registerSuccess.set(true);
      },
      error: (error) => {
        this.isRegisterLoading.set(false);
        this.registerError.set(error.error?.message || 'Erro ao criar conta. Tente novamente.');
      }
    });
  }
}
