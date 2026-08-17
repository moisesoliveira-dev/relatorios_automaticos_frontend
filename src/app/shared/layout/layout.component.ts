import { Component, signal, computed, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { AccessService } from '../../core/services/access.service';
import { ModalComponent } from '../components/modal.component';
import { filter } from 'rxjs/operators';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  children?: { label: string; route: string }[];
}

const TITLE_MAP: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/reports': 'Relatórios',
  '/reports/ocorrencias': 'Ocorrências',
  '/jobs': 'Jobs',
  '/usuarios': 'Usuários',
  '/perfil': 'Meu perfil',
  '/configuracoes': 'Configurações',
  '/gosac-pontta': 'Gosac / Pontta',
  '/gosac-pontta/grupos': 'Grupos',
  '/gosac-pontta/rodizio': 'Rodízio GOSAC',
  '/gosac-pontta/rodizio-pontta': 'Rodízio Pontta',
  '/gosac-pontta/pagamento-montador': 'Pagamento Montador',
  '/gosac-pontta/pcp-operacional': 'PCP Operacional',
  '/gosac-pontta/webhooks': 'Webhooks',
};

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ModalComponent],
  template: `
    <div class="min-h-screen flex" style="background: var(--cmm-surface); color: var(--cmm-ink);">
      @if (mobileOpen()) {
        <div
          class="fixed inset-0 z-40 bg-black/45 md:hidden animate-fadeIn"
          (click)="mobileOpen.set(false)"
          aria-hidden="true"
        ></div>
      }

      <aside
        class="fixed inset-y-0 left-0 z-50 flex flex-col transition-transform duration-200 ease-out"
        style="background: var(--cmm-sidebar); border-right: 1px solid var(--cmm-sidebar-border);"
        [class.w-60]="!sidebarCollapsed() || mobileOpen()"
        [class.w-[60px]]="sidebarCollapsed() && !mobileOpen()"
        [class.-translate-x-full]="!mobileOpen() && isMobile()"
        [class.translate-x-0]="mobileOpen() || !isMobile()"
      >
        <div
          class="h-14 flex items-center px-4 gap-3 overflow-hidden"
          style="border-bottom: 1px solid var(--cmm-sidebar-border);"
        >
          <div
            class="w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 text-xs font-semibold"
            style="background: var(--cmm-accent); color: #042f2e;"
          >
            CM
          </div>
          @if (!sidebarCollapsed() || mobileOpen()) {
            <div class="min-w-0">
              <div class="text-sm font-semibold text-white tracking-wide truncate">CMM System</div>
              <div class="text-[10px] uppercase tracking-[0.14em]" style="color: var(--cmm-sidebar-muted);">Ops console</div>
            </div>
          }
        </div>

        <nav class="flex-1 py-3 overflow-y-auto">
          <ul class="space-y-0.5 px-2">
            @for (item of menuItems(); track item.route) {
              <li>
                @if (item.children && item.children.length > 0) {
                  <button
                    type="button"
                    (click)="toggleGroup(item.route)"
                    class="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors"
                    [class.justify-center]="sidebarCollapsed() && !mobileOpen()"
                    [style.background]="isGroupActive(item) ? 'rgba(45,212,191,0.12)' : 'transparent'"
                    [style.color]="isGroupActive(item) ? '#e7eef6' : 'var(--cmm-sidebar-muted)'"
                    [title]="sidebarCollapsed() && !mobileOpen() ? item.label : ''"
                  >
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="item.icon"/>
                    </svg>
                    @if (!sidebarCollapsed() || mobileOpen()) {
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
                  @if (expandedGroups().has(item.route) && (!sidebarCollapsed() || mobileOpen())) {
                    <ul class="mt-0.5 space-y-0.5 pl-3">
                      @for (child of item.children; track child.route) {
                        <li>
                          <a
                            [routerLink]="child.route"
                            routerLinkActive="nav-active"
                            [routerLinkActiveOptions]="{ exact: true }"
                            (click)="closeMobile()"
                            class="flex items-center gap-2.5 pl-3 pr-3 py-2 rounded-md text-sm transition-colors"
                            style="color: var(--cmm-sidebar-muted);"
                          >
                            <span class="w-1 h-1 rounded-full bg-current flex-shrink-0"></span>
                            {{ child.label }}
                          </a>
                        </li>
                      }
                    </ul>
                  }
                } @else {
                  <a
                    [routerLink]="item.route"
                    routerLinkActive="nav-active"
                    [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                    (click)="closeMobile()"
                    class="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors"
                    style="color: var(--cmm-sidebar-muted);"
                    [class.justify-center]="sidebarCollapsed() && !mobileOpen()"
                    [title]="sidebarCollapsed() && !mobileOpen() ? item.label : ''"
                  >
                    <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="item.icon"/>
                    </svg>
                    @if (!sidebarCollapsed() || mobileOpen()) {
                      <span>{{ item.label }}</span>
                    }
                  </a>
                }
              </li>
            }
          </ul>
        </nav>

        <button
          type="button"
          (click)="toggleSidebar()"
          class="hidden md:flex h-11 items-center justify-center transition-colors"
          style="border-top: 1px solid var(--cmm-sidebar-border); color: var(--cmm-sidebar-muted);"
          [attr.aria-label]="sidebarCollapsed() ? 'Expandir menu' : 'Recolher menu'"
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

      <div
        class="flex-1 flex flex-col min-w-0 transition-[margin] duration-200 ease-out"
        [class.md:ml-60]="!sidebarCollapsed()"
        [class.md:ml-[60px]]="sidebarCollapsed()"
      >
        <header
          class="h-14 flex items-center justify-between gap-3 px-4 sm:px-6 sticky top-0 z-30"
          style="background: color-mix(in srgb, var(--cmm-panel) 92%, transparent); border-bottom: 1px solid var(--cmm-border); backdrop-filter: blur(8px);"
        >
          <div class="flex items-center gap-3 min-w-0">
            <button
              type="button"
              class="btn btn-ghost btn-sm md:hidden px-2"
              (click)="mobileOpen.set(true)"
              aria-label="Abrir menu"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
              </svg>
            </button>
            <div class="min-w-0">
              <p class="text-[10px] uppercase tracking-[0.16em] truncate" style="color: var(--cmm-muted);">CMM</p>
              <h1 class="text-sm font-semibold truncate" style="color: var(--cmm-ink);">{{ pageTitle() }}</h1>
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="toggleDarkMode()"
              class="btn btn-secondary btn-sm"
              [attr.aria-label]="isDarkMode() ? 'Desativar modo noturno' : 'Ativar modo noturno'"
              [title]="isDarkMode() ? 'Modo noturno ativo' : 'Ativar modo noturno'"
            >
              @if (isDarkMode()) {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 3v1m0 16v1m8.66-9H19.5m-15 0H3.34m14.02 6.36l-.7-.7m-9.32 0l-.7.7m10.02-10.02l-.7.7m-9.32 0l-.7-.7M12 7a5 5 0 100 10 5 5 0 000-10z"/>
                </svg>
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M20.354 15.354A9 9 0 118.646 3.646 7 7 0 1020.354 15.354z"/>
                </svg>
              }
            </button>

            <div class="relative" data-user-menu>
              <button
                type="button"
                (click)="userMenuOpen.set(!userMenuOpen())"
                class="flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors"
                style="color: var(--cmm-ink);"
                [attr.aria-expanded]="userMenuOpen()"
              >
                <div
                  class="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                  style="background: var(--cmm-ink); color: var(--cmm-panel);"
                >
                  {{ authService.userInitials() }}
                </div>
                <span class="text-sm font-medium hidden sm:block">{{ authService.user()?.name }}</span>
                <svg class="w-3.5 h-3.5 hidden sm:block" style="color: var(--cmm-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              @if (userMenuOpen()) {
                <div
                  class="absolute right-0 mt-1 w-52 rounded-lg py-1 z-50 animate-slideUp"
                  style="background: var(--cmm-panel); border: 1px solid var(--cmm-border); box-shadow: 0 12px 32px rgba(15, 26, 39, 0.14);"
                >
                  <a
                    routerLink="/perfil"
                    (click)="userMenuOpen.set(false)"
                    class="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                    style="color: var(--cmm-ink);"
                  >
                    Meu perfil
                  </a>
                  @if (hasTab('configuracoes')) {
                    <a
                      routerLink="/configuracoes"
                      (click)="userMenuOpen.set(false)"
                      class="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                      style="color: var(--cmm-ink);"
                    >
                      Configurações
                    </a>
                  }
                  <div class="my-1" style="border-top: 1px solid var(--cmm-border);"></div>
                  <button
                    type="button"
                    (click)="logout()"
                    class="flex items-center gap-2.5 px-4 py-2.5 text-sm w-full text-left"
                    style="color: var(--cmm-danger);"
                  >
                    Sair
                  </button>
                </div>
              }
            </div>
          </div>
        </header>

        <main class="flex-1 p-4 sm:p-6">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>

    <app-modal></app-modal>
  `,
  styles: [`
    a.nav-active {
      background: rgba(45, 212, 191, 0.14) !important;
      color: #e7eef6 !important;
    }
    a:hover:not(.nav-active) {
      background: rgba(255, 255, 255, 0.04);
      color: #e7eef6;
    }
  `]
})
export class LayoutComponent implements OnInit, OnDestroy {
  private readonly accessService = inject(AccessService);
  private readonly THEME_KEY = 'theme_mode';
  private mediaQuery?: MediaQueryList;
  private onMediaChange?: () => void;

  sidebarCollapsed = signal(false);
  mobileOpen = signal(false);
  isMobile = signal(false);
  userMenuOpen = signal(false);
  pageTitle = signal('Dashboard');
  isDarkMode = signal(false);
  allowedTabs = signal<string[]>([]);
  expandedGroups = signal<Set<string>>(new Set());

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
        { label: 'Rodízio GOSAC', route: '/gosac-pontta/rodizio' },
        { label: 'Rodízio Pontta', route: '/gosac-pontta/rodizio-pontta' },
        { label: 'Pagamento Montador', route: '/gosac-pontta/pagamento-montador' },
        { label: 'PCP Operacional', route: '/gosac-pontta/pcp-operacional' },
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

    return this.allMenuItems
      .map((item) => {
        if (!item.children?.length) {
          return allowed.has(this.menuKeyFromRoute(item.route)) ? item : null;
        }

        const parentKey = this.menuKeyFromRoute(item.route);
        const filteredChildren = item.children.filter((child) => {
          const childKey = child.route.replace(/^\//, '');
          return allowed.has(childKey) || allowed.has(parentKey);
        });

        // Se só o pai está liberado sem filhos específicos, mostra todos
        const hasSpecificChild = item.children.some((c) => allowed.has(c.route.replace(/^\//, '')));
        const children = hasSpecificChild
          ? item.children.filter((c) => allowed.has(c.route.replace(/^\//, '')))
          : (allowed.has(parentKey) ? item.children : filteredChildren);

        if (!allowed.has(parentKey) && children.length === 0) return null;
        return { ...item, children };
      })
      .filter((item): item is MenuItem => !!item);
  });

  constructor(public authService: AuthService, private router: Router) {
    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      this.syncFromUrl(this.router.url);
    });
    this.syncFromUrl(this.router.url);
  }

  ngOnInit(): void {
    this.initializeTheme();
    this.loadNavigationTabs();
    this.bindViewport();
  }

  ngOnDestroy(): void {
    if (this.mediaQuery && this.onMediaChange) {
      this.mediaQuery.removeEventListener('change', this.onMediaChange);
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('[data-user-menu]')) {
      this.userMenuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.userMenuOpen.set(false);
    this.mobileOpen.set(false);
  }

  private bindViewport(): void {
    if (typeof window === 'undefined') return;
    this.mediaQuery = window.matchMedia('(max-width: 767px)');
    this.onMediaChange = () => {
      const mobile = this.mediaQuery!.matches;
      this.isMobile.set(mobile);
      if (!mobile) this.mobileOpen.set(false);
    };
    this.onMediaChange();
    this.mediaQuery.addEventListener('change', this.onMediaChange);
  }

  private syncFromUrl(url: string): void {
    const path = url.split('?')[0];
    this.pageTitle.set(this.resolveTitle(path));

    for (const item of this.menuItems()) {
      if (item.children?.some(c => path.startsWith(c.route))) {
        this.expandedGroups.update(s => {
          const n = new Set(s);
          n.add(item.route);
          return n;
        });
      }
    }

    this.redirectIfTabForbidden(path);
  }

  private resolveTitle(path: string): string {
    if (TITLE_MAP[path]) return TITLE_MAP[path];
    const match = Object.keys(TITLE_MAP)
      .sort((a, b) => b.length - a.length)
      .find((key) => path.startsWith(key));
    return match ? TITLE_MAP[match] : 'CMM System';
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

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  closeMobile(): void {
    this.mobileOpen.set(false);
  }

  private loadNavigationTabs(): void {
    this.accessService.ensureLoaded().subscribe({
      next: (tabs) => {
        this.allowedTabs.set(tabs || []);
        this.redirectIfTabForbidden(this.router.url.split('?')[0]);
      },
    });
  }

  private menuKeyFromRoute(route: string): string {
    return route.replace(/^\//, '').split('/')[0] || 'dashboard';
  }

  private isCurrentRouteAllowed(url: string): boolean {
    const allowed = new Set(this.allowedTabs());
    if (allowed.size === 0) return true;
    const path = url.replace(/^\//, '').split('?')[0];
    if (path.startsWith('perfil')) return true;
    if (allowed.has(path)) return true;
    const top = path.split('/')[0] || 'dashboard';
    if (allowed.has(top)) {
      // Se há filhos específicos, exige match do filho
      const hasSpecificChild = [...allowed].some((k) => k.startsWith(`${top}/`));
      if (!hasSpecificChild) return true;
      return [...allowed].some((k) => path === k || path.startsWith(`${k}/`));
    }
    return false;
  }

  private redirectIfTabForbidden(url: string): void {
    if (this.isCurrentRouteAllowed(url)) return;
    this.router.navigateByUrl(this.accessService.firstAllowedRoute());
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
    const url = this.router.url.split('?')[0];
    return !!item.children?.some(c => url.startsWith(c.route));
  }

  logout() {
    this.userMenuOpen.set(false);
    this.authService.logout();
  }
}
