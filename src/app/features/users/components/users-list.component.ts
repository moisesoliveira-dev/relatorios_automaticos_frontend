import { Component, inject } from '@angular/core';
import { UsersFacade } from '../facade/users.facade';
import { IconComponent } from '../../../shared/components/icon.component';

@Component({
  selector: 'app-users-list',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th>Pessoa</th>
            <th>Acesso</th>
            <th>Situação</th>
            <th>Desde</th>
            @if (facade.canManageUsers()) { <th style="text-align: right;"></th> }
          </tr>
        </thead>
        <tbody>
          @for (user of facade.users(); track user.id) {
            <tr>
              <td>
                <div class="flex items-center gap-3 min-w-0">
                  <div class="avatar" [class.avatar-master]="user.role === 'master'" aria-hidden="true">
                    @if (user.role === 'master') { <app-icon name="estrela" [size]="16" /> } @else { {{ facade.getInitials(user.name) }} }
                  </div>
                  <div class="min-w-0">
                    <p class="font-medium truncate">{{ user.name }}</p>
                    <p class="text-xs truncate" style="color: var(--cmm-muted);">{{ user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="text-sm" style="color: var(--cmm-muted);">
                @if (user.role === 'master') { Tudo (master) } @else { {{ facade.formatTabsSummary(user.tabs) }} }
              </td>
              <td>
                <span class="state" [class.state-on]="user.status === 'active' || !user.status" [class.state-warn]="user.status === 'pending'" [class.state-off]="user.status === 'inactive'">
                  {{ facade.getStatusLabel(user.status) }}
                </span>
              </td>
              <td class="text-sm" style="color: var(--cmm-muted);">{{ facade.formatDate(user.createdAt) }}</td>
              @if (facade.canManageUsers()) {
                <td style="text-align: right;">
                  @if (user.role !== 'master') {
                    <div class="flex items-center justify-end gap-1">
                      <button type="button" (click)="facade.editUser(user)" class="icon-btn" title="Editar" aria-label="Editar"><app-icon name="lapis" [size]="16" /></button>
                      <button type="button" (click)="facade.deleteUser(user)" class="icon-btn icon-danger" title="Excluir" aria-label="Excluir"><app-icon name="lixeira" [size]="16" /></button>
                    </div>
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr><td [attr.colspan]="facade.canManageUsers() ? 5 : 4"><div class="empty-state">Nenhuma pessoa encontrada.</div></td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .avatar { flex-shrink: 0; width: 2.4rem; height: 2.4rem; border-radius: 99px; display: grid; place-items: center; font-size: .75rem; font-weight: 700; background: color-mix(in srgb, var(--cmm-border) 55%, var(--cmm-panel)); color: var(--cmm-muted); }
    .avatar-master { background: color-mix(in srgb, var(--cmm-warning) 14%, var(--cmm-panel)); color: var(--cmm-warning); }
  `],
})
export class UsersListComponent {
  readonly facade = inject(UsersFacade);
}
