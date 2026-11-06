import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpResponse } from '@angular/common/http';
import { GosacApiService, SalesOrderSearchResult } from '../data/gosac-api.service';
import { ToastService } from '../../../core/ui/toast.service';
import { DialogComponent } from '../../../shared/components/dialog.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { PaginationComponent, pageRange, pageCount } from '../../../shared/components/pagination.component';

interface EnvironmentItem {
  id: string;
  name: string;
  value: number;
  selected: boolean;
}

interface SalesOrderItem extends SalesOrderSearchResult { id: string }

/**
 * Pagamento de montador: escolha o pedido na lista, marque os ambientes e gere o PDF.
 * O logotipo é um ajuste raro e fica numa janela própria, fora do caminho principal.
 */
@Component({
  selector: 'app-pagamento-montador',
  standalone: true,
  imports: [FormsModule, DialogComponent, IconComponent, PaginationComponent],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Pagamento de montador</h1>
          <p class="page-subtitle">Gere o PDF consolidado com os ambientes de um pedido de venda.</p>
        </div>
        <button type="button" class="icon-btn icon-btn-outline" (click)="logoAberto.set(true)" title="Logotipo do PDF" aria-label="Logotipo do PDF"><app-icon name="imagem" [size]="18" /></button>
      </div>

      <div class="table-shell">
        <div class="list-head">
          <form class="search-field" style="flex: 1 1 18rem;" (ngSubmit)="searchSalesOrders()">
            <app-icon name="busca" [size]="16" />
            <input type="search" class="form-input !min-h-9" [(ngModel)]="searchQuery" name="q" (ngModelChange)="onSearchInput($event)" placeholder="Cliente, código ou número do pedido" aria-label="Buscar pedido de venda" autocomplete="off" />
          </form>
          <span class="list-head-title"><small>{{ salesOrders().length }} {{ salesOrders().length === 1 ? 'pedido' : 'pedidos' }}@if (isSearchMode()) { · “{{ activeSearchTerm() }}” }</small></span>
        </div>

        @if (loading()) {
          <div class="loading-block"><span class="spinner"></span> Carregando pedidos…</div>
        } @else if (error()) {
          <div class="empty-state"><p style="color: var(--cmm-danger);">{{ error() }}</p><button type="button" class="btn btn-secondary btn-sm mt-3" (click)="loadSalesOrders()">Tentar de novo</button></div>
        } @else if (salesOrders().length === 0) {
          <div class="empty-state">
            @if (isSearchMode()) { <p>Nenhum pedido para “{{ activeSearchTerm() }}”.</p><button type="button" class="btn btn-ghost btn-sm mt-2" (click)="clearSearch()">Limpar busca</button> }
            @else { <p>Nenhum pedido de venda encontrado.</p> }
          </div>
        } @else {
          <table>
            <thead>
              <tr><th>Pedido</th><th>Cliente</th><th style="text-align: right;">Valor</th><th>Entrega</th><th>Criado em</th><th></th></tr>
            </thead>
            <tbody>
              @for (so of pagedSalesOrders(); track so.id) {
                <tr class="row-click" tabindex="0" (click)="openModal(so)" (keyup.enter)="openModal(so)">
                  <td><span class="font-mono text-xs font-semibold">{{ so.code }}</span></td>
                  <td class="font-medium">{{ so.customerName }}</td>
                  <td class="text-right font-semibold">{{ formatCurrency(so.value || 0) }}</td>
                  <td class="text-xs" style="color: var(--cmm-muted);">{{ formatDate(so.deliveryDate || '') }}</td>
                  <td class="text-xs" style="color: var(--cmm-muted);">{{ formatDate(so.saleDate || '') }}</td>
                  <td class="text-right"><app-icon name="seta_dir" [size]="16" style="color: var(--cmm-muted);" /></td>
                </tr>
              }
            </tbody>
          </table>
          <app-pagination [page]="currentPage() + 1" [totalPages]="totalPages()" [label]="pageRangeLabel()" (pageChange)="currentPage.set($event - 1)" />
        }
      </div>
    </div>

    <!-- Gerar PDF -->
    <app-dialog [open]="modalOpen()" title="Pagamento de montador" [subtitle]="selectedSalesOrder() ? selectedSalesOrder()!.code + ' · ' + selectedSalesOrder()!.customerName : ''" size="xl" [closable]="!generatingPdf()" (closed)="closeModal()">
      @if (loadingItems()) {
        <div class="loading-block"><span class="spinner"></span> Carregando ambientes…</div>
      } @else if (itemsError()) {
        <div class="empty-state"><p style="color: var(--cmm-danger);">{{ itemsError() }}</p><button type="button" (click)="loadItems()" class="btn btn-secondary btn-sm mt-3">Tentar de novo</button></div>
      } @else {
        <div class="space-y-6">
          <section>
            <div class="flex items-center justify-between gap-3 mb-2">
              <h3 class="form-label !mb-0">Ambientes <span class="font-normal" style="color: var(--cmm-muted);">· {{ environments().length }}</span></h3>
              <label class="check-chip !min-h-8 text-xs"><input type="checkbox" class="sr-only" [checked]="allSelected()" (change)="toggleAll()" /> Todos</label>
            </div>
            @if (environments().length === 0) {
              <p class="note">Nenhum ambiente neste pedido.</p>
            } @else {
              <div class="table-shell">
                <table class="min-w-[720px]">
                  <thead>
                    <tr><th class="w-10"></th><th>Ambiente</th><th style="text-align: right;">Valor base</th><th style="text-align: right;">Com desconto</th><th style="text-align: right;">Montador ({{ montadorPercent() }}%)</th></tr>
                  </thead>
                  <tbody>
                    @for (env of environments(); track env.id; let i = $index) {
                      <tr class="row-click" [class.row-on]="env.selected" (click)="toggleEnv(i)">
                        <td class="text-center"><input type="checkbox" [checked]="env.selected" (change)="toggleEnv(i)" (click)="$event.stopPropagation()" [attr.aria-label]="'Incluir ' + env.name" /></td>
                        <td class="font-medium">{{ env.name }}</td>
                        <td class="text-right">{{ formatCurrency(getOriginalValue(env)) }}</td>
                        <td class="text-right" style="color: var(--cmm-muted);">{{ formatCurrency(getFinalValue(env)) }}</td>
                        <td class="text-right font-semibold" style="color: var(--cmm-success);">{{ formatCurrency(getMontadorValue(env)) }}</td>
                      </tr>
                    }
                  </tbody>
                </table>
              </div>
            }
          </section>

          <section class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="form-label" for="pm-desc">Desconto adicional antes da nota</label>
              <div class="relative"><input id="pm-desc" type="number" min="0" max="100" step="0.1" [ngModel]="additionalDiscountPercent()" (ngModelChange)="additionalDiscountPercent.set(toPercent($event))" class="form-input pr-8" /><span class="pct">%</span></div>
            </div>
            <div>
              <label class="form-label" for="pm-mont">Percentual do montador</label>
              <div class="relative"><input id="pm-mont" type="number" min="0" max="100" step="0.1" [ngModel]="montadorPercent()" (ngModelChange)="montadorPercent.set(toPercent($event))" class="form-input pr-8" /><span class="pct">%</span></div>
            </div>
          </section>

          <section class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div><label class="form-label" for="pm-d1">Entrega de material</label><input id="pm-d1" type="date" [(ngModel)]="deliveryDate" class="form-input" /></div>
            <div><label class="form-label" for="pm-d2">Início da montagem</label><input id="pm-d2" type="date" [(ngModel)]="assemblyStartDate" class="form-input" /></div>
            <div><label class="form-label" for="pm-d3">Fim da montagem</label><input id="pm-d3" type="date" [(ngModel)]="assemblyEndDate" class="form-input" /></div>
          </section>

          <label class="switch-row">
            <span>Enviar também para o Google Drive<small>Precisa do Drive configurado em Configurações.</small></span>
            <button type="button" role="switch" class="switch" [class.switch-on]="sendToDrive" [attr.aria-checked]="sendToDrive" (click)="sendToDrive = !sendToDrive"><span class="switch-knob"></span></button>
          </label>
        </div>
      }
      <ng-container dialog-footer>
        <span class="mr-auto text-sm">
          @if (selectedCount() > 0) { {{ selectedCount() }} {{ selectedCount() === 1 ? 'ambiente' : 'ambientes' }} · <b style="color: var(--cmm-success);">{{ formatCurrency(totalMontador()) }}</b> }
          @else { <span style="color: var(--cmm-muted);">Marque os ambientes</span> }
        </span>
        <button type="button" (click)="closeModal()" class="btn btn-secondary" [disabled]="generatingPdf()">Cancelar</button>
        <button type="button" (click)="generatePdfs()" [disabled]="selectedCount() === 0 || generatingPdf()" class="btn btn-primary">
          @if (generatingPdf()) { <span class="spinner"></span> Gerando… } @else { <app-icon name="download" [size]="16" /> Gerar PDF }
        </button>
      </ng-container>
    </app-dialog>

    <!-- Logotipo -->
    <app-dialog [open]="logoAberto()" title="Logotipo do PDF" subtitle="Aparece no canto superior esquerdo. PNG, JPG ou WebP até 5 MB." size="sm" (closed)="logoAberto.set(false)">
      <label class="logo-drop">
        <input type="file" accept="image/png,image/jpeg,image/webp" class="sr-only" (change)="onLogoUpload($event)" [disabled]="logoUploading()" />
        @if (logoUploading()) { <span class="spinner"></span> Enviando… } @else { <app-icon name="upload" [size]="22" /> <span>{{ logoName() || 'Escolher arquivo' }}</span> }
      </label>
      <ng-container dialog-footer>
        <button type="button" class="btn btn-secondary" (click)="logoAberto.set(false)">Fechar</button>
      </ng-container>
    </app-dialog>
  `,
  styles: [`
    .pct { position: absolute; right: .8rem; top: 50%; transform: translateY(-50%); font-size: .75rem; color: var(--cmm-muted); }
    .logo-drop { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: .5rem; padding: 1.75rem 1rem; border: 1.5px dashed var(--cmm-border); border-radius: 1rem; cursor: pointer; color: var(--cmm-muted); font-size: .875rem; font-weight: 600; transition: border-color 160ms, color 160ms; }
    .logo-drop:hover { border-color: var(--cmm-accent); color: var(--cmm-accent); }
    .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); border: 0; }
  `],
})
export class PagamentoMontadorComponent implements OnInit {
  private readonly gosacService = inject(GosacApiService);
  private readonly toast = inject(ToastService);

  searchQuery = '';
  loading = signal(false);
  error = signal('');
  salesOrders = signal<SalesOrderItem[]>([]);
  isSearchMode = signal(false);
  activeSearchTerm = signal('');
  currentPage = signal(0);
  pageSize = signal(10);

  totalPages = computed(() => pageCount(this.salesOrders().length, this.pageSize()));
  pagedSalesOrders = computed(() => {
    const size = this.pageSize();
    const page = Math.min(this.currentPage(), Math.max(0, this.totalPages() - 1));
    return this.salesOrders().slice(page * size, page * size + size);
  });
  pageRangeLabel = computed(() => pageRange(this.currentPage() + 1, this.pageSize(), this.salesOrders().length));

  // janela de geração
  modalOpen = signal(false);
  selectedSalesOrder = signal<SalesOrderItem | null>(null);
  loadingItems = signal(false);
  itemsError = signal('');
  environments = signal<EnvironmentItem[]>([]);
  generatingPdf = signal(false);
  deliveryDate = '';
  assemblyStartDate = '';
  assemblyEndDate = '';
  sendToDrive = true;
  additionalDiscountPercent = signal<number>(15);
  montadorPercent = signal<number>(7);

  // logotipo
  logoAberto = signal(false);
  logoUploading = signal(false);
  logoName = signal('');

  ngOnInit(): void { this.loadSalesOrders(); }

  toPercent(value: unknown): number {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 0;
    return n > 100 ? 100 : n;
  }

  // ───── logotipo
  onLogoUpload(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.logoUploading.set(true);
    this.logoName.set(file.name);
    const formData = new FormData();
    formData.append('file', file);
    this.gosacService.uploadLogo(formData).subscribe({
      next: () => { this.logoUploading.set(false); this.toast.success('Logotipo atualizado.'); this.logoAberto.set(false); },
      error: (err) => { this.logoUploading.set(false); this.logoName.set(''); this.toast.error(err?.error?.message || 'Não foi possível enviar o logotipo.'); },
    });
    input.value = '';
  }

  // ───── pedidos
  loadSalesOrders(): void {
    this.loading.set(true);
    this.error.set('');
    this.gosacService.searchSalesOrders(this.isSearchMode() ? this.activeSearchTerm() : undefined).subscribe({
      next: (items) => {
        this.salesOrders.set(items.map((i) => ({ ...i, id: i.ponttaId })));
        this.currentPage.set(0);
        this.loading.set(false);
      },
      error: (err) => { this.error.set(err?.error?.message || 'Não foi possível carregar os pedidos.'); this.loading.set(false); },
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
    if (value.trim().length === 0 && this.isSearchMode()) this.clearSearch();
  }

  // ───── janela
  openModal(salesOrder: SalesOrderItem): void {
    this.selectedSalesOrder.set(salesOrder);
    this.environments.set([]);
    this.itemsError.set('');
    this.deliveryDate = this.assemblyStartDate = this.assemblyEndDate = '';
    this.modalOpen.set(true);
    this.loadItems();
  }

  closeModal(): void {
    if (this.generatingPdf()) return;
    this.modalOpen.set(false);
  }

  loadItems(): void {
    const salesOrder = this.selectedSalesOrder();
    if (!salesOrder) return;
    this.loadingItems.set(true);
    this.itemsError.set('');
    this.gosacService.getSalesOrderItems(salesOrder.id).subscribe({
      next: (items) => {
        const envs: EnvironmentItem[] = (items as Array<Record<string, unknown>>).map((item) => ({
          id: String(item['id'] || item['itemId'] || crypto.randomUUID()),
          name: String(item['name'] || item['description'] || item['title'] || 'Sem nome'),
          // Regra de negócio: no pagamento do montador, usar o total do ambiente.
          value: Number(item['total'] ?? item['totalValue'] ?? item['pvValue'] ?? item['saleValue'] ?? item['salePrice'] ?? item['price'] ?? item['value'] ?? 0) || 0,
          selected: false,
        }));
        this.environments.set(envs);
        this.loadingItems.set(false);
      },
      error: (err) => { this.itemsError.set(err?.error?.message || 'Não foi possível carregar os ambientes.'); this.loadingItems.set(false); },
    });
  }

  toggleEnv(index: number): void {
    this.environments.update((envs) => envs.map((e, i) => (i === index ? { ...e, selected: !e.selected } : e)));
  }
  toggleAll(): void {
    const all = this.allSelected();
    this.environments.update((envs) => envs.map((e) => ({ ...e, selected: !all })));
  }
  allSelected(): boolean { const e = this.environments(); return e.length > 0 && e.every((x) => x.selected); }
  selectedCount(): number { return this.environments().filter((e) => e.selected).length; }

  // ───── cálculo
  private getEnvironmentsTotal(): number { return this.environments().reduce((s, e) => s + (Number.isFinite(e.value) ? e.value : 0), 0); }
  private getDiscountedSalesOrderTotal(): number | null {
    const v = this.selectedSalesOrder()?.value;
    return typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;
  }
  /** Distribui o desconto total do pedido proporcionalmente por ambiente. */
  getOriginalValue(env: EnvironmentItem): number {
    const totalItems = this.getEnvironmentsTotal();
    const discountedTotal = this.getDiscountedSalesOrderTotal();
    return discountedTotal != null && totalItems > 0 ? env.value * (discountedTotal / totalItems) : env.value;
  }
  getFinalValue(env: EnvironmentItem): number { return this.getOriginalValue(env) * (1 - this.additionalDiscountPercent() / 100); }
  getMontadorValue(env: EnvironmentItem): number { return this.getFinalValue(env) * (this.montadorPercent() / 100); }
  totalMontador(): number { return this.environments().filter((e) => e.selected).reduce((s, e) => s + this.getMontadorValue(e), 0); }

  // ───── PDF
  async generatePdfs(): Promise<void> {
    const selected = this.environments().filter((e) => e.selected);
    const salesOrder = this.selectedSalesOrder();
    if (!selected.length || !salesOrder) return;
    this.generatingPdf.set(true);
    const br = (d: string) => (d ? d.split('-').reverse().join('/') : '');
    try {
      const environmentsPayload = selected.map((env) => ({ environmentName: env.name, environmentValue: this.getOriginalValue(env) }));
      const response = await new Promise<HttpResponse<Blob>>((resolve, reject) => {
        this.gosacService.generateMontadorPdf({
          proposalCode: salesOrder.code,
          customerName: salesOrder.customerName,
          environmentName: selected.length > 1 ? 'Ambientes' : selected[0].name,
          environmentValue: environmentsPayload.reduce((s, e) => s + e.environmentValue, 0),
          environments: environmentsPayload,
          ponttaDiscount: 0,
          additionalDiscount: this.additionalDiscountPercent(),
          montadorPercent: this.montadorPercent(),
          deliveryDate: br(this.deliveryDate),
          assemblyStartDate: br(this.assemblyStartDate),
          assemblyEndDate: br(this.assemblyEndDate),
          sendToDrive: this.sendToDrive,
        }).subscribe({ next: resolve, error: reject });
      });

      const blob = response.body!;
      const clean = (s: string) => (s || '').replace(/[<>:"/\\|?*]/g, '').trim();
      const firstName = clean(salesOrder.customerName).split(' ')[0] || 'Cliente';
      const envLabel = selected.length > 1 ? 'Ambientes' : clean(selected[0].name) || 'Ambiente';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = clean(salesOrder.code) ? `(${clean(salesOrder.code)}) ${firstName} - ${envLabel}.pdf` : `${firstName} - ${envLabel}.pdf`;
      a.click();
      URL.revokeObjectURL(url);

      if (this.sendToDrive) {
        if (response.headers.get('X-Drive-Success') === 'true') this.toast.success('PDF gerado e enviado ao Google Drive.');
        else this.toast.warning(`PDF gerado, mas o Drive falhou: ${response.headers.get('X-Drive-Error') || 'erro desconhecido'}.`);
      } else {
        this.toast.success('PDF gerado.');
      }
      this.modalOpen.set(false);
    } catch (err: unknown) {
      this.toast.error((err as { error?: { message?: string } })?.error?.message || 'Não foi possível gerar o PDF.');
    } finally {
      this.generatingPdf.set(false);
    }
  }

  // ───── formatação
  formatCurrency(value: number): string {
    return value == null ? '—' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }
  formatDate(dateStr: string): string {
    if (!dateStr) return '—';
    try { return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr)); } catch { return dateStr; }
  }
}
