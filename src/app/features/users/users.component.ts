import { Component, OnInit } from '@angular/core';
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
})
export class UsersComponent implements OnInit {
  constructor(readonly facade: UsersFacade) {}

  ngOnInit(): void {
    this.facade.init();
  }
}
