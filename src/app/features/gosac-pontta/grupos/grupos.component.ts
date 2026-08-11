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
      <div class="page-header">
        <div>
          <h1 class="page-title">Grupos</h1>
          <p class="page-subtitle">Vincule grupos e orçamentos entre GOSAC e Pontta.</p>
        </div>
      </div>

      <div class="panel panel-pad space-y-3">
        <label class="form-label">Pesquisar ticket no GOSAC</label>
        <div class="flex gap-2">
          <input
            type="text"
            [(ngModel)]="searchQuery"
            placeholder="Nome do contato ou grupo"
            class="form-input flex-1 min-w-0" style="width: auto;"
            (keyup.enter)="searchTickets()"
          />
          <button
            type="button"
            (click)="searchTickets()"
            [disabled]="searching()"
            class="btn btn-primary"
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
          <p class="text-sm" style="color: var(--cmm-danger);">{{ searchError() }}</p>
        }
      </div>

      @if (searchResults().length > 0) {
        <div class="panel overflow-hidden">
          <div class="px-4 py-2.5 border-b" style="border-color: var(--cmm-border); background: color-mix(in srgb, var(--cmm-surface) 70%, var(--cmm-panel));">
            <span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--cmm-muted);">
              {{ searchResults().length }} resultado{{ searchResults().length === 1 ? '' : 's' }}
            </span>
          </div>
          <div class="divide-y max-h-72 overflow-y-auto" style="border-color: var(--cmm-border);">
            @for (ticket of searchResults(); track ticket.id) {
              <div class="flex items-center justify-between gap-3 px-4 py-3">
                <div class="min-w-0">
                  <p class="text-sm font-medium" style="color: var(--cmm-ink);">{{ ticket.contact?.name || 'Sem nome' }}</p>
                  <p class="text-xs mt-0.5" style="color: var(--cmm-muted);">
                    Ticket #{{ ticket.id }}
                    @if (ticket.queue) {
                      <span class="badge badge-accent ml-2">{{ ticket.queue.name }}</span>
                    }
                  </p>
                </div>
                @if (isTicketAlreadyAdded(ticket.id)) {
                  <span class="badge badge-neutral">Já cadastrado</span>
                } @else {
                  <button type="button" (click)="addTicketAsGroup(ticket)" class="btn btn-primary btn-sm">Cadastrar</button>
                }
              </div>
            }
          </div>
        </div>
      }

      <div class="table-shell">
        <div class="flex items-center justify-between gap-3 px-4 py-3 border-b" style="border-color: var(--cmm-border);">
          <span class="text-sm font-semibold" style="color: var(--cmm-ink);">
            Grupos cadastrados
            <span class="font-normal" style="color: var(--cmm-muted);">({{ groups().length }})</span>
          </span>
          <button type="button" (click)="loadGroups()" class="btn btn-ghost btn-sm">Atualizar</button>
        </div>

        @if (loadingGroups()) {
          <div class="empty-state">
            <svg class="w-5 h-5 animate-spin mx-auto" style="color: var(--cmm-muted);" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
        } @else if (groups().length === 0) {
          <div class="empty-state">
            <p>Nenhum grupo cadastrado.</p>
            <p class="text-xs mt-1">Pesquise um ticket acima e clique em Cadastrar.</p>
          </div>
        } @else {
          <table>
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Contato / Grupo</th>
                <th>Pedido de Venda</th>
                <th>Ocorrência Pontta</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (group of groups(); track group.id) {
                <tr>
                  <td class="font-mono text-xs" style="color: var(--cmm-muted);">#{{ group.gosacTicketId }}</td>
                  <td>{{ group.gosacTicketName }}</td>
                  <td>
                    @if ((group.salesOrders || []).length > 0) {
                      @for (so of group.salesOrders; track so.id) {
                        <div class="flex items-center gap-2">
                          <span class="font-medium">{{ so.code }}</span>
                          <span class="text-xs truncate max-w-32" style="color: var(--cmm-muted);" [title]="so.customerName">{{ abbreviate(so.customerName, 24) }}</span>
                          <button type="button" (click)="unlinkSalesOrder(group, so.id)" class="btn btn-ghost btn-sm" style="color: var(--cmm-danger); min-height: 1.75rem; padding: 0.25rem;" title="Desvincular">
                            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                          </button>
                        </div>
                      }
                    } @else {
                      <button type="button" (click)="openLinkModal(group)" class="btn btn-secondary btn-sm">Vincular PV</button>
                    }
                  </td>
                  <td>
                    @if ((group.salesOrders || []).length > 0) {
                      @for (so of group.salesOrders; track so.id) {
                        @if (so.ponttaOccurrenceStatus === 'created' || so.ponttaOccurrenceId) {
                          <span class="badge badge-success">
                            @if (so.ponttaOccurrenceNumber) { #{{ so.ponttaOccurrenceNumber }} } @else { Criada }
                          </span>
                        } @else if (so.ponttaOccurrenceStatus === 'failed') {
                          <span class="badge badge-danger">Falha</span>
                        } @else {
                          <span class="badge badge-warning">
                            <svg class="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                            Criando...
                          </span>
                        }
                      }
                    } @else {
                      <span style="color: var(--cmm-muted);">—</span>
                    }
                  </td>
                  <td>
                    <button
                      type="button"
                      (click)="toggleGroup(group)"
                      class="badge"
                      [class.badge-success]="group.isActive"
                      [class.badge-neutral]="!group.isActive"
                    >{{ group.isActive ? 'Ativo' : 'Inativo' }}</button>
                  </td>
                  <td class="text-right">
                    <button type="button" (click)="deleteGroup(group)" class="btn btn-ghost btn-sm" style="color: var(--cmm-danger);" title="Remover grupo">
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        }
      </div>
    </div>

    @if (toast().open) {
      <div class="fixed bottom-6 right-6 z-[60] max-w-sm w-full">
        <div
          class="flex items-start gap-3 rounded-lg px-4 py-3 border"
          [style.background]="toast().type === 'error'
            ? 'color-mix(in srgb, var(--cmm-danger) 12%, var(--cmm-panel))'
            : 'color-mix(in srgb, var(--cmm-success) 12%, var(--cmm-panel))'"
          [style.borderColor]="toast().type === 'error'
            ? 'color-mix(in srgb, var(--cmm-danger) 30%, transparent)'
            : 'color-mix(in srgb, var(--cmm-success) 30%, transparent)'"
          style="box-shadow: 0 12px 28px rgba(15, 26, 39, 0.16);"
        >
          <p class="text-sm flex-1" [style.color]="toast().type === 'error' ? 'var(--cmm-danger)' : 'var(--cmm-success)'">
            {{ toast().message }}
          </p>
          <button type="button" (click)="closeToast()" class="btn btn-ghost btn-sm flex-shrink-0" style="min-height: 1.5rem; padding: 0.15rem;">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      </div>
    }

    @if (confirmDialog().open) {
      <div class="fixed inset-0 z-[55] flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
        <div class="absolute inset-0" (click)="closeConfirmDialog()"></div>
        <div class="relative w-full max-w-sm panel panel-pad">
          <h3 class="text-sm font-semibold mb-1" style="color: var(--cmm-ink);">{{ confirmDialog().title }}</h3>
          <p class="text-sm mb-6" style="color: var(--cmm-muted);">{{ confirmDialog().message }}</p>
          <div class="flex gap-2 justify-end">
            <button type="button" (click)="closeConfirmDialog()" class="btn btn-secondary">Cancelar</button>
            <button
              type="button"
              (click)="confirmDialog().onConfirm(); closeConfirmDialog()"
              class="btn"
              [class.btn-danger]="confirmDialog().danger"
              [class.btn-primary]="!confirmDialog().danger"
            >{{ confirmDialog().confirmLabel }}</button>
          </div>
        </div>
      </div>
    }

    @if (linkModal().open) {
      <div class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" style="background: rgba(10, 16, 24, 0.55);">
        <div class="absolute inset-0" (click)="closeLinkModal()"></div>
        <div
          class="relative w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] flex flex-col overflow-hidden sm:rounded-xl"
          style="background: var(--cmm-panel); border: 1px solid var(--cmm-border); box-shadow: 0 18px 40px rgba(15, 26, 39, 0.18);"
        >
          <div class="flex items-start justify-between gap-3 px-5 py-4 border-b flex-shrink-0" style="border-color: var(--cmm-border);">
            <div>
              <h2 class="text-base font-semibold" style="color: var(--cmm-ink);">Vincular pedido de venda</h2>
              @if (linkModal().group) {
                <p class="text-xs mt-0.5" style="color: var(--cmm-muted);">{{ linkModal().group!.gosacTicketName }} · Ticket #{{ linkModal().group!.gosacTicketId }}</p>
              }
            </div>
            <button type="button" (click)="closeLinkModal()" class="btn btn-ghost btn-sm">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>
          </div>

          <div class="flex items-center gap-0 px-5 pt-4 flex-shrink-0">
            <div class="flex items-center gap-1.5">
              <span class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style="background: var(--cmm-ink); color: var(--cmm-panel);">1</span>
              <span class="text-xs font-medium" style="color: var(--cmm-ink);">Pesquisar</span>
            </div>
            <div class="flex-1 h-px mx-3" [style.background]="linkModal().step === 'confirm' ? 'var(--cmm-ink)' : 'var(--cmm-border)'"></div>
            <div class="flex items-center gap-1.5">
              <span
                class="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
                [style.background]="linkModal().step === 'confirm' ? 'var(--cmm-ink)' : 'color-mix(in srgb, var(--cmm-border) 55%, var(--cmm-panel))'"
                [style.color]="linkModal().step === 'confirm' ? 'var(--cmm-panel)' : 'var(--cmm-muted)'"
              >2</span>
              <span class="text-xs font-medium" [style.color]="linkModal().step === 'confirm' ? 'var(--cmm-ink)' : 'var(--cmm-muted)'">Confirmar</span>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-5 py-5 min-h-0">
            @if (linkModal().step === 'search') {
              <div class="space-y-4">
                <input
                  type="text"
                  [(ngModel)]="modalSearchQuery"
                  (ngModelChange)="onModalSearchInput($event)"
                  (keyup.escape)="closeLinkModal()"
                  placeholder="Código do pedido ou nome do cliente..."
                  class="form-input"
                  autofocus
                />
                @if (modalSearching()) {
                  <div class="flex items-center gap-2 py-4 text-sm justify-center" style="color: var(--cmm-muted);">
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                    Buscando...
                  </div>
                } @else if (modalSearchError()) {
                  <p class="text-sm" style="color: var(--cmm-danger);">{{ modalSearchError() }}</p>
                } @else if (modalSearchResults().length > 0) {
                  <div class="panel overflow-hidden">
                    <div class="divide-y max-h-64 overflow-y-auto" style="border-color: var(--cmm-border);">
                      @for (result of modalSearchResults(); track result.ponttaId) {
                        <button type="button" (click)="selectSalesOrder(result)" class="w-full text-left px-4 py-3 transition-colors group">
                          <div class="flex items-center justify-between gap-3">
                            <div>
                              <p class="text-sm font-semibold" style="color: var(--cmm-ink);">{{ result.code }}</p>
                              <p class="text-xs mt-0.5" style="color: var(--cmm-muted);">{{ result.customerName }}</p>
                            </div>
                            <svg class="w-4 h-4 flex-shrink-0" style="color: var(--cmm-muted);" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/></svg>
                          </div>
                        </button>
                      }
                    </div>
                  </div>
                } @else if (modalSearchQuery.length >= 2) {
                  <p class="empty-state py-4">Nenhum pedido encontrado.</p>
                } @else {
                  <p class="text-xs" style="color: var(--cmm-muted);">Digite pelo menos 2 caracteres para pesquisar.</p>
                }
              </div>
            }

            @if (linkModal().step === 'confirm' && linkModal().selectedSo) {
              <div class="space-y-5">
                <div class="panel panel-pad" style="padding: 0.875rem 1rem;">
                  <p class="text-xs mb-1" style="color: var(--cmm-muted);">Pedido de venda selecionado</p>
                  <p class="font-semibold" style="color: var(--cmm-ink);">{{ linkModal().selectedSo!.code }}</p>
                  <p class="text-sm mt-0.5" style="color: var(--cmm-muted);">{{ linkModal().selectedSo!.customerName }}</p>
                </div>

                <div>
                  <label class="form-label">Título da ocorrência no Pontta</label>
                  <input
                    type="text"
                    [(ngModel)]="occurrenceTitleInput"
                    class="form-input"
                    placeholder="Título da ocorrência"
                  />
                  <p class="text-xs mt-1" style="color: var(--cmm-muted);">O título é usado para identificar a ocorrência no Pontta onde os anexos serão enviados.</p>
                </div>

                <div class="panel panel-pad text-xs" style="padding: 0.875rem 1rem; color: var(--cmm-muted);">
                  Após confirmar, os arquivos de mídia enviados no grupo GOSAC
                  <strong style="color: var(--cmm-ink);">"{{ linkModal().group!.gosacTicketName }}"</strong>
                  serão automaticamente anexados a essa ocorrência.
                </div>
              </div>
            }
          </div>

          <div class="flex items-center justify-between gap-3 px-5 py-4 border-t flex-shrink-0" style="border-color: var(--cmm-border);">
            @if (linkModal().step === 'confirm') {
              <button type="button" (click)="backToSearch()" class="btn btn-ghost btn-sm">Voltar</button>
            } @else {
              <div></div>
            }
            <div class="flex gap-2">
              <button type="button" (click)="closeLinkModal()" class="btn btn-secondary">Cancelar</button>
              @if (linkModal().step === 'confirm') {
                <button type="button" (click)="confirmLink()" [disabled]="linkModal().linking" class="btn btn-primary">
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

  private log(event: string, data?: unknown): void {
    if (data !== undefined) {
      console.log(`[GruposUI] ${event}`, data);
      return;
    }
    console.log(`[GruposUI] ${event}`);
  }

  constructor(private gosacService: GosacService) { }

  ngOnInit(): void {
    this.log('ngOnInit -> carregando grupos');
    this.loadGroups();
  }

  // ----- Ticket Search -----

  searchTickets(): void {
    const raw = this.searchQuery.trim();
    if (!raw) {
      this.log('searchTickets ignorado: query vazia');
      return;
    }

    this.log('searchTickets início', { query: raw });

    this.searching.set(true);
    this.searchError.set('');
    this.searchResults.set([]);

    this.gosacService.searchTickets(raw).subscribe({
      next: (res) => {
        const tickets = res.tickets || [];
        this.log('searchTickets sucesso', { total: tickets.length, ticketIds: tickets.slice(0, 10).map(t => t.id) });
        this.searchResults.set(tickets);
        this.searching.set(false);
        if (tickets.length === 0) {
          this.searchError.set('Nenhum ticket encontrado para essa pesquisa.');
        }
      },
      error: (err) => {
        this.log('searchTickets erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
        this.searchError.set(err.error?.message || 'Erro ao pesquisar tickets no GOSAC');
        this.searching.set(false);
      },
    });
  }

  // ----- Groups -----

  loadGroups(): void {
    this.log('loadGroups início');
    this.loadingGroups.set(true);
    this.gosacService.findAllGroups().subscribe({
      next: (groups) => {
        this.log('loadGroups sucesso', { total: groups.length });
        this.groups.set(groups);
        this.loadingGroups.set(false);
      },
      error: (err) => {
        this.log('loadGroups erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
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
    this.log('addTicketAsGroup início', { ticketId: ticket.id, contactId, name });
    this.gosacService
      .createGroup({ gosacTicketId: ticket.id, gosacContactId: contactId, gosacTicketName: name })
      .subscribe({
        next: (group) => {
          this.log('addTicketAsGroup sucesso', { groupId: group.id, gosacTicketId: group.gosacTicketId });
          if (!group.salesOrders) group.salesOrders = [];
          this.groups.set([group, ...this.groups()]);
        },
        error: (err) => {
          this.log('addTicketAsGroup erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
          this.showToast(err.error?.message || 'Erro ao cadastrar grupo', 'error');
        },
      });
  }

  toggleGroup(group: GosacGroup): void {
    this.log('toggleGroup início', { groupId: group.id, currentIsActive: group.isActive });
    this.gosacService.toggleGroup(group.id).subscribe({
      next: (updated) => {
        this.log('toggleGroup sucesso', { groupId: updated.id, newIsActive: updated.isActive });
        const currentGroup = this.groups().find(g => g.id === updated.id);
        if (!updated.salesOrders && currentGroup) updated.salesOrders = currentGroup.salesOrders;
        this.groups.set(this.groups().map((g) => (g.id === updated.id ? updated : g)));
      },
      error: (err) => {
        this.log('toggleGroup erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
      },
    });
  }

  deleteGroup(group: GosacGroup): void {
    this.log('deleteGroup solicitado', { groupId: group.id, ticketId: group.gosacTicketId });
    this.openConfirmDialog({
      title: 'Remover grupo',
      message: `Deseja remover o grupo "${group.gosacTicketName}"? Esta ação não pode ser desfeita.`,
      confirmLabel: 'Remover',
      danger: true,
      onConfirm: () => {
        this.log('deleteGroup confirmado', { groupId: group.id });
        this.gosacService.deleteGroup(group.id).subscribe({
          next: () => {
            this.log('deleteGroup sucesso', { groupId: group.id });
            this.groups.set(this.groups().filter((g) => g.id !== group.id));
          },
          error: (err) => {
            this.log('deleteGroup erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
            this.showToast(err.error?.message || 'Erro ao remover grupo', 'error');
          },
        });
      },
    });
  }

  unlinkSalesOrder(group: GosacGroup, salesOrderId: string): void {
    this.log('unlinkSalesOrder solicitado', { groupId: group.id, salesOrderId });
    this.openConfirmDialog({
      title: 'Desvincular pedido de venda',
      message: 'Deseja desvincular este pedido de venda do grupo?',
      confirmLabel: 'Desvincular',
      danger: true,
      onConfirm: () => {
        this.log('unlinkSalesOrder confirmado', { groupId: group.id, salesOrderId });
        this.gosacService.unlinkSalesOrder(group.id, salesOrderId).subscribe({
          next: () => {
            this.log('unlinkSalesOrder sucesso', { groupId: group.id, salesOrderId });
            this.groups.update(groups => groups.map((g) => {
              if (g.id !== group.id) return g;
              return { ...g, salesOrders: (g.salesOrders || []).filter((so) => so.id !== salesOrderId) };
            }));
          },
          error: (err) => {
            this.log('unlinkSalesOrder erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
            this.showToast(err.error?.message || 'Erro ao desvincular pedido de venda', 'error');
          },
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
    this.log('openLinkModal', { groupId: group.id, ticketId: group.gosacTicketId });
    this.modalSearchQuery = '';
    this.modalSearchResults.set([]);
    this.modalSearchError.set('');
    this.occurrenceTitleInput = '';
    this.linkModal.set({ open: true, group, step: 'search', selectedSo: null, occurrenceTitle: '', linking: false });
  }

  closeLinkModal(force = false): void {
    this.log('closeLinkModal', { force, linking: this.linkModal().linking });
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
    this.log('onModalSearchInput', { query });
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
          this.log('modal searchSalesOrders sucesso', { total: results.length });
          this.modalSearchResults.set(results);
          this.modalSearching.set(false);
        },
        error: (err) => {
          this.log('modal searchSalesOrders erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
          this.modalSearchError.set(err?.error?.message || 'Erro ao buscar pedidos de venda');
          this.modalSearching.set(false);
        },
      });
    }, 400);
  }

  selectSalesOrder(result: SalesOrderSearchResult): void {
    this.log('selectSalesOrder', { ponttaId: result.ponttaId, code: result.code });
    const defaultTitle = `Anexos GOSAC - ${this.linkModal().group?.gosacTicketName ?? ''}`;
    this.occurrenceTitleInput = defaultTitle;
    this.linkModal.update(s => ({ ...s, step: 'confirm', selectedSo: result, occurrenceTitle: defaultTitle }));
  }

  confirmLink(): void {
    const state = this.linkModal();
    if (!state.group || !state.selectedSo || state.linking) {
      this.log('confirmLink ignorado', {
        hasGroup: !!state.group,
        hasSelectedSo: !!state.selectedSo,
        linking: state.linking,
      });
      return;
    }

    const groupId = state.group.id;
    const selectedSo = state.selectedSo;
    this.log('confirmLink início', {
      groupId,
      ticketId: state.group.gosacTicketId,
      ponttaId: selectedSo.ponttaId,
      code: selectedSo.code,
    });

    this.linkModal.update(s => ({ ...s, linking: true }));

    this.gosacService.linkSalesOrder(groupId, {
      ponttaId: selectedSo.ponttaId,
      code: selectedSo.code,
      customerName: selectedSo.customerName,
      occurrenceTitle: this.occurrenceTitleInput.trim() || undefined,
    }).subscribe({
      next: (res) => {
        this.log('confirmLink sucesso (resposta inicial)', {
          groupId,
          salesOrderId: res?.salesOrder?.id,
          occurrenceStatus: res?.salesOrder?.ponttaOccurrenceStatus,
        });
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
          this.log('confirmLink: agendando loadGroups em 6s');
          setTimeout(() => this.loadGroups(), 6000);
        }
      },
      error: (err) => {
        this.log('confirmLink erro', { message: err?.error?.message || err?.message || 'Erro desconhecido' });
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
