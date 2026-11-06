import { Component, inject } from '@angular/core';
import { UsersFacade } from '../facade/users.facade';
import { IconComponent } from '../../../shared/components/icon.component';

@Component({
  selector: 'app-users-invites-tab',
  standalone: true,
  imports: [IconComponent],
  template: `
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th>E-mail</th>
            <th>Acesso</th>
            <th>Convidado por</th>
            <th>Expira em</th>
            <th style="text-align: right;"></th>
          </tr>
        </thead>
        <tbody>
          @for (invite of facade.pendingInvites(); track invite.id) {
            <tr>
              <td class="font-medium">{{ invite.email }}</td>
              <td class="text-sm" style="color: var(--cmm-muted);">{{ facade.formatTabsSummary(invite.tabs) }}</td>
              <td style="color: var(--cmm-muted);">{{ invite.invitedBy ? invite.invitedBy.name : '—' }}</td>
              <td class="text-sm" style="color: var(--cmm-muted);">{{ facade.formatDate(invite.inviteExpiresAt) }}</td>
              <td style="text-align: right;">
                <div class="flex items-center justify-end gap-1">
                  <button type="button" (click)="facade.copyInviteLink(invite)" class="icon-btn" title="Copiar link do convite" aria-label="Copiar link"><app-icon name="copiar" [size]="16" /></button>
                  <button type="button" (click)="facade.cancelInvite(invite)" class="icon-btn icon-danger" title="Cancelar convite" aria-label="Cancelar convite"><app-icon name="fechar" [size]="16" /></button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="5"><div class="empty-state">Nenhum convite pendente.</div></td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class UsersInvitesTabComponent {
  readonly facade = inject(UsersFacade);
}
