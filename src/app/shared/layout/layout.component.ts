import { Component, signal, computed } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ModalComponent } from '../components/modal.component';

interface MenuItem {
  label: string;
  icon: string;
  route: string;
  children?: MenuItem[];
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
        [class.w-64]="!sidebarCollapsed()"
        [class.w-20]="sidebarCollapsed()"
      >
        <!-- Logo -->
        <div class="h-16 flex items-center justify-center border-b border-slate-700">
          @if (!sidebarCollapsed()) {
            <span class="text-xl font-bold text-white">📊 Relatórios</span>
          } @else {
            <span class="text-2xl">📊</span>
          }
        </div>

        <!-- Menu -->
        <nav class="flex-1 py-4 overflow-y-auto">
          <ul class="space-y-1 px-3">
            @for (item of menuItems; track item.route) {
              <li>
                <a
                  [routerLink]="item.route"
                  routerLinkActive="bg-purple-600 text-white"
                  [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
                  class="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                  [class.justify-center]="sidebarCollapsed()"
                >
                  <span class="text-xl" [innerHTML]="item.icon"></span>
                  @if (!sidebarCollapsed()) {
                    <span>{{ item.label }}</span>
                  }
                </a>
              </li>
            }
          </ul>
        </nav>

        <!-- Toggle Button -->
        <button
          (click)="sidebarCollapsed.set(!sidebarCollapsed())"
          class="h-12 flex items-center justify-center border-t border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          @if (sidebarCollapsed()) {
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path>
            </svg>
          } @else {
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 19l-7-7 7-7m8 14l-7-7 7-7"></path>
            </svg>
          }
        </button>
      </aside>

      <!-- Main Content -->
      <div 
        class="flex-1 flex flex-col transition-all duration-300"
        [class.ml-64]="!sidebarCollapsed()"
        [class.ml-20]="sidebarCollapsed()"
      >
        <!-- Header -->
        <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <div class="flex items-center gap-4">
            <h1 class="text-xl font-semibold text-slate-800">{{ pageTitle() }}</h1>
          </div>

          <div class="flex items-center gap-4">
            <!-- Notifications -->
            <button class="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
              </svg>
              <span class="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            <!-- User Menu -->
            <div class="relative">
              <button
                (click)="userMenuOpen.set(!userMenuOpen())"
                class="flex items-center gap-3 p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <div class="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {{ authService.userInitials() }}
                </div>
                <div class="text-left hidden sm:block">
                  <p class="text-sm font-medium text-slate-700">{{ authService.user()?.name }}</p>
                  <p class="text-xs text-slate-500">{{ authService.user()?.role }}</p>
                </div>
                <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              @if (userMenuOpen()) {
                <div class="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50">
                  <a routerLink="/perfil" class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                    Meu Perfil
                  </a>
                  <a routerLink="/configuracoes" class="flex items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                    </svg>
                    Configurações
                  </a>
                  <hr class="my-1 border-slate-200">
                  <button
                    (click)="logout()"
                    class="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                  >
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path>
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
export class LayoutComponent {
  sidebarCollapsed = signal(false);
  userMenuOpen = signal(false);
  pageTitle = signal('Dashboard');

  menuItems: MenuItem[] = [
    { label: 'Dashboard', icon: '🏠', route: '/dashboard' },
    { label: 'Relatórios', icon: '📊', route: '/reports' },
    { label: 'Gosac/Pontta', icon: '🔗', route: '/gosac-pontta' },
    { label: 'Usuários', icon: '👥', route: '/usuarios' },
    { label: 'Configurações', icon: '⚙️', route: '/configuracoes' },
  ];

  constructor(public authService: AuthService) { }

  logout() {
    this.authService.logout();
  }
}
