import { Component, inject } from '@angular/core';
import { UsersFacade } from '../facade/users.facade';

@Component({
  selector: 'app-users-registrations-tab',
  standalone: true,
  template: `
    <div class="table-shell">
      <table>
        <thead>
          <tr>
            <th>Pessoa</th>
            <th>Pediu em</th>
            <th style="text-align: right;"></th>
          </tr>
        </thead>
        <tbody>
          @for (reg of facade.pendingRegistrations(); track reg.id) {
            <tr>
              <td>
                <p class="font-medium">{{ reg.name || '—' }}</p>
                <p class="text-xs" style="color: var(--cmm-muted);">{{ reg.email }}</p>
              </td>
              <td class="text-sm" style="color: var(--cmm-muted);">{{ facade.formatDate(reg.createdAt) }}</td>
              <td style="text-align: right;">
                <div class="flex items-center justify-end gap-2">
                  <button type="button" (click)="facade.rejectRegistration(reg)" class="btn btn-sm btn-ghost" style="color: var(--cmm-danger);">Rejeitar</button>
                  <button type="button" (click)="facade.openApproveModal(reg)" class="btn btn-sm btn-accent">Aprovar</button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr><td colspan="3"><div class="empty-state">Nenhum cadastro aguardando aprovação.</div></td></tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class UsersRegistrationsTabComponent {
  readonly facade = inject(UsersFacade);
}
