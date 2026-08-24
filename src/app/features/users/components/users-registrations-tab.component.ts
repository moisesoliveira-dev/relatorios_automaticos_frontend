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
            <th>Nome</th>
            <th>Email</th>
            <th>Data</th>
            <th style="text-align: right;">Ações</th>
          </tr>
        </thead>
        <tbody>
          @for (reg of facade.pendingRegistrations(); track reg.id) {
            <tr>
              <td class="font-medium">{{ reg.name || '—' }}</td>
              <td style="color: var(--cmm-muted);">{{ reg.email }}</td>
              <td class="text-sm" style="color: var(--cmm-muted);">{{ facade.formatDate(reg.createdAt) }}</td>
              <td style="text-align: right;">
                <div class="flex items-center justify-end gap-2">
                  <button type="button" (click)="facade.openApproveModal(reg)" class="btn btn-sm btn-accent">
                    Definir abas e aprovar
                  </button>
                  <button type="button" (click)="facade.rejectRegistration(reg)" class="btn btn-sm btn-danger">
                    Rejeitar
                  </button>
                </div>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="4"><div class="empty-state">Nenhum cadastro pendente de aprovação</div></td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class UsersRegistrationsTabComponent {
  readonly facade = inject(UsersFacade);
}
