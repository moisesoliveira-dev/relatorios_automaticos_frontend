import { Component, effect, inject, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { PcpOperacionalFacade } from '../facade/pcp-operacional.facade';
import { PcpAreaConfig, PcpAreaConfigItem } from '../models/pcp.models';
import { DialogComponent } from '../../../../shared/components/dialog.component';

/** Prazos (dias úteis) e cores por área, numa janela. */
@Component({
  selector: 'app-pcp-area-config-panel',
  standalone: true,
  imports: [FormsModule, DialogComponent],
  template: `
    <app-dialog [open]="facade.configPanelOpen()" title="Áreas do PCP" [subtitle]="'Dias úteis a partir de: ' + draft.baseDateLabel" size="md" [closable]="!facade.configSaving()" (closed)="facade.configPanelOpen.set(false)">
      <div class="space-y-3">
        @for (area of draft.areas; track area.key) {
          <div class="area" [style.border-left-color]="area.color">
            <div class="grid grid-cols-[auto_1fr_auto] sm:grid-cols-[auto_1fr_6rem_7rem] gap-3 items-end">
              <label class="space-y-1">
                <span class="lbl">Cor</span>
                <input type="color" class="h-10 w-12 rounded-lg border p-0.5 cursor-pointer" [(ngModel)]="area.color" [attr.aria-label]="'Cor de ' + area.label" />
              </label>
              <label class="space-y-1 min-w-0">
                <span class="lbl">Área</span>
                <input type="text" class="form-input" [(ngModel)]="area.label" [attr.aria-label]="'Nome da área'" />
              </label>
              <label class="space-y-1">
                <span class="lbl">Sigla</span>
                <input type="text" class="form-input" [(ngModel)]="area.short" maxlength="10" />
              </label>
              <label class="space-y-1">
                <span class="lbl">Dias úteis</span>
                <input type="number" min="0" max="365" class="form-input" [(ngModel)]="area.businessDays" />
              </label>
            </div>
          </div>
        }
        @if (facade.configError()) { <p class="note note-error">{{ facade.configError() }}</p> }
      </div>
      <ng-container dialog-footer>
        <button type="button" class="btn btn-ghost btn-sm mr-auto" (click)="resetDraft()" [disabled]="facade.configSaving()">Desfazer</button>
        <button type="button" class="btn btn-secondary" (click)="facade.configPanelOpen.set(false)" [disabled]="facade.configSaving()">Cancelar</button>
        <button type="button" class="btn btn-primary" (click)="save()" [disabled]="facade.configSaving()">{{ facade.configSaving() ? 'Salvando…' : 'Salvar e recalcular' }}</button>
      </ng-container>
    </app-dialog>
  `,
  styles: [`
    .area { padding: .75rem .9rem; border: 1px solid var(--cmm-border); border-left-width: 4px; border-radius: .85rem; background: var(--cmm-surface); }
    .lbl { display: block; font-size: .68rem; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--cmm-muted); }
  `],
})
export class PcpAreaConfigPanelComponent {
  readonly facade = inject(PcpOperacionalFacade);
  draft: PcpAreaConfig = cloneConfig(this.facade.areaConfig());

  constructor() {
    // Cada vez que a janela abre, começa da configuração atual.
    effect(() => {
      const open = this.facade.configPanelOpen();
      if (open) untracked(() => this.resetDraft());
    });
  }

  resetDraft(): void { this.draft = cloneConfig(this.facade.areaConfig()); }
  save(): void { this.facade.saveAreaConfig(cloneConfig(this.draft)); }
}

function cloneConfig(config: PcpAreaConfig): PcpAreaConfig {
  return { baseDateLabel: config.baseDateLabel, areas: config.areas.map((area: PcpAreaConfigItem) => ({ ...area })) };
}
