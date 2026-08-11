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
      <div class="page-header">
        <div>
          <h1 class="page-title">Pagamento de Montador</h1>
          <p class="page-subtitle">Gere um boleto/PDF consolidado com todos os ambientes selecionados.</p>
        </div>
      </div>

      <div class="panel panel-pad flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div class="flex items-center gap-3 min-w-0">
          <svg class="w-5 h-5 flex-shrink-0" style="color: var(--cmm-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
          <div class="min-w-0">
            <p class="text-sm font-medium" style="color: var(--cmm-ink);">Logotipo da empresa</p>
            <p class="text-xs" style="color: var(--cmm-muted);">Aparece no canto superior esquerdo do PDF · PNG, JPG ou WebP · máx 5MB</p>
          </div>
        </div>
        <label class="cursor-pointer flex-shrink-0">
          <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" (change)="onLogoUpload($event)" />
          <span
            class="btn btn-sm"
            [class.btn-secondary]="!logoSuccess()"
            [class.btn-accent]="logoSuccess()"
            [class.opacity-60]="logoUploading()"
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

      <div class="panel panel-pad space-y-3">
        <label class="form-label">Pesquisar pedido de venda no Pontta</label>
        <div class="flex gap-2">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Nome do cliente, código ou número do pedido..."
            class="form-input flex-1 min-w-0" style="width: auto;"
            (keyup.enter)="searchSalesOrders()"
            (ngModelChange)="onSearchInput($event)"
          />
          <button type="button" (click)="searchSalesOrders()" [disabled]="loading()" class="btn btn-primary">
            @if (loading()) {
              <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
            }
            Pesquisar
          </button>
          @if (searchQuery.length > 0) {
            <button type="button" (click)="clearSearch()" class="btn btn-secondary" title="Limpar pesquisa">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          }
        </div>
        @if (error()) {
          <p class="text-sm" style="color: var(--cmm-danger);">{{ error() }}</p>
        }
      </div>

      <div class="table-shell">
        <div class="flex items-center justify-between gap-3 px-4 py-3 border-b" style="border-color: var(--cmm-border);">
          <span class="text-sm font-semibold" style="color: var(--cmm-ink);">
            Pedidos de Venda
            @if (isSearchMode()) {
              <span class="font-normal" style="color: var(--cmm-muted);">&middot; Pesquisa: "{{ activeSearchTerm() }}"</span>
            }
            <span class="font-normal" style="color: var(--cmm-muted);">({{ salesOrders().length }})</span>
          </span>
          <button type="button" (click)="loadSalesOrders()" class="btn btn-ghost btn-sm">Atualizar</button>
        </div>

        @if (loading()) {
          <div class="empty-state">
            <svg class="w-5 h-5 animate-spin mx-auto" style="color: var(--cmm-muted);" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <p class="text-xs mt-2">Carregando pedidos de venda...</p>
          </div>
        } @else if (salesOrders().length === 0) {
          <div class="empty-state">
            <svg class="w-8 h-8 mx-auto mb-2" style="color: var(--cmm-border);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            @if (isSearchMode()) {
              <p>Nenhum pedido de venda encontrado para "{{ activeSearchTerm() }}".</p>
              <p class="text-xs mt-1">Tente outra pesquisa ou limpe o filtro.</p>
            } @else {
              <p>Nenhum pedido de venda encontrado.</p>
            }
          </div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Responsável</th>
                <th style="text-align: right;">Valor</th>
                <th>Negociação</th>
                <th>Entrega</th>
                <th>Criado em</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (salesOrder of salesOrders(); track salesOrder.id) {
                <tr class="cursor-pointer" (click)="openModal(salesOrder)">
                  <td>
                    <span class="font-mono text-xs font-semibold">{{ salesOrder.code }}</span>
                  </td>
                  <td>
                    <p class="font-medium">{{ salesOrder.customerName }}</p>
                  </td>
                  <td style="color: var(--cmm-muted);">—</td>
                  <td class="text-right font-semibold">{{ formatCurrency(salesOrder.value || 0) }}</td>
                  <td>
                    <span class="badge badge-neutral">{{ salesOrder.status || '—' }}</span>
                  </td>
                  <td class="text-xs" style="color: var(--cmm-muted);">—</td>
                  <td class="text-xs" style="color: var(--cmm-muted);">{{ formatDate(salesOrder.saleDate || '') }}</td>
                  <td class="text-right">
                    <button
                      type="button"
                      (click)="openModal(salesOrder); $event.stopPropagation()"
                      class="btn btn-ghost btn-sm"
                      title="Abrir ambientes"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    @if (modalOpen()) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" (click)="closeModal()">
        <div class="absolute inset-0" style="background: rgba(10, 16, 24, 0.55);"></div>

        <div
          class="relative w-full sm:max-w-3xl max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden sm:rounded-xl"
          style="background: var(--cmm-panel); border: 1px solid var(--cmm-border); box-shadow: 0 18px 40px rgba(15, 26, 39, 0.18);"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between gap-3 px-5 py-4 border-b flex-shrink-0" style="border-color: var(--cmm-border); background: color-mix(in srgb, var(--cmm-surface) 70%, var(--cmm-panel));">
            <div class="min-w-0">
              <h2 class="text-base font-semibold" style="color: var(--cmm-ink);">Pagamento de Montador</h2>
              <p class="text-xs mt-0.5 truncate" style="color: var(--cmm-muted);">
                {{ selectedSalesOrder()!.code }} &mdash; {{ selectedSalesOrder()!.customerName }}
              </p>
            </div>
            <button type="button" (click)="closeModal()" class="btn btn-ghost btn-sm flex-shrink-0">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="flex-1 overflow-y-auto overscroll-contain px-5 py-5 space-y-6 min-h-0">
            @if (loadingItems()) {
              <div class="empty-state py-10">
                <svg class="w-6 h-6 animate-spin mx-auto" style="color: var(--cmm-muted);" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                <p class="text-sm mt-2">Carregando ambientes...</p>
              </div>
            } @else if (itemsError()) {
              <div class="empty-state py-6">
                <p style="color: var(--cmm-danger);">{{ itemsError() }}</p>
                <button type="button" (click)="loadItems()" class="btn btn-ghost btn-sm mt-2">Tentar novamente</button>
              </div>
            } @else {
              <div>
                <div class="flex items-center justify-between gap-3 mb-3">
                  <p class="text-sm font-semibold" style="color: var(--cmm-ink);">Ambientes ({{ environments().length }})</p>
                  <label class="flex items-center gap-2 text-xs cursor-pointer select-none" style="color: var(--cmm-muted);">
                    <input type="checkbox" [checked]="allSelected()" (change)="toggleAll()" class="rounded" style="accent-color: var(--cmm-accent);" />
                    Selecionar todos
                  </label>
                </div>

                @if (environments().length === 0) {
                  <div class="empty-state py-6">Nenhum ambiente encontrado neste orçamento.</div>
                } @else {
                  <div class="table-shell">
                    <table class="min-w-[980px]">
                      <thead>
                        <tr>
                          <th class="w-10"></th>
                          <th>Ambiente</th>
                          <th style="text-align: right;">Valor Base</th>
                          <th style="text-align: right;">Valor Original</th>
                          <th style="text-align: right;">Desc. Adic.</th>
                          <th style="text-align: right;">Valor c/ Desc.</th>
                          <th style="text-align: right;">Montador ({{ montadorPercent() }}%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (env of environments(); track env.id; let i = $index) {
                          <tr
                            class="cursor-pointer"
                            [style.background]="env.selected ? 'color-mix(in srgb, var(--cmm-accent) 8%, var(--cmm-panel))' : null"
                            (click)="toggleEnv(i)"
                          >
                            <td class="text-center">
                              <input
                                type="checkbox"
                                [checked]="env.selected"
                                (change)="toggleEnv(i)"
                                (click)="$event.stopPropagation()"
                                class="rounded"
                                style="accent-color: var(--cmm-accent);"
                              />
                            </td>
                            <td class="font-medium">{{ env.name }}</td>
                            <td class="text-right font-medium">{{ formatCurrency(getOriginalValue(env)) }}</td>
                            <td class="text-right" style="color: var(--cmm-muted);">{{ formatCurrency(env.value) }}</td>
                            <td class="text-right" style="color: var(--cmm-muted);">{{ additionalDiscountPercent().toFixed(1) }}%</td>
                            <td class="text-right font-medium">{{ formatCurrency(getFinalValue(env)) }}</td>
                            <td class="text-right font-semibold" style="color: var(--cmm-success);">{{ formatCurrency(getMontadorValue(env)) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>

                  @if (selectedCount() > 0) {
                    <div class="mt-3 flex flex-wrap items-center justify-end gap-4 text-sm">
                      <span style="color: var(--cmm-muted);">{{ selectedCount() }} ambiente(s) selecionado(s)</span>
                      <span class="font-semibold" style="color: var(--cmm-success);">Total montador: {{ formatCurrency(totalMontador()) }}</span>
                    </div>
                  }
                }
              </div>

              <div>
                <p class="text-sm font-semibold mb-3" style="color: var(--cmm-ink);">Percentuais</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="form-label">Desconto adicional aplicado antes da nota (%)</label>
                    <div class="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        [ngModel]="additionalDiscountPercent()"
                        (ngModelChange)="additionalDiscountPercent.set(toPercent($event))"
                        class="form-input pr-8"
                      />
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style="color: var(--cmm-muted);">%</span>
                    </div>
                    <p class="text-[11px] mt-1" style="color: var(--cmm-muted);">Padrão: 15%</p>
                  </div>
                  <div>
                    <label class="form-label">Percentual do montador (%)</label>
                    <div class="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        [ngModel]="montadorPercent()"
                        (ngModelChange)="montadorPercent.set(toPercent($event))"
                        class="form-input pr-8"
                      />
                      <span class="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style="color: var(--cmm-muted);">%</span>
                    </div>
                    <p class="text-[11px] mt-1" style="color: var(--cmm-muted);">Padrão: 7%</p>
                  </div>
                </div>
              </div>

              <div>
                <p class="text-sm font-semibold mb-3" style="color: var(--cmm-ink);">Datas</p>
                <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label class="form-label">Entrega de Material</label>
                    <input type="date" [(ngModel)]="deliveryDate" class="form-input" />
                  </div>
                  <div>
                    <label class="form-label">Início de Montagem</label>
                    <input type="date" [(ngModel)]="assemblyStartDate" class="form-input" />
                  </div>
                  <div>
                    <label class="form-label">Finalização de Montagem</label>
                    <input type="date" [(ngModel)]="assemblyEndDate" class="form-input" />
                  </div>
                </div>
              </div>

              <div>
                <label class="flex items-center gap-2.5 cursor-pointer select-none">
                  <input type="checkbox" [(ngModel)]="sendToDrive" class="rounded" style="accent-color: var(--cmm-accent);" />
                  <span class="text-sm" style="color: var(--cmm-ink);">Enviar para o Drive</span>
                  <span class="text-xs" style="color: var(--cmm-muted);">(requer configuração nas Variáveis de Ambiente)</span>
                </label>
              </div>
            }
          </div>

          <div class="flex flex-col gap-2 px-5 py-4 border-t flex-shrink-0" style="border-color: var(--cmm-border); background: color-mix(in srgb, var(--cmm-surface) 70%, var(--cmm-panel));">
            @if (driveSuccessCount() > 0) {
              <div class="flex items-center gap-2 text-xs rounded-lg px-3 py-2 border"
                style="color: var(--cmm-success); background: color-mix(in srgb, var(--cmm-success) 12%, var(--cmm-panel)); border-color: color-mix(in srgb, var(--cmm-success) 30%, transparent);">
                <svg class="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                {{ driveSuccessCount() }} arquivo(s) enviado(s) ao Google Drive com sucesso.
              </div>
            }
            @if (driveErrors().length > 0) {
              @for (err of driveErrors(); track $index) {
                <div class="flex items-start gap-2 text-xs rounded-lg px-3 py-2 border"
                  style="color: var(--cmm-warning); background: color-mix(in srgb, var(--cmm-warning) 12%, var(--cmm-panel)); border-color: color-mix(in srgb, var(--cmm-warning) 30%, transparent);">
                  <svg class="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                  <span><strong>Drive:</strong> {{ err }}</span>
                </div>
              }
            }
            <div class="flex items-center justify-end gap-3">
              <button type="button" (click)="closeModal()" class="btn btn-secondary">Cancelar</button>
              <button
                type="button"
                (click)="generatePdfs()"
                [disabled]="selectedCount() === 0 || generatingPdf()"
                class="btn btn-primary"
              >
                @if (generatingPdf()) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  Gerando boleto...
                } @else {
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                  Gerar boleto
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

  // Percentuais editáveis (padrão mantido)
  additionalDiscountPercent = signal<number>(15);
  montadorPercent = signal<number>(7);

  toPercent(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    if (n > 100) return 100;
    return n;
  }

  // Logo upload
  logoUploading = signal(false);
  logoSuccess = signal(false);
  logoName = signal('');

  private log(event: string, data?: unknown): void {
    if (data !== undefined) {
      console.log(`[MontadorUI] ${event}`, data);
      return;
    }
    console.log(`[MontadorUI] ${event}`);
  }

  constructor(private gosacService: GosacService) { }

  ngOnInit(): void {
    this.log('ngOnInit -> loadSalesOrders');
    this.loadSalesOrders();
  }

  // --- Logo ---

  onLogoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.log('onLogoUpload início', { name: file.name, size: file.size, type: file.type });

    this.logoUploading.set(true);
    this.logoSuccess.set(false);
    this.logoName.set(file.name);

    const formData = new FormData();
    formData.append('file', file);

    this.gosacService.uploadLogo(formData).subscribe({
      next: () => {
        this.log('onLogoUpload sucesso', { name: file.name });
        this.logoUploading.set(false);
        this.logoSuccess.set(true);
        setTimeout(() => this.logoSuccess.set(false), 3000);
      },
      error: (err) => {
        this.log('onLogoUpload erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
        this.logoUploading.set(false);
        this.logoName.set('');
      },
    });

    input.value = '';
  }

  // --- Sales Orders ---

  loadSalesOrders(): void {
    this.log('loadSalesOrders início', {
      isSearchMode: this.isSearchMode(),
      query: this.isSearchMode() ? this.activeSearchTerm() : undefined,
    });
    this.loading.set(true);
    this.error.set('');
    const query = this.isSearchMode() ? this.activeSearchTerm() : undefined;
    this.gosacService.searchSalesOrders(query).subscribe({
      next: (items) => {
        this.log('loadSalesOrders sucesso', { total: items.length });
        const normalized: SalesOrderItem[] = items.map((i) => ({
          ...i,
          id: i.ponttaId,
        }));
        this.salesOrders.set(normalized);
        this.loading.set(false);
      },
      error: (err) => {
        this.log('loadSalesOrders erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
        this.error.set(err?.error?.message || 'Erro ao carregar pedidos de venda');
        this.loading.set(false);
      },
    });
  }

  searchSalesOrders(): void {
    const q = this.searchQuery.trim();
    this.log('searchSalesOrders acionado', { query: q });
    if (!q) { this.clearSearch(); return; }
    this.isSearchMode.set(true);
    this.activeSearchTerm.set(q);
    this.loadSalesOrders();
  }

  clearSearch(): void {
    this.log('clearSearch');
    this.searchQuery = '';
    this.isSearchMode.set(false);
    this.activeSearchTerm.set('');
    this.loadSalesOrders();
  }

  onSearchInput(value: string): void {
    this.log('onSearchInput', { value });
    if (value.trim().length === 0 && this.isSearchMode()) {
      this.clearSearch();
    }
  }

  // --- Modal ---

  openModal(salesOrder: SalesOrderItem): void {
    this.log('openModal', { salesOrderId: salesOrder.id, code: salesOrder.code, customerName: salesOrder.customerName });
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
    this.log('closeModal');
    this.modalOpen.set(false);
    this.selectedSalesOrder.set(null);
  }

  loadItems(): void {
    const salesOrder = this.selectedSalesOrder();
    if (!salesOrder) return;

    this.log('loadItems início', { salesOrderId: salesOrder.id, code: salesOrder.code });

    this.loadingItems.set(true);
    this.itemsError.set('');

    this.gosacService.getSalesOrderItems(salesOrder.id).subscribe({
      next: (items: any[]) => {
        this.log('loadItems sucesso', { total: items.length });
        if (items.length > 0) {
          console.log('[PonttaItems] raw keys:', Object.keys(items[0]));
          console.log('[PonttaItems] raw item[0]:', JSON.stringify(items[0]));
        }
        const envs: EnvironmentItem[] = items.map((item: any) => {
          // Regra de negócio: no pagamento do montador, usar o total do ambiente.
          const value =
            item.total ??
            item.totalValue ??
            item.pvValue ??
            item.saleValue ??
            item.salePrice ??
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
        this.log('loadItems erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
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
    this.log('toggleEnv', { index, envId: envs[index].id, selected: envs[index].selected });
  }

  toggleAll(): void {
    const allSel = this.allSelected();
    this.environments.set(this.environments().map(e => ({ ...e, selected: !allSel })));
    this.log('toggleAll', { previousAllSelected: allSel, selectedCount: this.selectedCount() });
  }

  allSelected(): boolean {
    const envs = this.environments();
    return envs.length > 0 && envs.every(e => e.selected);
  }

  selectedCount(): number {
    return this.environments().filter(e => e.selected).length;
  }

  // --- Calculations ---

  private getEnvironmentsTotal(): number {
    return this.environments()
      .reduce((sum, e) => sum + (typeof e.value === 'number' ? e.value : 0), 0);
  }

  private getDiscountedSalesOrderTotal(): number | null {
    const salesOrderValue = this.selectedSalesOrder()?.value;
    if (typeof salesOrderValue === 'number' && Number.isFinite(salesOrderValue) && salesOrderValue > 0) {
      return salesOrderValue;
    }
    return null;
  }

  getOriginalValue(env: EnvironmentItem): number {
    // Regra: distribuir o desconto total proporcionalmente por ambiente.
    const totalItems = this.getEnvironmentsTotal();
    const discountedTotal = this.getDiscountedSalesOrderTotal();

    if (discountedTotal != null && totalItems > 0) {
      const ratio = discountedTotal / totalItems;
      return env.value * ratio;
    }

    return env.value;
  }

  getFinalValue(env: EnvironmentItem): number {
    const discountFactor = 1 - this.additionalDiscountPercent() / 100;
    return this.getOriginalValue(env) * discountFactor;
  }

  getMontadorValue(env: EnvironmentItem): number {
    return this.getFinalValue(env) * (this.montadorPercent() / 100);
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
    this.log('generatePdfs início', {
      salesOrderId: salesOrder.id,
      code: salesOrder.code,
      selectedCount: selected.length,
      sendToDrive: this.sendToDrive,
    });
    this.generatingPdf.set(true);
    this.driveSuccessCount.set(0);
    this.driveErrors.set([]);

    const formatDateBR = (d: string) => {
      if (!d) return '';
      const [y, m, day] = d.split('-');
      return `${day}/${m}/${y}`;
    };

    try {
      const totalItems = this.getEnvironmentsTotal();
      const discountedTotal = this.getDiscountedSalesOrderTotal();
      const environmentsPayload = selected.map((env) => ({
        environmentName: env.name,
        environmentValue: this.getOriginalValue(env),
      }));

      this.log('generatePdfs payload consolidado', {
        salesOrderTotal: salesOrder.value,
        totalItems,
        selectedCount: selected.length,
        baseSource: discountedTotal != null && totalItems > 0 ? 'environment.total (proporcional ao desconto)' : 'environment.total',
        environments: environmentsPayload,
      });

      const response = await new Promise<HttpResponse<Blob>>((resolve, reject) => {
        this.gosacService.generateMontadorPdf({
          proposalCode: salesOrder.code,
          customerName: salesOrder.customerName,
          environmentName: selected.length > 1 ? 'Ambientes' : selected[0].name,
          environmentValue: environmentsPayload.reduce((sum, env) => sum + env.environmentValue, 0),
          environments: environmentsPayload,
          ponttaDiscount: 0,
          additionalDiscount: this.additionalDiscountPercent(),
          montadorPercent: this.montadorPercent(),
          deliveryDate: formatDateBR(this.deliveryDate),
          assemblyStartDate: formatDateBR(this.assemblyStartDate),
          assemblyEndDate: formatDateBR(this.assemblyEndDate),
          sendToDrive: this.sendToDrive,
        }).subscribe({ next: resolve, error: reject });
      });

      const blob = response.body!;

      if (this.sendToDrive) {
        if (response.headers.get('X-Drive-Success') === 'true') {
          this.log('generatePdfs drive sucesso', { selectedCount: selected.length });
          this.driveSuccessCount.set(1);
        } else {
          const errMsg = response.headers.get('X-Drive-Error');
          if (errMsg) {
            this.log('generatePdfs drive erro', { error: errMsg });
            this.driveErrors.set([`Boleto consolidado: ${errMsg}`]);
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const orderCode = (salesOrder.code || '').replace(/[<>:"/\\|?*]/g, '').trim();
      const customerName = (salesOrder.customerName || '').replace(/[<>:"/\\|?*]/g, '').trim();
      const firstName = customerName.split(' ')[0] || 'Cliente';
      const envLabel = selected.length > 1 ? 'Ambientes' : (selected[0].name || 'Ambiente').replace(/[<>:"/\\|?*]/g, '').trim();
      a.download = orderCode
        ? `(${orderCode}) ${firstName} - ${envLabel}.pdf`
        : `${firstName} - ${envLabel}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      this.log('generatePdfs concluído arquivo único', { fileName: a.download, selectedCount: selected.length });

      this.log('generatePdfs concluído', {
        driveSuccessCount: this.driveSuccessCount(),
        driveErrorsCount: this.driveErrors().length,
      });
    } catch (err: any) {
      this.log('generatePdfs erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
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
