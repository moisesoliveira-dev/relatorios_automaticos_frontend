import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { PonttaRotationApiService, PonttaRotation, PonttaPcpArea, PCP_AREA_OPTIONS } from '../../../services/pontta-rotation.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ModalService } from '../../../shared/services/modal.service';
import { DialogComponent } from '../../../shared/components/dialog.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { PonttaPerfil, PonttaProfilePickerComponent } from '../components/pontta-profile-picker.component';

interface FormState {
  mode: 'create' | 'edit';
  editingId: number | null;
  projetistaid: string;
  name: string;
  turn: boolean;
  pcpArea: PonttaPcpArea | null;
}

const VAZIO: FormState = { mode: 'create', editingId: null, projetistaid: '', name: '', turn: false, pcpArea: null };

/** Rodízio Pontta: projetistas que recebem as tarefas por vez, com a área do PCP de cada um. */
@Component({
  selector: 'app-rodizio-pontta',
  standalone: true,
  imports: [FormsModule, DialogComponent, IconComponent, PonttaProfilePickerComponent],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Rodízio Pontta</h1>
          <p class="page-subtitle">Projetistas que recebem as tarefas automáticas por vez.</p>
        </div>
        <button type="button" (click)="openCreate()" class="btn btn-primary"><app-icon name="mais" [size]="16" /> Adicionar pessoa</button>
      </div>

      <label class="panel panel-pad switch-row cursor-pointer">
        <span>Atribuir por área do PCP<small>Ligado, cada ambiente do pedido (molhada, íntima, social) vai para o projetista responsável por aquela área. Desligado, vale o rodízio geral.</small></span>
        <button type="button" role="switch" class="switch" [class.switch-on]="assignByPcpArea()" [attr.aria-checked]="assignByPcpArea()" [disabled]="savingAssignSetting()" (click)="onAssignByPcpAreaChange(!assignByPcpArea())"><span class="switch-knob"></span></button>
      </label>

      <div class="table-shell">
        <div class="list-head">
          <span class="list-head-title">
            @if (daVez(); as v) { Da vez: <b>{{ v.name }}</b> } @else { Ninguém marcado como da vez }
            <small> · {{ items().length }} {{ items().length === 1 ? 'pessoa' : 'pessoas' }}</small>
          </span>
          <div class="search-field" style="min-width: 14rem;">
            <app-icon name="busca" [size]="16" />
            <input type="search" class="form-input !min-h-9" [ngModel]="tableFilter()" (ngModelChange)="tableFilter.set($event)" placeholder="Filtrar por nome" aria-label="Filtrar por nome" />
          </div>
        </div>

        @if (loading()) {
          <div class="loading-block"><span class="spinner"></span></div>
        } @else if (filteredItems().length === 0) {
          <div class="empty-state">{{ items().length === 0 ? 'Nenhuma pessoa no rodízio Pontta.' : 'Nenhum resultado para o filtro.' }}</div>
        } @else {
          <table>
            <thead>
              <tr><th>Nome</th><th>Área PCP</th><th>Da vez</th><th style="text-align: right;"></th></tr>
            </thead>
            <tbody>
              @for (item of filteredItems(); track item.id) {
                <tr>
                  <td>
                    <div class="font-medium">{{ item.name }}</div>
                    <div class="text-xs font-mono mt-0.5 truncate max-w-[240px]" style="color: var(--cmm-muted);" [title]="item.projetistaid">{{ item.projetistaid }}</div>
                  </td>
                  <td>
                    @if (areaMeta(item.pcpArea); as meta) {
                      <span class="inline-flex items-center gap-1.5 text-sm font-medium" [style.color]="meta.color"><span class="w-2 h-2 rounded-full" [style.background]="meta.color"></span>{{ meta.label }}</span>
                    } @else { <span class="text-sm" style="color: var(--cmm-muted);">Rodízio geral</span> }
                  </td>
                  <td>
                    @if (item.turn) { <span class="state state-on">Da vez</span> } @else { <button type="button" class="btn btn-ghost btn-sm" (click)="passarVez(item)">Passar a vez</button> }
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1">
                      <button type="button" (click)="openEdit(item)" class="icon-btn" title="Editar" aria-label="Editar"><app-icon name="lapis" [size]="16" /></button>
                      <button type="button" (click)="askDelete(item)" class="icon-btn icon-danger" title="Excluir" aria-label="Excluir"><app-icon name="lixeira" [size]="16" /></button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <app-dialog [open]="formAberto()" [title]="form().mode === 'create' ? 'Adicionar pessoa' : 'Editar pessoa'" [subtitle]="form().mode === 'create' ? 'Busque o perfil no Pontta para preencher nome e projetista.' : form().name" [closable]="!saving()" (closed)="closeForm()">
      <div class="space-y-5">
        <app-pontta-profile-picker [buscarFn]="buscarPontta" [selecionadoId]="form().projetistaid" [selecionadoNome]="form().name" (escolhido)="selectPontta($event)" />

        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="form-label" for="rp-name">Nome exibido</label>
            <input id="rp-name" type="text" [ngModel]="form().name" (ngModelChange)="patchForm({ name: $event })" placeholder="Como aparece no rodízio" class="form-input" />
          </div>
          <div>
            <label class="form-label" for="rp-area">Área PCP</label>
            <select id="rp-area" class="form-input" [ngModel]="form().pcpArea ?? ''" (ngModelChange)="patchForm({ pcpArea: $event ? $event : null })">
              <option value="">Rodízio geral (sem área)</option>
              @for (opt of areaOptions; track opt.key) { <option [value]="opt.key">{{ opt.label }}</option> }
            </select>
          </div>
        </div>

        <label class="switch-row">
          <span>É a pessoa da vez<small>Só uma pessoa pode ser a da vez. Ao salvar, as demais são desmarcadas.</small></span>
          <button type="button" role="switch" class="switch" [class.switch-on]="form().turn" [attr.aria-checked]="form().turn" (click)="patchForm({ turn: !form().turn })"><span class="switch-knob"></span></button>
        </label>
      </div>
      <ng-container dialog-footer>
        <button type="button" (click)="closeForm()" class="btn btn-secondary" [disabled]="saving()">Cancelar</button>
        <button type="button" (click)="save()" [disabled]="saving()" class="btn btn-primary">{{ saving() ? 'Salvando…' : 'Salvar' }}</button>
      </ng-container>
    </app-dialog>
  `,
})
export class RodizioPonttaComponent implements OnInit {
  private readonly api = inject(PonttaRotationApiService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(ModalService);

  readonly areaOptions = PCP_AREA_OPTIONS;
  items = signal<PonttaRotation[]>([]);
  loading = signal(false);
  saving = signal(false);
  assignByPcpArea = signal(false);
  savingAssignSetting = signal(false);
  tableFilter = signal('');
  formAberto = signal(false);
  form = signal<FormState>({ ...VAZIO });

  buscarPontta = (q: string): Observable<PonttaPerfil[]> => this.api.searchPonttaProfiles(q);

  daVez = computed(() => this.items().find((i) => i.turn) ?? null);
  filteredItems = computed(() => {
    const q = this.tableFilter().trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter((item) => [item.name, item.projetistaid, item.pcpArea || '', String(item.id)].join(' ').toLowerCase().includes(q));
  });

  ngOnInit(): void {
    this.load();
    this.api.getAssignByPcpArea().subscribe({ next: (res) => this.assignByPcpArea.set(!!res.enabled), error: () => this.assignByPcpArea.set(false) });
  }

  areaMeta(area: PonttaPcpArea | null | undefined) { return area ? this.areaOptions.find((o) => o.key === area) ?? null : null; }

  onAssignByPcpAreaChange(enabled: boolean): void {
    this.savingAssignSetting.set(true);
    this.api.setAssignByPcpArea(enabled).subscribe({
      next: (res) => {
        this.assignByPcpArea.set(!!res.enabled);
        this.savingAssignSetting.set(false);
        this.toast.success(res.enabled ? 'Atribuição por área ligada.' : 'Atribuição por área desligada. Vale o rodízio geral.');
      },
      error: (err) => { this.savingAssignSetting.set(false); this.toast.error(err.error?.message || 'Não foi possível salvar.'); },
    });
  }

  load(): void {
    this.loading.set(true);
    this.api.findAll().subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toast.error(err.error?.message || 'Não foi possível carregar o rodízio.'); },
    });
  }

  openCreate(): void { this.form.set({ ...VAZIO }); this.formAberto.set(true); }
  openEdit(item: PonttaRotation): void {
    this.form.set({ mode: 'edit', editingId: item.id, projetistaid: item.projetistaid, name: item.name, turn: !!item.turn, pcpArea: item.pcpArea || null });
    this.formAberto.set(true);
  }
  closeForm(): void { if (!this.saving()) this.formAberto.set(false); }
  patchForm(partial: Partial<FormState>): void { this.form.update((f) => ({ ...f, ...partial })); }

  selectPontta(p: PonttaPerfil): void { this.patchForm({ projetistaid: p.cooperatorId || p.id, name: p.name }); }

  async save(): Promise<void> {
    const f = this.form();
    if (!f.projetistaid || !f.name.trim()) { this.toast.warning('Selecione um perfil no Pontta.'); return; }
    const atual = this.items().find((i) => i.turn && i.id !== f.editingId);
    if (f.turn && atual && !(await this.modal.confirm('Passar a vez?', `Hoje a vez é de ${atual.name}. Passa para ${f.name}?`, 'Passar a vez'))) return;
    this.saving.set(true);
    const payload = { projetistaid: f.projetistaid, name: f.name.trim(), turn: f.turn, turn_v: true, pcpArea: f.pcpArea };
    const done = (msg: string) => { this.saving.set(false); this.formAberto.set(false); this.toast.success(msg); this.load(); };
    const fail = (err: { error?: { message?: string } }) => { this.saving.set(false); this.toast.error(err.error?.message || 'Não foi possível salvar.'); };
    if (f.mode === 'create') this.api.create(payload).subscribe({ next: () => done('Pessoa adicionada ao rodízio.'), error: fail });
    else this.api.update(f.editingId!, payload).subscribe({ next: () => done('Pessoa atualizada.'), error: fail });
  }

  async passarVez(item: PonttaRotation): Promise<void> {
    const atual = this.daVez();
    if (!(await this.modal.confirm('Passar a vez?', atual ? `Hoje a vez é de ${atual.name}. Passa para ${item.name}?` : `${item.name} passa a ser a pessoa da vez.`, 'Passar a vez'))) return;
    this.api.update(item.id, { turn: true }).subscribe({
      next: () => { this.toast.success(`Agora a vez é de ${item.name}.`); this.load(); },
      error: (err) => this.toast.error(err.error?.message || 'Não foi possível passar a vez.'),
    });
  }

  async askDelete(item: PonttaRotation): Promise<void> {
    if (!(await this.modal.confirm('Excluir do rodízio?', `${item.name} deixa de receber tarefas por vez.`, 'Excluir'))) return;
    this.api.remove(item.id).subscribe({
      next: () => { this.toast.success('Pessoa excluída.'); this.load(); },
      error: (err) => this.toast.error(err.error?.message || 'Não foi possível excluir.'),
    });
  }
}
