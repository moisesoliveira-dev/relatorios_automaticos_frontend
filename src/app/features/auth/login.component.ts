import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      @if (isCheckingMaster()) {
        <!-- Loading inicial -->
        <div class="text-center">
          <div class="inline-flex items-center justify-center w-16 h-16 bg-slate-700 rounded-2xl mb-4">
            <svg class="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h1 class="text-xl font-semibold text-white">Carregando...</h1>
        </div>
      } @else {
        <div class="w-full max-w-md">
          <!-- Logo e Título -->
          <div class="text-center mb-8">
            <div class="inline-flex items-center justify-center w-16 h-16 bg-slate-700 rounded-2xl mb-4">
              <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <h1 class="text-2xl font-semibold text-white tracking-tight">Sistema de Relatórios</h1>
            <p class="text-slate-400 mt-1 text-sm">Faça login para continuar</p>
          </div>

          <!-- Card de Login -->
          <div class="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8">
            @if (!showRegister()) {
            @if (errorMessage()) {
              <div class="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                {{ errorMessage() }}
              </div>
            }

            @if (infoMessage()) {
              <div class="mb-6 p-4 bg-amber-500/15 border border-amber-500/40 rounded-lg text-amber-200 text-sm flex items-start gap-3">
                <svg class="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"/>
                </svg>
                <span>{{ infoMessage() }}</span>
              </div>
            }

            <form (ngSubmit)="onSubmit()" class="space-y-6">
              <div>
                <label class="block text-slate-300 text-sm font-medium mb-2">
                  Email
                </label>
                <div class="relative">
                  <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg class="h-5 w-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207"></path>
                    </svg>
                  </div>
                  <input
                    type="email"
                    [(ngModel)]="email"
                    name="email"
                    required
                    class="w-full pl-10 pr-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                    placeholder="seu@email.com"
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
                    class="w-full pl-10 pr-12 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                    placeholder="••••••••"
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

              <button
                type="submit"
                [disabled]="isLoading()"
                class="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                @if (isLoading()) {
                  <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Entrando...
                } @else {
                  Entrar
                }
              </button>
            </form>

            <div class="mt-6 flex flex-col gap-3 text-center">
              <a 
                routerLink="/invite" 
                class="text-slate-300 hover:text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
                </svg>
                Tenho um código de convite
              </a>
              <button
                type="button"
                (click)="showRegister.set(true)"
                class="text-slate-300 hover:text-white text-sm font-medium transition-colors"
              >
                Ainda não tem conta? Cadastre-se
              </button>
              <button 
                type="button"
                (click)="checkAndGoToSetup()"
                class="text-slate-500 hover:text-slate-300 text-xs transition-colors"
              >
                Primeira vez aqui? Configure o sistema
              </button>
            </div>
            } @else {
              @if (registerSuccess()) {
                <div class="text-center py-6">
                  <div class="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <h3 class="text-white font-semibold text-lg mb-2">Cadastro realizado!</h3>
                  <p class="text-slate-300 text-sm mb-4">Aguarde a aprovação do administrador para acessar o sistema.</p>
                  <button
                    type="button"
                    (click)="showRegister.set(false); registerSuccess.set(false)"
                    class="text-slate-300 hover:text-white text-sm transition-colors"
                  >
                    Voltar ao login
                  </button>
                </div>
              } @else {
                @if (registerError()) {
                  <div class="mb-5 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                    {{ registerError() }}
                  </div>
                }
                <form (ngSubmit)="onRegisterSubmit()" class="space-y-5">
                  <div>
                    <label class="block text-slate-300 text-sm font-medium mb-2">Nome completo</label>
                    <input
                      type="text"
                      [(ngModel)]="registerName"
                      name="registerName"
                      required
                      class="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                      placeholder="Seu nome completo"
                    />
                  </div>
                  <div>
                    <label class="block text-slate-300 text-sm font-medium mb-2">Email</label>
                    <input
                      type="email"
                      [(ngModel)]="registerEmail"
                      name="registerEmail"
                      required
                      class="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                      placeholder="seu@email.com"
                    />
                  </div>
                  <div>
                    <label class="block text-slate-300 text-sm font-medium mb-2">Senha</label>
                    <input
                      type="password"
                      [(ngModel)]="registerPassword"
                      name="registerPassword"
                      required
                      minlength="6"
                      class="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent transition"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                  <button
                    type="submit"
                    [disabled]="isRegisterLoading()"
                    class="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    @if (isRegisterLoading()) {
                      <svg class="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Cadastrando...
                    } @else {
                      Criar Conta
                    }
                  </button>
                </form>
                <div class="mt-6 text-center">
                  <button
                    type="button"
                    (click)="showRegister.set(false)"
                    class="text-slate-400 hover:text-white text-sm transition-colors"
                  >
                    Já tenho uma conta. Voltar ao login
                  </button>
                </div>
              }
            }
          </div>

          <p class="text-center text-white/40 text-sm mt-8">
            Sistema de Relatórios Automáticos © 2026
          </p>
        </div>
      }
    </div>
  `
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
        this.router.navigate(['/dashboard']);
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
    if (this.registerPassword.length < 6) {
      this.registerError.set('A senha deve ter pelo menos 6 caracteres');
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
