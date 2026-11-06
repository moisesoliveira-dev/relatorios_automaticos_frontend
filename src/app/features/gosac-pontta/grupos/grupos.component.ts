import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GosacApiService, GosacTicket, GosacGroup, SalesOrderSearchResult } from '../data/gosac-api.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ModalService } from '../../../shared/services/modal.service';
import { DialogComponent } from '../../../shared/components/dialog.component';
import { IconComponent } from '../../../shared/components/icon.component';

/**
 * Grupos: cada grupo do GOSAC ligado a um pedido de venda do Pontta. A busca de tickets abre numa
 * janela (é um passo de cadastro, não parte da lista) e o vínculo do pedido também.
 */
@Component({
  selector: 'app-grupos',
  standalone: true,
  imports: [FormsModule, DialogComponent, IconComponent],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Grupos</h1>
          <p class="page-subtitle">Grupos do GOSAC cujas mídias vão para uma ocorrência no Pontta.</p>
        </div>
        <button type="button" (click)="abrirBusca()" class="btn btn-primary"><app-icon name="mais" [size]="16" /> Cadastrar grupo</button>
      </div>

      <div class="table-shell">
        <div class="list-head">
          <span class="list-head-title">Grupos cadastrados <small>· {{ groups().length }}</small></span>
        </div>

        @if (loadingGroups()) {
          <div class="loading-block"><span class="spinner"></span></div>
        } @else if (groups().length === 0) {
          <div class="empty-state">
            <p>Nenhum grupo cadastrado.</p>
            <button type="button" class="btn btn-secondary btn-sm mt-3" (click)="abrirBusca()">Buscar um ticket no GOSAC</button>
          </div>
        } @else {
          <table>
            <thead>
              <tr><th>Grupo</th><th>Pedido de venda</th><th>Ocorrência Pontta</th><th>Ativo</th><th style="text-align: right;"></th></tr>
            </thead>
            <tbody>
              @for (group of groups(); track group.id) {
                <tr>
                  <td>
                    <p class="font-medium">{{ group.gosacTicketName }}</p>
                    <p class="text-xs font-mono" style="color: var(--cmm-muted);">ticket #{{ group.gosacTicketId }}</p>
                  </td>
                  <td>
                    @if ((group.salesOrders || []).length > 0) {
                      @for (so of group.salesOrders; track so.id) {
                        <div class="flex items-center gap-2">
                          <span class="font-medium font-mono text-xs">{{ so.code }}</span>
                          <span class="text-xs truncate max-w-40" style="color: var(--cmm-muted);" [title]="so.customerName">{{ so.customerName }}</span>
                          <button type="button" (click)="unlinkSalesOrder(group, so.id)" class="icon-btn icon-btn-sm icon-danger" title="Desvincular pedido" aria-label="Desvincular pedido"><app-icon name="desvincular" [size]="14" /></button>
                        </div>
                      }
                    } @else {
                      <button type="button" (click)="openLinkModal(group)" class="btn btn-secondary btn-sm"><app-icon name="link" [size]="14" /> Vincular pedido</button>
                    }
                  </td>
                  <td>
                    @if ((group.salesOrders || []).length > 0) {
                      @for (so of group.salesOrders; track so.id) {
                        @if (so.ponttaOccurrenceStatus === 'created' || so.ponttaOccurrenceId) {
                          <span class="state state-on">{{ so.ponttaOccurrenceNumber ? '#' + so.ponttaOccurrenceNumber : 'Criada' }}</span>
                        } @else if (so.ponttaOccurrenceStatus === 'failed') {
                          <span class="state state-bad">Falhou</span>
                        } @else {
                          <span class="state state-busy">Criando…</span>
                        }
                      }
                    } @else { <span style="color: var(--cmm-muted);">—</span> }
                  </td>
                  <td>
                    <button type="button" role="switch" class="switch" [class.switch-on]="group.isActive" [attr.aria-checked]="group.isActive" (click)="toggleGroup(group)" [attr.aria-label]="group.isActive ? 'Desativar grupo' : 'Ativar grupo'"><span class="switch-knob"></span></button>
                  </td>
                  <td class="text-right">
                    <button type="button" (click)="deleteGroup(group)" class="icon-btn icon-danger" title="Remover grupo" aria-label="Remover grupo"><app-icon name="lixeira" [size]="16" /></button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    <!-- Cadastrar: buscar ticket no GOSAC -->
    <app-dialog [open]="buscaAberta()" title="Cadastrar grupo" subtitle="Procure o grupo ou contato no GOSAC e cadastre." (closed)="buscaAberta.set(false)">
      <form class="search-field mb-3" (ngSubmit)="searchTickets()">
        <app-icon name="busca" [size]="16" />
        <input type="search" class="form-input" [(ngModel)]="searchQuery" name="q" placeholder="Nome do contato ou do grupo e Enter" autocomplete="off" autofocus />
      </form>
      @if (searching()) {
        <div class="loading-block"><span class="spinner"></span> Buscando…</div>
      } @else if (searchError()) {
        <p class="note note-warn">{{ searchError() }}</p>
      } @else if (searchResults().length) {
        <ul class="res">
          @for (ticket of searchResults(); track ticket.id) {
            <li class="res-item">
              <span class="min-w-0 flex-1">
                <span class="block text-sm font-medium truncate">{{ ticket.contact?.name || 'Sem nome' }}</span>
                <span class="block text-xs" style="color: var(--cmm-muted);">ticket #{{ ticket.id }}@if (ticket.queue) { · {{ ticket.queue.name }} }</span>
              </span>
              @if (isTicketAlreadyAdded(ticket.id)) {
                <span class="state state-on">Cadastrado</span>
              } @else {
                <button type="button" (click)="addTicketAsGroup(ticket)" class="btn btn-primary btn-sm" [disabled]="adding() === ticket.id">{{ adding() === ticket.id ? 'Cadastrando…' : 'Cadastrar' }}</button>
              }
            </li>
          }
        </ul>
      } @else {
        <p class="text-sm" style="color: var(--cmm-muted);">Digite parte do nome e pressione Enter.</p>
      }
    </app-dialog>

    <!-- Vincular pedido de venda -->
    <app-dialog [open]="linkAberto()" title="Vincular pedido de venda" [subtitle]="linkGroup() ? linkGroup()!.gosacTicketName + ' · ticket #' + linkGroup()!.gosacTicketId : ''" [closable]="!linking()" (closed)="closeLinkModal()">
      @if (!selectedSo()) {
        <div class="space-y-3">
          <div class="search-field">
            <app-icon name="busca" [size]="16" />
            <input type="search" class="form-input" [(ngModel)]="modalSearchQuery" (ngModelChange)="onModalSearchInput($event)" placeholder="Código do pedido ou nome do cliente" autocomplete="off" autofocus />
          </div>
          @if (modalSearching()) {
            <div class="loading-block"><span class="spinner"></span> Buscando…</div>
          } @else if (modalSearchError()) {
            <p class="note note-error">{{ modalSearchError() }}</p>
          } @else if (modalSearchResults().length) {
            <ul class="res">
              @for (r of modalSearchResults(); track r.ponttaId) {
                <li><button type="button" class="res-item w-full text-left" (click)="selectSalesOrder(r)">
                  <span class="min-w-0 flex-1"><span class="block text-sm font-semibold font-mono">{{ r.code }}</span><span class="block text-xs truncate" style="color: var(--cmm-muted);">{{ r.customerName }}</span></span>
                  <app-icon name="seta_dir" [size]="16" style="color: var(--cmm-muted);" />
                </button></li>
              }
            </ul>
          } @else if (modalSearchQuery.length >= 2) {
            <p class="text-sm" style="color: var(--cmm-muted);">Nenhum pedido encontrado.</p>
          } @else {
            <p class="text-sm" style="color: var(--cmm-muted);">Digite pelo menos 2 caracteres.</p>
          }
        </div>
      } @else {
        <div class="space-y-4">
          <div class="note note-accent flex items-center gap-3">
            <span class="min-w-0 flex-1"><span class="block text-xs" style="color: var(--cmm-muted);">Pedido escolhido</span><span class="block font-semibold font-mono">{{ selectedSo()!.code }}</span><span class="block text-sm truncate">{{ selectedSo()!.customerName }}</span></span>
            <button type="button" class="btn btn-ghost btn-sm" (click)="selectedSo.set(null)">Trocar</button>
          </div>
          <div>
            <label class="form-label" for="occ-title">Título da ocorrência no Pontta</label>
            <input id="occ-title" type="text" [(ngModel)]="occurrenceTitleInput" class="form-input" placeholder="Título da ocorrência" />
            <p class="text-xs mt-1" style="color: var(--cmm-muted);">As mídias enviadas no grupo passam a ser anexadas a essa ocorrência.</p>
          </div>
        </div>
      }
      <ng-container dialog-footer>
        <button type="button" (click)="closeLinkModal()" class="btn btn-secondary" [disabled]="linking()">Cancelar</button>
        @if (selectedSo()) {
          <button type="button" (click)="confirmLink()" [disabled]="linking()" class="btn btn-primary">{{ linking() ? 'Vinculando…' : 'Vincular' }}</button>
        }
      </ng-container>
    </app-dialog>
  `,
  styles: [`
    .res { list-style: none; margin: 0; padding: 0; display: grid; gap: .35rem; max-height: 20rem; overflow-y: auto; }
    .res-item { display: flex; align-items: center; gap: .75rem; padding: .55rem .75rem; border: 1px solid var(--cmm-border); border-radius: .75rem; background: var(--cmm-panel); color: var(--cmm-ink); }
    button.res-item { cursor: pointer; transition: border-color 160ms; } button.res-item:hover { border-color: var(--cmm-accent); }
  `],
})
export class GruposComponent implements OnInit {
  private readonly gosacService = inject(GosacApiService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(ModalService);

  groups = signal<GosacGroup[]>([]);
  loadingGroups = signal(false);

  // cadastrar
  buscaAberta = signal(false);
  searchQuery = '';
  searching = signal(false);
  searchError = signal('');
  searchResults = signal<GosacTicket[]>([]);
  adding = signal<number | null>(null);

  // vincular
  linkAberto = signal(false);
  linkGroup = signal<GosacGroup | null>(null);
  selectedSo = signal<SalesOrderSearchResult | null>(null);
  linking = signal(false);
  occurrenceTitleInput = '';
  modalSearchQuery = '';
  modalSearching = signal(false);
  modalSearchResults = signal<SalesOrderSearchResult[]>([]);
  modalSearchError = signal('');
  private modalSearchTimeout: ReturnType<typeof setTimeout> | null = null;

  ngOnInit(): void { this.loadGroups(); }

  loadGroups(): void {
    this.loadingGroups.set(true);
    this.gosacService.findAllGroups().subscribe({
      next: (groups) => { this.groups.set(groups); this.loadingGroups.set(false); },
      error: (err) => { this.loadingGroups.set(false); this.toast.error(err?.error?.message || 'Não foi possível carregar os grupos.'); },
    });
  }

  // ───── cadastrar
  abrirBusca(): void {
    this.searchQuery = '';
    this.searchResults.set([]);
    this.searchError.set('');
    this.buscaAberta.set(true);
  }

  searchTickets(): void {
    const raw = this.searchQuery.trim();
    if (!raw) return;
    this.searching.set(true);
    this.searchError.set('');
    this.searchResults.set([]);
    this.gosacService.searchTickets(raw).subscribe({
      next: (res) => {
        const tickets = res.tickets || [];
        this.searchResults.set(tickets);
        this.searching.set(false);
        if (!tickets.length) this.searchError.set('Nenhum ticket encontrado para essa busca.');
      },
      error: (err) => { this.searchError.set(err.error?.message || 'Não foi possível buscar no GOSAC.'); this.searching.set(false); },
    });
  }

  isTicketAlreadyAdded(ticketId: number): boolean { return this.groups().some((g) => g.gosacTicketId === ticketId); }

  addTicketAsGroup(ticket: GosacTicket): void {
    const name = ticket.contact?.name || `Ticket #${ticket.id}`;
    const contactId = ticket.contact?.id || (ticket['contactId'] as number) || 0;
    this.adding.set(ticket.id);
    this.gosacService.createGroup({ gosacTicketId: ticket.id, gosacContactId: contactId, gosacTicketName: name }).subscribe({
      next: (group) => {
        if (!group.salesOrders) group.salesOrders = [];
        this.groups.update((g) => [group, ...g]);
        this.adding.set(null);
        this.toast.success(`${name} cadastrado. Agora vincule um pedido de venda.`);
        this.buscaAberta.set(false);
        this.openLinkModal(group);
      },
      error: (err) => { this.adding.set(null); this.toast.error(err.error?.message || 'Não foi possível cadastrar o grupo.'); },
    });
  }

  toggleGroup(group: GosacGroup): void {
    this.gosacService.toggleGroup(group.id).subscribe({
      next: (updated) => {
        if (!updated.salesOrders) updated.salesOrders = group.salesOrders;
        this.groups.update((gs) => gs.map((g) => (g.id === updated.id ? updated : g)));
      },
      error: (err) => this.toast.error(err?.error?.message || 'Não foi possível alterar o grupo.'),
    });
  }

  async deleteGroup(group: GosacGroup): Promise<void> {
    if (!(await this.modal.confirm('Remover grupo?', `${group.gosacTicketName} deixa de enviar mídias ao Pontta. Isso não pode ser desfeito.`, 'Remover'))) return;
    this.gosacService.deleteGroup(group.id).subscribe({
      next: () => { this.groups.update((gs) => gs.filter((g) => g.id !== group.id)); this.toast.success('Grupo removido.'); },
      error: (err) => this.toast.error(err.error?.message || 'Não foi possível remover o grupo.'),
    });
  }

  async unlinkSalesOrder(group: GosacGroup, salesOrderId: string): Promise<void> {
    if (!(await this.modal.confirm('Desvincular pedido?', 'O grupo fica sem pedido de venda até você vincular outro.', 'Desvincular'))) return;
    this.gosacService.unlinkSalesOrder(group.id, salesOrderId).subscribe({
      next: () => {
        this.groups.update((gs) => gs.map((g) => (g.id !== group.id ? g : { ...g, salesOrders: (g.salesOrders || []).filter((so) => so.id !== salesOrderId) })));
        this.toast.success('Pedido desvinculado.');
      },
      error: (err) => this.toast.error(err.error?.message || 'Não foi possível desvincular.'),
    });
  }

  // ───── vincular
  openLinkModal(group: GosacGroup): void {
    this.modalSearchQuery = '';
    this.modalSearchResults.set([]);
    this.modalSearchError.set('');
    this.occurrenceTitleInput = '';
    this.selectedSo.set(null);
    this.linkGroup.set(group);
    this.linkAberto.set(true);
  }

  closeLinkModal(): void {
    if (this.linking()) return;
    if (this.modalSearchTimeout) clearTimeout(this.modalSearchTimeout);
    this.linkAberto.set(false);
  }

  onModalSearchInput(query: string): void {
    if (this.modalSearchTimeout) clearTimeout(this.modalSearchTimeout);
    if (query.trim().length < 2) { this.modalSearchResults.set([]); this.modalSearchError.set(''); return; }
    this.modalSearchTimeout = setTimeout(() => {
      this.modalSearching.set(true);
      this.modalSearchResults.set([]);
      this.modalSearchError.set('');
      this.gosacService.searchSalesOrders(query.trim()).subscribe({
        next: (results) => { this.modalSearchResults.set(results); this.modalSearching.set(false); },
        error: (err) => { this.modalSearchError.set(err?.error?.message || 'Não foi possível buscar os pedidos.'); this.modalSearching.set(false); },
      });
    }, 400);
  }

  selectSalesOrder(result: SalesOrderSearchResult): void {
    this.occurrenceTitleInput = `Anexos GOSAC - ${this.linkGroup()?.gosacTicketName ?? ''}`;
    this.selectedSo.set(result);
  }

  confirmLink(): void {
    const group = this.linkGroup();
    const so = this.selectedSo();
    if (!group || !so || this.linking()) return;
    this.linking.set(true);
    this.gosacService.linkSalesOrder(group.id, { ponttaId: so.ponttaId, code: so.code, customerName: so.customerName, occurrenceTitle: this.occurrenceTitleInput.trim() || undefined }).subscribe({
      next: (res) => {
        const r = res?.salesOrder || {};
        this.groups.update((gs) => gs.map((g) => (g.id !== group.id ? g : {
          ...g,
          salesOrders: [...(g.salesOrders || []), {
            id: r.id || '', ponttaId: so.ponttaId, code: so.code, customerName: so.customerName,
            ponttaOccurrenceId: r.ponttaOccurrenceId ?? null, ponttaOccurrenceNumber: r.ponttaOccurrenceNumber ?? null,
            ponttaOccurrenceStatus: (r.ponttaOccurrenceStatus ?? 'pending') as 'pending' | 'created' | 'failed',
          }],
        })));
        this.linking.set(false);
        this.linkAberto.set(false);
        this.toast.success(`${so.code} vinculado. A ocorrência está sendo criada no Pontta.`);
        setTimeout(() => this.loadGroups(), 6000);
      },
      error: (err) => { this.linking.set(false); this.toast.error(err?.error?.message || 'Não foi possível vincular o pedido.'); },
    });
  }
}
