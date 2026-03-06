import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GosacService, GosacTicket, GosacGroup, SalesOrderSearchResult } from '../../services/gosac.service';

interface LinkModalState {
  open: boolean;
  group: GosacGroup | null;
  step: 'search' | 'confirm';
  selectedSo: SalesOrderSearchResult | null;
  linking: boolean;
}

@Component({
  selector: 'app-gosac-pontta',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="bg-white rounded-xl p-6 border border-slate-200">
        <h1 class="text-2xl font-bold text-slate-800 flex items-center gap-3">
          <span>🔗</span>
          Gosac / Pontta
        </h1>
        <p class="text-slate-500 mt-2">Integração entre GOSAC e Pontta — associe grupos e gerencie pedidos de venda</p>
      </div>

      <!-- Sub-tabs -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="flex border-b border-slate-200 overflow-x-auto">
          @for (tab of subTabs; track tab.id) {
            <button
              (click)="activeTab.set(tab.id)"
              class="px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors"
              [class.text-purple-600]="activeTab() === tab.id"
              [class.border-b-2]="activeTab() === tab.id"
              [class.border-purple-600]="activeTab() === tab.id"
              [class.text-slate-500]="activeTab() !== tab.id"
              [class.hover:text-slate-700]="activeTab() !== tab.id"
            >
              {{ tab.icon }} {{ tab.label }}
            </button>
          }
        </div>

        <div class="p-6">
          <!-- Sub-tab: Grupos -->
          @if (activeTab() === 'grupos') {
            <div class="space-y-6">

              <!-- Pesquisa de Tickets no GOSAC -->
              <div class="bg-slate-50 rounded-lg p-5 border border-slate-200">
                <h3 class="text-lg font-semibold text-slate-700 mb-4">🔍 Pesquisar Tickets no GOSAC</h3>
                <div class="flex gap-3">
                  <input
                    type="text"
                    [(ngModel)]="searchQuery"
                    placeholder="Digite para pesquisar (ex: Anexo ...)"
                    class="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
                    (keyup.enter)="searchTickets()"
                  />
                  <button
                    (click)="searchTickets()"
                    [disabled]="searching()"
                    class="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                  >
                    @if (searching()) {
                      <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                      </svg>
                      Buscando...
                    } @else {
                      🔍 Pesquisar
                    }
                  </button>
                </div>
                @if (searchError()) {
                  <div class="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    ❌ {{ searchError() }}
                  </div>
                }
              </div>

              <!-- Resultados da Pesquisa -->
              @if (searchResults().length > 0) {
                <div class="bg-white rounded-lg border border-slate-200">
                  <div class="px-5 py-3 border-b border-slate-200 bg-slate-50">
                    <h3 class="text-sm font-semibold text-slate-600">
                      Resultados da pesquisa ({{ searchResults().length }})
                    </h3>
                  </div>
                  <div class="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                    @for (ticket of searchResults(); track ticket.id) {
                      <div class="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                        <div class="flex items-center gap-3">
                          <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg"
                            [class.bg-green-100]="ticket.isGroup"
                            [class.bg-blue-100]="!ticket.isGroup"
                          >
                            {{ ticket.isGroup ? '👥' : '👤' }}
                          </div>
                          <div>
                            <p class="font-medium text-slate-800">
                              {{ ticket.contact?.name || 'Sem nome' }}
                            </p>
                            <p class="text-xs text-slate-500">
                              Ticket #{{ ticket.id }}
                              @if (ticket.isGroup) {
                                <span class="ml-1 px-1.5 py-0.5 bg-green-100 text-green-700 rounded text-xs">Grupo</span>
                              }
                              @if (ticket.queue) {
                                <span class="ml-1 px-1.5 py-0.5 rounded text-xs"
                                  [style.background-color]="ticket.queue.color + '20'"
                                  [style.color]="ticket.queue.color"
                                >{{ ticket.queue.name }}</span>
                              }
                            </p>
                          </div>
                        </div>
                        <div class="flex items-center gap-2">
                          @if (isTicketAlreadyAdded(ticket.id)) {
                            <span class="px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-sm">
                              ✅ Já cadastrado
                            </span>
                          } @else {
                            <button
                              (click)="addTicketAsGroup(ticket)"
                              class="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                            >
                              ➕ Cadastrar
                            </button>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Lista de Grupos Cadastrados -->
              <div class="bg-white rounded-lg border border-slate-200">
                <div class="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                  <h3 class="text-sm font-semibold text-slate-600">
                    📋 Grupos Cadastrados ({{ groups().length }})
                  </h3>
                  <button
                    (click)="loadGroups()"
                    class="text-xs text-purple-600 hover:text-purple-800 transition-colors"
                  >
                    🔄 Atualizar
                  </button>
                </div>

                @if (loadingGroups()) {
                  <div class="p-8 text-center text-slate-500">
                    <svg class="w-6 h-6 animate-spin mx-auto mb-2 text-purple-500" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Carregando...
                  </div>
                } @else if (groups().length === 0) {
                  <div class="p-8 text-center text-slate-400">
                    <p class="text-4xl mb-2">📭</p>
                    <p>Nenhum grupo cadastrado ainda.</p>
                    <p class="text-sm mt-1">Pesquise tickets no GOSAC acima e clique em "Cadastrar".</p>
                  </div>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full">
                      <thead class="bg-slate-50 text-left text-xs text-slate-500 uppercase tracking-wider">
                        <tr>
                          <th class="px-5 py-3">Ticket GOSAC</th>
                          <th class="px-5 py-3">Nome</th>
                          <th class="px-5 py-3">Pedido de Venda / Ocorrência</th>
                          <th class="px-5 py-3">Status</th>
                          <th class="px-5 py-3 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (group of groups(); track group.id) {
                          <tr class="hover:bg-slate-50/50 transition-colors align-top">
                            <td class="px-5 py-3 text-sm font-mono text-slate-700">
                              #{{ group.gosacTicketId }}
                            </td>
                            <td class="px-5 py-3 text-sm text-slate-800">
                              {{ group.gosacTicketName }}
                            </td>
                            <td class="px-5 py-3 text-sm">
                              <!-- Já tem PV vinculado: mostra a tag + badge de ocorrência -->
                              @if ((group.salesOrders || []).length > 0) {
                                @for (so of group.salesOrders; track so.id) {
                                  <div class="flex flex-col gap-1.5 mb-1">
                                    <div class="flex items-center gap-1.5 flex-wrap">
                                      <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 rounded-md text-xs border border-purple-200 font-medium">
                                        🛒 {{ so.code }}
                                      </span>
                                      <span class="text-xs text-slate-500 truncate max-w-40" [title]="so.customerName">{{ abbreviate(so.customerName, 28) }}</span>
                                      <button
                                        (click)="unlinkSalesOrder(group, so.id)"
                                        class="text-xs text-slate-400 hover:text-red-500 transition-colors"
                                        title="Desvincular pedido"
                                      >✕</button>
                                    </div>
                                    @if (so.ponttaOccurrenceId) {
                                      <span class="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs border border-green-200"
                                        [title]="'ID: ' + so.ponttaOccurrenceId">
                                        ✅ Ocorrência
                                        <span class="font-mono font-semibold">
                                          @if (so.ponttaOccurrenceNumber) { #{{ so.ponttaOccurrenceNumber }} }
                                        </span>
                                        criada no Pontta
                                      </span>
                                    } @else {
                                      <span class="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-md text-xs border border-amber-200">
                                        ⚠️ Sem ocorrência Pontta
                                      </span>
                                    }
                                  </div>
                                }
                              } @else {
                                <!-- Botão para abrir modal -->
                                <button
                                  (click)="openLinkModal(group)"
                                  class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-lg transition-colors"
                                >
                                  🔗 Vincular PV
                                </button>
                              }
                            </td>
                            <td class="px-5 py-3">
                              <button
                                (click)="toggleGroup(group)"
                                class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                                [class.bg-green-100]="group.isActive"
                                [class.text-green-700]="group.isActive"
                                [class.bg-red-100]="!group.isActive"
                                [class.text-red-700]="!group.isActive"
                              >
                                {{ group.isActive ? 'Ativo' : 'Inativo' }}
                              </button>
                            </td>
                            <td class="px-5 py-3 text-right">
                              <div class="flex items-center justify-end gap-1">
                                <button
                                  (click)="deleteGroup(group)"
                                  class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title="Remover"
                                >
                                  🗑️
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
          }

          @if (activeTab() === 'webhooks') {
            <div class="text-center py-12 text-slate-400">
              <p class="text-4xl mb-3">🚧</p>
              <p class="text-lg font-medium">Webhooks — Em breve</p>
              <p class="text-sm mt-1">Recepção e processamento de webhooks do GOSAC</p>
            </div>
          }
        </div>
      </div>
    </div>

    <!-- ===== MODAL: Vincular Pedido de Venda ===== -->
    @if (linkModal().open) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" (click)="closeLinkModal()"></div>

        <!-- Modal card -->
        <div class="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">

          <!-- Modal header -->
          <div class="flex items-start justify-between p-6 border-b border-slate-200">
            <div>
              <h2 class="text-lg font-bold text-slate-800">🔗 Vincular Pedido de Venda</h2>
              @if (linkModal().group) {
                <p class="text-sm text-slate-500 mt-0.5">
                  Grupo: <span class="font-medium text-slate-700">{{ linkModal().group!.gosacTicketName }}</span>
                  <span class="ml-2 text-xs text-slate-400">#{{ linkModal().group!.gosacTicketId }}</span>
                </p>
              }
            </div>
            <button (click)="closeLinkModal()" class="text-slate-400 hover:text-slate-600 text-xl leading-none p-1 ml-4">✕</button>
          </div>

          <!-- Step indicator -->
          <div class="flex items-center px-6 pt-4">
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-purple-600 text-white">1</div>
              <span class="text-sm font-medium text-purple-700">Pesquisar PV</span>
            </div>
            <div class="flex-1 h-px mx-3" [class.bg-purple-300]="linkModal().step === 'confirm'" [class.bg-slate-200]="linkModal().step === 'search'"></div>
            <div class="flex items-center gap-2">
              <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                [class.bg-purple-600]="linkModal().step === 'confirm'"
                [class.bg-slate-200]="linkModal().step === 'search'"
                [class.text-white]="linkModal().step === 'confirm'"
                [class.text-slate-400]="linkModal().step === 'search'">2</div>
              <span class="text-sm font-medium"
                [class.text-purple-700]="linkModal().step === 'confirm'"
                [class.text-slate-400]="linkModal().step === 'search'">Confirmar</span>
            </div>
          </div>

          <!-- Modal body -->
          <div class="flex-1 overflow-y-auto p-6">

            @if (linkModal().step === 'search') {
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-700 mb-2">Pesquisar por código ou cliente</label>
                  <input
                    type="text"
                    [(ngModel)]="modalSearchQuery"
                    (ngModelChange)="onModalSearchInput($event)"
                    (keyup.escape)="closeLinkModal()"
                    placeholder="Ex: PV-CM-605 ou nome do cliente..."
                    class="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm"
                  />
                </div>

                @if (modalSearching()) {
                  <div class="flex items-center justify-center py-6 text-slate-400 gap-2">
                    <svg class="w-4 h-4 animate-spin text-purple-500" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    <span class="text-sm">Buscando pedidos...</span>
                  </div>
                } @else if (modalSearchError()) {
                  <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                    ❌ {{ modalSearchError() }}
                  </div>
                } @else if (modalSearchResults().length > 0) {
                  <div class="border border-slate-200 rounded-xl overflow-hidden">
                    <div class="px-4 py-2 bg-slate-50 border-b border-slate-200">
                      <span class="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        {{ modalSearchResults().length }} resultado{{ modalSearchResults().length === 1 ? '' : 's' }}
                      </span>
                    </div>
                    <div class="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                      @for (result of modalSearchResults(); track result.ponttaId) {
                        <button
                          (click)="selectSalesOrder(result)"
                          class="w-full text-left px-4 py-3 hover:bg-purple-50 transition-colors group"
                        >
                          <div class="flex items-center justify-between">
                            <div>
                              <span class="font-semibold text-purple-700 group-hover:text-purple-800">{{ result.code }}</span>
                              <p class="text-xs text-slate-500 mt-0.5">{{ result.customerName }}</p>
                            </div>
                            <span class="text-xs text-purple-400 group-hover:text-purple-600 flex-shrink-0 ml-3">Selecionar →</span>
                          </div>
                        </button>
                      }
                    </div>
                  </div>
                } @else if (modalSearchQuery.length >= 2 && !modalSearching()) {
                  <div class="text-center py-6 text-slate-400">
                    <p class="text-2xl mb-1">🔍</p>
                    <p class="text-sm">Nenhum pedido encontrado para "{{ modalSearchQuery }}"</p>
                  </div>
                } @else {
                  <div class="text-center py-6 text-slate-300">
                    <p class="text-3xl mb-2">🛒</p>
                    <p class="text-sm">Digite pelo menos 2 caracteres para pesquisar</p>
                  </div>
                }
              </div>
            }

            @if (linkModal().step === 'confirm' && linkModal().selectedSo) {
              <div class="space-y-4">
                <div class="bg-purple-50 border border-purple-200 rounded-xl p-4">
                  <p class="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-2">Pedido de Venda selecionado</p>
                  <p class="text-lg font-bold text-purple-800">{{ linkModal().selectedSo!.code }}</p>
                  <p class="text-sm text-purple-600 mt-0.5">{{ linkModal().selectedSo!.customerName }}</p>
                </div>

                <div class="bg-green-50 border border-green-200 rounded-xl p-4">
                  <p class="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">✅ Ocorrência que será criada no Pontta</p>
                  <p class="text-sm font-semibold text-slate-800">Anexos GOSAC - {{ linkModal().group!.gosacTicketName }}</p>
                  <p class="text-xs text-slate-500 mt-1">
                    Vinculada ao pedido <strong>{{ linkModal().selectedSo!.code }}</strong>.
                    O responsável será definido automaticamente pelo usuário autenticado.
                  </p>
                </div>

                <div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500">
                  💡 Após confirmar, todos os arquivos de mídia enviados pelo grupo GOSAC
                  <strong class="text-slate-700">"{{ linkModal().group!.gosacTicketName }}"</strong>
                  serão automaticamente anexados a essa ocorrência.
                </div>
              </div>
            }
          </div>

          <!-- Modal footer -->
          <div class="flex items-center justify-between p-6 border-t border-slate-200 gap-3">
            @if (linkModal().step === 'confirm') {
              <button
                (click)="backToSearch()"
                class="px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
              >← Voltar</button>
            } @else {
              <div></div>
            }
            <div class="flex gap-3">
              <button
                (click)="closeLinkModal()"
                class="px-4 py-2.5 text-sm font-medium text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >Cancelar</button>
              @if (linkModal().step === 'confirm') {
                <button
                  (click)="confirmLink()"
                  [disabled]="linkModal().linking"
                  class="px-6 py-2.5 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  @if (linkModal().linking) {
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                    </svg>
                    Vinculando...
                  } @else {
                    ✅ Confirmar vínculo
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
export class GosacPonttaComponent implements OnInit {
  // Sub-tabs definition
  subTabs = [
    { id: 'grupos', icon: '👥', label: 'Grupos' },
    { id: 'webhooks', icon: '🔔', label: 'Webhooks' },
  ];

  activeTab = signal<string>('grupos');

  // Ticket search state
  searchQuery = '';
  searching = signal(false);
  searchError = signal<string>('');
  searchResults = signal<GosacTicket[]>([]);

  // Groups state
  groups = signal<GosacGroup[]>([]);
  loadingGroups = signal(false);

  // Link modal state
  linkModal = signal<LinkModalState>({ open: false, group: null, step: 'search', selectedSo: null, linking: false });
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
    const q = this.searchQuery.trim();
    if (!q) return;

    this.searching.set(true);
    this.searchError.set('');
    this.searchResults.set([]);

    this.gosacService.searchTickets(q).subscribe({
      next: (res) => {
        this.searchResults.set(res.tickets || []);
        this.searching.set(false);
        if ((res.tickets || []).length === 0) {
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
        error: (err) => alert(err.error?.message || 'Erro ao cadastrar grupo'),
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
    if (!confirm(`Deseja remover o grupo "${group.gosacTicketName}"?`)) return;
    this.gosacService.deleteGroup(group.id).subscribe({
      next: () => this.groups.set(this.groups().filter((g) => g.id !== group.id)),
      error: (err) => alert(err.error?.message || 'Erro ao remover grupo'),
    });
  }

  unlinkSalesOrder(group: GosacGroup, salesOrderId: string): void {
    if (!confirm('Desvincular este pedido de venda?')) return;
    this.gosacService.unlinkSalesOrder(group.id, salesOrderId).subscribe({
      next: () => {
        this.groups.set(this.groups().map((g) => {
          if (g.id !== group.id) return g;
          return { ...g, salesOrders: (g.salesOrders || []).filter((so) => so.id !== salesOrderId) };
        }));
      },
      error: (err) => alert(err.error?.message || 'Erro ao desvincular pedido de venda'),
    });
  }

  // ----- Link Modal -----

  openLinkModal(group: GosacGroup): void {
    this.modalSearchQuery = '';
    this.modalSearchResults.set([]);
    this.modalSearchError.set('');
    this.linkModal.set({ open: true, group, step: 'search', selectedSo: null, linking: false });
  }

  closeLinkModal(): void {
    if (this.linkModal().linking) return;
    if (this.modalSearchTimeout) clearTimeout(this.modalSearchTimeout);
    this.linkModal.set({ open: false, group: null, step: 'search', selectedSo: null, linking: false });
    this.modalSearchQuery = '';
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
    this.linkModal.update(s => ({ ...s, step: 'confirm', selectedSo: result }));
  }

  confirmLink(): void {
    const state = this.linkModal();
    if (!state.group || !state.selectedSo || state.linking) return;

    this.linkModal.update(s => ({ ...s, linking: true }));

    this.gosacService.linkSalesOrder(state.group.id, {
      ponttaId: state.selectedSo.ponttaId,
      code: state.selectedSo.code,
      customerName: state.selectedSo.customerName,
    }).subscribe({
      next: (res) => {
        const so = res.salesOrder || {};
        this.groups.set(this.groups().map((g) => {
          if (g.id !== state.group!.id) return g;
          return {
            ...g,
            salesOrders: [...(g.salesOrders || []), {
              id: so.id || '',
              ponttaId: state.selectedSo!.ponttaId,
              code: state.selectedSo!.code,
              customerName: state.selectedSo!.customerName,
              ponttaOccurrenceId: so.ponttaOccurrenceId ?? null,
              ponttaOccurrenceNumber: so.ponttaOccurrenceNumber ?? null,
            }],
          };
        }));
        this.closeLinkModal();
        // Aguarda alguns segundos para o backend criar a ocorrência Pontta em segundo plano
        setTimeout(() => this.loadGroups(), 6000);
      },
      error: (err) => {
        this.linkModal.update(s => ({ ...s, linking: false }));
        alert(err.error?.message || 'Erro ao vincular pedido de venda');
      },
    });
  }

  // ----- Helpers -----

  abbreviate(text: string, maxLen: number): string {
    if (!text) return '';
    return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
  }
}
