import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { animate } from 'motion';
import { AccessService } from '../../core/services/access.service';
import { AuthService } from '../../core/services/auth.service';
import { MotionService } from '../../core/motion/motion.service';
import { ModalComponent } from '../components/modal.component';
import { ToastHostComponent } from '../components/toast-host.component';
import { IconComponent } from '../components/icon.component';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  children?: { label: string; route: string }[];
}

const TITLE_MAP: Record<string, string> = {
  '/ia': 'IA',
  '/usuarios': 'Usuários',
  '/perfil': 'Meu perfil',
  '/configuracoes': 'Configurações',
  '/rodizio': 'Rodízio',
};

const SIDEBAR_KEY = 'sidebar_collapsed';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ModalComponent, ToastHostComponent, IconComponent],
  template: `
    <a href="#conteudo" class="skip-link" (click)="focusMain($event)">Pular para o conteúdo</a>

    <div class="min-h-screen flex" style="color: var(--cmm-ink);">
      @if (mobileOpen()) {
        <div class="fixed inset-0 z-40 lg:hidden animate-fadeIn" style="background: rgba(10,8,5,0.6); backdrop-filter: blur(4px);" (click)="mobileOpen.set(false)" aria-hidden="true"></div>
      }

      <aside
        class="sidebar fixed inset-y-0 left-0 z-50 flex flex-col"
        [class.sidebar-collapsed]="sidebarCollapsed() && !mobileOpen()"
        [class.sidebar-hidden]="!mobileOpen() && isMobile()"
        aria-label="Menu principal"
      >
        <div class="sidebar-brand">
          <div class="brand-mark" aria-hidden="true"><span>CM</span></div>
          @if (!sidebarCollapsed() || mobileOpen()) {
            <div class="min-w-0 brand-text">
              <div class="font-display text-[15px] font-bold tracking-tight text-white truncate">CMM System</div>
              <div class="text-[10px] uppercase tracking-[0.22em]" style="color: var(--cmm-sidebar-muted);">Ops console</div>
            </div>
          }
        </div>

        <nav class="sidebar-nav flex-1 overflow-y-auto" #nav aria-label="Seções">
          <div class="nav-pill" #pill aria-hidden="true"></div>
          <ul class="space-y-1 px-3 relative">
            @for (item of menuItems(); track item.route; let i = $index) {
              <li class="nav-enter" [style.--i]="i">
                @if (item.children && item.children.length > 0) {
                  <button
                    type="button"
                    (click)="toggleGroup(item.route)"
                    class="nav-link w-full"
                    [class.nav-group-active]="isGroupActive(item)"
                    [class.justify-center]="sidebarCollapsed() && !mobileOpen()"
                    [attr.aria-expanded]="expandedGroups().has(item.route)"
                    [attr.aria-label]="item.label"
                    [title]="sidebarCollapsed() && !mobileOpen() ? item.label : ''"
                  >
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="item.icon"/>
                    </svg>
                    @if (!sidebarCollapsed() || mobileOpen()) {
                      <span class="flex-1 text-left">{{ item.label }}</span>
                      <svg class="w-3.5 h-3.5 flex-shrink-0 chev" [class.chev-open]="expandedGroups().has(item.route)" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                      </svg>
                    }
                  </button>
                  @if (expandedGroups().has(item.route) && (!sidebarCollapsed() || mobileOpen())) {
                    <ul class="mt-1 space-y-0.5 ml-4 pl-3 sub-list">
                      @for (child of item.children; track child.route; let c = $index) {
                        <li class="nav-enter" [style.--i]="c">
                          <a
                            [routerLink]="child.route"
                            routerLinkActive="nav-active"
                            [routerLinkActiveOptions]="{ exact: true }"
                            (isActiveChange)="schedulePill()"
                            (click)="closeMobile()"
                            class="nav-link nav-child"
                          >
                            <span class="nav-dot"></span>
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
                    [routerLinkActiveOptions]="{ exact: false }"
                    (isActiveChange)="schedulePill()"
                    (click)="closeMobile()"
                    class="nav-link"
                    [class.justify-center]="sidebarCollapsed() && !mobileOpen()"
                    [attr.aria-label]="item.label"
                    [title]="sidebarCollapsed() && !mobileOpen() ? item.label : ''"
                  >
                    <svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
          class="sidebar-toggle hidden lg:flex"
          [attr.aria-label]="sidebarCollapsed() ? 'Expandir menu' : 'Recolher menu'"
          [attr.aria-pressed]="sidebarCollapsed()"
        >
          <svg class="w-4 h-4 toggle-arrow" [class.toggle-arrow-flip]="sidebarCollapsed()" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"/>
          </svg>
          @if (!sidebarCollapsed()) { <span class="text-xs font-medium">Recolher</span> }
        </button>
      </aside>

      <div class="flex-1 flex flex-col min-w-0 main-shell" [class.main-shell-collapsed]="sidebarCollapsed()">
        <header class="topbar sticky top-0 z-30">
          <div class="flex items-center gap-3 min-w-0">
            <button type="button" class="icon-btn lg:hidden" (click)="mobileOpen.set(true)" aria-label="Abrir menu" [attr.aria-expanded]="mobileOpen()">
              <app-icon name="menu" [size]="20" />
            </button>
            <div class="min-w-0 overflow-hidden">
              @for (t of [pageTitle()]; track t) {
                <h1 class="topbar-title font-display text-lg font-bold tracking-tight truncate" style="color: var(--cmm-ink);">{{ t }}</h1>
              }
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              (click)="toggleDarkMode($event)"
              class="icon-btn icon-btn-outline theme-btn"
              [attr.aria-label]="isDarkMode() ? 'Mudar para o tema claro' : 'Mudar para o tema escuro'"
              [attr.aria-pressed]="isDarkMode()"
              [title]="isDarkMode() ? 'Tema escuro ativo' : 'Tema claro ativo'"
            >
              <span class="theme-icon"><app-icon [name]="isDarkMode() ? 'sol' : 'lua'" [size]="17" /></span>
            </button>

            <div class="relative" data-user-menu>
              <button
                type="button"
                (click)="userMenuOpen.set(!userMenuOpen())"
                class="user-btn"
                [attr.aria-expanded]="userMenuOpen()"
                aria-haspopup="menu"
                aria-label="Menu do usuário"
              >
                <span class="avatar" aria-hidden="true">{{ authService.userInitials() }}</span>
                <span class="text-sm font-semibold hidden sm:block">{{ authService.user()?.name }}</span>
                <svg class="w-3.5 h-3.5 hidden sm:block chev" [class.chev-open]="userMenuOpen()" style="color: var(--cmm-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>

              @if (userMenuOpen()) {
                <div class="user-menu" role="menu">
                  <a routerLink="/perfil" role="menuitem" (click)="userMenuOpen.set(false)" class="user-item">Meu perfil</a>
                  @if (hasTab('configuracoes')) {
                    <a routerLink="/configuracoes" role="menuitem" (click)="userMenuOpen.set(false)" class="user-item">Configurações</a>
                  }
                  <div class="my-1" style="border-top: 1px solid var(--cmm-border);"></div>
                  <button type="button" role="menuitemcheckbox" [attr.aria-checked]="!motionOn()" (click)="toggleMotion()" class="user-item w-full justify-between">
                    <span>Reduzir animações</span>
                    <span class="switch" [class.switch-on]="!motionOn()" aria-hidden="true"><span class="switch-knob"></span></span>
                  </button>
                  <div class="my-1" style="border-top: 1px solid var(--cmm-border);"></div>
                  <button type="button" role="menuitem" (click)="logout()" class="user-item w-full" style="color: var(--cmm-danger);">Sair</button>
                </div>
              }
            </div>
          </div>
        </header>

        <main id="conteudo" class="flex-1 p-4 sm:p-8" tabindex="-1" #main>
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>

    <app-modal></app-modal>
    <app-toast-host></app-toast-host>
  `,
  styles: [`
    :host { display: block; }

    /* ——— Menu lateral ——— */
    .sidebar {
      width: 16.5rem;
      background: var(--cmm-sidebar);
      border-right: 1px solid var(--cmm-sidebar-border);
      transition: width 520ms var(--ease-out-expo), transform 520ms var(--ease-out-expo);
      overflow: hidden;
    }
    .sidebar::before {
      content: ""; position: absolute; inset: 0; pointer-events: none;
      background:
        radial-gradient(220px 220px at 0% 0%, color-mix(in srgb, var(--cmm-accent) 22%, transparent), transparent 70%),
        radial-gradient(240px 240px at 100% 100%, color-mix(in srgb, var(--cmm-accent-2) 10%, transparent), transparent 70%);
    }
    .sidebar > * { position: relative; }
    .sidebar-collapsed { width: 4.75rem; }
    .sidebar-hidden { transform: translateX(-100%); }

    .sidebar-brand {
      height: 4.25rem; display: flex; align-items: center; gap: 0.85rem; padding: 0 1.1rem;
      border-bottom: 1px solid var(--cmm-sidebar-border); overflow: hidden; flex-shrink: 0;
    }
    .brand-mark {
      position: relative; flex-shrink: 0; width: 2.25rem; height: 2.25rem; border-radius: 0.7rem;
      display: grid; place-items: center; font-weight: 800; font-size: 0.8rem; letter-spacing: -0.02em;
      color: var(--cmm-accent-ink);
      background: linear-gradient(135deg, var(--cmm-accent), var(--cmm-accent-2));
      box-shadow: 0 8px 24px -8px var(--cmm-accent);
      transition: transform 600ms var(--ease-out-expo);
    }
    .brand-mark::after {
      content: ""; position: absolute; inset: -4px; border-radius: 0.95rem;
      border: 1.5px solid transparent;
      background: conic-gradient(from 0deg, var(--cmm-accent), transparent 40%, var(--cmm-accent-2), transparent 80%, var(--cmm-accent)) border-box;
      -webkit-mask: linear-gradient(#000 0 0) padding-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor; mask-composite: exclude;
      animation: spin 6s linear infinite;
    }
    .sidebar-brand:hover .brand-mark { transform: rotate(-12deg) scale(1.1); }
    .brand-text { animation: cmm-fade-in 500ms var(--ease-out-expo) both; }

    .sidebar-nav { position: relative; padding: 1rem 0; }
    .nav-pill {
      position: absolute; left: 0.75rem; right: 0.75rem; top: 0; height: 0; opacity: 0; pointer-events: none;
      border-radius: 0.8rem;
      background: linear-gradient(100deg, color-mix(in srgb, var(--cmm-accent) 30%, transparent), color-mix(in srgb, var(--cmm-accent-2) 10%, transparent));
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--cmm-accent) 45%, transparent), 0 10px 30px -12px var(--cmm-accent);
    }
    .nav-pill::before {
      content: ""; position: absolute; left: -0.75rem; top: 22%; bottom: 22%; width: 4px; border-radius: 0 4px 4px 0;
      background: var(--cmm-accent); box-shadow: 0 0 14px var(--cmm-accent);
    }

    .nav-enter { animation: nav-in 700ms var(--ease-out-expo) both; animation-delay: calc(var(--i, 0) * 70ms + 120ms); }
    @keyframes nav-in { from { opacity: 0; transform: translateX(-28px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }

    .nav-link {
      position: relative; display: flex; align-items: center; gap: 0.8rem; padding: 0.7rem 0.85rem;
      border-radius: 0.8rem; font-size: 0.875rem; font-weight: 500; color: var(--cmm-sidebar-muted);
      background: transparent; border: none; cursor: pointer; text-decoration: none; white-space: nowrap;
      transition: color 250ms ease-out, background-color 250ms ease-out, transform 400ms var(--ease-out-expo);
    }
    .nav-link:hover { color: #f6f1e7; background: rgba(255,255,255,0.045); transform: translateX(4px); }
    .nav-link:hover .nav-icon { transform: scale(1.18) rotate(-6deg); color: var(--cmm-accent); }
    .nav-icon { width: 1.15rem; height: 1.15rem; flex-shrink: 0; transition: transform 400ms var(--ease-out-expo), color 250ms; }
    .nav-link.nav-active, .nav-link.nav-group-active { color: #fff; }
    .nav-link.nav-active .nav-icon, .nav-link.nav-group-active .nav-icon { color: var(--cmm-accent); }
    .nav-child { padding: 0.5rem 0.75rem; font-size: 0.8125rem; gap: 0.6rem; }
    .nav-dot { width: 5px; height: 5px; border-radius: 99px; background: currentColor; opacity: 0.5; transition: transform 300ms var(--ease-out-expo), opacity 200ms; }
    .nav-child:hover .nav-dot, .nav-child.nav-active .nav-dot { transform: scale(1.8); opacity: 1; background: var(--cmm-accent); }
    .sub-list { border-left: 1px solid var(--cmm-sidebar-border); }
    .chev { transition: transform 400ms var(--ease-out-expo); }
    .chev-open { transform: rotate(180deg); }

    .sidebar-toggle {
      height: 3.1rem; align-items: center; justify-content: center; gap: 0.5rem; color: var(--cmm-sidebar-muted);
      border: none; border-top: 1px solid var(--cmm-sidebar-border); background: transparent; cursor: pointer;
      transition: color 200ms, background-color 200ms;
    }
    .sidebar-toggle:hover { color: #fff; background: rgba(255,255,255,0.04); }
    .toggle-arrow { transition: transform 500ms var(--ease-out-expo); }
    .toggle-arrow-flip { transform: rotate(180deg); }

    /* ——— Área principal ——— */
    .main-shell { transition: margin 520ms var(--ease-out-expo); }
    @media (min-width: 1024px) {
      .main-shell { margin-left: 16.5rem; }
      .main-shell-collapsed { margin-left: 4.75rem; }
    }
    main:focus { outline: none; }

    .topbar {
      height: 4.25rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem;
      padding: 0 1rem;
      background: color-mix(in srgb, var(--cmm-surface) 72%, transparent);
      border-bottom: 1px solid color-mix(in srgb, var(--cmm-border) 80%, transparent);
      backdrop-filter: blur(14px) saturate(1.4);
    }
    @media (min-width: 640px) { .topbar { padding: 0 2rem; } }
    .topbar-title { animation: title-in 700ms var(--ease-out-expo) both; }
    @keyframes title-in { from { opacity: 0; transform: translateY(100%) rotateX(-70deg); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }

    .theme-btn:hover .theme-icon { transform: rotate(180deg) scale(1.15); }
    .theme-icon { display: inline-flex; transition: transform 700ms var(--ease-out-expo); }

    .user-btn {
      display: flex; align-items: center; gap: 0.6rem; padding: 0.3rem 0.5rem 0.3rem 0.3rem;
      border-radius: 999px; border: 1px solid transparent; background: transparent; cursor: pointer; color: var(--cmm-ink);
      transition: background-color 220ms, border-color 220ms, transform 300ms var(--ease-out-expo);
    }
    .user-btn:hover { background: var(--cmm-panel); border-color: var(--cmm-border); }
    .user-btn:active { transform: scale(0.96); }
    .avatar {
      width: 2rem; height: 2rem; border-radius: 99px; display: grid; place-items: center;
      font-size: 0.75rem; font-weight: 800; color: var(--cmm-accent-ink);
      background: linear-gradient(135deg, var(--cmm-accent), var(--cmm-accent-2));
    }
    .user-menu {
      position: absolute; right: 0; margin-top: 0.5rem; width: 15rem; padding: 0.35rem; z-index: 50;
      background: var(--cmm-panel); border: 1px solid var(--cmm-border); border-radius: 1rem;
      box-shadow: var(--cmm-shadow-lift); transform-origin: top right;
      animation: menu-in 420ms var(--ease-out-expo) both;
    }
    @keyframes menu-in { from { opacity: 0; transform: translateY(-10px) scale(0.92); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
    .user-item {
      display: flex; align-items: center; padding: 0.65rem 0.8rem; border-radius: 0.65rem; font-size: 0.875rem; font-weight: 500;
      color: var(--cmm-ink); background: transparent; border: none; cursor: pointer; text-decoration: none; text-align: left;
      transition: background-color 180ms, transform 300ms var(--ease-out-expo);
    }
    .user-item:hover { background: color-mix(in srgb, var(--cmm-accent) 10%, transparent); transform: translateX(3px); }
    .user-item .switch { width: 2.4rem; height: 1.35rem; } .user-item .switch-knob { width: 1.05rem; height: 1.05rem; top: 2px; left: 2px; } .user-item .switch-on .switch-knob { transform: translateX(1.05rem); }
  `]
})
export class LayoutComponent implements OnInit, AfterViewInit, OnDestroy {
  private readonly accessService = inject(AccessService);
  private readonly motion = inject(MotionService);
  private readonly titleService = inject(Title);
  private readonly THEME_KEY = 'theme_mode';
  private mediaQuery?: MediaQueryList;
  private onMediaChange?: () => void;
  private pillReady = false;
  private hasNavigated = false;

  @ViewChild('nav') navRef?: ElementRef<HTMLElement>;
  @ViewChild('pill') pillRef?: ElementRef<HTMLElement>;
  @ViewChild('main') mainRef?: ElementRef<HTMLElement>;

  sidebarCollapsed = signal(false);
  mobileOpen = signal(false);
  isMobile = signal(false);
  userMenuOpen = signal(false);
  pageTitle = signal('IA');
  isDarkMode = signal(false);
  motionOn = signal(true);
  allowedTabs = signal<string[]>([]);
  expandedGroups = signal<Set<string>>(new Set());

  private allMenuItems: MenuItem[] = [
    {
      label: 'IA',
      icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z',
      route: '/ia',
    },
    {
      label: 'Rodízio',
      icon: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
      route: '/rodizio',
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
      this.schedulePill();
      // Acessibilidade: ao navegar, leitor de tela anuncia a nova página e o teclado recomeça do conteúdo.
      // No primeiro carregamento o foco não é roubado (o "Pular para o conteúdo" precisa ser o 1º Tab).
      if (this.hasNavigated) setTimeout(() => this.mainRef?.nativeElement.focus({ preventScroll: true }), 0);
      this.hasNavigated = true;
    });
    this.syncFromUrl(this.router.url);

    // O indicador do menu também precisa se reposicionar quando o menu muda (permissões, grupos, recolher).
    effect(() => {
      this.menuItems();
      this.expandedGroups();
      this.sidebarCollapsed();
      this.mobileOpen();
      this.schedulePill();
    });
  }

  ngOnInit(): void {
    this.initializeTheme();
    try {
      this.sidebarCollapsed.set(localStorage.getItem(SIDEBAR_KEY) === '1');
    } catch { /* sem storage */ }
    this.motionOn.set(this.motion.enabled);
    this.loadNavigationTabs();
    this.bindViewport();
  }

  ngAfterViewInit(): void {
    this.schedulePill();
    window.addEventListener('resize', this.onResize, { passive: true });
  }

  private readonly onResize = () => this.schedulePill();

  /** Agenda o reposicionamento do indicador depois que o DOM do menu assentar. */
  schedulePill(): void {
    setTimeout(() => this.positionPill(), 60);
  }

  /** Faz o indicador deslizar até o item ativo do menu. */
  private positionPill(): void {
    const nav = this.navRef?.nativeElement;
    const pill = this.pillRef?.nativeElement;
    if (!nav || !pill) return;
    const active = nav.querySelector<HTMLElement>('.nav-link.nav-active, .nav-link.nav-group-active');
    if (!active) {
      pill.style.opacity = '0';
      return;
    }
    const navTop = nav.getBoundingClientRect().top - nav.scrollTop;
    const r = active.getBoundingClientRect();
    const top = r.top - navTop;
    if (!this.pillReady || !this.motion.enabled) {
      pill.style.top = `${top}px`;
      pill.style.height = `${r.height}px`;
      pill.style.opacity = '1';
      this.pillReady = true;
      return;
    }
    animate(pill, { top: `${top}px`, height: `${r.height}px`, opacity: 1 }, { duration: 0.75, ease: [0.16, 1, 0.3, 1] });
  }

  focusMain(event: Event): void {
    event.preventDefault();
    this.mainRef?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.onResize);
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
    this.mediaQuery = window.matchMedia('(max-width: 1023px)');
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
    const title = this.resolveTitle(path);
    this.pageTitle.set(title);
    this.titleService.setTitle(`${title} · CMM System`);

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

  toggleDarkMode(event?: MouseEvent): void {
    if (typeof document === 'undefined') return;

    const nextValue = !this.isDarkMode();
    const apply = () => {
      this.isDarkMode.set(nextValue);
      localStorage.setItem(this.THEME_KEY, nextValue ? 'dark' : 'light');
      document.documentElement.classList.toggle('dark', nextValue);
    };
    // O tema se espalha em círculo a partir do botão clicado.
    const origin = event ? { x: event.clientX, y: event.clientY } : { x: innerWidth - 60, y: 40 };
    void this.motion.themeTransition(origin, apply);
  }

  toggleMotion(): void {
    const next = !this.motionOn();
    this.motionOn.set(next);
    this.motion.setEnabled(next);
  }

  toggleSidebar(): void {
    const next = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(next);
    try {
      localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
    } catch { /* sem storage */ }
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
    return route.replace(/^\//, '').split('/')[0] || 'ia';
  }

  private isCurrentRouteAllowed(url: string): boolean {
    const allowed = new Set(this.allowedTabs());
    if (allowed.size === 0) return true;
    const path = url.replace(/^\//, '').split('?')[0];
    if (path.startsWith('perfil')) return true;
    if (allowed.has(path)) return true;
    const top = path.split('/')[0] || 'ia';
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
