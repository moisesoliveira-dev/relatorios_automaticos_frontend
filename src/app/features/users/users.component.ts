import { Component, OnInit, computed } from '@angular/core';
import { CounterDirective } from '../../core/motion/counter.directive';
import { UsersApiService } from './data/users-api.service';
import { UsersFacade } from './facade/users.facade';
import { UsersListComponent } from './components/users-list.component';
import { UsersInvitesTabComponent } from './components/users-invites-tab.component';
import { UsersRegistrationsTabComponent } from './components/users-registrations-tab.component';
import { UsersModalsComponent } from './components/users-modals.component';

/** Shell da feature Usuários — compõe subcomponentes via Facade. */
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CounterDirective,
    UsersListComponent,
    UsersInvitesTabComponent,
    UsersRegistrationsTabComponent,
    UsersModalsComponent,
  ],
  providers: [UsersApiService, UsersFacade],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Gerenciamento de Usuários</h1>
          <p class="page-subtitle">Cadastre usuários, gerencie acessos e envie convites</p>
        </div>
        @if (facade.canManageUsers()) {
          <div class="flex flex-wrap gap-2">
            <button type="button" (click)="facade.openCreateModal()" class="btn btn-primary">Cadastrar Usuário</button>
            <button type="button" (click)="facade.openInviteModal()" class="btn btn-secondary">Convidar Usuário</button>
          </div>
        }
      </div>

      <!-- Panorama: quem tem acesso e o que está esperando decisão -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        @for (k of resumo(); track k.label) {
          <div class="panel panel-pad flex items-center gap-4" [class.attn]="k.atencao">
            <span class="k-ico" aria-hidden="true">{{ k.icone }}</span>
            <div>
              <p class="k-num font-display" [appCounter]="'' + k.valor">{{ k.valor }}</p>
              <p class="text-sm" style="color: var(--cmm-muted);">{{ k.label }}</p>
            </div>
          </div>
        }
      </div>

      <div style="border-bottom: 1px solid var(--cmm-border);">
        <nav class="flex gap-4">
          <button
            type="button"
            (click)="facade.activeTab.set('users')"
            class="px-4 py-2 font-medium text-sm border-b-2 transition-colors"
            [style.border-color]="facade.activeTab() === 'users' ? 'var(--cmm-ink)' : 'transparent'"
            [style.color]="facade.activeTab() === 'users' ? 'var(--cmm-ink)' : 'var(--cmm-muted)'"
          >
            Usuários ({{ facade.users().length }})
          </button>
          @if (facade.canManageUsers()) {
            <button
              type="button"
              (click)="facade.activeTab.set('invites')"
              class="px-4 py-2 font-medium text-sm border-b-2 transition-colors"
              [style.border-color]="facade.activeTab() === 'invites' ? 'var(--cmm-ink)' : 'transparent'"
              [style.color]="facade.activeTab() === 'invites' ? 'var(--cmm-ink)' : 'var(--cmm-muted)'"
            >
              Convites Pendentes ({{ facade.pendingInvites().length }})
            </button>
            <button
              type="button"
              (click)="facade.activeTab.set('registrations')"
              class="px-4 py-2 font-medium text-sm border-b-2 transition-colors"
              [style.border-color]="facade.activeTab() === 'registrations' ? 'var(--cmm-ink)' : 'transparent'"
              [style.color]="facade.activeTab() === 'registrations' ? 'var(--cmm-ink)' : 'var(--cmm-muted)'"
            >
              Aprovações ({{ facade.pendingRegistrations().length }})
            </button>
          }
        </nav>
      </div>

      @if (facade.activeTab() === 'users') {
        <app-users-list />
      }
      @if (facade.activeTab() === 'invites' && facade.canManageUsers()) {
        <app-users-invites-tab />
      }
      @if (facade.activeTab() === 'registrations' && facade.canManageUsers()) {
        <app-users-registrations-tab />
      }

      <app-users-modals />
    </div>
  `,
  styles: [`
    .k-ico { flex-shrink: 0; width: 2.75rem; height: 2.75rem; border-radius: .9rem; display: grid; place-items: center; font-size: 1.25rem; background: var(--cmm-accent-soft); }
    .k-num { font-size: 1.9rem; font-weight: 800; line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
    .attn { border-color: color-mix(in srgb, var(--cmm-warning) 55%, var(--cmm-border)); background: color-mix(in srgb, var(--cmm-warning) 7%, var(--cmm-panel)); }
  `],
})
export class UsersComponent implements OnInit {
  constructor(readonly facade: UsersFacade) {}

  resumo = computed(() => {
    const u = this.facade.users();
    const pend = this.facade.pendingInvites().length + this.facade.pendingRegistrations().length;
    return [
      { icone: '👥', label: 'Pessoas com acesso', valor: u.length, atencao: false },
      { icone: '✅', label: 'Ativas', valor: u.filter((x) => x.isActive !== false).length, atencao: false },
      { icone: '🛡️', label: 'Administradores', valor: u.filter((x) => x.role === 'master' || x.role === 'admin').length, atencao: false },
      { icone: '⏳', label: 'Aguardando decisão', valor: pend, atencao: pend > 0 },
    ];
  });

  ngOnInit(): void {
    this.facade.init();
  }
}
