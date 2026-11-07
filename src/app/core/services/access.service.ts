import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap, catchError, map, shareReplay } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

const ROUTE_PRIORITY = ['ia', 'rodizio', 'usuarios', 'configuracoes'] as const;

const ROUTE_BY_TAB: Record<string, string> = {
  ia: '/ia',
  rodizio: '/rodizio',
  usuarios: '/usuarios',
  configuracoes: '/configuracoes',
};

@Injectable({ providedIn: 'root' })
export class AccessService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly apiUrl = environment.apiUrl;

  private readonly tabsSignal = signal<string[] | null>(null);
  private load$?: Observable<string[]>;

  readonly tabs = this.tabsSignal.asReadonly();

  clear(): void {
    this.tabsSignal.set(null);
    this.load$ = undefined;
  }

  ensureLoaded(): Observable<string[]> {
    const cached = this.tabsSignal();
    if (cached) return of(cached);
    if (this.load$) return this.load$;

    this.load$ = this.http
      .get<{ role: string; tabs: string[] }>(`${this.apiUrl}/settings/tabs/navigation`)
      .pipe(
        map((res) => res.tabs || []),
        catchError(() => {
          const role = this.auth.user()?.role;
          const defaults: Record<string, string[]> = {
            master: ['ia', 'rodizio', 'usuarios', 'configuracoes'],
            admin: ['rodizio', 'ia', 'usuarios'],
            manager: ['rodizio', 'ia'],
            user: ['ia'],
          };
          return of(defaults[role || 'user'] || defaults['user']);
        }),
        tap((tabs) => this.tabsSignal.set(tabs)),
        shareReplay(1),
      );

    return this.load$;
  }

  canAccess(requiredTabs: string[] | undefined | null): boolean {
    if (!requiredTabs?.length) return true;
    const role = this.auth.user()?.role;
    if (role === 'master') return true;

    const tabs = this.tabsSignal() || [];
    return requiredTabs.some((required) => this.matches(tabs, required));
  }

  firstAllowedRoute(): string {
    const tabs = this.tabsSignal() || [];
    if (this.auth.user()?.role === 'master') return '/ia';

    for (const key of ROUTE_PRIORITY) {
      if (this.matches(tabs, key)) {
        return ROUTE_BY_TAB[key] || '/ia';
      }
    }

    for (const tab of tabs) {
      if (ROUTE_BY_TAB[tab]) return ROUTE_BY_TAB[tab];
    }

    return '/perfil';
  }

  private matches(userTabs: string[], required: string): boolean {
    return userTabs.includes(required);
  }
}
