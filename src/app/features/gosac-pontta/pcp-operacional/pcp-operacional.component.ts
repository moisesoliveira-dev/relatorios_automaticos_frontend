import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { PcpApiService } from './data/pcp-api.service';
import { PcpOperacionalFacade } from './facade/pcp-operacional.facade';
import { PcpSearchPanelComponent } from './components/pcp-search-panel.component';
import { PcpOrdersTableComponent } from './components/pcp-orders-table.component';
import { PcpCalendarPanelComponent } from './components/pcp-calendar-panel.component';
import { PcpDayDetailComponent } from './components/pcp-day-detail.component';
import { PcpAreaConfigPanelComponent } from './components/pcp-area-config-panel.component';
import { PcpClassifyEnvironmentModalComponent } from './components/pcp-classify-environment-modal.component';

/** Shell da feature — compõe subcomponentes e fornece a Facade no escopo da página. */
@Component({
  selector: 'app-pcp-operacional',
  standalone: true,
  imports: [
    PcpSearchPanelComponent,
    PcpOrdersTableComponent,
    PcpCalendarPanelComponent,
    PcpDayDetailComponent,
    PcpAreaConfigPanelComponent,
    PcpClassifyEnvironmentModalComponent,
  ],
  providers: [PcpApiService, PcpOperacionalFacade],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">PCP Operacional</h1>
          <p class="page-subtitle">{{ facade.scheduleSubtitle() }}</p>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" (click)="facade.toggleConfigPanel()">
          Configurar áreas
        </button>
      </div>

      @if (facade.configPanelOpen()) {
        <app-pcp-area-config-panel />
      }

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

    <app-pcp-classify-environment-modal />
  `,
})
export class PcpOperacionalComponent implements OnInit, OnDestroy {
  readonly facade = inject(PcpOperacionalFacade);

  ngOnInit(): void {
    this.facade.init();
  }

  ngOnDestroy(): void {
    this.facade.destroy();
  }
}
