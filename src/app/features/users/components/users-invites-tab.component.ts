import { Component, inject } from '@angular/core';
import { UsersFacade } from '../facade/users.facade';

@Component({
  selector: 'app-users-invites-tab',
  standalone: true,
  template: `
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Acesso</th>
            <th>Convidado por</th>
            <th>Expira em</th>
            <th>Link</th>
            <th style="text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (invite of facade.pendingInvites(); track invite.id) {
            <tr>
              <td class="font-medium">{{ invite.email }}</td>
              <td>
                <div class="flex flex-wrap gap-1">
                  @if (facade.getTopLevelTabLabels(invite.tabs).length > 3) {
                    <span class="badge badge-neutral">{{ facade.formatTabsSummary(invite.tabs) }}</span>
                  } @else {
                    @for (label of facade.getTopLevelTabLabels(invite.tabs); track label) {
                      <span class="badge badge-neutral">{{ label }}</span>
                    } @empty {
                      <span class="badge badge-neutral">Sem acesso</span>
                    }
                  }
                </div>
              </td>
              <td style="color: var(--cmm-muted);">{{ invite.invitedBy?.name || '-' }}</td>
              <td class="text-sm" style="color: var(--cmm-muted);">{{ facade.formatDate(invite.inviteExpiresAt) }}</td>
              <td>
                <button type="button" (click)="facade.copyInviteLink(invite)" class="btn btn-ghost btn-sm">
                  Copiar Link
                </button>
              </td>
              <td style="text-align: right;">
                <button type="button" (click)="facade.cancelInvite(invite)" class="btn btn-ghost btn-sm" style="color: var(--cmm-danger);">
                  Cancelar
                </button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="6"><div class="empty-state">Nenhum convite pendente</div></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class UsersInvitesTabComponent {
  readonly facade = inject(UsersFacade);
}
