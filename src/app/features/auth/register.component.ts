import { Component, OnInit, signal, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <!-- Formulário de Registro -->
        <div class="text-center mb-8">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-green-500 rounded-2xl mb-4">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path>
            </svg>
          </div>
          <h1 class="text-2xl font-semibold text-white tracking-tight">Complete seu Cadastro</h1>
          <p class="text-slate-400 mt-1 text-sm">Digite o código de convite recebido por email</p>
        </div>

        <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8">
          @if (inviteEmail()) {
            <div class="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg flex items-center gap-3">
              <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <span class="text-green-200 text-sm">Código válido para: {{ inviteEmail() }}</span>
            </div>
          }

          @if (errorMessage()) {
            <div class="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
              {{ errorMessage() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-5">
            <div>
              <label class="block text-slate-300 text-sm font-medium mb-2">
                Código de Convite
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  class="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition text-center text-xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                />
              </div>
              <p class="text-slate-400 text-xs mt-2 flex items-center gap-1">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Válido por 10 minutos
              </p>
            </div>

            <div>
              <label class="block text-slate-300 text-sm font-medium mb-2">
                Nome Completo
              </label>
              <div class="relative">
                <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg class="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                  </div>
                  <input
                    type="text"
                    [(ngModel)]="name"
                    name="name"
                    required
                    class="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                    placeholder="Seu nome completo"
                  />
                </div>
              </div>

              <div>
                <label class="block text-slate-300 text-sm font-medium mb-2">
                  Senha
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                  </div>
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    [(ngModel)]="password"
                    name="password"
                    required
                    minlength="6"
                    class="w-full pl-10 pr-12 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                    placeholder="Mínimo 6 caracteres"
                  />
                  <button
                    type="button"
                    (click)="showPassword.set(!showPassword())"
                    class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-white transition"
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
                <label class="block text-slate-300 text-sm font-medium mb-2">
                  Confirmar Senha
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <input
                    [type]="showPassword() ? 'text' : 'password'"
                    [(ngModel)]="confirmPassword"
                    name="confirmPassword"
                    required
                    class="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                    placeholder="Repita a senha"
                  />
                </div>
              </div>

              <button
                type="submit"
                [disabled]="isLoading()"
                class="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-6"
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
              class="text-slate-400 hover:text-white transition"
            >
              ← Voltar para Login
            </button>
          </div>

        <p class="text-center text-white/40 text-sm mt-8">
          Sistema de Relatórios Automáticos © 2026
        </p>
      </div>
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
    // Não precisa mais verificar token nos query params
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

    if (this.password.length < 6) {
      this.errorMessage.set('A senha deve ter no mínimo 6 caracteres');
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

        this.router.navigate(['/dashboard']);
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
