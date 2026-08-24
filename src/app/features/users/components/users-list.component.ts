import { Component, inject } from '@angular/core';
import { UsersFacade } from '../facade/users.facade';

@Component({
  selector: 'app-users-list',
  standalone: true,
  template: `
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th>Usuário</th>
            <th>Email</th>
            <th>Acesso</th>
            <th>Status</th>
            <th>Criado em</th>
            @if (facade.canManageUsers()) {
              <th style="text-align: right;">Ações</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (user of facade.users(); track user.id) {
            <tr>
              <td>
                <div class="flex items-center gap-3">
                  <div
                    class="w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm"
                    [style.background]="user.role === 'master' ? 'color-mix(in srgb, var(--cmm-warning) 14%, var(--cmm-panel))' : 'color-mix(in srgb, var(--cmm-border) 55%, var(--cmm-panel))'"
                    [style.color]="user.role === 'master' ? 'var(--cmm-warning)' : 'var(--cmm-muted)'"
                  >
                    @if (user.role === 'master') {
                      <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path>
                      </svg>
                    } @else {
                      {{ facade.getInitials(user.name) }}
                    }
                  </div>
                  <div>
                    <span class="font-medium" style="color: var(--cmm-ink);">{{ user.name }}</span>
                    @if (user.role === 'master') {
                      <span class="badge badge-warning ml-2">Master</span>
                    }
                  </div>
                </div>
              </td>
              <td style="color: var(--cmm-muted);">{{ user.email }}</td>
              <td>
                <div class="flex flex-wrap gap-1">
                  @if (user.role === 'master') {
                    <span class="badge badge-warning">Todas as abas</span>
                  } @else if (facade.getTopLevelTabLabels(user.tabs).length > 3) {
                    <span class="badge badge-neutral">{{ facade.formatTabsSummary(user.tabs) }}</span>
                  } @else {
                    @for (label of facade.getTopLevelTabLabels(user.tabs); track label) {
                      <span class="badge badge-neutral">{{ label }}</span>
                    } @empty {
                      <span class="badge badge-neutral">Sem acesso</span>
                    }
                  }
                </div>
              </td>
              <td>
                <span
                  class="badge"
                  [class.badge-success]="user.status === 'active' || !user.status"
                  [class.badge-warning]="user.status === 'pending'"
                  [class.badge-neutral]="user.status === 'inactive'"
                >
                  {{ facade.getStatusLabel(user.status) }}
                </span>
              </td>
              <td class="text-sm" style="color: var(--cmm-muted);">{{ facade.formatDate(user.createdAt) }}</td>
              @if (facade.canManageUsers()) {
                <td style="text-align: right;">
                  <div class="flex items-center justify-end gap-2">
                    <button type="button" (click)="facade.editUser(user)" class="btn btn-ghost btn-sm" title="Editar">
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                      </svg>
                    </button>
                    @if (user.role !== 'master') {
                      <button type="button" (click)="facade.deleteUser(user)" class="btn btn-ghost btn-sm" style="color: var(--cmm-danger);" title="Excluir">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    }
                  </div>
                </td>
              }
            </tr>
          } @empty {
            <tr>
              <td [attr.colspan]="facade.canManageUsers() ? 6 : 5">
                <div class="empty-state">Nenhum usuário encontrado</div>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class UsersListComponent {
  readonly facade = inject(UsersFacade);
}
