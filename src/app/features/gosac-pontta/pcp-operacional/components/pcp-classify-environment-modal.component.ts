import { Component, inject } from '@angular/core';
import { PcpOperacionalFacade } from '../facade/pcp-operacional.facade';
import { PcpAreaKey } from '../models/pcp.models';
import { DialogComponent } from '../../../../shared/components/dialog.component';

@Component({
  selector: 'app-pcp-classify-environment-modal',
  standalone: true,
  imports: [DialogComponent],
  template: `
    <app-dialog [open]="facade.classifyModalOpen()" title="Classificar ambiente" [subtitle]="facade.classifyTarget() ? facade.classifyTarget()!.orderCode + ' · ' + facade.classifyTarget()!.customerName : ''" size="sm" [closable]="!facade.classifySaving()" (closed)="facade.closeClassifyModal()">
      @if (facade.classifyTarget(); as target) {
        <p class="note font-medium mb-3">{{ target.environmentName }}</p>
        <p class="text-xs mb-3" style="color: var(--cmm-muted);">Escolha a área. Vale para este ambiente em todos os pedidos.</p>
        <div class="grid gap-2">
          @for (area of facade.areaOrder(); track area) {
            <button type="button" class="opt" [style.border-left-color]="facade.areaMeta()[area].color" [disabled]="facade.classifySaving()" (click)="selectArea(area)">
              <span class="text-sm font-semibold" [style.color]="facade.areaMeta()[area].color">{{ facade.areaMeta()[area].label }}</span>
              <span class="text-xs" style="color: var(--cmm-muted);">{{ facade.areaMeta()[area].offset }}</span>
            </button>
          }
        </div>
        @if (facade.classifyError()) { <p class="note note-error mt-3">{{ facade.classifyError() }}</p> }
      }
    </app-dialog>
  `,
  styles: [`
    .opt { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .75rem .9rem; text-align: left; border: 1px solid var(--cmm-border); border-left-width: 4px; border-radius: .85rem; background: var(--cmm-surface); cursor: pointer; transition: border-color 160ms, background-color 160ms; }
    .opt:hover:not(:disabled) { background: var(--cmm-panel); border-color: var(--cmm-accent); }
    .opt:disabled { opacity: .5; cursor: default; }
  `],
})
export class PcpClassifyEnvironmentModalComponent {
  readonly facade = inject(PcpOperacionalFacade);
  selectArea(area: PcpAreaKey): void { this.facade.saveEnvironmentClassification(area); }
}
