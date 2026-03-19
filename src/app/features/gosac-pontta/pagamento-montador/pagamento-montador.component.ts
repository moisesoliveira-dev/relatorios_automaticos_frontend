import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { GosacService, SalesOrderSearchResult } from '../../../services/gosac.service';

interface EnvironmentItem {
  id: string;
  name: string;
  value: number;
  discount: number;
  selected: boolean;
  [key: string]: any;
}

interface SalesOrderItem extends SalesOrderSearchResult {
  id: string;
}

@Component({
  selector: 'app-pagamento-montador',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">

      <!-- Page header -->
      <div>
        <h1 class="text-xl font-semibold text-slate-800">Pagamento de Montador</h1>
        <p class="text-sm text-slate-500 mt-1">Gere PDFs de pagamento por ambiente a partir dos orçamentos do Pontta.</p>
      </div>

      <!-- Logo upload -->
      <div class="flex items-center justify-between border border-slate-200 rounded-lg px-4 py-3 bg-slate-50">
        <div class="flex items-center gap-3">
          <svg class="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <div>
            <p class="text-sm font-medium text-slate-700">Logotipo da empresa</p>
            <p class="text-xs text-slate-400">Aparece no canto superior esquerdo do PDF · PNG, JPG ou WebP · máx 5MB</p>
          </div>
        </div>
        <label class="cursor-pointer">
          <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" (change)="onLogoUpload($event)" />
          <span
            class="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors"
            [class.border-slate-300]="!logoUploading() && !logoSuccess()"
            [class.text-slate-600]="!logoUploading() && !logoSuccess()"
            [class.hover:bg-slate-100]="!logoUploading() && !logoSuccess()"
            [class.border-emerald-300]="logoSuccess()"
            [class.text-emerald-600]="logoSuccess()"
            [class.bg-emerald-50]="logoSuccess()"
            [class.opacity-60]="logoUploading()"
            [class.cursor-not-allowed]="logoUploading()"
          >
            @if (logoUploading()) {
              <svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
              Enviando...
            } @else if (logoSuccess()) {
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
              Logo atualizado
            } @else {
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
              {{ logoName() || 'Selecionar logo' }}
            }
          </span>
        </label>
      </div>

      <!-- Search -->
      <div>
        <p class="text-sm font-medium text-slate-700 mb-2">Pesquisar pedido de venda no Pontta</p>
        <div class="flex gap-2">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Nome do cliente, código ou número do pedido..."
            class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none"
            (keyup.enter)="searchSalesOrders()"
            (ngModelChange)="onSearchInput($event)"
          />
          <button
            (click)="searchSalesOrders()"
            [disabled]="loading()"
            class="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
          >
            @if (loading()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            }
            Pesquisar
          </button>
          @if (searchQuery.length > 0) {
            <button
              (click)="clearSearch()"
              class="px-3 py-2 text-sm text-slate-500 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              title="Limpar pesquisa"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          }
        </div>
        @if (error()) {
          <p class="mt-2 text-sm text-red-600">{{ error() }}</p>
        }
      </div>

      <!-- Sales Orders Table -->
      <div class="border border-slate-200 rounded-lg overflow-hidden">
        <div class="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span class="text-sm font-semibold text-slate-700">
            Pedidos de Venda
            @if (isSearchMode()) {
              <span class="text-slate-400 font-normal">&middot; Pesquisa: "{{ activeSearchTerm() }}"</span>
            }
            <span class="text-slate-400 font-normal">({{ salesOrders().length }})</span>
          </span>
          <button (click)="loadSalesOrders()" class="text-xs text-slate-500 hover:text-slate-800 transition-colors">Atualizar</button>
        </div>

        @if (loading()) {
          <div class="p-10 text-center">
            <svg class="w-5 h-5 animate-spin mx-auto text-slate-400" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <p class="text-xs text-slate-400 mt-2">Carregando pedidos de venda...</p>
          </div>
        } @else if (salesOrders().length === 0) {
          <div class="p-10 text-center text-slate-400">
            <svg class="w-8 h-8 mx-auto mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            @if (isSearchMode()) {
              <p class="text-sm">Nenhum pedido de venda encontrado para "{{ activeSearchTerm() }}".</p>
              <p class="text-xs mt-1">Tente outra pesquisa ou limpe o filtro.</p>
            } @else {
              <p class="text-sm">Nenhum pedido de venda encontrado.</p>
            }
          </div>
        } @else {
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead class="bg-slate-50 border-b border-slate-200">
                <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                  <th class="px-4 py-3">Código</th>
                  <th class="px-4 py-3">Cliente</th>
                  <th class="px-4 py-3">Responsável</th>
                  <th class="px-4 py-3 text-right">Valor</th>
                  <th class="px-4 py-3">Negociação</th>
                  <th class="px-4 py-3">Entrega</th>
                  <th class="px-4 py-3">Criado em</th>
                  <th class="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                @for (salesOrder of salesOrders(); track salesOrder.id) {
                  <tr
                    class="hover:bg-slate-50/60 transition-colors align-middle cursor-pointer"
                    (click)="openModal(salesOrder)"
                  >
                    <td class="px-4 py-3">
                      <span class="font-mono text-xs font-semibold text-slate-700">{{ salesOrder.code }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <div>
                        <p class="text-slate-800 font-medium">{{ salesOrder.customerName }}</p>
                      </div>
                    </td>
                    <td class="px-4 py-3 text-slate-600">—</td>
                    <td class="px-4 py-3 text-right">
                      <span class="font-semibold text-slate-800">{{ formatCurrency(salesOrder.value || 0) }}</span>
                    </td>
                    <td class="px-4 py-3">
                      <span class="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border bg-slate-50 text-slate-600 border-slate-200">
                        {{ salesOrder.status || '—' }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-slate-600 text-xs">—</td>
                    <td class="px-4 py-3 text-slate-500 text-xs">{{ formatDate(salesOrder.saleDate || '') }}</td>
                    <td class="px-4 py-3 text-right">
                      <button
                        (click)="openModal(salesOrder); $event.stopPropagation()"
                        class="p-1.5 rounded text-slate-300 hover:text-slate-600 transition-colors"
                        title="Abrir ambientes"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
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

    <!-- ========= MODAL OVERLAY ========= -->
    @if (modalOpen()) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4" (click)="closeModal()">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm"></div>

        <!-- Modal Panel -->
        <div
          class="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          (click)="$event.stopPropagation()"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50 flex-shrink-0">
            <div>
              <h2 class="text-base font-bold text-slate-800">Pagamento de Montador</h2>
              <p class="text-xs text-slate-500 mt-0.5">
                {{ selectedSalesOrder()!.code }} &mdash; {{ selectedSalesOrder()!.customerName }}
              </p>
            </div>
            <button
              (click)="closeModal()"
              class="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <!-- Modal Body (scrollable) -->
          <div class="flex-1 overflow-y-auto px-6 py-5 space-y-6">

            @if (loadingItems()) {
              <div class="py-10 text-center">
                <svg class="w-6 h-6 animate-spin mx-auto text-slate-400" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <p class="text-sm text-slate-400 mt-2">Carregando ambientes...</p>
              </div>
            } @else if (itemsError()) {
              <div class="py-6 text-center">
                <p class="text-sm text-red-600">{{ itemsError() }}</p>
                <button (click)="loadItems()" class="mt-2 text-xs text-slate-500 hover:text-slate-700 underline">Tentar novamente</button>
              </div>
            } @else {
              <!-- Environments Table -->
              <div>
                <div class="flex items-center justify-between mb-3">
                  <p class="text-sm font-semibold text-slate-700">Ambientes ({{ environments().length }})</p>
                  <label class="flex items-center gap-2 text-xs text-slate-500 cursor-pointer select-none">
                    <input type="checkbox" [checked]="allSelected()" (change)="toggleAll()" class="rounded border-slate-300 text-slate-800 focus:ring-slate-400" />
                    Selecionar todos
                  </label>
                </div>

                @if (environments().length === 0) {
                  <div class="text-center py-6 text-slate-400 text-sm">Nenhum ambiente encontrado neste orçamento.</div>
                } @else {
                  <div class="border border-slate-200 rounded-lg overflow-hidden">
                    <div class="overflow-x-auto">
                    <table class="w-full min-w-[980px] text-sm">
                      <thead class="bg-slate-50 border-b border-slate-200">
                        <tr class="text-xs font-semibold text-slate-500 uppercase tracking-wider text-left">
                          <th class="px-4 py-2.5 w-10"></th>
                          <th class="px-4 py-2.5">Ambiente</th>
                          <th class="px-4 py-2.5 text-right">Valor Base</th>
                          <th class="px-4 py-2.5 text-right">Valor Original</th>
                          <th class="px-4 py-2.5 text-right">Desc. Adic.</th>
                          <th class="px-4 py-2.5 text-right">Valor c/ Desc.</th>
                          <th class="px-4 py-2.5 text-right">Montador (7%)</th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-slate-100">
                        @for (env of environments(); track env.id; let i = $index) {
                          <tr
                            class="hover:bg-slate-50/60 transition-colors cursor-pointer"
                            [class.bg-blue-50/40]="env.selected"
                            (click)="toggleEnv(i)"
                          >
                            <td class="px-4 py-2.5 text-center">
                              <input
                                type="checkbox"
                                [checked]="env.selected"
                                (change)="toggleEnv(i)"
                                (click)="$event.stopPropagation()"
                                class="rounded border-slate-300 text-slate-800 focus:ring-slate-400"
                              />
                            </td>
                            <td class="px-4 py-2.5">
                              <span class="font-medium text-slate-800">{{ env.name }}</span>
                            </td>
                            <td class="px-4 py-2.5 text-right font-medium text-slate-800">{{ formatCurrency(getOriginalValue(env)) }}</td>
                            <td class="px-4 py-2.5 text-right text-slate-600">6.0%</td>
                            <td class="px-4 py-2.5 text-right font-medium text-slate-800">{{ formatCurrency(getFinalValue(env)) }}</td>
                            <td class="px-4 py-2.5 text-right font-bold text-emerald-700">{{ formatCurrency(getMontadorValue(env)) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                    </div>
                  </div>

                  <!-- Summary -->
                  @if (selectedCount() > 0) {
                    <div class="mt-3 flex items-center justify-end gap-4 text-sm">
                      <span class="text-slate-500">{{ selectedCount() }} ambiente(s) selecionado(s)</span>
                      <span class="font-bold text-emerald-700">Total montador: {{ formatCurrency(totalMontador()) }}</span>
                    </div>
                  }
                }
              </div>

              <!-- Date Fields -->
              <div>
                <p class="text-sm font-semibold text-slate-700 mb-3">Datas</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="block text-xs text-slate-500 mb-1">Entrega de Material</label>
                    <input
                      type="date"
                      [(ngModel)]="deliveryDate"
                      class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-slate-500 mb-1">Início de Montagem</label>
                    <input
                      type="date"
                      [(ngModel)]="assemblyStartDate"
                      class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none"
                    />
                  </div>
                  <div>
                    <label class="block text-xs text-slate-500 mb-1">Finalização de Montagem</label>
                    <input
                      type="date"
                      [(ngModel)]="assemblyEndDate"
                      class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-slate-400 focus:border-transparent outline-none"
                    />
                  </div>
                </div>
              </div>

              <!-- Send to Drive -->
              <div>
                <label class="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    [(ngModel)]="sendToDrive"
                    class="rounded border-slate-300 text-slate-800 focus:ring-slate-400"
                  />
                  <span class="text-sm text-slate-700">Enviar para o Drive</span>
                  <span class="text-xs text-slate-400">(requer configuração nas Variáveis de Ambiente)</span>
                </label>
              </div>
            }
          </div>

          <!-- Modal Footer -->
          <div class="flex flex-col gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50 flex-shrink-0">
            <!-- Drive status -->
            @if (driveSuccessCount() > 0) {
              <div class="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                {{ driveSuccessCount() }} arquivo(s) enviado(s) ao Google Drive com sucesso.
              </div>
            }
            @if (driveErrors().length > 0) {
              @for (err of driveErrors(); track $index) {
                <div class="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                  <span><strong>Drive:</strong> {{ err }}</span>
                </div>
              }
            }
            <!-- Buttons -->
            <div class="flex items-center justify-end gap-3">
              <button
                (click)="closeModal()"
                class="px-4 py-2 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                (click)="generatePdfs()"
                [disabled]="selectedCount() === 0 || generatingPdf()"
                class="px-5 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                @if (generatingPdf()) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Gerando...
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Gerar PDF{{ selectedCount() > 1 ? 's' : '' }}
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class PagamentoMontadorComponent implements OnInit {
  searchQuery = '';
  loading = signal(false);
  error = signal<string>('');
  salesOrders = signal<SalesOrderItem[]>([]);
  isSearchMode = signal(false);
  activeSearchTerm = signal('');

  // Modal state
  modalOpen = signal(false);
  selectedSalesOrder = signal<SalesOrderItem | null>(null);
  loadingItems = signal(false);
  itemsError = signal('');
  environments = signal<EnvironmentItem[]>([]);
  generatingPdf = signal(false);

  // Drive feedback
  driveSuccessCount = signal(0);
  driveErrors = signal<string[]>([]);

  // Form fields
  deliveryDate = '';
  assemblyStartDate = '';
  assemblyEndDate = '';
  sendToDrive = true;

  // Logo upload
  logoUploading = signal(false);
  logoSuccess = signal(false);
  logoName = signal('');

  constructor(private gosacService: GosacService) { }

  ngOnInit(): void {
    this.loadSalesOrders();
  }

  // --- Logo ---

  onLogoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.logoUploading.set(true);
    this.logoSuccess.set(false);
    this.logoName.set(file.name);

    const formData = new FormData();
    formData.append('file', file);

    this.gosacService.uploadLogo(formData).subscribe({
      next: () => {
        this.logoUploading.set(false);
        this.logoSuccess.set(true);
        setTimeout(() => this.logoSuccess.set(false), 3000);
      },
      error: () => {
        this.logoUploading.set(false);
        this.logoName.set('');
      },
    });

    input.value = '';
  }

  // --- Sales Orders ---

  loadSalesOrders(): void {
    this.loading.set(true);
    this.error.set('');
    const query = this.isSearchMode() ? this.activeSearchTerm() : undefined;
    this.gosacService.searchSalesOrders(query).subscribe({
      next: (items) => {
        const normalized: SalesOrderItem[] = items.map((i) => ({
          ...i,
          id: i.ponttaId,
        }));
        this.salesOrders.set(normalized);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(err?.error?.message || 'Erro ao carregar pedidos de venda');
        this.loading.set(false);
      },
    });
  }

  searchSalesOrders(): void {
    const q = this.searchQuery.trim();
    if (!q) { this.clearSearch(); return; }
    this.isSearchMode.set(true);
    this.activeSearchTerm.set(q);
    this.loadSalesOrders();
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.isSearchMode.set(false);
    this.activeSearchTerm.set('');
    this.loadSalesOrders();
  }

  onSearchInput(value: string): void {
    if (value.trim().length === 0 && this.isSearchMode()) {
      this.clearSearch();
    }
  }

  // --- Modal ---

  openModal(salesOrder: SalesOrderItem): void {
    this.selectedSalesOrder.set(salesOrder);
    this.environments.set([]);
    this.itemsError.set('');
    this.deliveryDate = '';
    this.assemblyStartDate = '';
    this.assemblyEndDate = '';
    this.driveSuccessCount.set(0);
    this.driveErrors.set([]);
    this.modalOpen.set(true);
    this.loadItems();
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedSalesOrder.set(null);
  }

  loadItems(): void {
    const salesOrder = this.selectedSalesOrder();
    if (!salesOrder) return;

    this.loadingItems.set(true);
    this.itemsError.set('');

    this.gosacService.getSalesOrderItems(salesOrder.id).subscribe({
      next: (items: any[]) => {
        if (items.length > 0) {
          console.log('[PonttaItems] raw keys:', Object.keys(items[0]));
          console.log('[PonttaItems] raw item[0]:', JSON.stringify(items[0]));
        }
        const envs: EnvironmentItem[] = items.map((item: any) => {
          const value =
            item.pvValue ??
            item.totalValue ??
            item.saleValue ??
            item.salePrice ??
            item.total ??
            item.price ??
            item.value ??
            0;
          const discount =
            item.discountPercentage ??
            item.discountPercent ??
            item.pvDiscount ??
            item.discount ??
            0;
          return {
            ...item,
            id: item.id || item.itemId || crypto.randomUUID(),
            name: item.name || item.description || item.title || 'Sem nome',
            value,
            discount,
            selected: false,
          };
        });
        this.environments.set(envs);
        this.loadingItems.set(false);
      },
      error: (err) => {
        this.itemsError.set(err?.error?.message || 'Erro ao carregar ambientes');
        this.loadingItems.set(false);
      },
    });
  }

  // --- Environment Selection ---

  toggleEnv(index: number): void {
    const envs = [...this.environments()];
    envs[index] = { ...envs[index], selected: !envs[index].selected };
    this.environments.set(envs);
  }

  toggleAll(): void {
    const allSel = this.allSelected();
    this.environments.set(this.environments().map(e => ({ ...e, selected: !allSel })));
  }

  allSelected(): boolean {
    const envs = this.environments();
    return envs.length > 0 && envs.every(e => e.selected);
  }

  selectedCount(): number {
    return this.environments().filter(e => e.selected).length;
  }

  // --- Calculations ---

  getOriginalValue(env: EnvironmentItem): number {
    // O valor retornado do Pontta já vem com desconto aplicado.
    return env.value;
  }

  getFinalValue(env: EnvironmentItem): number {
    return this.getOriginalValue(env) * 0.94;
  }

  getMontadorValue(env: EnvironmentItem): number {
    return this.getFinalValue(env) * 0.07;
  }

  totalMontador(): number {
    return this.environments()
      .filter(e => e.selected)
      .reduce((sum, e) => sum + this.getMontadorValue(e), 0);
  }

  // --- PDF Generation ---

  async generatePdfs(): Promise<void> {
    const selected = this.environments().filter(e => e.selected);
    if (selected.length === 0) return;

    const salesOrder = this.selectedSalesOrder()!;
    this.generatingPdf.set(true);
    this.driveSuccessCount.set(0);
    this.driveErrors.set([]);

    const formatDateBR = (d: string) => {
      if (!d) return '';
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    };

    try {
      for (const env of selected) {
        const response = await new Promise<HttpResponse<Blob>>((resolve, reject) => {
          this.gosacService.generateMontadorPdf({
            proposalCode: salesOrder.code,
            customerName: salesOrder.customerName,
            environmentName: env.name,
            environmentValue: env.value,
            ponttaDiscount: 0,
            additionalDiscount: 6,
            deliveryDate: formatDateBR(this.deliveryDate),
            assemblyStartDate: formatDateBR(this.assemblyStartDate),
            assemblyEndDate: formatDateBR(this.assemblyEndDate),
            sendToDrive: this.sendToDrive,
          }).subscribe({ next: resolve, error: reject });
        });

        const blob = response.body!;

        // Check Drive response headers
        if (this.sendToDrive) {
          if (response.headers.get('X-Drive-Success') === 'true') {
            this.driveSuccessCount.update(n => n + 1);
          } else {
            const errMsg = response.headers.get('X-Drive-Error');
            if (errMsg) {
              this.driveErrors.update(errs => [...errs, `${env.name}: ${errMsg}`]);
            }
          }
        }

        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const customerName = (salesOrder.customerName || '').replace(/[<>:"/\\|?*]/g, '').trim();
        const envName = env.name.replace(/[<>:"/\\|?*]/g, '').trim();
        a.download = `Pagamento Montador - ${customerName} - ${envName}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      this.itemsError.set(err?.error?.message || 'Erro ao gerar PDF');
    } finally {
      this.generatingPdf.set(false);
    }
  }

  // --- Formatters ---

  formatCurrency(value: number): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try {
      return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  }

  formatNegotiationStatus(status: string): string {
    const map: Record<string, string> = {
      'APPROVED': 'Aprovado',
      'IN_NEGOTIATION': 'Em negociação',
      'WAITING': 'Aguardando',
      'REJECTED': 'Rejeitado',
      'CANCELED': 'Cancelado',
    };
    return map[status] || status;
  }

  getNegotiationClasses(status: string): Record<string, boolean> {
    const approved = status === 'APPROVED';
    const pending = status === 'IN_NEGOTIATION' || status === 'WAITING';
    return {
      'bg-emerald-50 text-emerald-700 border-emerald-200': approved,
      'bg-amber-50 text-amber-700 border-amber-200': pending,
      'bg-slate-50 text-slate-600 border-slate-200': !approved && !pending,
    };
  }

  getNegotiationDotClass(status: string): string {
    if (status === 'APPROVED') return 'bg-emerald-500';
    if (status === 'IN_NEGOTIATION' || status === 'WAITING') return 'bg-amber-500';
    return 'bg-slate-400';
  }
}
