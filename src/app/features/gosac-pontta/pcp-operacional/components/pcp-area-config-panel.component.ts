import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PcpOperacionalFacade } from '../facade/pcp-operacional.facade';
import { PcpAreaConfig, PcpAreaConfigItem } from '../models/pcp.models';

@Component({
  selector: 'app-pcp-area-config-panel',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="panel panel-pad space-y-4">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h2 class="text-sm font-semibold" style="color: var(--cmm-ink);">Configuração de áreas</h2>
          <p class="text-xs mt-0.5" style="color: var(--cmm-muted);">
            Dias úteis e cores por área. Base de cálculo: {{ draft.baseDateLabel }}.
          </p>
        </div>
        <button type="button" class="btn btn-ghost btn-sm" (click)="facade.toggleConfigPanel()">Fechar</button>
      </div>

      <div class="space-y-3">
        @for (area of draft.areas; track area.key) {
          <div
            class="rounded-lg px-3 py-3 space-y-2"
            style="background: var(--cmm-surface); border: 1px solid var(--cmm-border);"
            [style.border-left]="'3px solid ' + area.color"
          >
            <p class="text-xs font-semibold" style="color: var(--cmm-ink);">{{ area.label }}</p>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label class="space-y-1">
                <span class="text-[10px] uppercase tracking-wide" style="color: var(--cmm-muted);">Dias úteis</span>
                <input
                  type="number"
                  min="0"
                  max="365"
                  class="form-input py-1 text-sm"
                  [(ngModel)]="area.businessDays"
                />
              </label>
              <label class="space-y-1">
                <span class="text-[10px] uppercase tracking-wide" style="color: var(--cmm-muted);">Cor</span>
                <div class="flex items-center gap-2">
                  <input type="color" class="h-9 w-10 rounded border p-0.5 cursor-pointer" [(ngModel)]="area.color" />
                  <input type="text" class="form-input py-1 text-sm flex-1 font-mono" [(ngModel)]="area.color" />
                </div>
              </label>
              <label class="space-y-1">
                <span class="text-[10px] uppercase tracking-wide" style="color: var(--cmm-muted);">Rótulo curto</span>
                <input type="text" class="form-input py-1 text-sm" [(ngModel)]="area.short" />
              </label>
            </div>
          </div>
        }
      </div>

      @if (facade.configError()) {
        <p class="text-sm" style="color: var(--cmm-danger);">{{ facade.configError() }}</p>
      }

      <div class="flex items-center justify-end gap-2">
        <button type="button" class="btn btn-secondary btn-sm" (click)="resetDraft()" [disabled]="facade.configSaving()">
          Restaurar
        </button>
        <button type="button" class="btn btn-primary btn-sm" (click)="save()" [disabled]="facade.configSaving()">
          @if (facade.configSaving()) {
            Salvando...
          } @else {
            Salvar e recalcular
          }
        </button>
      </div>
    </div>
  `,
})
export class PcpAreaConfigPanelComponent implements OnInit {
  readonly facade = inject(PcpOperacionalFacade);
  draft!: PcpAreaConfig;

  ngOnInit(): void {
    this.resetDraft();
  }

  resetDraft(): void {
    this.draft = cloneConfig(this.facade.areaConfig());
  }

  save(): void {
    this.facade.saveAreaConfig(cloneConfig(this.draft));
  }
}

function cloneConfig(config: PcpAreaConfig): PcpAreaConfig {
  return {
    baseDateLabel: config.baseDateLabel,
    areas: config.areas.map((area: PcpAreaConfigItem) => ({ ...area })),
  };
}
