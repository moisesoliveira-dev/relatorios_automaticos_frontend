import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RotationService,
  Rotation,
  PonttaProfile,
  GosacUser,
  GosacQueue,
} from '../../../services/rotation.service';

interface FormState {
  open: boolean;
  mode: 'create' | 'edit';
  editingId: string | null;
  id: string;
  name: string;
  identificacao: number | null;
  queueid: number | null;
  turn: boolean;
  saving: boolean;
}

interface ConfirmState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: (() => void) | null;
}

@Component({
  selector: 'app-rodizio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Rodízio GOSAC</h1>
          <p class="page-subtitle">Cadastre e edite os atendentes do rodízio de atendimento.</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" (click)="load()" [disabled]="loading()" class="btn btn-secondary">
            Atualizar
          </button>
          <button type="button" (click)="openCreate()" class="btn btn-primary">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Adicionar pessoa
          </button>
        </div>
      </div>

      @if (toast()) {
        <div
          class="px-4 py-3 rounded-lg text-sm border"
          [style.background]="toast()!.type === 'error'
            ? 'color-mix(in srgb, var(--cmm-danger) 12%, var(--cmm-panel))'
            : 'color-mix(in srgb, var(--cmm-success) 12%, var(--cmm-panel))'"
          [style.borderColor]="toast()!.type === 'error'
            ? 'color-mix(in srgb, var(--cmm-danger) 30%, transparent)'
            : 'color-mix(in srgb, var(--cmm-success) 30%, transparent)'"
          [style.color]="toast()!.type === 'error' ? 'var(--cmm-danger)' : 'var(--cmm-success)'"
        >
          {{ toast()!.message }}
        </div>
      }

      <div class="table-shell">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-b" style="border-color: var(--cmm-border);">
          <div>
            <p class="text-sm font-semibold" style="color: var(--cmm-ink);">Pessoas no rodízio</p>
            <p class="text-xs mt-0.5" style="color: var(--cmm-muted);">{{ items().length }} registro(s)</p>
          </div>
          <input
            type="search"
            [ngModel]="tableFilter()"
            (ngModelChange)="tableFilter.set($event)"
            placeholder="Filtrar por nome..."
            class="form-input w-full max-w-xs"
          />
        </div>

        @if (loading()) {
          <div class="empty-state">
            <svg class="w-6 h-6 animate-spin mx-auto" style="color: var(--cmm-muted);" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        } @else if (filteredItems().length === 0) {
          <div class="empty-state">
            {{ items().length === 0 ? 'Nenhuma pessoa cadastrada no rodízio.' : 'Nenhum resultado para o filtro.' }}
          </div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário GOSAC</th>
                <th>Fila</th>
                <th>Da vez</th>
                <th style="text-align: right;">Ações</th>
              </tr>
            </thead>
            <tbody>
              @for (item of filteredItems(); track item.id) {
                <tr>
                  <td>
                    <div class="font-medium" style="color: var(--cmm-ink);">{{ item.name }}</div>
                    <div class="text-xs font-mono mt-0.5 truncate max-w-[220px]" style="color: var(--cmm-muted);" [title]="item.id">{{ item.id }}</div>
                  </td>
                  <td style="color: var(--cmm-muted);">{{ userLabel(item.identificacao) }}</td>
                  <td style="color: var(--cmm-muted);">{{ queueLabel(item.queueid) }}</td>
                  <td>
                    @if (item.turn) {
                      <span class="badge badge-success">Sim</span>
                    } @else {
                      <span class="badge badge-neutral">Não</span>
                    }
                  </td>
                  <td class="text-right whitespace-nowrap">
                    <div class="flex items-center justify-end gap-1">
                      <button type="button" (click)="openEdit(item)" class="btn btn-ghost btn-sm" title="Editar">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                      </button>
                      <button type="button" (click)="askDelete(item)" class="btn btn-ghost btn-sm" title="Excluir" style="color: var(--cmm-danger);">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    @if (form().open) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style="background: rgba(10, 16, 24, 0.55);" (click)="closeForm()">
        <div
          class="w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden sm:rounded-xl"
          style="background: var(--cmm-panel); border: 1px solid var(--cmm-border); box-shadow: 0 18px 40px rgba(15, 26, 39, 0.18);"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between gap-3 px-5 py-4 border-b flex-shrink-0" style="border-color: var(--cmm-border);">
            <div>
              <h2 class="text-base font-semibold" style="color: var(--cmm-ink);">
                {{ form().mode === 'create' ? 'Adicionar pessoa' : 'Editar pessoa' }}
              </h2>
              <p class="text-xs mt-0.5" style="color: var(--cmm-muted);">
                {{ form().mode === 'create' ? 'Busque no Pontta e vincule ao usuário/fila do GOSAC.' : 'Atualize os dados do registro.' }}
              </p>
            </div>
            <button type="button" (click)="closeForm()" class="btn btn-ghost btn-sm">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
            @if (form().mode === 'create') {
              <div class="space-y-2">
                <label class="form-label">Perfil no Pontta</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="ponttaQuery"
                    placeholder="Digite o nome e pressione Enter"
                    class="form-input flex-1 min-w-0" style="width: auto;"
                    (keyup.enter)="searchPontta()"
                  />
                  <button
                    type="button"
                    (click)="searchPontta()"
                    [disabled]="searchingPontta() || !ponttaQuery.trim()"
                    class="btn btn-primary"
                  >
                    {{ searchingPontta() ? 'Buscando...' : 'Buscar' }}
                  </button>
                </div>

                @if (ponttaResults().length > 0) {
                  <div class="space-y-1.5">
                    <p class="text-xs" style="color: var(--cmm-muted);">
                      {{ ponttaResults().length }} resultado(s) — clique para selecionar
                    </p>
                    <div class="space-y-2 max-h-52 overflow-y-auto pr-0.5">
                      @for (p of ponttaResults(); track p.id) {
                        <button
                          type="button"
                          (click)="selectPontta(p)"
                          class="w-full text-left px-3 py-3 rounded-lg transition-colors flex items-start gap-3"
                          [style.background]="form().id === p.id ? 'var(--cmm-accent-soft)' : 'var(--cmm-panel)'"
                          [style.border]="form().id === p.id ? '2px solid var(--cmm-accent)' : '1px solid var(--cmm-border)'"
                          [attr.aria-pressed]="form().id === p.id"
                        >
                          <span
                            class="mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            [style.background]="form().id === p.id ? 'var(--cmm-accent)' : 'transparent'"
                            [style.border]="form().id === p.id ? 'none' : '2px solid var(--cmm-border)'"
                            [style.color]="form().id === p.id ? '#042f2e' : 'transparent'"
                          >
                            @if (form().id === p.id) {
                              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/>
                              </svg>
                            }
                          </span>
                          <span class="min-w-0 flex-1">
                            <span class="flex items-center gap-2 flex-wrap">
                              <span class="block text-sm font-medium" style="color: var(--cmm-ink);">{{ p.name }}</span>
                              @if (form().id === p.id) {
                                <span class="badge badge-accent">Selecionado</span>
                              }
                            </span>
                            <span class="block text-xs mt-0.5" style="color: var(--cmm-muted);">{{ p.email || p.position || 'Sem email' }}</span>
                          </span>
                        </button>
                      }
                    </div>
                  </div>
                }

                @if (form().id) {
                  <div
                    class="flex items-start gap-3 rounded-lg px-3 py-3"
                    style="background: var(--cmm-accent-soft); border: 1px solid color-mix(in srgb, var(--cmm-accent) 35%, transparent);"
                  >
                    <span
                      class="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                      style="background: var(--cmm-accent); color: #042f2e;"
                    >
                      {{ (selectedPonttaName || form().name || '?').slice(0, 1).toUpperCase() }}
                    </span>
                    <div class="min-w-0">
                      <p class="text-xs font-medium uppercase tracking-wide" style="color: var(--cmm-accent);">Perfil selecionado</p>
                      <p class="text-sm font-semibold" style="color: var(--cmm-ink);">{{ selectedPonttaName || form().name || 'Perfil Pontta' }}</p>
                      <p class="text-xs font-mono mt-0.5 truncate" style="color: var(--cmm-muted);">{{ form().id }}</p>
                    </div>
                  </div>
                }
              </div>
            } @else {
              <div>
                <label class="form-label">ID Pontta</label>
                <input type="text" [ngModel]="form().id" disabled class="form-input font-mono opacity-70" />
              </div>
            }

            <div class="space-y-2">
              <label class="form-label">Usuário no GOSAC</label>
              @if (loadingLookups()) {
                <p class="text-sm" style="color: var(--cmm-muted);">Carregando usuários...</p>
              } @else {
                <select
                  class="form-input"
                  [ngModel]="form().identificacao"
                  (ngModelChange)="onUserChange($event)"
                >
                  <option [ngValue]="null">Selecione o usuário</option>
                  @for (u of gosacUsers(); track u.id) {
                    <option [ngValue]="u.id">{{ u.name }} — id {{ u.id }}</option>
                  }
                </select>
              }
            </div>

            <div class="space-y-2">
              <label class="form-label">Fila no GOSAC</label>
              @if (loadingLookups()) {
                <p class="text-sm" style="color: var(--cmm-muted);">Carregando filas...</p>
              } @else {
                <select
                  class="form-input"
                  [ngModel]="form().queueid"
                  (ngModelChange)="patchForm({ queueid: $event })"
                >
                  <option [ngValue]="null">Selecione a fila</option>
                  @for (q of suggestedQueues(); track q.id) {
                    <option [ngValue]="q.id">{{ q.name }} — id {{ q.id }}</option>
                  }
                </select>
                @if (form().identificacao && suggestedQueues().length === 0) {
                  <p class="text-xs" style="color: var(--cmm-warning);">Este usuário não tem filas vinculadas; mostrando todas as filas.</p>
                }
              }
            </div>

            <div>
              <label class="form-label">Nome exibido</label>
              <input
                type="text"
                [ngModel]="form().name"
                (ngModelChange)="patchForm({ name: $event })"
                placeholder="Nome que aparece no rodízio"
                class="form-input"
              />
            </div>

            <label class="flex items-center gap-3 panel panel-pad cursor-pointer select-none" style="padding: 0.875rem 1rem;">
              <input
                type="checkbox"
                class="h-4 w-4 rounded"
                style="accent-color: var(--cmm-accent);"
                [ngModel]="form().turn"
                (ngModelChange)="patchForm({ turn: $event })"
              />
              <div>
                <p class="text-sm font-medium" style="color: var(--cmm-ink);">É a pessoa da vez</p>
                <p class="text-xs" style="color: var(--cmm-muted);">Só pode haver uma pessoa marcada. Ao salvar, as demais serão desmarcadas.</p>
              </div>
            </label>
          </div>

          <div class="flex justify-end gap-2 px-5 py-4 border-t flex-shrink-0" style="border-color: var(--cmm-border); background: color-mix(in srgb, var(--cmm-surface) 70%, var(--cmm-panel));">
            <button type="button" (click)="closeForm()" class="btn btn-secondary">Cancelar</button>
            <button type="button" (click)="save()" [disabled]="form().saving" class="btn btn-primary">
              {{ form().saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (confirm().open) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);" (click)="closeConfirm()">
        <div class="w-full max-w-md panel panel-pad" (click)="$event.stopPropagation()">
          <h3 class="text-base font-semibold" style="color: var(--cmm-ink);">{{ confirm().title }}</h3>
          <p class="text-sm mt-2 whitespace-pre-line" style="color: var(--cmm-muted);">{{ confirm().message }}</p>
          <div class="mt-6 flex justify-end gap-2">
            <button type="button" (click)="closeConfirm()" class="btn btn-secondary">Cancelar</button>
            <button
              type="button"
              (click)="runConfirm()"
              class="btn"
              [class.btn-danger]="confirm().danger"
              [class.btn-primary]="!confirm().danger"
            >
              {{ confirm().confirmLabel }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class RodizioComponent implements OnInit {
  items = signal<Rotation[]>([]);
  loading = signal(false);
  loadingLookups = signal(false);
  searchingPontta = signal(false);

  ponttaQuery = '';
  tableFilter = signal('');
  selectedPonttaName = '';

  ponttaResults = signal<PonttaProfile[]>([]);
  gosacUsers = signal<GosacUser[]>([]);
  gosacQueues = signal<GosacQueue[]>([]);
  toast = signal<{ message: string; type: 'error' | 'success' } | null>(null);

  filteredItems = computed(() => {
    const q = this.tableFilter().trim().toLowerCase();
    if (!q) return this.items();
    return this.items().filter((item) =>
      [item.name, String(item.identificacao), String(item.queueid), item.id]
        .join(' ')
        .toLowerCase()
        .includes(q),
    );
  });

  suggestedQueues = computed(() => {
    const all = this.gosacQueues();
    const userId = this.form().identificacao;
    if (userId == null) return all;
    const user = this.gosacUsers().find((u) => u.id === userId);
    const userQueueIds = new Set((user?.queues || []).map((q) => q.id));
    if (userQueueIds.size === 0) return all;
    const filtered = all.filter((q) => userQueueIds.has(q.id));
    return filtered.length > 0 ? filtered : all;
  });

  form = signal<FormState>({
    open: false,
    mode: 'create',
    editingId: null,
    id: '',
    name: '',
    identificacao: null,
    queueid: null,
    turn: false,
    saving: false,
  });

  confirm = signal<ConfirmState>({
    open: false,
    title: '',
    message: '',
    confirmLabel: 'Confirmar',
    danger: false,
    onConfirm: null,
  });

  constructor(private readonly rotationService: RotationService) {}

  ngOnInit(): void {
    this.load();
    this.loadLookups();
  }

  load(): void {
    this.loading.set(true);
    this.rotationService.findAll().subscribe({
      next: (data) => {
        this.items.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.showToast(err.error?.message || 'Erro ao carregar rodízio', 'error');
      },
    });
  }

  loadLookups(): void {
    this.loadingLookups.set(true);
    this.rotationService.listGosacUsers().subscribe({
      next: (users) => this.gosacUsers.set(users || []),
      error: () => this.showToast('Erro ao carregar usuários GOSAC', 'error'),
    });
    this.rotationService.listGosacQueues().subscribe({
      next: (queues) => {
        this.gosacQueues.set(queues || []);
        this.loadingLookups.set(false);
      },
      error: () => {
        this.loadingLookups.set(false);
        this.showToast('Erro ao carregar filas GOSAC', 'error');
      },
    });
  }

  queueLabel(queueid: number): string {
    const q = this.gosacQueues().find((x) => x.id === queueid);
    return q ? `${q.name} (${queueid})` : `Fila ${queueid}`;
  }

  userLabel(identificacao: number): string {
    const u = this.gosacUsers().find((x) => x.id === identificacao);
    return u ? `${u.name} (${identificacao})` : `ID ${identificacao}`;
  }

  openCreate(): void {
    this.ponttaQuery = '';
    this.selectedPonttaName = '';
    this.ponttaResults.set([]);
    this.form.set({
      open: true,
      mode: 'create',
      editingId: null,
      id: '',
      name: '',
      identificacao: null,
      queueid: null,
      turn: false,
      saving: false,
    });
  }

  openEdit(item: Rotation): void {
    this.ponttaResults.set([]);
    this.selectedPonttaName = item.name;
    this.form.set({
      open: true,
      mode: 'edit',
      editingId: item.id,
      id: item.id,
      name: item.name,
      identificacao: item.identificacao,
      queueid: item.queueid,
      turn: !!item.turn,
      saving: false,
    });
  }

  closeForm(): void {
    this.form.update((f) => ({ ...f, open: false, saving: false }));
  }

  patchForm(partial: Partial<FormState>): void {
    this.form.update((f) => ({ ...f, ...partial }));
  }

  searchPontta(): void {
    const q = this.ponttaQuery.trim();
    if (!q) return;
    this.searchingPontta.set(true);
    this.rotationService.searchPonttaProfiles(q).subscribe({
      next: (results) => {
        this.ponttaResults.set(results || []);
        this.searchingPontta.set(false);
        if (!results?.length) {
          this.showToast('Nenhum perfil encontrado no Pontta', 'error');
        }
      },
      error: (err) => {
        this.searchingPontta.set(false);
        this.showToast(err.error?.message || 'Erro ao buscar no Pontta', 'error');
      },
    });
  }

  selectPontta(profile: PonttaProfile): void {
    this.selectedPonttaName = profile.name;
    this.patchForm({
      id: profile.id,
      name: this.form().name || profile.name,
    });
  }

  onUserChange(userId: number | null): void {
    if (userId == null) {
      this.patchForm({ identificacao: null });
      return;
    }
    const user = this.gosacUsers().find((u) => u.id === userId);
    const preferredQueue =
      this.form().queueid ??
      user?.defaultQueueId ??
      user?.queues?.[0]?.id ??
      null;

    this.patchForm({
      identificacao: userId,
      name: user?.name || this.form().name,
      queueid: preferredQueue,
    });
  }

  save(): void {
    const f = this.form();
    if (!f.id || !f.name || f.identificacao == null || f.queueid == null) {
      this.showToast('Selecione perfil Pontta, usuário GOSAC e fila', 'error');
      return;
    }

    const currentTurn = this.items().find(
      (item) => item.turn && item.id !== (f.editingId || f.id),
    );

    if (f.turn && currentTurn) {
      this.confirm.set({
        open: true,
        title: 'Alterar pessoa da vez?',
        message: `Atualmente a vez é de "${currentTurn.name}".\n\nDeseja passar a vez para "${f.name}"?`,
        confirmLabel: 'Sim, alterar',
        danger: false,
        onConfirm: () => {
          this.closeConfirm();
          this.persistSave();
        },
      });
      return;
    }

    this.persistSave();
  }

  private persistSave(): void {
    const f = this.form();
    this.patchForm({ saving: true });

    if (f.mode === 'create') {
      this.rotationService
        .create({
          id: f.id,
          name: f.name,
          identificacao: f.identificacao!,
          queueid: f.queueid!,
          turn: f.turn,
        })
        .subscribe({
          next: () => {
            this.closeForm();
            this.showToast('Pessoa adicionada ao rodízio', 'success');
            this.load();
          },
          error: (err) => {
            this.patchForm({ saving: false });
            this.showToast(err.error?.message || 'Erro ao criar', 'error');
          },
        });
      return;
    }

    this.rotationService
      .update(f.editingId!, {
        name: f.name,
        identificacao: f.identificacao!,
        queueid: f.queueid!,
        turn: f.turn,
      })
      .subscribe({
        next: () => {
          this.closeForm();
          this.showToast('Registro atualizado', 'success');
          this.load();
        },
        error: (err) => {
          this.patchForm({ saving: false });
          this.showToast(err.error?.message || 'Erro ao atualizar', 'error');
        },
      });
  }

  askDelete(item: Rotation): void {
    this.confirm.set({
      open: true,
      title: 'Excluir do rodízio',
      message: `Remover "${item.name}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      danger: true,
      onConfirm: () => {
        this.rotationService.remove(item.id).subscribe({
          next: () => {
            this.closeConfirm();
            this.showToast('Registro excluído', 'success');
            this.load();
          },
          error: (err) => {
            this.closeConfirm();
            this.showToast(err.error?.message || 'Erro ao excluir', 'error');
          },
        });
      },
    });
  }

  closeConfirm(): void {
    this.confirm.set({
      open: false,
      title: '',
      message: '',
      confirmLabel: 'Confirmar',
      danger: false,
      onConfirm: null,
    });
  }

  runConfirm(): void {
    this.confirm().onConfirm?.();
  }

  private showToast(message: string, type: 'error' | 'success'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
