import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GosacService, GosacTicket, GosacGroup, SalesOrderSearchResult } from '../../../services/gosac.service';

interface LinkModalState {
  open: boolean;
  group: GosacGroup | null;
  step: 'search' | 'confirm';
  selectedSo: SalesOrderSearchResult | null;
  occurrenceTitle: string;
  linking: boolean;
}

interface ConfirmDialogState {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger: boolean;
  onConfirm: () => void;
}

interface ToastState {
  open: boolean;
  message: string;
  type: 'error' | 'success';
}

@Component({
  selector: 'app-grupos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">

      <!-- Page header -->
      <div>
        <h1 class="text-xl font-semibold text-slate-800">Grupos</h1>
        <p class="text-sm text-slate-500 mt-1">Vincule grupos e orçamentos entre GOSAC e Pontta.</p>
      </div>

      <!-- Pesquisa de Tickets -->
      <div>
        <p class="text-sm font-medium text-slate-700 mb-2">Pesquisar ticket no GOSAC</p>
        <div class="flex gap-2">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Nome do contato ou grupo (prefixo MONT. aplicado automaticamente)"
            class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none"
            (keyup.enter)="searchTickets()"
          />
          <button
            (click)="searchTickets()"
            [disabled]="searching()"
            class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            @if (searching()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            }
            Pesquisar
          </button>
        </div>
        @if (searchError()) {
          <p class="mt-2 text-sm text-red-600">{{ searchError() }}</p>
        }
      </div>

      <!-- Resultados da pesquisa -->
      @if (searchResults().length > 0) {
        <div class="border border-slate-200 rounded-lg overflow-hidden">
          <div class="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
            <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">{{ searchResults().length }} resultado{{ searchResults().length === 1 ? '' : 's' }}</span>
          </div>
          <div class="divide-y divide-slate-100 max-h-72 overflow-y-auto">
            @for (ticket of searchResults(); track ticket.id) {
              <div class="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                <div>
                  <p class="text-sm font-medium text-slate-800">{{ ticket.contact?.name || 'Sem nome' }}</p>
                  <p class="text-xs text-slate-500 mt-0.5">
                    Ticket #{{ ticket.id }}
                    @if (ticket.queue) {
                      <span class="ml-2 px-1.5 py-0.5 rounded text-xs" [style.background-color]="ticket.queue.color + '20'" [style.color]="ticket.queue.color">{{ ticket.queue.name }}</span>
                    }
                  </p>
                </div>
                @if (isTicketAlreadyAdded(ticket.id)) {
                  <span class="text-xs text-slate-400">Já cadastrado</span>
                } @else {
                  <button
                    (click)="addTicketAsGroup(ticket)"
                    class="px-3 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-lg hover:bg-slate-700 transition-colors"
                  >Cadastrar</button>
                }
              </div>
            }
          </div>
        </div>
      }

      <!-- Tabela de grupos -->
      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span class="text-sm font-semibold text-slate-700">Grupos cadastrados <span class="text-slate-400 font-normal">({{ groups().length }})</span></span>
          <button (click)="loadGroups()" class="text-xs text-slate-500 hover:text-slate-800 transition-colors">Atualizar</button>
        </div>

        @if (loadingGroups()) {
          <div class="p-10 text-center">
            <svg class="w-5 h-5 animate-spin mx-auto text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        } @else if (groups().length === 0) {
          <div class="p-10 text-center text-slate-400">
            <p class="text-sm">Nenhum grupo cadastrado.</p>
            <p class="text-xs mt-1">Pesquise um ticket acima e clique em Cadastrar.</p>
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                  <th class="px-4 py-3">Ticket</th>
                  <th class="px-4 py-3">Contato / Grupo</th>
                  <th class="px-4 py-3">Pedido de Venda</th>
                  <th class="px-4 py-3">Ocorrência Pontta</th>
                  <th class="px-4 py-3">Status</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (group of groups(); track group.id) {
                  <tr class="hover:bg-slate-50/60 transition-colors align-middle">
                    <td class="px-4 py-3 font-mono text-slate-600 text-xs">#{{ group.gosacTicketId }}</td>
                    <td class="px-4 py-3 text-slate-800">{{ group.gosacTicketName }}</td>
                    <td class="px-4 py-3">
                      @if ((group.salesOrders || []).length > 0) {
                        @for (so of group.salesOrders; track so.id) {
                          <div class="flex items-center gap-2">
                            <span class="font-medium text-slate-700">{{ so.code }}</span>
                            <span class="text-slate-400 text-xs truncate max-w-32" [title]="so.customerName">{{ abbreviate(so.customerName, 24) }}</span>
                            <button (click)="unlinkSalesOrder(group, so.id)" class="text-slate-300 hover:text-red-500 transition-colors ml-1" title="Desvincular">
                              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                          </div>
                        }
                      } @else {
                        <button
                          (click)="openLinkModal(group)"
                          class="text-xs font-medium text-slate-600 border border-slate-300 rounded px-2.5 py-1 hover:bg-slate-50 transition-colors"
                        >Vincular PV</button>
                      }
                    </td>
                    <td class="px-4 py-3">
                      @if ((group.salesOrders || []).length > 0) {
                        @for (so of group.salesOrders; track so.id) {
                          @if (so.ponttaOccurrenceStatus === 'created' || so.ponttaOccurrenceId) {
                            <span class="inline-flex items-center gap-1.5 text-xs text-green-700">
                              <span class="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
                              @if (so.ponttaOccurrenceNumber) { #{{ so.ponttaOccurrenceNumber }} } @else { Criada }
                            </span>
                          } @else if (so.ponttaOccurrenceStatus === 'failed') {
                            <span class="inline-flex items-center gap-1.5 text-xs text-red-600">
                              <span class="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0"></span>
                              Falha
                            </span>
                          } @else {
                            <span class="inline-flex items-center gap-1.5 text-xs text-slate-400">
                              <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                              Criando...
                            </span>
                          }
                        }
                      } @else {
                        <span class="text-xs text-slate-300">—</span>
                      }
                    </td>
                    <td class="px-4 py-3">
                      <button
                        (click)="toggleGroup(group)"
                        class="text-xs font-medium px-2 py-0.5 rounded-full transition-colors"
                        [class.bg-emerald-50]="group.isActive"
                        [class.text-emerald-700]="group.isActive"
                        [class.border]="true"
                        [class.border-emerald-200]="group.isActive"
                        [class.bg-slate-50]="!group.isActive"
                        [class.text-slate-500]="!group.isActive"
                        [class.border-slate-200]="!group.isActive"
                      >{{ group.isActive ? 'Ativo' : 'Inativo' }}</button>
                    </td>
                    <td class="px-4 py-3 text-right">
                      <button
                        (click)="deleteGroup(group)"
                        class="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                        title="Remover grupo"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>

    </div>

    <!-- Toast -->
    @if (toast().open) {
      <div class="fixed bottom-6 right-6 z-[60] max-w-sm w-full">
        <div class="flex items-start gap-3 rounded-lg shadow-lg px-4 py-3 border"
          [class.bg-red-50]="toast().type === 'error'" [class.border-red-200]="toast().type === 'error'"
          [class.bg-emerald-50]="toast().type === 'success'" [class.border-emerald-200]="toast().type === 'success'"
        >
          <p class="text-sm flex-1"
            [class.text-red-700]="toast().type === 'error'"
            [class.text-emerald-700]="toast().type === 'success'"
          >{{ toast().message }}</p>
          <button (click)="closeToast()" class="text-slate-400 hover:text-slate-600 flex-shrink-0">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    }

    <!-- Modal de confirmação genérico -->
    @if (confirmDialog().open) {
      <div class="fixed inset-0 z-[55] flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" (click)="closeConfirmDialog()"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
          <h3 class="text-sm font-semibold text-slate-800 mb-1">{{ confirmDialog().title }}</h3>
          <p class="text-sm text-slate-500 mb-6">{{ confirmDialog().message }}</p>
          <div class="flex gap-2 justify-end">
            <button (click)="closeConfirmDialog()" class="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
            <button
              (click)="confirmDialog().onConfirm(); closeConfirmDialog()"
              class="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              [class.bg-red-600]="confirmDialog().danger" [class.hover:bg-red-700]="confirmDialog().danger" [class.text-white]="confirmDialog().danger"
              [class.bg-slate-800]="!confirmDialog().danger" [class.hover:bg-slate-700]="!confirmDialog().danger"
            >{{ confirmDialog().confirmLabel }}</button>
          </div>
        </div>
      </div>
    }

    <!-- Modal: Vincular Pedido de Venda -->
    @if (linkModal().open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40" (click)="closeLinkModal()"></div>
        <div class="relative bg-white rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">

          <!-- Header -->
          <div class="flex items-start justify-between px-6 py-5 border-b border-slate-100">
            <div>
              <h2 class="text-base font-semibold text-slate-800">Vincular pedido de venda</h2>
              @if (linkModal().group) {
                <p class="text-xs text-slate-400 mt-0.5">{{ linkModal().group!.gosacTicketName }} · Ticket #{{ linkModal().group!.gosacTicketId }}</p>
              }
            </div>
            <button (click)="closeLinkModal()" class="text-slate-400 hover:text-slate-600 p-1 ml-4">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Step indicator -->
          <div class="flex items-center gap-0 px-6 pt-4">
            <div class="flex items-center gap-1.5">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-slate-800 text-white">1</span>
              <span class="text-xs font-medium text-slate-700">Pesquisar</span>
            </div>
            <div class="flex-1 h-px mx-3" [class.bg-slate-700]="linkModal().step === 'confirm'" [class.bg-slate-200]="linkModal().step === 'search'"></div>
            <div class="flex items-center gap-1.5">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                [class.bg-slate-800]="linkModal().step === 'confirm'"
                [class.text-white]="linkModal().step === 'confirm'"
                [class.bg-slate-100]="linkModal().step === 'search'"
                [class.text-slate-400]="linkModal().step === 'search'">2</span>
              <span class="text-xs font-medium" [class.text-slate-700]="linkModal().step === 'confirm'" [class.text-slate-400]="linkModal().step === 'search'">Confirmar</span>
            </div>
          </div>

          <!-- Body -->
          <div class="flex-1 overflow-y-auto px-6 py-5">

            @if (linkModal().step === 'search') {
              <div class="space-y-4">
                <input
                  type="text"
                  [(ngModel)]="modalSearchQuery"
                  (ngModelChange)="onModalSearchInput($event)"
                  (keyup.escape)="closeLinkModal()"
                  placeholder="Código do pedido ou nome do cliente..."
                  class="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none"
                  autofocus
                />
                @if (modalSearching()) {
                  <div class="flex items-center gap-2 py-4 text-slate-400 text-sm justify-center">
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    Buscando...
                  </div>
                } @else if (modalSearchError()) {
                  <p class="text-sm text-red-600">{{ modalSearchError() }}</p>
                } @else if (modalSearchResults().length > 0) {
                  <div class="border border-slate-200 rounded-lg overflow-hidden">
                    <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      @for (result of modalSearchResults(); track result.ponttaId) {
                        <button (click)="selectSalesOrder(result)" class="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors group">
                          <div class="flex items-center justify-between">
                            <div>
                              <p class="text-sm font-semibold text-slate-800">{{ result.code }}</p>
                              <p class="text-xs text-slate-500 mt-0.5">{{ result.customerName }}</p>
                            </div>
                            <svg class="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                          </div>
                        </button>
                      }
                    </div>
                  </div>
                } @else if (modalSearchQuery.length >= 2) {
                  <p class="text-sm text-slate-400 text-center py-4">Nenhum pedido encontrado.</p>
                } @else {
                  <p class="text-xs text-slate-400">Digite pelo menos 2 caracteres para pesquisar.</p>
                }
              </div>
            }

            @if (linkModal().step === 'confirm' && linkModal().selectedSo) {
              <div class="space-y-5">

                <!-- Pedido selecionado (somente leitura) -->
                <div class="bg-slate-50 border border-slate-200 rounded-lg px-4 py-3">
                  <p class="text-xs text-slate-500 mb-1">Pedido de venda selecionado</p>
                  <p class="font-semibold text-slate-800">{{ linkModal().selectedSo!.code }}</p>
                  <p class="text-sm text-slate-500 mt-0.5">{{ linkModal().selectedSo!.customerName }}</p>
                </div>

                <!-- Título da ocorrência (editável) -->
                <div>
                  <label class="block text-xs font-semibold text-slate-600 mb-1.5">Título da ocorrência no Pontta</label>
                  <input
                    type="text"
                    [(ngModel)]="occurrenceTitleInput"
                    class="w-full px-3 py-2.5 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none"
                    placeholder="Título da ocorrência"
                  />
                  <p class="text-xs text-slate-400 mt-1">O título é usado para identificar a ocorrência no Pontta onde os anexos serão enviados.</p>
                </div>

                <!-- Nota informativa -->
                <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Após confirmar, os arquivos de mídia enviados no grupo GOSAC <strong class="text-slate-700">"{{ linkModal().group!.gosacTicketName }}"</strong> serão automaticamente anexados a essa ocorrência.
                </div>

              </div>
            }
          </div>

          <!-- Footer -->
          <div class="flex items-center justify-between px-6 py-4 border-t border-slate-100">
            @if (linkModal().step === 'confirm') {
              <button (click)="backToSearch()" class="text-sm text-slate-500 hover:text-slate-800 transition-colors">← Voltar</button>
            } @else {
              <div></div>
            }
            <div class="flex gap-2">
              <button (click)="closeLinkModal()" class="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors">Cancelar</button>
              @if (linkModal().step === 'confirm') {
                <button
                  (click)="confirmLink()"
                  [disabled]="linkModal().linking"
                  class="px-5 py-2 text-sm font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  @if (linkModal().linking) {
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    Vinculando...
                  } @else {
                    Confirmar vínculo
                  }
                </button>
              }
            </div>
          </div>

        </div>
      </div>
    }
  `,
})
export class GruposComponent implements OnInit {
  // Ticket search state
  searchQuery = '';
  searching = signal(false);
  searchError = signal<string>('');
  searchResults = signal<GosacTicket[]>([]);

  // Groups state
  groups = signal<GosacGroup[]>([]);
  loadingGroups = signal(false);

  // Link modal state
  linkModal = signal<LinkModalState>({ open: false, group: null, step: 'search', selectedSo: null, occurrenceTitle: '', linking: false });
  occurrenceTitleInput = '';
  confirmDialog = signal<ConfirmDialogState>({ open: false, title: '', message: '', confirmLabel: 'Confirmar', danger: false, onConfirm: () => { } });
  toast = signal<ToastState>({ open: false, message: '', type: 'error' });
  modalSearchQuery = '';
  modalSearching = signal(false);
  modalSearchResults = signal<SalesOrderSearchResult[]>([]);
  modalSearchError = signal<string>('');
  private modalSearchTimeout: any = null;

  constructor(private gosacService: GosacService) { }

  ngOnInit(): void {
    this.loadGroups();
  }

  // ----- Ticket Search -----

  searchTickets(): void {
    const raw = this.searchQuery.trim();
    if (!raw) return;

    const PREFIX = 'MONT.';
    const q = raw.toUpperCase().startsWith(PREFIX) ? raw : `${PREFIX} ${raw}`;

    this.searching.set(true);
    this.searchError.set('');
    this.searchResults.set([]);

    this.gosacService.searchTickets(q).subscribe({
      next: (res) => {
        const PREFIX = 'MONT.';
        const filtered = (res.tickets || []).filter((ticket) => {
          const groupName = (ticket.contact?.name || '').trim().toUpperCase();
          return ticket.isGroup === true && groupName.startsWith(PREFIX);
        });
        this.searchResults.set(filtered);
        this.searching.set(false);
        if (filtered.length === 0) {
          this.searchError.set('Nenhum ticket encontrado para essa pesquisa.');
        }
      },
      error: (err) => {
        this.searchError.set(err.error?.message || 'Erro ao pesquisar tickets no GOSAC');
        this.searching.set(false);
      },
    });
  }

  // ----- Groups -----

  loadGroups(): void {
    this.loadingGroups.set(true);
    this.gosacService.findAllGroups().subscribe({
      next: (groups) => {
        this.groups.set(groups);
        this.loadingGroups.set(false);
      },
      error: () => {
        this.loadingGroups.set(false);
      },
    });
  }

  isTicketAlreadyAdded(ticketId: number): boolean {
    return this.groups().some((g) => g.gosacTicketId === ticketId);
  }

  addTicketAsGroup(ticket: GosacTicket): void {
    const name = ticket.contact?.name || `Ticket #${ticket.id}`;
    const contactId = ticket.contact?.id || ticket['contactId'] || 0;
    this.gosacService
      .createGroup({ gosacTicketId: ticket.id, gosacContactId: contactId, gosacTicketName: name })
      .subscribe({
        next: (group) => {
          if (!group.salesOrders) group.salesOrders = [];
          this.groups.set([group, ...this.groups()]);
        },
        error: (err) => this.showToast(err.error?.message || 'Erro ao cadastrar grupo', 'error'),
      });
  }

  toggleGroup(group: GosacGroup): void {
    this.gosacService.toggleGroup(group.id).subscribe({
      next: (updated) => {
        const currentGroup = this.groups().find(g => g.id === updated.id);
        if (!updated.salesOrders && currentGroup) updated.salesOrders = currentGroup.salesOrders;
        this.groups.set(this.groups().map((g) => (g.id === updated.id ? updated : g)));
      },
    });
  }

  deleteGroup(group: GosacGroup): void {
    this.openConfirmDialog({
      title: 'Remover grupo',
      message: `Deseja remover o grupo "${group.gosacTicketName}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover',
      danger: true,
      onConfirm: () => {
        this.gosacService.deleteGroup(group.id).subscribe({
          next: () => this.groups.set(this.groups().filter((g) => g.id !== group.id)),
          error: (err) => this.showToast(err.error?.message || 'Erro ao remover grupo', 'error'),
        });
      },
    });
  }

  unlinkSalesOrder(group: GosacGroup, salesOrderId: string): void {
    this.openConfirmDialog({
      title: 'Desvincular pedido de venda',
      message: 'Deseja desvincular este pedido de venda do grupo?',
      confirmLabel: 'Desvincular',
      danger: true,
      onConfirm: () => {
        this.gosacService.unlinkSalesOrder(group.id, salesOrderId).subscribe({
          next: () => {
            this.groups.update(groups => groups.map((g) => {
              if (g.id !== group.id) return g;
              return { ...g, salesOrders: (g.salesOrders || []).filter((so) => so.id !== salesOrderId) };
            }));
          },
          error: (err) => this.showToast(err.error?.message || 'Erro ao desvincular pedido de venda', 'error'),
        });
      },
    });
  }

  // ----- Confirm Dialog -----

  openConfirmDialog(opts: Omit<ConfirmDialogState, 'open'>): void {
    this.confirmDialog.set({ open: true, ...opts });
  }

  closeConfirmDialog(): void {
    this.confirmDialog.update(s => ({ ...s, open: false }));
  }

  // ----- Toast -----

  private toastTimeout: any = null;

  showToast(message: string, type: 'error' | 'success' = 'error'): void {
    if (this.toastTimeout) clearTimeout(this.toastTimeout);
    this.toast.set({ open: true, message, type });
    this.toastTimeout = setTimeout(() => this.closeToast(), 5000);
  }

  closeToast(): void {
    this.toast.update(s => ({ ...s, open: false }));
  }

  // ----- Link Modal -----

  openLinkModal(group: GosacGroup): void {
    this.modalSearchQuery = '';
    this.modalSearchResults.set([]);
    this.modalSearchError.set('');
    this.occurrenceTitleInput = '';
    this.linkModal.set({ open: true, group, step: 'search', selectedSo: null, occurrenceTitle: '', linking: false });
  }

  closeLinkModal(force = false): void {
    if (!force && this.linkModal().linking) return;
    if (this.modalSearchTimeout) clearTimeout(this.modalSearchTimeout);
    this.linkModal.set({ open: false, group: null, step: 'search', selectedSo: null, occurrenceTitle: '', linking: false });
    this.modalSearchQuery = '';
    this.occurrenceTitleInput = '';
    this.modalSearchResults.set([]);
    this.modalSearchError.set('');
  }

  backToSearch(): void {
    this.linkModal.update(s => ({ ...s, step: 'search', selectedSo: null }));
  }

  onModalSearchInput(query: string): void {
    if (this.modalSearchTimeout) clearTimeout(this.modalSearchTimeout);
    if (query.trim().length < 2) {
      this.modalSearchResults.set([]);
      this.modalSearchError.set('');
      return;
    }
    this.modalSearchTimeout = setTimeout(() => {
      this.modalSearching.set(true);
      this.modalSearchResults.set([]);
      this.modalSearchError.set('');
      this.gosacService.searchSalesOrders(query.trim()).subscribe({
        next: (results) => {
          this.modalSearchResults.set(results);
          this.modalSearching.set(false);
        },
        error: (err) => {
          this.modalSearchError.set(err?.error?.message || 'Erro ao buscar pedidos de venda');
          this.modalSearching.set(false);
        },
      });
    }, 400);
  }

  selectSalesOrder(result: SalesOrderSearchResult): void {
    const defaultTitle = `Anexos GOSAC - ${this.linkModal().group?.gosacTicketName ?? ''}`;
    this.occurrenceTitleInput = defaultTitle;
    this.linkModal.update(s => ({ ...s, step: 'confirm', selectedSo: result, occurrenceTitle: defaultTitle }));
  }

  confirmLink(): void {
    const state = this.linkModal();
    if (!state.group || !state.selectedSo || state.linking) return;

    const groupId = state.group.id;
    const selectedSo = state.selectedSo;

    this.linkModal.update(s => ({ ...s, linking: true }));

    this.gosacService.linkSalesOrder(groupId, {
      ponttaId: selectedSo.ponttaId,
      code: selectedSo.code,
      customerName: selectedSo.customerName,
      occurrenceTitle: this.occurrenceTitleInput.trim() || undefined,
    }).subscribe({
      next: (res) => {
        try {
          const so = res?.salesOrder || {};
          this.groups.update(groups => groups.map((g) => {
            if (g.id !== groupId) return g;
            return {
              ...g,
              salesOrders: [...(g.salesOrders || []), {
                id: so.id || '',
                ponttaId: selectedSo.ponttaId,
                code: selectedSo.code,
                customerName: selectedSo.customerName,
                ponttaOccurrenceId: so.ponttaOccurrenceId ?? null,
                ponttaOccurrenceNumber: so.ponttaOccurrenceNumber ?? null,
                ponttaOccurrenceStatus: (so.ponttaOccurrenceStatus ?? 'pending') as 'pending' | 'created' | 'failed',
              }],
            };
          }));
        } catch (e) {
          console.error('Erro ao atualizar lista de grupos:', e);
        } finally {
          this.closeLinkModal(true);
          setTimeout(() => this.loadGroups(), 6000);
        }
      },
      error: (err) => {
        this.linkModal.update(s => ({ ...s, linking: false }));
        const msg = err?.error?.message || err?.message || 'Erro ao vincular pedido de venda';
        this.showToast(msg, 'error');
      },
    });
  }

  // ----- Helpers -----

  abbreviate(text: string, maxLen: number): string {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  }
}
