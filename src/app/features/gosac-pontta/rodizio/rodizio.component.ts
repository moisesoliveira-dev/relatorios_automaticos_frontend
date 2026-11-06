import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { RotationService, Rotation, GosacUser, GosacQueue } from '../../../services/rotation.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ModalService } from '../../../shared/services/modal.service';
import { DialogComponent } from '../../../shared/components/dialog.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { PonttaPerfil, PonttaProfilePickerComponent } from '../components/pontta-profile-picker.component';

interface FormState {
  mode: 'create' | 'edit';
  editingId: string | null;
  id: string;
  name: string;
  identificacao: number | null;
  queueid: number | null;
  turn: boolean;
}

const VAZIO: FormState = { mode: 'create', editingId: null, id: '', name: '', identificacao: null, queueid: null, turn: false };

/** Rodízio GOSAC: quem atende da vez. Uma lista, uma busca, uma janela para adicionar ou editar. */
@Component({
  selector: 'app-rodizio',
  standalone: true,
  imports: [FormsModule, DialogComponent, IconComponent, PonttaProfilePickerComponent],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Rodízio GOSAC</h1>
          <p class="page-subtitle">Atendentes que recebem as conversas por vez.</p>
        </div>
        <button type="button" (click)="openCreate()" class="btn btn-primary"><app-icon name="mais" [size]="16" /> Adicionar pessoa</button>
      </div>

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
          <div class="empty-state">{{ items().length === 0 ? 'Nenhuma pessoa no rodízio.' : 'Nenhum resultado para o filtro.' }}</div>
        } @else {
          <table>
            <thead>
              <tr><th>Nome</th><th>Usuário GOSAC</th><th>Fila</th><th>Da vez</th><th style="text-align: right;"></th></tr>
            </thead>
            <tbody>
              @for (item of filteredItems(); track item.id) {
                <tr>
                  <td>
                    <div class="font-medium">{{ item.name }}</div>
                    <div class="text-xs font-mono mt-0.5 truncate max-w-[220px]" style="color: var(--cmm-muted);" [title]="item.id">{{ item.id }}</div>
                  </td>
                  <td style="color: var(--cmm-muted);">{{ userLabel(item.identificacao) }}</td>
                  <td style="color: var(--cmm-muted);">{{ queueLabel(item.queueid) }}</td>
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

    <app-dialog [open]="formAberto()" [title]="form().mode === 'create' ? 'Adicionar pessoa' : 'Editar pessoa'" [subtitle]="form().mode === 'create' ? 'Busque no Pontta e vincule ao usuário e à fila do GOSAC.' : form().name" [closable]="!saving()" (closed)="closeForm()">
      <div class="space-y-5">
        @if (form().mode === 'create') {
          <app-pontta-profile-picker [buscarFn]="buscarPontta" [selecionadoId]="form().id" [selecionadoNome]="selectedPonttaName" (escolhido)="selectPontta($event)" />
        } @else {
          <div>
            <label class="form-label">ID Pontta</label>
            <input type="text" [value]="form().id" disabled class="form-input font-mono" />
          </div>
        }

        <div class="grid sm:grid-cols-2 gap-4">
          <div>
            <label class="form-label" for="rg-user">Usuário no GOSAC</label>
            @if (loadingLookups()) { <div class="loading-block py-2"><span class="spinner spinner-sm"></span></div> } @else {
              <select id="rg-user" class="form-input" [ngModel]="form().identificacao" (ngModelChange)="onUserChange($event)">
                <option [ngValue]="null">Selecione</option>
                @for (u of gosacUsers(); track u.id) { <option [ngValue]="u.id">{{ u.name }}</option> }
              </select>
            }
          </div>
          <div>
            <label class="form-label" for="rg-queue">Fila no GOSAC</label>
            @if (loadingLookups()) { <div class="loading-block py-2"><span class="spinner spinner-sm"></span></div> } @else {
              <select id="rg-queue" class="form-input" [ngModel]="form().queueid" (ngModelChange)="patchForm({ queueid: $event })">
                <option [ngValue]="null">Selecione</option>
                @for (q of suggestedQueues(); track q.id) { <option [ngValue]="q.id">{{ q.name }}</option> }
              </select>
              @if (form().identificacao && suggestedQueues().length === gosacQueues().length && gosacQueues().length) {
                <p class="text-xs mt-1" style="color: var(--cmm-muted);">Este usuário não tem filas vinculadas; mostrando todas.</p>
              }
            }
          </div>
        </div>

        <div>
          <label class="form-label" for="rg-name">Nome exibido</label>
          <input id="rg-name" type="text" [ngModel]="form().name" (ngModelChange)="patchForm({ name: $event })" placeholder="Como aparece no rodízio" class="form-input" />
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
export class RodizioComponent implements OnInit {
  private readonly rotationService = inject(RotationService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(ModalService);

  items = signal<Rotation[]>([]);
  loading = signal(false);
  loadingLookups = signal(false);
  saving = signal(false);
  tableFilter = signal('');
  selectedPonttaName = '';
  gosacUsers = signal<GosacUser[]>([]);
  gosacQueues = signal<GosacQueue[]>([]);
  formAberto = signal(false);
  form = signal<FormState>({ ...VAZIO });

  buscarPontta = (q: string): Observable<PonttaPerfil[]> => this.rotationService.searchPonttaProfiles(q);

  daVez = computed(() => this.items().find((i) => i.turn) ?? null);

  filteredItems = computed(() => {
    const q = this.tableFilter().trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter((item) => [item.name, String(item.identificacao), String(item.queueid), item.id].join(' ').toLowerCase().includes(q));
  });

  suggestedQueues = computed(() => {
    const all = this.gosacQueues();
    const userId = this.form().identificacao;
    if (userId == null) return all;
    const user = this.gosacUsers().find((u) => u.id === userId);
    const ids = new Set((user?.queues || []).map((q) => q.id));
    const filtered = ids.size ? all.filter((q) => ids.has(q.id)) : [];
    return filtered.length ? filtered : all;
  });

  ngOnInit(): void {
    this.load();
    this.loadLookups();
  }

  load(): void {
    this.loading.set(true);
    this.rotationService.findAll().subscribe({
      next: (data) => { this.items.set(data); this.loading.set(false); },
      error: (err) => { this.loading.set(false); this.toast.error(err.error?.message || 'Não foi possível carregar o rodízio.'); },
    });
  }

  loadLookups(): void {
    this.loadingLookups.set(true);
    this.rotationService.listGosacUsers().subscribe({
      next: (users) => this.gosacUsers.set(users || []),
      error: () => this.toast.error('Não foi possível carregar os usuários do GOSAC.'),
    });
    this.rotationService.listGosacQueues().subscribe({
      next: (queues) => { this.gosacQueues.set(queues || []); this.loadingLookups.set(false); },
      error: () => { this.loadingLookups.set(false); this.toast.error('Não foi possível carregar as filas do GOSAC.'); },
    });
  }

  queueLabel(queueid: number): string { return this.gosacQueues().find((x) => x.id === queueid)?.name ?? `Fila ${queueid}`; }
  userLabel(identificacao: number): string { return this.gosacUsers().find((x) => x.id === identificacao)?.name ?? `ID ${identificacao}`; }

  openCreate(): void {
    this.selectedPonttaName = '';
    this.form.set({ ...VAZIO });
    this.formAberto.set(true);
  }

  openEdit(item: Rotation): void {
    this.selectedPonttaName = item.name;
    this.form.set({ mode: 'edit', editingId: item.id, id: item.id, name: item.name, identificacao: item.identificacao, queueid: item.queueid, turn: !!item.turn });
    this.formAberto.set(true);
  }

  closeForm(): void { if (!this.saving()) this.formAberto.set(false); }
  patchForm(partial: Partial<FormState>): void { this.form.update((f) => ({ ...f, ...partial })); }

  selectPontta(p: PonttaPerfil): void {
    this.selectedPonttaName = p.name;
    this.patchForm({ id: p.cooperatorId || p.id, name: this.form().name || p.name });
  }

  onUserChange(userId: number | null): void {
    if (userId == null) { this.patchForm({ identificacao: null }); return; }
    const user = this.gosacUsers().find((u) => u.id === userId);
    this.patchForm({ identificacao: userId, name: this.form().name || user?.name || '', queueid: this.form().queueid ?? user?.defaultQueueId ?? user?.queues?.[0]?.id ?? null });
  }

  async save(): Promise<void> {
    const f = this.form();
    if (!f.id || !f.name.trim() || f.identificacao == null || f.queueid == null) {
      this.toast.warning('Selecione o perfil no Pontta, o usuário e a fila do GOSAC.');
      return;
    }
    const atual = this.items().find((i) => i.turn && i.id !== (f.editingId || f.id));
    if (f.turn && atual && !(await this.modal.confirm('Passar a vez?', `Hoje a vez é de ${atual.name}. Passa para ${f.name}?`, 'Passar a vez'))) return;
    this.persist();
  }

  private persist(): void {
    const f = this.form();
    this.saving.set(true);
    const done = (msg: string) => { this.saving.set(false); this.formAberto.set(false); this.toast.success(msg); this.load(); };
    const fail = (err: { error?: { message?: string } }) => { this.saving.set(false); this.toast.error(err.error?.message || 'Não foi possível salvar.'); };
    if (f.mode === 'create') {
      this.rotationService.create({ id: f.id, name: f.name.trim(), identificacao: f.identificacao!, queueid: f.queueid!, turn: f.turn }).subscribe({ next: () => done('Pessoa adicionada ao rodízio.'), error: fail });
    } else {
      this.rotationService.update(f.editingId!, { name: f.name.trim(), identificacao: f.identificacao!, queueid: f.queueid!, turn: f.turn }).subscribe({ next: () => done('Pessoa atualizada.'), error: fail });
    }
  }

  async passarVez(item: Rotation): Promise<void> {
    const atual = this.daVez();
    if (!(await this.modal.confirm('Passar a vez?', atual ? `Hoje a vez é de ${atual.name}. Passa para ${item.name}?` : `${item.name} passa a ser a pessoa da vez.`, 'Passar a vez'))) return;
    this.rotationService.update(item.id, { turn: true }).subscribe({
      next: () => { this.toast.success(`Agora a vez é de ${item.name}.`); this.load(); },
      error: (err) => this.toast.error(err.error?.message || 'Não foi possível passar a vez.'),
    });
  }

  async askDelete(item: Rotation): Promise<void> {
    if (!(await this.modal.confirm('Excluir do rodízio?', `${item.name} deixa de receber conversas por vez.`, 'Excluir'))) return;
    this.rotationService.remove(item.id).subscribe({
      next: () => { this.toast.success('Pessoa excluída.'); this.load(); },
      error: (err) => this.toast.error(err.error?.message || 'Não foi possível excluir.'),
    });
  }
}
