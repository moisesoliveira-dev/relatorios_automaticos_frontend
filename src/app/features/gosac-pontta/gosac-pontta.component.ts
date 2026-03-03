import { Component, OnInit, signal, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GosacService, GosacTicket, GosacGroup, SalesOrderSearchResult } from '../../services/gosac.service';

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
                          <th class="px-5 py-3">Pedidos de Venda</th>
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
                            <td class="px-4 py-3 text-sm" style="min-width: 260px">
                              <!-- Já tem PV vinculado: mostra a tag -->
                              @if ((group.salesOrders || []).length > 0) {
                                @for (so of group.salesOrders; track so.id) {
                                  <div class="flex flex-col gap-1">
                                    <span class="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 text-purple-700 rounded-md text-xs border border-purple-200 max-w-full">
                                      <span class="font-medium">{{ so.code }}</span>
                                      <span class="text-purple-400">—</span>
                                      <span class="truncate" [title]="so.customerName">{{ abbreviate(so.customerName, 25) }}</span>
                                      <button
                                        (click)="unlinkSalesOrder(group, so.id)"
                                        class="ml-0.5 text-purple-400 hover:text-red-500 transition-colors flex-shrink-0 text-base leading-none"
                                        title="Desvincular"
                                      >×</button>
                                    </span>
                                    @if (so.ponttaOccurrenceNumber || so.ponttaOccurrenceId) {
                                      <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded text-xs border border-green-200" [title]="'Ocorrência Pontta: ' + (so.ponttaOccurrenceId || '')">
                                        ✅ Ocorrência
                                        @if (so.ponttaOccurrenceNumber) {
                                          <span class="font-mono font-semibold">#{{ so.ponttaOccurrenceNumber }}</span>
                                        }
                                        criada
                                      </span>
                                    } @else {
                                      <span class="inline-flex items-center gap-1 px-2 py-0.5 bg-yellow-50 text-yellow-700 rounded text-xs border border-yellow-200" title="Ocorrência Pontta não criada">
                                        ⚠️ Sem ocorrência
                                      </span>
                                    }
                                  </div>
                                }
                              } @else if (soSearchGroupId() === group.id) {
                                <!-- Campo de busca ativo -->
                                <div (click)="$event.stopPropagation()">
                                  <div class="flex items-center gap-1 mb-1">
                                    <input
                                      type="text"
                                      [(ngModel)]="soSearchQuery"
                                      (ngModelChange)="onSoSearchInput($event)"
                                      (keyup.escape)="closeSoSearch()"
                                      placeholder="Pesquisar PV..."
                                      class="flex-1 px-2 py-1 border border-purple-300 rounded text-xs focus:ring-1 focus:ring-purple-500 focus:border-transparent outline-none"
                                      autofocus
                                    />
                                    <button (click)="closeSoSearch()" class="text-slate-400 hover:text-slate-600 text-xs px-1">✕</button>
                                  </div>
                                  @if (soSearching()) {
                                    <div class="py-2 text-center text-xs text-slate-400">
                                      <svg class="w-3 h-3 animate-spin inline mr-1 text-purple-500" fill="none" viewBox="0 0 24 24">
                                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                                      </svg>
                                      Buscando...
                                    </div>
                                  } @else if (soSearchError()) {
                                    <div class="py-2 px-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded">
                                      ❌ {{ soSearchError() }}
                                    </div>
                                  } @else if (soSearchResults().length > 0) {
                                    <div class="border border-slate-200 rounded-md overflow-hidden max-h-40 overflow-y-auto">
                                      @for (result of soSearchResults(); track result.ponttaId) {
                                        <button
                                          (click)="linkSalesOrder(group, result)"
                                          class="w-full text-left px-2 py-1.5 text-xs hover:bg-purple-50 transition-colors border-b border-slate-100 last:border-0"
                                        >
                                          <span class="font-medium text-purple-700">{{ result.code }}</span>
                                          <span class="text-slate-400 mx-1">—</span>
                                          <span class="text-slate-600">{{ abbreviate(result.customerName, 30) }}</span>
                                        </button>
                                      }
                                    </div>
                                  } @else if (soSearchQuery.length >= 2) {
                                    <div class="py-2 text-center text-xs text-slate-400">Nenhum pedido encontrado</div>
                                  }
                                </div>
                              } @else {
                                <!-- Botão para abrir busca -->
                                <button
                                  (click)="openSoSearch(group.id, $event)"
                                  class="inline-flex items-center gap-1 px-2 py-1 text-xs text-purple-600 hover:bg-purple-50 rounded-md border border-dashed border-purple-300 transition-colors"
                                >
                                  ➕ Vincular PV
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

          <!-- Placeholder for future sub-tabs -->
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

  // Sales order search state (per group)
  soSearchGroupId = signal<string | null>(null);
  soSearchQuery = '';
  soSearching = signal(false);
  soSearchResults = signal<SalesOrderSearchResult[]>([]);
  soSearchError = signal<string>('');
  ) { }

ngOnInit(): void {
  this.loadGroups();
}

@HostListener('document:click', ['$event'])
onDocumentClick(event: Event): void {
  if(!this.soSearchGroupId()) return;
  // Close if click is outside the host component entirely
  if(!this.elementRef.nativeElement.contains(event.target as Node)) {
  this.closeSoSearch();
}
  }

// ----- Ticket Search -----

searchTickets(): void {
  const q = this.searchQuery.trim();
  if(!q) return;

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
    .createGroup({
      gosacTicketId: ticket.id,
      gosacContactId: contactId,
      gosacTicketName: name,
    })
    .subscribe({
      next: (group) => {
        // Ensure new group has salesOrders array
        if (!group.salesOrders) group.salesOrders = [];
        this.groups.set([group, ...this.groups()]);
      },
      error: (err) => {
        alert(err.error?.message || 'Erro ao cadastrar grupo');
      },
    });
}

toggleGroup(group: GosacGroup): void {
  this.gosacService.toggleGroup(group.id).subscribe({
    next: (updated) => {
      // Preserve sales orders from current state since toggle may not return them
      const currentGroup = this.groups().find(g => g.id === updated.id);
      if (!updated.salesOrders && currentGroup) {
        updated.salesOrders = currentGroup.salesOrders;
      }
      this.groups.set(
        this.groups().map((g) => (g.id === updated.id ? updated : g)),
      );
    },
  });
}

deleteGroup(group: GosacGroup): void {
  if(!confirm(`Deseja remover o grupo "${group.gosacTicketName}"?`)) return;

this.gosacService.deleteGroup(group.id).subscribe({
  next: () => {
    this.groups.set(this.groups().filter((g) => g.id !== group.id));
  },
  error: (err) => {
    alert(err.error?.message || 'Erro ao remover grupo');
  },
});
  }

// ----- Sales Order Search & Link -----

openSoSearch(groupId: string, event ?: Event): void {
  event?.stopPropagation();
    this.soSearchGroupId.set(groupId);
  this.soSearchQuery = '';
  this.soSearchResults.set([]);
}

closeSoSearch(): void {
  this.soSearchGroupId.set(null);
  this.soSearchQuery = '';
  this.soSearchResults.set([]);
  this.soSearchError.set('');
  if(this.soSearchTimeout) {
  clearTimeout(this.soSearchTimeout);
  this.soSearchTimeout = null;
}
  }

onSoSearchInput(query: string): void {
  if(this.soSearchTimeout) {
  clearTimeout(this.soSearchTimeout);
}

if (query.trim().length < 2) {
  this.soSearchResults.set([]);
  this.soSearchError.set('');
  return;
}

// Debounce 400ms
this.soSearchTimeout = setTimeout(() => {
  this.soSearching.set(true);
  this.soSearchResults.set([]);
  this.soSearchError.set('');
  this.gosacService.searchSalesOrders(query.trim()).subscribe({
    next: (results) => {
      this.soSearchResults.set(results);
      this.soSearching.set(false);
    },
    error: (err) => {
      const msg = err?.error?.message || 'Erro ao buscar pedidos de venda';
      this.soSearchError.set(msg);
      this.soSearchResults.set([]);
      this.soSearching.set(false);
    },
  });
}, 400);
  }

isSoAlreadyLinked(group: GosacGroup, ponttaId: string): boolean {
  return (group.salesOrders || []).some((so) => so.ponttaId === ponttaId);
}

linkSalesOrder(group: GosacGroup, result: SalesOrderSearchResult): void {
  if(this.isSoAlreadyLinked(group, result.ponttaId)) return;

  this.gosacService
    .linkSalesOrder(group.id, {
      ponttaId: result.ponttaId,
      code: result.code,
      customerName: result.customerName,
    })
    .subscribe({
      next: (link) => {
        // Rebuilds the group's salesOrders with the full data returned from backend
        const so = link.salesOrder || {};
        const updatedGroups = this.groups().map((g) => {
          if (g.id === group.id) {
            const salesOrders = [...(g.salesOrders || [])];
            salesOrders.push({
              id: so.id || link.id || '',
              ponttaId: result.ponttaId,
              code: result.code,
              customerName: result.customerName,
              ponttaOccurrenceId: so.ponttaOccurrenceId ?? null,
              ponttaOccurrenceNumber: so.ponttaOccurrenceNumber ?? null,
            });
            return { ...g, salesOrders };
          }
          return g;
        });
        this.groups.set(updatedGroups);
        this.closeSoSearch();
      },
      error: (err) => {
        alert(err.error?.message || 'Erro ao vincular pedido de venda');
      },
    });
}

unlinkSalesOrder(group: GosacGroup, salesOrderId: string): void {
  this.gosacService.unlinkSalesOrder(group.id, salesOrderId).subscribe({
    next: () => {
      const updatedGroups = this.groups().map((g) => {
        if (g.id === group.id) {
          return {
            ...g,
            salesOrders: (g.salesOrders || []).filter((so) => so.id !== salesOrderId),
          };
        }
        return g;
      });
      this.groups.set(updatedGroups);
    },
    error: (err) => {
      alert(err.error?.message || 'Erro ao desvincular pedido de venda');
    },
  });
}

// ----- Helpers -----

abbreviate(text: string, maxLen: number): string {
  if (!text) return '';
  return text.length > maxLen ? text.substring(0, maxLen) + '...' : text;
}
}
