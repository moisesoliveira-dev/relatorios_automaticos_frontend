import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PcpOperacionalFacade } from '../facade/pcp-operacional.facade';

@Component({
  selector: 'app-pcp-search-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="panel panel-pad space-y-3">
      <label class="form-label">Pesquisar (opcional)</label>
      <div class="flex gap-2">
        <input
          type="text"
          [(ngModel)]="facade.searchQuery"
          placeholder="Cliente, código ou número do PV..."
          class="form-input flex-1 min-w-0"
          style="width: auto;"
          (keyup.enter)="facade.loadSchedule()"
        />
        <button type="button" (click)="facade.loadSchedule()" [disabled]="facade.loading()" class="btn btn-primary">
          @if (facade.loading()) {
            <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          }
          Atualizar
        </button>
      </div>
      @if (facade.enriching()) {
        <p class="text-xs" style="color: var(--cmm-muted);">Carregando ambientes dos pedidos em segundo plano...</p>
      }
      @if (facade.error()) {
        <p class="text-sm" style="color: var(--cmm-danger);">{{ facade.error() }}</p>
      }
    </div>
  `,
})
export class PcpSearchPanelComponent {
  readonly facade = inject(PcpOperacionalFacade);
}
