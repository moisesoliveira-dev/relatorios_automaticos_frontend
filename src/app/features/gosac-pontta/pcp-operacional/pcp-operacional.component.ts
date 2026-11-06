import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PcpApiService } from './data/pcp-api.service';
import { PcpOperacionalFacade } from './facade/pcp-operacional.facade';
import { PcpOrdersTableComponent } from './components/pcp-orders-table.component';
import { PcpCalendarPanelComponent } from './components/pcp-calendar-panel.component';
import { PcpDayDetailComponent } from './components/pcp-day-detail.component';
import { PcpAreaConfigPanelComponent } from './components/pcp-area-config-panel.component';
import { PcpClassifyEnvironmentModalComponent } from './components/pcp-classify-environment-modal.component';
import { IconComponent } from '../../../shared/components/icon.component';

/** Shell da feature: busca na barra do cabeçalho, lista à esquerda, calendário à direita. */
@Component({
  selector: 'app-pcp-operacional',
  standalone: true,
  imports: [FormsModule, PcpOrdersTableComponent, PcpCalendarPanelComponent, PcpDayDetailComponent, PcpAreaConfigPanelComponent, PcpClassifyEnvironmentModalComponent, IconComponent],
  providers: [PcpApiService, PcpOperacionalFacade],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">PCP Operacional</h1>
          <p class="page-subtitle">{{ facade.scheduleSubtitle() }}</p>
        </div>
        <div class="toolbar">
          <form class="search-field" style="flex: 1 1 16rem;" (ngSubmit)="facade.loadSchedule()">
            <app-icon name="busca" [size]="16" />
            <input type="search" class="form-input" [(ngModel)]="facade.searchQuery" name="q" placeholder="Cliente, código ou número do PV" aria-label="Buscar pedido" autocomplete="off" />
          </form>
          <button type="button" class="icon-btn icon-btn-outline" (click)="facade.toggleConfigPanel()" title="Prazos e cores das áreas" aria-label="Prazos e cores das áreas"><app-icon name="ajustes" [size]="18" /></button>
        </div>
      </div>

      @if (facade.error()) { <p class="note note-error">{{ facade.error() }}</p> }

      <div class="grid grid-cols-1 xl:grid-cols-5 gap-6">
        <div class="xl:col-span-3">
          <app-pcp-orders-table />
        </div>
        <div class="xl:col-span-2 space-y-4">
          <app-pcp-calendar-panel />
          <app-pcp-day-detail />
        </div>
      </div>
    </div>

    <app-pcp-area-config-panel />
    <app-pcp-classify-environment-modal />
  `,
})
export class PcpOperacionalComponent implements OnInit, OnDestroy {
  readonly facade = inject(PcpOperacionalFacade);

  ngOnInit(): void { this.facade.init(); }
  ngOnDestroy(): void { this.facade.destroy(); }
}
