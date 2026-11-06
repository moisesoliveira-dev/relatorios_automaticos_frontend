import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { DashboardService, ReportEmail } from '../../../services/dashboard.service';
import { ToastService } from '../../../core/ui/toast.service';
import { ModalService } from '../../../shared/services/modal.service';
import { DialogComponent } from '../../../shared/components/dialog.component';
import { SheetComponent } from '../../../shared/components/sheet.component';
import { IconComponent } from '../../../shared/components/icon.component';
import { PaginationComponent, pageRange } from '../../../shared/components/pagination.component';

interface Occurrence {
  number: string;
  title: string;
  status: string;
  responsibleName: string;
  deadline: string;
  createdDate: string;
  occurrenceTypeName: string;
  tagName: string;
  contactName: string;
  salesOrderCode: string;
}

interface PreviewResponse {
  data: Occurrence[];
  pagination: { page: number; size: number; total: number; totalPages: number };
}

/**
 * Relatório de ocorrências: filtros numa linha, três ações diretas (ver, Excel, CSV) e o envio por
 * e-mail numa janela que reúne os destinatários fixos e um e-mail avulso.
 */
@Component({
  selector: 'app-ocorrencias',
  standalone: true,
  imports: [FormsModule, DialogComponent, SheetComponent, IconComponent, PaginationComponent],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Ocorrências Pontta</h1>
          <p class="page-subtitle">Todas as ocorrências com status, responsável, prazo e pedido. Baixe ou envie por e-mail.</p>
        </div>
      </div>

      <div class="panel panel-pad space-y-5">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="form-label" for="f-ini">De</label>
            <input id="f-ini" type="date" [(ngModel)]="filters.startDate" class="form-input" />
          </div>
          <div>
            <label class="form-label" for="f-fim">Até</label>
            <input id="f-fim" type="date" [(ngModel)]="filters.endDate" class="form-input" />
          </div>
          <div>
            <label class="form-label" for="f-lim">Quantidade</label>
            <select id="f-lim" [(ngModel)]="filters.limit" class="form-input">
              <option [ngValue]="0">Todas</option>
              <option [ngValue]="100">Até 100</option>
              <option [ngValue]="500">Até 500</option>
              <option [ngValue]="1000">Até 1.000</option>
              <option [ngValue]="5000">Até 5.000</option>
            </select>
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <button type="button" (click)="previewData()" [disabled]="isLoading()" class="btn btn-secondary">
            @if (isLoading() && currentAction() === 'preview') { <span class="spinner"></span> } @else { <app-icon name="olho" [size]="16" /> }
            Visualizar
          </button>
          <button type="button" (click)="download('excel')" [disabled]="isLoading()" class="btn btn-primary">
            @if (isLoading() && currentAction() === 'excel') { <span class="spinner"></span> } @else { <app-icon name="download" [size]="16" /> }
            Baixar Excel
          </button>
          <button type="button" (click)="download('csv')" [disabled]="isLoading()" class="btn btn-secondary">
            @if (isLoading() && currentAction() === 'csv') { <span class="spinner"></span> } @else { <app-icon name="download" [size]="16" /> }
            Baixar CSV
          </button>
          <span class="toolbar-spacer"></span>
          <button type="button" (click)="abrirEnvio()" [disabled]="isLoading()" class="btn btn-accent">
            <app-icon name="email" [size]="16" /> Enviar por e-mail
            @if (emailsAtivos().length) { <span class="tab-count" style="background: rgba(0,0,0,.15); color: inherit;">{{ emailsAtivos().length }}</span> }
          </button>
        </div>
      </div>
    </div>

    <!-- ═══ Enviar por e-mail ═══ -->
    <app-dialog [open]="envioAberto()" title="Enviar por e-mail" subtitle="O relatório vai com os filtros escolhidos na tela." size="md" [closable]="!isLoading()" (closed)="envioAberto.set(false)">
      <div class="space-y-5">
        <section>
          <div class="flex items-center justify-between gap-2 mb-2">
            <h3 class="form-label !mb-0">Destinatários fixos</h3>
            <button type="button" class="btn btn-ghost btn-sm" (click)="novoEmailAberto.set(true)"><app-icon name="mais" [size]="14" /> Adicionar</button>
          </div>
          @if (emailsFixos().length === 0) {
            <p class="note">Nenhum destinatário fixo. Adicione quem deve receber este relatório sempre.</p>
          } @else {
            <ul class="dest-list">
              @for (e of emailsFixos(); track e.id) {
                <li class="dest" [class.dest-off]="!e.isActive">
                  <button type="button" role="switch" class="switch" [class.switch-on]="e.isActive" [attr.aria-checked]="e.isActive" (click)="toggleEmail(e)" [attr.aria-label]="'Enviar para ' + e.email"><span class="switch-knob"></span></button>
                  <span class="min-w-0 flex-1"><span class="block text-sm font-medium truncate">{{ e.name }}</span><span class="block text-xs truncate" style="color: var(--cmm-muted);">{{ e.email }}</span></span>
                  <button type="button" class="icon-btn icon-btn-sm icon-danger" (click)="deleteEmail(e)" aria-label="Remover destinatário" title="Remover"><app-icon name="lixeira" [size]="15" /></button>
                </li>
              }
            </ul>
          }
        </section>
        <section>
          <label class="form-label" for="email-extra">Outro e-mail (opcional)</label>
          <input id="email-extra" type="email" [(ngModel)]="email" placeholder="nome@empresa.com" class="form-input" autocomplete="email" />
          <p class="text-xs mt-1" style="color: var(--cmm-muted);">Recebe só este envio, sem entrar na lista fixa.</p>
        </section>
      </div>
      <ng-container dialog-footer>
        <span class="text-xs mr-auto" style="color: var(--cmm-muted);">{{ resumoEnvio() }}</span>
        <button type="button" class="btn btn-secondary" (click)="envioAberto.set(false)" [disabled]="isLoading()">Cancelar</button>
        <button type="button" class="btn btn-accent" (click)="enviar()" [disabled]="isLoading() || (!emailsAtivos().length && !email.trim())">
          @if (isLoading() && currentAction() === 'send') { <span class="spinner"></span> Enviando… } @else { <app-icon name="enviar" [size]="15" /> Enviar }
        </button>
      </ng-container>
    </app-dialog>

    <!-- Novo destinatário fixo -->
    <app-dialog [open]="novoEmailAberto()" title="Novo destinatário fixo" subtitle="Passa a receber todos os relatórios de ocorrências." size="sm" [closable]="!savingEmail()" (closed)="novoEmailAberto.set(false)">
      <form id="form-novo-email" class="space-y-4" (ngSubmit)="saveEmail()">
        <div>
          <label class="form-label" for="ne-nome">Nome</label>
          <input id="ne-nome" type="text" [(ngModel)]="newEmail.name" name="name" class="form-input" placeholder="Ex.: Maria · Gerente" required />
        </div>
        <div>
          <label class="form-label" for="ne-email">E-mail</label>
          <input id="ne-email" type="email" [(ngModel)]="newEmail.email" name="email" class="form-input" placeholder="nome@empresa.com" required />
        </div>
      </form>
      <ng-container dialog-footer>
        <button type="button" class="btn btn-secondary" (click)="novoEmailAberto.set(false)" [disabled]="savingEmail()">Cancelar</button>
        <button type="submit" form="form-novo-email" class="btn btn-primary" [disabled]="savingEmail()">{{ savingEmail() ? 'Salvando…' : 'Adicionar' }}</button>
      </ng-container>
    </app-dialog>

    <!-- ═══ Prévia ═══ -->
    <app-dialog [open]="previaAberta()" title="Prévia das ocorrências" [subtitle]="previaSubtitulo()" size="xl" [flush]="true" (closed)="closePreview()">
      @if (previewRows().length === 0) {
        <div class="empty-state">Nenhuma ocorrência no período.</div>
      } @else {
        <div class="table-shell" style="border: none; border-radius: 0; box-shadow: none;">
          <table>
            <thead><tr><th>Nº</th><th>Título</th><th>Status</th><th>Responsável</th><th>Prazo</th><th>Pedido</th></tr></thead>
            <tbody>
              @for (item of previewRows(); track item.number) {
                <tr class="row-click" tabindex="0" (click)="selectedItem.set(item)" (keyup.enter)="selectedItem.set(item)">
                  <td class="font-mono text-xs">#{{ item.number }}</td>
                  <td class="font-medium">{{ item.title }}</td>
                  <td><span class="state" [class]="'state ' + statusClass(item.status)">{{ item.status }}</span></td>
                  <td style="color: var(--cmm-muted);">{{ item.responsibleName || '—' }}</td>
                  <td style="color: var(--cmm-muted);">{{ item.deadline || '—' }}</td>
                  <td class="font-mono text-xs">{{ item.salesOrderCode || '—' }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
      <ng-container dialog-footer>
        <label class="text-xs inline-flex items-center gap-2 mr-auto" style="color: var(--cmm-muted);">Por página
          <select class="form-input !min-h-8 !py-1 !w-auto text-xs" [ngModel]="filters.pageSize" (ngModelChange)="setPageSize($event)">
            <option [ngValue]="10">10</option><option [ngValue]="25">25</option><option [ngValue]="50">50</option><option [ngValue]="100">100</option>
          </select>
        </label>
        <app-pagination [page]="(pagination()?.page ?? 0) + 1" [totalPages]="pagination()?.totalPages ?? 1" [label]="previaRange()" [disabled]="isLoading()" (pageChange)="changePage($event - 1)" />
      </ng-container>
    </app-dialog>

    <!-- Detalhe de uma ocorrência -->
    <app-sheet [open]="!!selectedItem()" [title]="selectedItem() ? '#' + selectedItem()!.number : ''" [subtitle]="selectedItem()?.title ?? ''" width="28rem" (closed)="selectedItem.set(null)">
      @if (selectedItem(); as it) {
        <dl class="kv">
          <div><dt>Status</dt><dd><span class="state" [class]="'state ' + statusClass(it.status)">{{ it.status }}</span></dd></div>
          <div><dt>Responsável</dt><dd>{{ it.responsibleName || '—' }}</dd></div>
          <div><dt>Prazo</dt><dd>{{ it.deadline || '—' }}</dd></div>
          <div><dt>Criada em</dt><dd>{{ it.createdDate || '—' }}</dd></div>
          <div><dt>Tipo</dt><dd>{{ it.occurrenceTypeName || '—' }}</dd></div>
          <div><dt>Etiqueta</dt><dd>{{ it.tagName || '—' }}</dd></div>
          <div><dt>Contato</dt><dd>{{ it.contactName || '—' }}</dd></div>
          <div><dt>Pedido</dt><dd class="font-mono">{{ it.salesOrderCode || '—' }}</dd></div>
        </dl>
      }
    </app-sheet>
  `,
  styles: [`
    .dest-list { display: grid; gap: .4rem; }
    .dest { display: flex; align-items: center; gap: .75rem; padding: .55rem .75rem; border: 1px solid var(--cmm-border); border-radius: .75rem; background: var(--cmm-panel); }
    .dest-off { opacity: .6; }
  `],
})
export class OcorrenciasComponent implements OnInit {
  private http = inject(HttpClient);
  private toast = inject(ToastService);
  private modal = inject(ModalService);
  private dashboardService = inject(DashboardService);
  private apiUrl = environment.apiUrl;

  filters = { limit: 0, startDate: '', endDate: '', pageSize: 25 };
  email = '';
  isLoading = signal(false);
  currentAction = signal('');

  // envio
  envioAberto = signal(false);
  novoEmailAberto = signal(false);
  savingEmail = signal(false);
  newEmail = { name: '', email: '', reportType: 'occurrences' };
  emailsFixos = computed(() => this.dashboardService.reportEmails().filter((e) => e.reportType === 'occurrences'));
  emailsAtivos = computed(() => this.emailsFixos().filter((e) => e.isActive));
  resumoEnvio = computed(() => {
    const n = this.emailsAtivos().length + (this.email.trim() ? 1 : 0);
    return n === 0 ? 'Escolha ao menos um destinatário' : n === 1 ? '1 destinatário' : `${n} destinatários`;
  });

  // prévia
  previaAberta = signal(false);
  previewRows = signal<Occurrence[]>([]);
  pagination = signal<PreviewResponse['pagination'] | null>(null);
  selectedItem = signal<Occurrence | null>(null);
  previaSubtitulo = computed(() => {
    const p = this.pagination();
    return p ? `${p.total} ocorrências no período. Clique numa linha para ver os detalhes.` : '';
  });
  previaRange = computed(() => {
    const p = this.pagination();
    return p ? pageRange(p.page + 1, p.size, p.total) : '';
  });

  ngOnInit() {
    void this.dashboardService.loadReportEmails();
  }

  statusClass(status: string): string {
    if (status === 'Concluída') return 'state-on';
    if (status === 'Em Andamento') return 'state-warn';
    if (status === 'Aberta') return 'state-busy';
    if (status === 'Cancelada') return 'state-bad';
    return '';
  }

  private filterParams(): Record<string, string | number> {
    const p: Record<string, string | number> = {};
    if (this.filters.limit > 0) p['limit'] = this.filters.limit;
    if (this.filters.startDate) p['startDate'] = this.filters.startDate;
    if (this.filters.endDate) p['endDate'] = this.filters.endDate;
    return p;
  }

  // ───── prévia
  previewData() { this.loadPreview(0, true); }
  changePage(page: number) { this.loadPreview(page, false); }
  setPageSize(size: number) { this.filters.pageSize = Number(size) || 25; this.loadPreview(0, false); }
  closePreview() { this.previaAberta.set(false); this.selectedItem.set(null); }

  private loadPreview(page: number, abrir: boolean) {
    this.isLoading.set(true);
    this.currentAction.set('preview');
    const params: Record<string, string | number> = { page, size: this.filters.pageSize };
    if (this.filters.startDate) params['startDate'] = this.filters.startDate;
    if (this.filters.endDate) params['endDate'] = this.filters.endDate;
    this.http.get<PreviewResponse>(`${this.apiUrl}/report/preview`, { params }).subscribe({
      next: (r) => {
        this.previewRows.set(r.data || []);
        this.pagination.set(r.pagination);
        if (abrir) this.previaAberta.set(true);
        this.isLoading.set(false);
      },
      error: (e) => { this.isLoading.set(false); this.toast.error(e.error?.message || 'Não foi possível carregar a prévia.'); },
    });
  }

  // ───── download
  download(kind: 'excel' | 'csv') {
    this.isLoading.set(true);
    this.currentAction.set(kind);
    const url = kind === 'excel' ? `${this.apiUrl}/report/download-excel` : `${this.apiUrl}/report/download`;
    this.http.get(url, { params: this.filterParams(), responseType: 'blob' }).subscribe({
      next: (blob) => {
        this.downloadFile(blob, kind === 'excel' ? 'relatorio_ocorrencias.xlsx' : 'relatorio_ocorrencias.csv');
        this.toast.success(kind === 'excel' ? 'Excel baixado.' : 'CSV baixado.');
        this.isLoading.set(false);
      },
      error: () => { this.isLoading.set(false); this.toast.error('Não foi possível baixar o arquivo.'); },
    });
  }

  private downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  // ───── envio
  abrirEnvio() { this.envioAberto.set(true); }

  async enviar() {
    const extra = this.email.trim();
    const fixos = this.emailsAtivos();
    if (!fixos.length && !extra) return;
    const total = fixos.length + (extra ? 1 : 0);
    if (!(await this.modal.confirm('Enviar o relatório?', `Vai para ${total === 1 ? '1 destinatário' : total + ' destinatários'} com os filtros atuais.`, 'Enviar'))) return;

    this.isLoading.set(true);
    this.currentAction.set('send');
    const base = this.filterParams();
    const pedidos: Promise<unknown>[] = [];
    if (fixos.length) pedidos.push(firstValueFrom(this.http.post(`${this.apiUrl}/report/generate-and-send`, { ...base, sendToFixed: true })));
    if (extra) pedidos.push(firstValueFrom(this.http.post(`${this.apiUrl}/report/generate-and-send`, { ...base, email: extra })));
    try {
      await Promise.all(pedidos);
      this.toast.success(total === 1 ? 'Relatório enviado.' : `Relatório enviado para ${total} destinatários.`);
      this.envioAberto.set(false);
      this.email = '';
    } catch (e: unknown) {
      const msg = (e as { error?: { message?: string } })?.error?.message;
      this.toast.error(msg || 'Não foi possível enviar o relatório.');
    } finally {
      this.isLoading.set(false);
    }
  }

  async saveEmail() {
    if (!this.newEmail.name.trim() || !this.newEmail.email.trim()) { this.toast.warning('Preencha nome e e-mail.'); return; }
    this.savingEmail.set(true);
    try {
      await this.dashboardService.createReportEmail({ ...this.newEmail, name: this.newEmail.name.trim(), email: this.newEmail.email.trim() });
      this.toast.success('Destinatário adicionado.');
      this.novoEmailAberto.set(false);
      this.newEmail = { name: '', email: '', reportType: 'occurrences' };
    } catch {
      this.toast.error('Não foi possível adicionar o destinatário.');
    } finally {
      this.savingEmail.set(false);
    }
  }

  async toggleEmail(e: ReportEmail) {
    try { await this.dashboardService.toggleReportEmail(e.id); }
    catch { this.toast.error('Não foi possível alterar o destinatário.'); }
  }

  async deleteEmail(e: ReportEmail) {
    if (!(await this.modal.confirm('Remover destinatário?', `${e.email} deixa de receber este relatório.`, 'Remover'))) return;
    try { await this.dashboardService.deleteReportEmail(e.id); this.toast.success('Destinatário removido.'); }
    catch { this.toast.error('Não foi possível remover.'); }
  }
}
