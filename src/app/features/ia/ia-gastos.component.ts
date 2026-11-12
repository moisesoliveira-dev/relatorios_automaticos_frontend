import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/ui/toast.service';
import { DialogComponent } from '../../shared/components/dialog.component';
import { IconComponent } from '../../shared/components/icon.component';
import { IaApiService, IaPreco, IaUso } from './ia-api.service';

type Origem = 'cliente' | 'teste' | 'todas';

/** Nome do agente como aparece para quem opera (o código usa o nome técnico). */
const AGENTES: Record<string, { nome: string; ajuda: string }> = {
  scope: { nome: 'Escopo', ajuda: 'Decide se a mensagem é assunto da loja.' },
  interpreter: { nome: 'Intérprete', ajuda: 'Entende o que o cliente quis dizer.' },
  faq: { nome: 'Dúvidas (FAQ)', ajuda: 'Responde perguntas com a base de conhecimento.' },
  verifier: { nome: 'Verificador', ajuda: 'Revisa a resposta das dúvidas.' },
  writer: { nome: 'Atendente / redator', ajuda: 'Escreve a mensagem final ao cliente.' },
};

interface LinhaPreco { modelo: string; entrada: number; cache: number; saida: number }

/** Quanto a IA está custando: consumo medido em tokens × preços da OpenAI (ajustáveis). */
@Component({
  selector: 'app-ia-gastos',
  standalone: true,
  imports: [FormsModule, IconComponent, DialogComponent],
  template: `
    <div class="space-y-4">
      <div class="toolbar">
        <div class="seg" role="group" aria-label="Período">
          @for (p of periodos; track p.dias) {
            <button type="button" class="seg-btn" [class.seg-on]="dias() === p.dias" [attr.aria-pressed]="dias() === p.dias" (click)="trocarPeriodo(p.dias)">{{ p.label }}</button>
          }
        </div>
        <div class="seg" role="group" aria-label="Origem do gasto">
          @for (o of origens; track o.key) {
            <button type="button" class="seg-btn" [class.seg-on]="origem() === o.key" [attr.aria-pressed]="origem() === o.key" (click)="trocarOrigem(o.key)" [title]="o.ajuda">{{ o.label }}</button>
          }
        </div>
        <span class="toolbar-spacer"></span>
        <button type="button" class="btn btn-secondary btn-sm" (click)="abrirPrecos()" [disabled]="!uso()"><app-icon name="engrenagem" [size]="14" /> Preços e dólar</button>
      </div>

      @if (carregando() && !uso()) {
        <div class="loading-block"><span class="spinner-sm"></span> Carregando…</div>
      }

      @if (uso(); as u) {
        @if (u.semPreco.length) {
          <p class="note note-warn" role="status">
            Sem preço cadastrado para {{ u.semPreco.join(', ') }}: esses gastos aparecem como zero.
            <button type="button" class="link-btn" (click)="abrirPrecos()">Cadastrar preço</button>
          </p>
        }

        <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div class="panel panel-pad kpi">
            <p class="kpi-label">Gasto no período</p>
            <p class="kpi-value font-display">{{ brl(u.totais.brl) }}</p>
            <p class="kpi-hint">{{ usd(u.totais.usd) }} · {{ u.periodo.dias }} dias</p>
          </div>
          <div class="panel panel-pad kpi">
            <p class="kpi-label">Previsão do mês</p>
            <p class="kpi-value font-display">{{ brl(u.mes.previsaoBrl) }}</p>
            <p class="kpi-hint">{{ brl(u.mes.gastoBrl) }} até agora neste mês</p>
          </div>
          <div class="panel panel-pad kpi">
            <p class="kpi-label">Custo por conversa</p>
            <p class="kpi-value font-display">{{ brl(u.custoPorConversaBrl) }}</p>
            <p class="kpi-hint">{{ u.conversas }} {{ u.conversas === 1 ? 'conversa nova' : 'conversas novas' }} no período</p>
          </div>
          <div class="panel panel-pad kpi">
            <p class="kpi-label">Chamadas à IA</p>
            <p class="kpi-value font-display">{{ num(u.totais.chamadas) }}</p>
            <p class="kpi-hint">{{ num(u.totais.tokensEntrada + u.totais.tokensSaida) }} tokens
              @if (u.totais.falhas) { · {{ num(u.totais.falhas) }} com falha }</p>
          </div>
        </div>

        <section class="panel panel-pad" aria-label="Gasto por dia">
          <div class="flex items-baseline justify-between mb-3 gap-2 flex-wrap">
            <h2 class="sec-title">Gasto por dia</h2>
            <span class="text-xs" style="color: var(--cmm-muted);">Maior dia: {{ brl(maxDia()) }}</span>
          </div>
          <div class="bars" role="img" [attr.aria-label]="'Gasto por dia nos últimos ' + u.periodo.dias + ' dias, total ' + brl(u.totais.brl)">
            @for (d of u.porDia; track d.dia) {
              <div class="bar-col" [title]="dataCurta(d.dia) + ': ' + brl(d.brl) + ' · ' + d.chamadas + ' chamadas'">
                <div class="bar" [style.height.%]="altura(d.brl)" [class.bar-zero]="!d.brl"></div>
              </div>
            }
          </div>
          <div class="bars-axis"><span>{{ dataCurta(u.porDia[0].dia) }}</span><span>{{ dataCurta(u.porDia[u.porDia.length - 1].dia) }}</span></div>
        </section>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <section aria-label="Gasto por agente">
            <h2 class="sec-title mb-2">Onde o dinheiro vai</h2>
            <div class="table-shell">
              <table>
                <thead><tr><th>Agente</th><th class="r">Chamadas</th><th class="r">Tokens</th><th class="r">Custo</th></tr></thead>
                <tbody>
                  @for (a of u.porAgente; track a.agente) {
                    <tr>
                      <td><b>{{ nomeAgente(a.agente) }}</b><br /><span class="text-xs" style="color: var(--cmm-muted);">{{ ajudaAgente(a.agente) }}</span></td>
                      <td class="r">{{ num(a.chamadas) }}</td>
                      <td class="r">{{ num(a.tokensEntrada + a.tokensSaida) }}</td>
                      <td class="r"><b>{{ brl(a.brl) }}</b><br /><span class="text-xs" style="color: var(--cmm-muted);">{{ pct(a.usd, u.totais.usd) }}</span></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="4" class="vazio">Nenhuma chamada à IA neste período.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section aria-label="Gasto por modelo">
            <h2 class="sec-title mb-2">Por modelo</h2>
            <div class="table-shell">
              <table>
                <thead><tr><th>Modelo</th><th class="r">Chamadas</th><th class="r">Resposta média</th><th class="r">Custo</th></tr></thead>
                <tbody>
                  @for (m of u.porModelo; track m.modelo) {
                    <tr>
                      <td><b>{{ m.modelo }}</b>@if (!m.precificado) { <br /><span class="text-xs" style="color: var(--cmm-warning);">sem preço cadastrado</span> }</td>
                      <td class="r">{{ num(m.chamadas) }}</td>
                      <td class="r">{{ seg(m.latenciaMediaMs) }}</td>
                      <td class="r"><b>{{ brl(m.brl) }}</b><br /><span class="text-xs" style="color: var(--cmm-muted);">{{ usd(m.usd) }}</span></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="4" class="vazio">Nenhuma chamada à IA neste período.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <p class="text-xs" style="color: var(--cmm-muted);">
          Estimativa: tokens medidos em cada chamada × preço por milhão de tokens (dólar a {{ u.cotacao.toFixed(2).replace('.', ',') }}). Só conta chamadas feitas depois que este painel entrou no ar.
          Confira os preços na página da OpenAI e a fatura real no painel deles; ajuste em “Preços e dólar”.
        </p>
      }

      <!-- Preços e cotação -->
      <app-dialog [open]="precosAberto()" title="Preços e dólar" subtitle="Valores em dólar por 1 milhão de tokens. O que você salvar vale também para o histórico." size="lg" (closed)="precosAberto.set(false)">
        <div class="space-y-4">
          <div>
            <label class="form-label" for="gastos-cotacao">Cotação do dólar (R$)</label>
            <input id="gastos-cotacao" class="form-input" type="number" min="0.01" max="99" step="0.01" [ngModel]="cotacao()" (ngModelChange)="cotacao.set($event)" style="max-width: 9rem;" />
          </div>
          <div class="table-shell">
            <table>
              <thead><tr><th>Modelo</th><th class="r">Entrada</th><th class="r">Entrada em cache</th><th class="r">Saída</th><th></th></tr></thead>
              <tbody>
                @for (l of linhas(); track l.modelo; let i = $index) {
                  <tr>
                    <td><b>{{ l.modelo }}</b></td>
                    <td class="r"><input class="form-input num-in" type="number" min="0" step="0.001" [ngModel]="l.entrada" (ngModelChange)="mudar(i, 'entrada', $event)" [attr.aria-label]="'Entrada de ' + l.modelo" /></td>
                    <td class="r"><input class="form-input num-in" type="number" min="0" step="0.001" [ngModel]="l.cache" (ngModelChange)="mudar(i, 'cache', $event)" [attr.aria-label]="'Cache de ' + l.modelo" /></td>
                    <td class="r"><input class="form-input num-in" type="number" min="0" step="0.001" [ngModel]="l.saida" (ngModelChange)="mudar(i, 'saida', $event)" [attr.aria-label]="'Saída de ' + l.modelo" /></td>
                    <td></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="novo">
            <input class="form-input" placeholder="Outro modelo, ex.: gpt-5.1" maxlength="80" [ngModel]="novoModelo()" (ngModelChange)="novoModelo.set($event)" aria-label="Nome do novo modelo" />
            <button type="button" class="btn btn-secondary btn-sm" (click)="adicionar()" [disabled]="!novoModelo().trim()">Adicionar modelo</button>
          </div>
          <p class="text-xs" style="color: var(--cmm-muted);">Os modelos que o sistema usa com datas no nome (ex.: gpt-4o-mini-2024-07-18) usam o preço do nome base.</p>
        </div>
        <ng-container dialog-footer>
          <button type="button" class="btn btn-secondary btn-sm" (click)="precosAberto.set(false)">Cancelar</button>
          <button type="button" class="btn btn-primary btn-sm" (click)="salvarPrecos()" [disabled]="salvando()">Salvar</button>
        </ng-container>
      </app-dialog>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .kpi { display: flex; flex-direction: column; gap: .15rem; }
    .kpi-label { font-size: .75rem; font-weight: 700; letter-spacing: .02em; color: var(--cmm-muted); }
    .kpi-value { font-size: 1.6rem; line-height: 1.15; font-weight: 700; color: var(--cmm-ink); }
    .kpi-hint { font-size: .75rem; color: var(--cmm-muted); }
    .bars { display: flex; align-items: flex-end; gap: 2px; height: 9rem; }
    .bar-col { flex: 1 1 0; min-width: 2px; height: 100%; display: flex; align-items: flex-end; }
    .bar { width: 100%; min-height: 2px; border-radius: 3px 3px 0 0; background: var(--cmm-accent); transition: height 300ms var(--ease-out-expo); }
    .bar-zero { background: var(--cmm-border); }
    .bar-col:hover .bar { filter: brightness(1.12); }
    .bars-axis { display: flex; justify-content: space-between; margin-top: .35rem; font-size: .6875rem; color: var(--cmm-muted); }
    th.r, td.r { text-align: right; white-space: nowrap; }
    .vazio { text-align: center; color: var(--cmm-muted); padding: 1.25rem; }
    .num-in { width: 6.5rem; text-align: right; padding-block: .3rem; min-height: 0; }
    .novo { display: flex; gap: .5rem; flex-wrap: wrap; align-items: center; }
    .novo .form-input { flex: 1 1 14rem; }
    .link-btn { background: none; border: 0; padding: 0; margin-left: .35rem; font: inherit; font-weight: 700; color: inherit; text-decoration: underline; cursor: pointer; }
  `],
})
export class IaGastosComponent implements OnInit {
  private readonly api = inject(IaApiService);
  private readonly toast = inject(ToastService);

  readonly periodos = [{ dias: 7, label: '7 dias' }, { dias: 30, label: '30 dias' }, { dias: 90, label: '90 dias' }];
  readonly origens: Array<{ key: Origem; label: string; ajuda: string }> = [
    { key: 'cliente', label: 'Clientes', ajuda: 'Só o que foi gasto atendendo clientes reais.' },
    { key: 'teste', label: 'Testes', ajuda: 'O que foi gasto nos simuladores da tela.' },
    { key: 'todas', label: 'Tudo', ajuda: 'Clientes e testes somados.' },
  ];

  dias = signal(30);
  origem = signal<Origem>('cliente');
  uso = signal<IaUso | null>(null);
  carregando = signal(false);

  precosAberto = signal(false);
  salvando = signal(false);
  cotacao = signal(5.5);
  linhas = signal<LinhaPreco[]>([]);
  novoModelo = signal('');

  maxDia = computed(() => Math.max(0, ...(this.uso()?.porDia.map((d) => d.brl) ?? [0])));

  ngOnInit(): void { this.carregar(); }

  carregar(): void {
    this.carregando.set(true);
    this.api.usage(this.dias(), this.origem()).subscribe({
      next: (u) => { this.uso.set(u); this.carregando.set(false); },
      error: () => { this.carregando.set(false); this.toast.error('Não foi possível carregar os gastos.'); },
    });
  }
  trocarPeriodo(d: number): void { this.dias.set(d); this.carregar(); }
  trocarOrigem(o: Origem): void { this.origem.set(o); this.carregar(); }

  abrirPrecos(): void {
    const u = this.uso();
    if (!u) return;
    this.cotacao.set(u.cotacao);
    this.linhas.set(u.precos.map((p: IaPreco) => ({ modelo: p.modelo, entrada: p.entrada, cache: p.cache, saida: p.saida })));
    this.novoModelo.set('');
    this.precosAberto.set(true);
  }
  mudar(i: number, campo: 'entrada' | 'cache' | 'saida', v: number | string): void {
    this.linhas.update((l) => l.map((x, j) => (j === i ? { ...x, [campo]: Number(v) || 0 } : x)));
  }
  adicionar(): void {
    const m = this.novoModelo().trim().toLowerCase();
    if (!m) return;
    if (!this.linhas().some((l) => l.modelo === m)) this.linhas.update((l) => [...l, { modelo: m, entrada: 0, cache: 0, saida: 0 }]);
    this.novoModelo.set('');
  }
  salvarPrecos(): void {
    const precos: Record<string, { entrada: number; cache: number; saida: number }> = {};
    for (const l of this.linhas()) precos[l.modelo] = { entrada: l.entrada, cache: l.cache, saida: l.saida };
    this.salvando.set(true);
    this.api.saveUsagePrices({ cotacao: Number(this.cotacao()), precos }).subscribe({
      next: () => { this.salvando.set(false); this.precosAberto.set(false); this.toast.success('Preços salvos.'); this.carregar(); },
      error: (e) => { this.salvando.set(false); this.toast.error(e?.error?.message || 'Não foi possível salvar os preços.'); },
    });
  }

  // ───── formatação
  brl(v: number): string {
    const casas = v !== 0 && Math.abs(v) < 1 ? 4 : 2;
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: casas, maximumFractionDigits: casas });
  }
  usd(v: number): string {
    const casas = v !== 0 && Math.abs(v) < 1 ? 4 : 2;
    return 'US$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
  }
  num(v: number): string { return v.toLocaleString('pt-BR'); }
  seg(ms: number): string { return ms ? (ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 }) + ' s' : '—'; }
  pct(parte: number, total: number): string { return total > 0 ? Math.round((parte / total) * 100) + '%' : '—'; }
  altura(v: number): number { const m = this.maxDia(); return m > 0 ? Math.max(2, (v / m) * 100) : 2; }
  dataCurta(iso: string): string { return iso.slice(8, 10) + '/' + iso.slice(5, 7); }
  nomeAgente(a: string): string { return AGENTES[a]?.nome ?? a; }
  ajudaAgente(a: string): string { return AGENTES[a]?.ajuda ?? ''; }
}
