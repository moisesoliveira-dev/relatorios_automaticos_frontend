import { Component, OnInit, computed } from '@angular/core';
import { CounterDirective } from '../../core/motion/counter.directive';
import { IconComponent, IconName } from '../../shared/components/icon.component';
import { UsersApiService } from './data/users-api.service';
import { UsersFacade } from './facade/users.facade';
import { UsersListComponent } from './components/users-list.component';
import { UsersInvitesTabComponent } from './components/users-invites-tab.component';
import { UsersRegistrationsTabComponent } from './components/users-registrations-tab.component';
import { UsersModalsComponent } from './components/users-modals.component';

/** Shell da feature Usuários: panorama, uma barra de abas e as janelas. */
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CounterDirective, IconComponent, UsersListComponent, UsersInvitesTabComponent, UsersRegistrationsTabComponent, UsersModalsComponent],
  providers: [UsersApiService, UsersFacade],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Usuários</h1>
          <p class="page-subtitle">Quem acessa o sistema e o que cada pessoa pode abrir.</p>
        </div>
        @if (facade.canManageUsers()) {
          <div class="flex flex-wrap gap-2">
            <button type="button" (click)="facade.openCreateModal()" class="btn btn-secondary"><app-icon name="usuario" [size]="16" /> Cadastrar</button>
            <button type="button" (click)="facade.openInviteModal()" class="btn btn-primary"><app-icon name="enviar" [size]="16" /> Convidar</button>
          </div>
        }
      </div>

      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        @for (k of resumo(); track k.label) {
          <div class="panel panel-pad stat" [class.stat-attn]="k.atencao">
            <span class="stat-ico"><app-icon [name]="k.icone" [size]="20" /></span>
            <div class="min-w-0">
              <p class="stat-num" [appCounter]="'' + k.valor">{{ k.valor }}</p>
              <p class="stat-lbl">{{ k.label }}</p>
            </div>
          </div>
        }
      </div>

      @if (facade.canManageUsers()) {
        <div class="tabs" role="tablist" aria-label="Seções">
          <button type="button" role="tab" class="tab" [class.tab-on]="facade.activeTab() === 'users'" [attr.aria-selected]="facade.activeTab() === 'users'" (click)="facade.activeTab.set('users')">
            Pessoas <span class="tab-count">{{ facade.users().length }}</span>
          </button>
          <button type="button" role="tab" class="tab" [class.tab-on]="facade.activeTab() === 'invites'" [attr.aria-selected]="facade.activeTab() === 'invites'" (click)="facade.activeTab.set('invites')">
            Convites <span class="tab-count">{{ facade.pendingInvites().length }}</span>
          </button>
          <button type="button" role="tab" class="tab" [class.tab-on]="facade.activeTab() === 'registrations'" [attr.aria-selected]="facade.activeTab() === 'registrations'" (click)="facade.activeTab.set('registrations')">
            Aprovações <span class="tab-count" [class.tab-count-alert]="facade.pendingRegistrations().length > 0">{{ facade.pendingRegistrations().length }}</span>
          </button>
        </div>
      }

      @if (facade.activeTab() === 'users') { <app-users-list /> }
      @if (facade.activeTab() === 'invites' && facade.canManageUsers()) { <app-users-invites-tab /> }
      @if (facade.activeTab() === 'registrations' && facade.canManageUsers()) { <app-users-registrations-tab /> }

      <app-users-modals />
    </div>
  `,
})
export class UsersComponent implements OnInit {
  constructor(readonly facade: UsersFacade) {}

  resumo = computed((): Array<{ icone: IconName; label: string; valor: number; atencao: boolean }> => {
    const u = this.facade.users();
    const pend = this.facade.pendingInvites().length + this.facade.pendingRegistrations().length;
    return [
      { icone: 'usuarios', label: 'Pessoas com acesso', valor: u.length, atencao: false },
      { icone: 'check', label: 'Ativas', valor: u.filter((x) => x.isActive !== false).length, atencao: false },
      { icone: 'escudo', label: 'Administradores', valor: u.filter((x) => x.role === 'master' || x.role === 'admin').length, atencao: false },
      { icone: 'relogio', label: 'Aguardando decisão', valor: pend, atencao: pend > 0 },
    ];
  });

  ngOnInit(): void {
    this.facade.init();
  }
}
