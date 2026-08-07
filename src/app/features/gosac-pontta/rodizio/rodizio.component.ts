import { Component, OnInit, signal } from '@angular/core';
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
  onConfirm: (() => void) | null;
}

@Component({
  selector: 'app-rodizio',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-slate-800">Rodízio GOSAC</h1>
          <p class="text-sm text-slate-500 mt-1">
            Gerencie os atendentes do rodízio (tb_rotation). O campo turn é controlado por outra API.
          </p>
        </div>
        <button
          (click)="openCreate()"
          class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
        >
          Novo registro
        </button>
      </div>

      @if (toast()) {
        <div
          class="px-4 py-3 rounded-lg text-sm"
          [class.bg-red-50]="toast()!.type === 'error'"
          [class.text-red-700]="toast()!.type === 'error'"
          [class.bg-emerald-50]="toast()!.type === 'success'"
          [class.text-emerald-700]="toast()!.type === 'success'"
        >
          {{ toast()!.message }}
        </div>
      }

      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span class="text-sm font-semibold text-slate-700">
            Registros <span class="text-slate-400 font-normal">({{ items().length }})</span>
          </span>
          <button (click)="load()" class="text-xs text-slate-500 hover:text-slate-800 transition-colors">
            Atualizar
          </button>
        </div>

        @if (loading()) {
          <div class="p-10 text-center">
            <svg class="w-5 h-5 animate-spin mx-auto text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        } @else if (items().length === 0) {
          <div class="p-10 text-center text-slate-400 text-sm">Nenhum registro no rodízio.</div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 border-b border-slate-200 text-left text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  <th class="px-4 py-2.5 font-semibold">Nome</th>
                  <th class="px-4 py-2.5 font-semibold">ID Pontta</th>
                  <th class="px-4 py-2.5 font-semibold">Identificação</th>
                  <th class="px-4 py-2.5 font-semibold">Fila</th>
                  <th class="px-4 py-2.5 font-semibold">Turn</th>
                  <th class="px-4 py-2.5 font-semibold text-right">Ações</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (item of items(); track item.id) {
                  <tr class="hover:bg-slate-50 transition-colors">
                    <td class="px-4 py-3 font-medium text-slate-800">{{ item.name }}</td>
                    <td class="px-4 py-3 text-slate-500 font-mono text-xs">{{ item.id }}</td>
                    <td class="px-4 py-3 text-slate-600">{{ item.identificacao }}</td>
                    <td class="px-4 py-3 text-slate-600">
                      {{ queueLabel(item.queueid) }}
                    </td>
                    <td class="px-4 py-3">
                      @if (item.turn) {
                        <span class="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">Sim</span>
                      } @else {
                        <span class="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-500">Não</span>
                      }
                    </td>
                    <td class="px-4 py-3 text-right space-x-2">
                      <button
                        (click)="openEdit(item)"
                        class="text-xs font-medium text-slate-600 hover:text-slate-900"
                      >Editar</button>
                      <button
                        (click)="askDelete(item)"
                        class="text-xs font-medium text-red-600 hover:text-red-800"
                      >Excluir</button>
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
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 class="text-base font-semibold text-slate-800">
              {{ form().mode === 'create' ? 'Novo registro' : 'Editar registro' }}
            </h2>
            <button (click)="closeForm()" class="text-slate-400 hover:text-slate-700 text-lg leading-none">&times;</button>
          </div>

          <div class="p-5 space-y-5">
            @if (form().mode === 'create') {
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">1. Buscar perfil no Pontta</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    [(ngModel)]="ponttaQuery"
                    placeholder="Nome da pessoa"
                    class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400"
                    (keyup.enter)="searchPontta()"
                  />
                  <button
                    (click)="searchPontta()"
                    [disabled]="searchingPontta()"
                    class="px-3 py-2 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 disabled:opacity-50"
                  >Buscar</button>
                </div>
                @if (ponttaResults().length > 0) {
                  <div class="mt-2 border border-slate-200 rounded-lg max-h-40 overflow-y-auto divide-y divide-slate-100">
                    @for (p of ponttaResults(); track p.id) {
                      <button
                        type="button"
                        (click)="selectPontta(p)"
                        class="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm"
                        [class.bg-blue-50]="form().id === p.id"
                      >
                        <span class="font-medium text-slate-800">{{ p.name }}</span>
                        <span class="block text-xs text-slate-500">{{ p.email || p.position || p.id }}</span>
                      </button>
                    }
                  </div>
                }
                @if (form().id) {
                  <p class="mt-2 text-xs text-slate-500">ID selecionado: <span class="font-mono">{{ form().id }}</span></p>
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

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                {{ form().mode === 'create' ? '2. Usuário GOSAC' : 'Usuário GOSAC' }}
              </label>
              @if (loadingLookups()) {
                <p class="text-sm text-slate-400">Carregando usuários...</p>
              } @else {
                <select
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  [ngModel]="form().identificacao"
                  (ngModelChange)="onUserChange($event)"
                >
                  <option [ngValue]="null">Selecione o usuário</option>
                  @for (u of gosacUsers(); track u.id) {
                    <option [ngValue]="u.id">{{ u.name }} (id {{ u.id }})</option>
                  }
                </select>
              }
            </div>

            <div>
              <label class="block text-sm font-medium text-slate-700 mb-1">
                {{ form().mode === 'create' ? '3. Fila GOSAC' : 'Fila GOSAC' }}
              </label>
              @if (loadingLookups()) {
                <p class="text-sm text-slate-400">Carregando filas...</p>
              } @else {
                <select
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400"
                  [ngModel]="form().queueid"
                  (ngModelChange)="patchForm({ queueid: $event })"
                >
                  <option [ngValue]="null">Selecione a fila</option>
                  @for (q of gosacQueues(); track q.id) {
                    <option [ngValue]="q.id">{{ q.name }} (id {{ q.id }})</option>
                  }
                </select>
              }
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  [ngModel]="form().name"
                  (ngModelChange)="patchForm({ name: $event })"
                  class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Turn</label>
                <input
                  type="text"
                  [value]="form().turn ? 'Sim' : 'Não'"
                  disabled
                  class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 text-slate-500"
                />
              </div>
            </div>
          </div>

          <div class="px-5 py-4 border-t border-slate-200 flex justify-end gap-2">
            <button
              (click)="closeForm()"
              class="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
            >Cancelar</button>
            <button
              (click)="save()"
              [disabled]="form().saving"
              class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50"
            >
              {{ form().saving ? 'Salvando...' : 'Salvar' }}
            </button>
          </div>
        </div>
      </div>
    }

    @if (confirm().open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div class="bg-white rounded-xl shadow-xl w-full max-w-md p-5">
          <h3 class="text-base font-semibold text-slate-800">{{ confirm().title }}</h3>
          <p class="text-sm text-slate-500 mt-2">{{ confirm().message }}</p>
          <div class="mt-5 flex justify-end gap-2">
            <button (click)="closeConfirm()" class="px-4 py-2 text-sm text-slate-600">Cancelar</button>
            <button
              (click)="runConfirm()"
              class="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
            >Excluir</button>
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
  ponttaResults = signal<PonttaProfile[]>([]);
  gosacUsers = signal<GosacUser[]>([]);
  gosacQueues = signal<GosacQueue[]>([]);
  toast = signal<{ message: string; type: 'error' | 'success' } | null>(null);

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
    return q ? `${q.name} (${queueid})` : String(queueid);
  }

  openCreate(): void {
    this.ponttaQuery = '';
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
    this.form.set({
      open: true,
      mode: 'edit',
      editingId: item.id,
      id: item.id,
      name: item.name,
      identificacao: item.identificacao,
      queueid: item.queueid,
      turn: item.turn,
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
    this.patchForm({ id: profile.id });
  }

  onUserChange(userId: number | null): void {
    if (userId == null) {
      this.patchForm({ identificacao: null });
      return;
    }
    const user = this.gosacUsers().find((u) => u.id === userId);
    this.patchForm({
      identificacao: userId,
      name: user?.name || this.form().name,
      queueid: this.form().queueid ?? user?.defaultQueueId ?? null,
    });
  }

  save(): void {
    const f = this.form();
    if (!f.id || !f.name || f.identificacao == null || f.queueid == null) {
      this.showToast('Preencha id, nome, usuário e fila', 'error');
      return;
    }

    this.patchForm({ saving: true });

    if (f.mode === 'create') {
      this.rotationService
        .create({
          id: f.id,
          name: f.name,
          identificacao: f.identificacao,
          queueid: f.queueid,
        })
        .subscribe({
          next: () => {
            this.closeForm();
            this.showToast('Registro criado', 'success');
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
        identificacao: f.identificacao,
        queueid: f.queueid,
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
      title: 'Excluir registro',
      message: `Remover "${item.name}" do rodízio?`,
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
    this.confirm.set({ open: false, title: '', message: '', onConfirm: null });
  }

  runConfirm(): void {
    this.confirm().onConfirm?.();
  }

  private showToast(message: string, type: 'error' | 'success'): void {
    this.toast.set({ message, type });
    setTimeout(() => this.toast.set(null), 4000);
  }
}
