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
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-slate-800">Rodízio GOSAC</h1>
          <p class="text-slate-500 mt-1">Cadastre e edite os atendentes do rodízio de atendimento.</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            type="button"
            (click)="load()"
            [disabled]="loading()"
            class="px-4 py-2 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Atualizar
          </button>
          <button
            type="button"
            (click)="openCreate()"
            class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
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
          [class.bg-red-50]="toast()!.type === 'error'"
          [class.border-red-200]="toast()!.type === 'error'"
          [class.text-red-700]="toast()!.type === 'error'"
          [class.bg-emerald-50]="toast()!.type === 'success'"
          [class.border-emerald-200]="toast()!.type === 'success'"
          [class.text-emerald-700]="toast()!.type === 'success'"
        >
          {{ toast()!.message }}
        </div>
      }

      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <p class="text-sm font-semibold text-slate-800">Pessoas no rodízio</p>
            <p class="text-xs text-slate-500 mt-0.5">{{ items().length }} registro(s)</p>
          </div>
          <input
            type="search"
            [ngModel]="tableFilter()"
            (ngModelChange)="tableFilter.set($event)"
            placeholder="Filtrar por nome..."
            class="w-full max-w-xs px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
          />
        </div>

        @if (loading()) {
          <div class="p-12 text-center">
            <svg class="w-6 h-6 animate-spin mx-auto text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        } @else if (filteredItems().length === 0) {
          <div class="p-12 text-center text-slate-500 text-sm">
            {{ items().length === 0 ? 'Nenhuma pessoa cadastrada no rodízio.' : 'Nenhum resultado para o filtro.' }}
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Nome</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuário GOSAC</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fila</th>
                  <th class="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Da vez</th>
                  <th class="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200">
                @for (item of filteredItems(); track item.id) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-6 py-4">
                      <div class="font-medium text-slate-800">{{ item.name }}</div>
                      <div class="text-xs text-slate-400 font-mono mt-0.5 truncate max-w-[220px]" [title]="item.id">{{ item.id }}</div>
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-600">
                      {{ userLabel(item.identificacao) }}
                    </td>
                    <td class="px-6 py-4 text-sm text-slate-600">
                      {{ queueLabel(item.queueid) }}
                    </td>
                    <td class="px-6 py-4">
                      @if (item.turn) {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Sim
                        </span>
                      } @else {
                        <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                          Não
                        </span>
                      }
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-right">
                      <div class="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          (click)="openEdit(item)"
                          class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                          </svg>
                        </button>
                        <button
                          type="button"
                          (click)="askDelete(item)"
                          class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>

    @if (form().open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" (click)="closeForm()">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" (click)="$event.stopPropagation()">
          <div class="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 class="text-lg font-semibold text-slate-800">
                {{ form().mode === 'create' ? 'Adicionar pessoa' : 'Editar pessoa' }}
              </h2>
              <p class="text-xs text-slate-500 mt-0.5">
                {{ form().mode === 'create' ? 'Busque no Pontta e vincule ao usuário/fila do GOSAC.' : 'Atualize os dados do registro.' }}
              </p>
            </div>
            <button type="button" (click)="closeForm()" class="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>

          <div class="p-6 space-y-5">
            @if (form().mode === 'create') {
              <div class="space-y-2">
                <label class="block text-sm font-medium text-slate-700">Perfil no Pontta</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="ponttaQuery"
                    placeholder="Digite o nome e pressione Enter"
                    class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                    (keyup.enter)="searchPontta()"
                  />
                  <button
                    type="button"
                    (click)="searchPontta()"
                    [disabled]="searchingPontta() || !ponttaQuery.trim()"
                    class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {{ searchingPontta() ? 'Buscando...' : 'Buscar' }}
                  </button>
                </div>

                @if (ponttaResults().length > 0) {
                  <div class="border border-slate-200 rounded-lg max-h-44 overflow-y-auto divide-y divide-slate-100">
                    @for (p of ponttaResults(); track p.id) {
                      <button
                        type="button"
                        (click)="selectPontta(p)"
                        class="w-full text-left px-3 py-2.5 hover:bg-slate-50 transition-colors"
                        [class.bg-slate-100]="form().id === p.id"
                        [class.ring-1]="form().id === p.id"
                        [class.ring-slate-300]="form().id === p.id"
                      >
                        <span class="block text-sm font-medium text-slate-800">{{ p.name }}</span>
                        <span class="block text-xs text-slate-500 mt-0.5">{{ p.email || p.position || 'Sem email' }}</span>
                      </button>
                    }
                  </div>
                }

                @if (form().id) {
                  <div class="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-xs text-slate-600">
                    Selecionado: <span class="font-medium text-slate-800">{{ selectedPonttaName || 'Perfil Pontta' }}</span>
                    <span class="font-mono text-slate-400 ml-2">{{ form().id }}</span>
                  </div>
                }
              </div>
            } @else {
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">ID Pontta</label>
                <input
                  type="text"
                  [ngModel]="form().id"
                  disabled
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500 font-mono"
                />
              </div>
            }

            <div class="space-y-2">
              <label class="block text-sm font-medium text-slate-700">Usuário no GOSAC</label>
              @if (loadingLookups()) {
                <p class="text-sm text-slate-400">Carregando usuários...</p>
              } @else {
                <select
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
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
              <label class="block text-sm font-medium text-slate-700">Fila no GOSAC</label>
              @if (loadingLookups()) {
                <p class="text-sm text-slate-400">Carregando filas...</p>
              } @else {
                <select
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  [ngModel]="form().queueid"
                  (ngModelChange)="patchForm({ queueid: $event })"
                >
                  <option [ngValue]="null">Selecione a fila</option>
                  @for (q of suggestedQueues(); track q.id) {
                    <option [ngValue]="q.id">{{ q.name }} — id {{ q.id }}</option>
                  }
                </select>
                @if (form().identificacao && suggestedQueues().length === 0) {
                  <p class="text-xs text-amber-600">Este usuário não tem filas vinculadas; mostrando todas as filas.</p>
                }
              }
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">Nome exibido</label>
              <input
                type="text"
                [ngModel]="form().name"
                (ngModelChange)="patchForm({ name: $event })"
                placeholder="Nome que aparece no rodízio"
                class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              />
            </div>

            <label class="flex items-center gap-3 rounded-lg border border-slate-200 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors select-none">
              <input
                type="checkbox"
                class="h-4 w-4 rounded border-slate-300 text-slate-800 focus:ring-slate-500"
                [ngModel]="form().turn"
                (ngModelChange)="patchForm({ turn: $event })"
              />
              <div>
                <p class="text-sm font-medium text-slate-800">É a pessoa da vez</p>
                <p class="text-xs text-slate-500">Só pode haver uma pessoa marcada. Ao salvar, as demais serão desmarcadas.</p>
              </div>
            </label>
          </div>

          <div class="px-6 py-4 border-t border-slate-200 flex justify-end gap-2 bg-slate-50">
            <button
              type="button"
              (click)="closeForm()"
              class="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-white transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="save()"
              [disabled]="form().saving"
              class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ form().saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (confirm().open) {
      <div class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" (click)="closeConfirm()">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-6" (click)="$event.stopPropagation()">
          <h3 class="text-lg font-semibold text-slate-800">{{ confirm().title }}</h3>
          <p class="text-sm text-slate-500 mt-2 whitespace-pre-line">{{ confirm().message }}</p>
          <div class="mt-6 flex justify-end gap-2">
            <button
              type="button"
              (click)="closeConfirm()"
              class="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="runConfirm()"
              class="px-4 py-2 text-white text-sm font-medium rounded-lg transition-colors"
              [class.bg-red-600]="confirm().danger"
              [class.hover:bg-red-700]="confirm().danger"
              [class.bg-slate-800]="!confirm().danger"
              [class.hover:bg-slate-700]="!confirm().danger"
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
