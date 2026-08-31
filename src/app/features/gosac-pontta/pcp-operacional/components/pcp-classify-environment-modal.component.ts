import { Component, inject } from '@angular/core';
import { PcpOperacionalFacade } from '../facade/pcp-operacional.facade';
import { PcpAreaKey } from '../models/pcp.models';

@Component({
  selector: 'app-pcp-classify-environment-modal',
  standalone: true,
  template: `
    @if (facade.classifyModalOpen() && facade.classifyTarget(); as target) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" (click)="facade.closeClassifyModal()">
        <div class="absolute inset-0" style="background: rgba(10, 16, 24, 0.55);"></div>

        <div
          class="relative w-full sm:max-w-md overflow-hidden sm:rounded-xl"
          style="background: var(--cmm-panel); border: 1px solid var(--cmm-border); box-shadow: 0 18px 40px rgba(15, 26, 39, 0.18);"
          (click)="$event.stopPropagation()"
        >
          <div class="px-5 py-4 border-b" style="border-color: var(--cmm-border);">
            <h2 class="text-base font-semibold" style="color: var(--cmm-ink);">Classificar ambiente</h2>
            <p class="text-xs mt-1" style="color: var(--cmm-muted);">
              {{ target.orderCode }} · {{ target.customerName }}
            </p>
          </div>

          <div class="px-5 py-5 space-y-4">
            <div class="rounded-lg px-3 py-2 text-sm font-medium" style="background: var(--cmm-surface); border: 1px solid var(--cmm-border); color: var(--cmm-ink);">
              {{ target.environmentName }}
            </div>

            <p class="text-xs" style="color: var(--cmm-muted);">
              Escolha a área PCP. A classificação será salva e aplicada automaticamente em todos os pedidos.
            </p>

            <div class="grid grid-cols-1 gap-2">
              @for (area of facade.areaOrder(); track area) {
                <button
                  type="button"
                  class="rounded-lg px-3 py-3 text-left transition-colors"
                  style="background: var(--cmm-surface); border: 1px solid var(--cmm-border);"
                  [style.border-left]="'3px solid ' + facade.areaMeta()[area].color"
                  [disabled]="facade.classifySaving()"
                  (click)="selectArea(area)"
                >
                  <span class="text-sm font-semibold" [style.color]="facade.areaMeta()[area].color">
                    {{ facade.areaMeta()[area].label }}
                  </span>
                  <p class="text-[10px] mt-0.5" style="color: var(--cmm-muted);">
                    {{ facade.areaMeta()[area].offset }}
                  </p>
                </button>
              }
            </div>

            @if (facade.classifyError()) {
              <p class="text-sm" style="color: var(--cmm-danger);">{{ facade.classifyError() }}</p>
            }
          </div>

          <div class="px-5 py-4 border-t flex justify-end" style="border-color: var(--cmm-border);">
            <button type="button" class="btn btn-secondary btn-sm" (click)="facade.closeClassifyModal()" [disabled]="facade.classifySaving()">
              Cancelar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class PcpClassifyEnvironmentModalComponent {
  readonly facade = inject(PcpOperacionalFacade);

  selectArea(area: PcpAreaKey): void {
    this.facade.saveEnvironmentClassification(area);
  }
}
