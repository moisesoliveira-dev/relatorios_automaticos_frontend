import { Component, OnDestroy, OnInit } from '@angular/core';
import { PcpApiService } from './data/pcp-api.service';
import { PcpOperacionalFacade } from './facade/pcp-operacional.facade';
import { PcpSearchPanelComponent } from './components/pcp-search-panel.component';
import { PcpOrdersTableComponent } from './components/pcp-orders-table.component';
import { PcpCalendarPanelComponent } from './components/pcp-calendar-panel.component';
import { PcpDayDetailComponent } from './components/pcp-day-detail.component';

/** Shell da feature — compõe subcomponentes e fornece a Facade no escopo da página. */
@Component({
  selector: 'app-pcp-operacional',
  standalone: true,
  imports: [
    PcpSearchPanelComponent,
    PcpOrdersTableComponent,
    PcpCalendarPanelComponent,
    PcpDayDetailComponent,
  ],
  providers: [PcpApiService, PcpOperacionalFacade],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">PCP Operacional</h1>
          <p class="page-subtitle">
            Pedidos com data de entrega a partir de hoje. Datas por área: +20 / +25 / +30 dias úteis · Ter / Qui / Sex.
          </p>
        </div>
      </div>

      <app-pcp-search-panel />

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
  `,
})
export class PcpOperacionalComponent implements OnInit, OnDestroy {
  constructor(private readonly facade: PcpOperacionalFacade) {}

  ngOnInit(): void {
    this.facade.init();
  }

  ngOnDestroy(): void {
    this.facade.destroy();
  }
}
