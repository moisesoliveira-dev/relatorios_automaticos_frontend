import { Component, signal, computed, OnInit, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../core/services/auth.service';
import { ModalComponent } from '../components/modal.component';
import { filter } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  children?: { label: string; route: string }[];
}

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ModalComponent],
  template: `
    <div class="min-h-screen bg-slate-100 flex">
      <!-- Sidebar -->
      <aside
        class="fixed inset-y-0 left-0 z-50 flex flex-col bg-slate-900 transition-all duration-300"
        [class.w-60]="!sidebarCollapsed()"
        [class.w-[60px]]="sidebarCollapsed()"
      >
        <!-- Logo -->
        <div class="h-14 flex items-center border-b border-slate-800 px-4 gap-3 overflow-hidden">
          <svg class="w-6 h-6 text-white flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
          @if (!sidebarCollapsed()) {
            <span class="text-sm font-semibold text-white tracking-wide whitespace-nowrap">CMM System</span>
          }
        </div>

        <!-- Menu -->
        <nav class="flex-1 py-3 overflow-y-auto">
          <ul class="space-y-0.5 px-2">
            @for (item of menuItems(); track item.route) {
              <li>
                @if (item.children && item.children.length > 0) {
                  <!-- Expandable group -->
                  <button
                    (click)="toggleGroup(item.route)"
                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors text-sm"
                    [class.justify-center]="sidebarCollapsed()"
                    [class.bg-slate-800]="isGroupActive(item)"
                    [class.text-white]="isGroupActive(item)"
                    [class.text-slate-400]="!isGroupActive(item)"
                    [class.hover:bg-slate-800]="true"
                    [class.hover:text-slate-100]="true"
                    [title]="sidebarCollapsed() ? item.label : ''"
                  >
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="item.icon"/>
                    </svg>
                    @if (!sidebarCollapsed()) {
                      <span class="flex-1 text-left">{{ item.label }}</span>
                      <svg
                        class="w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200"
                        [class.rotate-180]="expandedGroups().has(item.route)"
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    }
                  </button>
                  @if (expandedGroups().has(item.route) && !sidebarCollapsed()) {
                    <ul class="mt-0.5 space-y-0.5 pl-3">
                      @for (child of item.children; track child.route) {
                        <li>
                          <a
                            [routerLink]="child.route"
                            routerLinkActive="bg-slate-700 text-white"
                            [routerLinkActiveOptions]="{ exact: true }"
                            class="flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors text-sm"
                          >
                            <span class="w-1 h-1 rounded-full bg-current flex-shrink-0"></span>
                            {{ child.label }}
                          </a>
                        </li>
                      }
                    </ul>
                  }
                } @else {
                  <!-- Regular link -->
                  <a
                    [routerLink]="item.route"
                    routerLinkActive="bg-slate-700 text-white"
                    [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors text-sm"
                    [class.justify-center]="sidebarCollapsed()"
                    [title]="sidebarCollapsed() ? item.label : ''"
                  >
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="item.icon"/>
                    </svg>
                    @if (!sidebarCollapsed()) {
                      <span>{{ item.label }}</span>
                    }
                  </a>
                }
              </li>
            }
          </ul>
        </nav>

        <!-- Toggle Button -->
        <button
          (click)="sidebarCollapsed.set(!sidebarCollapsed())"
          class="h-11 flex items-center justify-center border-t border-slate-800 text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          @if (sidebarCollapsed()) {
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"/>
            </svg>
          } @else {
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
            </svg>
          }
        </button>
      </aside>

      <!-- Main Content -->
      <div
        class="flex-1 flex flex-col transition-all duration-300"
        [class.ml-60]="!sidebarCollapsed()"
        [class.ml-[60px]]="sidebarCollapsed()"
      >
        <!-- Header -->
        <header class="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <h1 class="text-sm font-semibold text-slate-700">{{ pageTitle() }}</h1>

          <div class="flex items-center gap-2">
            <button
              (click)="toggleDarkMode()"
              class="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              [attr.aria-label]="isDarkMode() ? 'Desativar modo noturno' : 'Ativar modo noturno'"
              [title]="isDarkMode() ? 'Modo noturno ativo' : 'Ativar modo noturno'"
            >
              @if (isDarkMode()) {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 3v1m0 16v1m8.66-9H19.5m-15 0H3.34m14.02 6.36l-.7-.7m-9.32 0l-.7.7m10.02-10.02l-.7.7m-9.32 0l-.7-.7M12 7a5 5 0 100 10 5 5 0 000-10z"/>
                </svg>
                <span class="text-xs font-medium hidden sm:inline">Noturno</span>
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M20.354 15.354A9 9 0 118.646 3.646 7 7 0 1020.354 15.354z"/>
                </svg>
                <span class="text-xs font-medium hidden sm:inline">Claro</span>
              }
            </button>

            <!-- User Menu -->
            <div class="relative">
              <button
                (click)="userMenuOpen.set(!userMenuOpen())"
                class="flex items-center gap-2.5 px-2 py-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <div class="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center text-white text-xs font-medium">
                  {{ authService.userInitials() }}
                </div>
                <span class="text-sm font-medium text-slate-700 hidden sm:block">{{ authService.user()?.name }}</span>
                <svg class="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              @if (userMenuOpen()) {
                <div class="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                  <a routerLink="/perfil" (click)="userMenuOpen.set(false)" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                    <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
                    </svg>
                    Meu perfil
                  </a>
                  @if (hasTab('configuracoes')) {
                    <a routerLink="/configuracoes" (click)="userMenuOpen.set(false)" class="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50">
                      <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      Configurações
                    </a>
                  }
                  <div class="my-1 border-t border-slate-100"></div>
                  <button
                    (click)="logout()"
                    class="flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                    </svg>
                    Sair
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 p-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>

    <!-- Modal Global -->
    <app-modal></app-modal>
  `
})
export class LayoutComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environment.apiUrl;
  private readonly THEME_KEY = 'theme_mode';

  sidebarCollapsed = signal(false);
  userMenuOpen = signal(false);
  pageTitle = signal('Dashboard');
  isDarkMode = signal(false);

  allowedTabs = signal<string[]>([]);

  private allMenuItems: MenuItem[] = [
    {
      label: 'Dashboard',
      icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      route: '/dashboard',
    },
    {
      label: 'Relatórios',
      icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      route: '/reports',
    },
    {
      label: 'Jobs',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      route: '/jobs',
    },
    {
      label: 'Gosac / Pontta',
      icon: 'M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1',
      route: '/gosac-pontta',
      children: [
        { label: 'Grupos', route: '/gosac-pontta/grupos' },
        { label: 'Pagamento Montador', route: '/gosac-pontta/pagamento-montador' },
      ],
    },
    {
      label: 'Usuários',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      route: '/usuarios',
    },
    {
      label: 'Configurações',
      icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
      route: '/configuracoes',
    },
  ];

  menuItems = computed(() => {
    const allowed = new Set(this.allowedTabs());
    if (allowed.size === 0) return this.allMenuItems;
    return this.allMenuItems.filter((item) => allowed.has(this.menuKeyFromRoute(item.route)));
  });

  expandedGroups = signal<Set<string>>(new Set());

  constructor(public authService: AuthService, private router: Router) {
    // Auto-expand group when a child route is active
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const url = this.router.url;
      for (const item of this.menuItems()) {
        if (item.children?.some(c => url.startsWith(c.route))) {
          this.expandedGroups.update(s => { const n = new Set(s); n.add(item.route); return n; });
        }
      }

      this.redirectIfTabForbidden(url);
    });
    // Initial check
    const url = this.router.url;
    for (const item of this.menuItems()) {
      if (item.children?.some(c => url.startsWith(c.route))) {
        this.expandedGroups.update(s => { const n = new Set(s); n.add(item.route); return n; });
      }
    }

    this.redirectIfTabForbidden(url);
  }

  ngOnInit(): void {
    this.initializeTheme();
    this.loadNavigationTabs();
  }

  private initializeTheme(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const savedTheme = localStorage.getItem(this.THEME_KEY);
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = savedTheme ? savedTheme === 'dark' : !!prefersDark;

    this.isDarkMode.set(shouldUseDark);
    document.documentElement.classList.toggle('dark', shouldUseDark);
  }

  toggleDarkMode(): void {
    if (typeof document === 'undefined') return;

    const nextValue = !this.isDarkMode();
    this.isDarkMode.set(nextValue);
    localStorage.setItem(this.THEME_KEY, nextValue ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', nextValue);
  }

  private loadNavigationTabs(): void {
    this.http.get<{ role: string; tabs: string[] }>(`${this.apiUrl}/settings/tabs/navigation`).subscribe({
      next: (res) => {
        this.allowedTabs.set(res.tabs || []);
        this.redirectIfTabForbidden(this.router.url);
      },
      error: () => {
        // Fallback por role local caso a API esteja indisponível
        const role = this.authService.user()?.role;
        const defaults: Record<string, string[]> = {
          master: ['dashboard', 'reports', 'jobs', 'gosac-pontta', 'usuarios', 'configuracoes'],
          admin: ['dashboard', 'reports', 'jobs', 'gosac-pontta', 'usuarios'],
          manager: ['dashboard', 'reports', 'gosac-pontta'],
          user: ['dashboard', 'reports'],
        };
        this.allowedTabs.set(defaults[role || 'user'] || defaults['user']);
        this.redirectIfTabForbidden(this.router.url);
      },
    });
  }

  private menuKeyFromRoute(route: string): string {
    return route.replace(/^\//, '').split('/')[0] || 'dashboard';
  }

  private isCurrentRouteAllowed(url: string): boolean {
    const allowed = new Set(this.allowedTabs());
    if (allowed.size === 0) return true;
    const key = this.menuKeyFromRoute(url);
    return allowed.has(key);
  }

  private redirectIfTabForbidden(url: string): void {
    if (this.isCurrentRouteAllowed(url)) return;
    const firstAllowed = this.menuItems()[0]?.route || '/dashboard';
    this.router.navigateByUrl(firstAllowed);
  }

  hasTab(tabKey: string): boolean {
    const allowed = new Set(this.allowedTabs());
    if (allowed.size === 0) return true;
    return allowed.has(tabKey);
  }

  toggleGroup(route: string): void {
    this.expandedGroups.update(s => {
      const n = new Set(s);
      n.has(route) ? n.delete(route) : n.add(route);
      return n;
    });
  }

  isGroupActive(item: MenuItem): boolean {
    const url = this.router.url;
    return !!item.children?.some(c => url.startsWith(c.route));
  }

  logout() {
    this.authService.logout();
  }
}
