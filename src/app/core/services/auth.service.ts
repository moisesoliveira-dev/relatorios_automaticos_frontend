import { Injectable, signal, computed, Injector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, of, map } from 'rxjs';
import { User, AuthResponse, LoginRequest } from '../models/user.model';
import { environment } from '../../../environments/environment';
import { AccessService } from './access.service';

export interface CheckMasterResponse {
    hasMaster: boolean;
}

export interface RegisterMasterRequest {
    name: string;
    email: string;
    password: string;
}

export interface CompleteRegistrationRequest {
    token: string;
    name: string;
    password: string;
}

@Injectable({
    providedIn: 'root'
})
export class AuthService {
    private readonly apiUrl = environment.apiUrl + '/auth';
    private readonly TOKEN_KEY = 'access_token';
    private readonly USER_KEY = 'user';
    private readonly LAST_ACTIVITY_KEY = 'last_activity';
    private readonly INACTIVITY_TIMEOUT = 10 * 60 * 1000; // 10 minutos em ms

    private userSignal = signal<User | null>(null);
    private isLoadingSignal = signal(false);
    private inactivityTimer: any = null;
    private sessionExpiredSignal = signal(false);

    readonly sessionExpired = this.sessionExpiredSignal.asReadonly();

    readonly user = this.userSignal.asReadonly();
    readonly isLoading = this.isLoadingSignal.asReadonly();
    readonly isAuthenticated = computed(() => !!this.userSignal());
    readonly userInitials = computed(() => {
        const user = this.userSignal();
        if (!user) return '';
        return user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    });

    constructor(private http: HttpClient, private router: Router, private injector: Injector) {
        this.loadStoredUser();
        this.setupInactivityMonitoring();
    }

    private loadStoredUser(): void {
        const token = localStorage.getItem(this.TOKEN_KEY);
        const userJson = localStorage.getItem(this.USER_KEY);

        if (token && userJson) {
            if (this.isTokenExpired(token)) {
                // Token expirado: limpa sessão e sinaliza para o guard redirecionar com ?expired=1
                this.clearStorage();
                this.sessionExpiredSignal.set(true);
                return;
            }
            try {
                const user = JSON.parse(userJson);
                this.userSignal.set(user);
            } catch {
                this.clearStorage();
            }
        }
    }

    /** Decodifica o JWT localmente e verifica o campo `exp` sem fazer requisição ao servidor. */
    private isTokenExpired(token: string): boolean {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            if (!payload.exp) return false;
            // exp está em segundos; Date.now() em milissegundos
            return payload.exp * 1000 < Date.now();
        } catch {
            return true; // token malformado → tratar como expirado
        }
    }

    // Verifica se existe um master no sistema
    checkMaster(): Observable<CheckMasterResponse> {
        return this.http.get<CheckMasterResponse>(`${this.apiUrl}/check-master`);
    }

    // Registra o primeiro usuário (master)
    registerMaster(data: RegisterMasterRequest): Observable<AuthResponse> {
        this.isLoadingSignal.set(true);

        return this.http.post<AuthResponse>(`${this.apiUrl}/register-master`, data).pipe(
            tap(response => {
                localStorage.setItem(this.TOKEN_KEY, response.access_token);
                localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
                this.userSignal.set(response.user);
                this.isLoadingSignal.set(false);
            }),
            catchError(error => {
                this.isLoadingSignal.set(false);
                throw error;
            })
        );
    }

    // Completa o registro de um usuário convidado
    completeRegistration(data: CompleteRegistrationRequest): Observable<AuthResponse> {
        this.isLoadingSignal.set(true);

        return this.http.post<AuthResponse>(`${this.apiUrl}/complete-registration`, data).pipe(
            tap(response => {
                localStorage.setItem(this.TOKEN_KEY, response.access_token);
                localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
                this.userSignal.set(response.user);
                this.isLoadingSignal.set(false);
            }),
            catchError(error => {
                this.isLoadingSignal.set(false);
                throw error;
            })
        );
    }

    // Valida o código de convite
    async validateInviteCode(code: string): Promise<{ valid: boolean; email?: string; token?: string; message?: string }> {
        try {
            const response = await this.http.post<{ valid: boolean; email?: string; token?: string; message?: string }>(
                `${this.apiUrl}/validate-invite-code`,
                { code }
            ).toPromise();
            return response || { valid: false, message: 'Erro ao validar código' };
        } catch (error: any) {
            throw error;
        }
    }

    login(credentials: LoginRequest): Observable<AuthResponse> {
        this.isLoadingSignal.set(true);

        return this.http.post<AuthResponse>(`${this.apiUrl}/login`, credentials).pipe(
            tap(response => {
                localStorage.setItem(this.TOKEN_KEY, response.access_token);
                localStorage.setItem(this.USER_KEY, JSON.stringify(response.user));
                this.userSignal.set(response.user);
                this.injector.get(AccessService).clear();
                this.updateLastActivity();
                this.isLoadingSignal.set(false);
            }),
            catchError(error => {
                this.isLoadingSignal.set(false);
                throw error;
            })
        );
    }

    /** Limpa o estado de autenticação sem redirecionar (usado pelo interceptor). */
    clearAuthState(): void {
        this.clearInactivityTimer();
        this.clearStorage();
        this.userSignal.set(null);
        this.injector.get(AccessService).clear();
    }

    logout(): void {
        this.clearAuthState();
        this.router.navigate(['/login']);
    }

    getToken(): string | null {
        return localStorage.getItem(this.TOKEN_KEY);
    }

    validateToken(): Observable<boolean> {
        const token = this.getToken();
        if (!token) {
            return of(false);
        }

        return this.http.get<{ valid: boolean }>(`${this.apiUrl}/validate`).pipe(
            map(response => response.valid),
            catchError(() => {
                this.logout();
                return of(false);
            })
        );
    }

    getProfile(): Observable<User> {
        return this.http.get<User>(`${this.apiUrl}/profile`).pipe(
            tap(user => {
                this.userSignal.set(user);
                localStorage.setItem(this.USER_KEY, JSON.stringify(user));
            })
        );
    }

    private clearStorage(): void {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
        localStorage.removeItem(this.LAST_ACTIVITY_KEY);
    }

    // Gerenciamento de inatividade
    private setupInactivityMonitoring(): void {
        // Monitora visibilidade da página
        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', () => {
                if (document.hidden) {
                    // Página ficou invisível (usuário saiu da aba)
                    this.onPageHidden();
                } else {
                    // Página voltou a ficar visível
                    this.onPageVisible();
                }
            });
        }
    }

    private onPageHidden(): void {
        if (!this.isAuthenticated()) return;

        // Salva o timestamp de quando saiu
        this.updateLastActivity();
    }

    private onPageVisible(): void {
        if (!this.isAuthenticated()) return;

        // Verifica se passou o tempo de inatividade
        const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
        if (lastActivity) {
            const timePassed = Date.now() - parseInt(lastActivity, 10);
            if (timePassed > this.INACTIVITY_TIMEOUT) {
                this.expireSession();
            } else {
                // Ainda está dentro do tempo, atualiza a última atividade
                this.updateLastActivity();
            }
        }
    }

    private updateLastActivity(): void {
        localStorage.setItem(this.LAST_ACTIVITY_KEY, Date.now().toString());
    }

    private clearInactivityTimer(): void {
        if (this.inactivityTimer) {
            clearTimeout(this.inactivityTimer);
            this.inactivityTimer = null;
        }
    }

    // Método público para verificar inatividade (pode ser chamado pelo app component)
    checkInactivity(): void {
        if (!this.isAuthenticated()) return;

        const lastActivity = localStorage.getItem(this.LAST_ACTIVITY_KEY);
        if (lastActivity) {
            const timePassed = Date.now() - parseInt(lastActivity, 10);
            if (timePassed > this.INACTIVITY_TIMEOUT) {
                this.expireSession();
            }
        }
    }

    /** Encerra a sessão por expiração e redireciona para o login com aviso componentizado. */
    private expireSession(): void {
        this.clearInactivityTimer();
        this.clearStorage();
        this.userSignal.set(null);
        this.router.navigate(['/login'], { queryParams: { expired: '1' } });
    }

    // Atualiza o nome do usuário no localStorage e signal
    updateUserName(name: string): void {
        const currentUser = this.userSignal();
        if (currentUser) {
            const updatedUser = { ...currentUser, name };
            this.userSignal.set(updatedUser);
            localStorage.setItem(this.USER_KEY, JSON.stringify(updatedUser));
        }
    }

    // Atualiza os dados completos do usuário (usado após registro)
    setUser(user: User): void {
        this.userSignal.set(user);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    }
}
