import { Component, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../shared/services/modal.service';
import { IaApiService, IaFlow, IaFlowState, IaNode, IaTool } from './ia-api.service';

type Tipo = IaNode['tipo'];

const TIPOS: Array<{ tipo: Tipo; label: string; icone: string; ajuda: string }> = [
  { tipo: 'mensagem', label: 'Mensagem', icone: '💬', ajuda: 'O bot diz algo e segue sozinho para o próximo bloco.' },
  { tipo: 'pergunta', label: 'Pergunta', icone: '❓', ajuda: 'Espera uma resposta livre e guarda numa variável (ex.: nome, bairro).' },
  { tipo: 'opcoes', label: 'Opções', icone: '🔢', ajuda: 'O cliente escolhe um número; cada opção leva a um caminho.' },
  { tipo: 'arquivos', label: 'Arquivos', icone: '📎', ajuda: 'Pede arquivos e espera o cliente enviar “OK”. Vão para a pasta do Drive.' },
  { tipo: 'acao', label: 'Ferramenta', icone: '🧰', ajuda: 'Faz algo por conta própria, como criar a pasta no Drive.' },
  { tipo: 'encaminhar', label: 'Encaminhar', icone: '🤝', ajuda: 'Passa o cliente a um atendente (rodízio) e termina o fluxo.' },
  { tipo: 'fim', label: 'Encerrar', icone: '🏁', ajuda: 'Termina o fluxo e volta ao menu inicial.' },
];

export const MODELOS: Record<string, () => IaFlow> = {
  branco: () => ({ id: '', nome: 'Novo fluxo', ativo: false, menuOpcao: null, guidance: { tone: 'padrao', instructions: '' }, reescrever: false, kb: [], nos: [
    { id: 'n1', tipo: 'mensagem', titulo: 'Boas-vindas', texto: 'Olá! Vou te ajudar com isso.', proximo: null },
  ] }),
  coleta: () => ({ id: '', nome: 'Coleta de dados', descricao: 'Pergunta o nome, cria a pasta no Drive, recebe arquivos e encaminha.', ativo: false, menuOpcao: null, guidance: { tone: 'padrao', instructions: '' }, reescrever: false, kb: [], nos: [
    { id: 'n1', tipo: 'pergunta', titulo: 'Nome', texto: 'Para começar, qual é o seu nome?', variavel: 'nome', validacao: 'nome', proximo: 'n2' },
    { id: 'n2', tipo: 'acao', titulo: 'Criar pasta no Drive', acao: 'drive_criar_pasta', proximo: 'n3' },
    { id: 'n3', tipo: 'arquivos', titulo: 'Receber arquivos', texto: 'Perfeito, {nome}! Pode me enviar os arquivos aqui.', minimo: 1, proximo: 'n4' },
    { id: 'n4', tipo: 'acao', titulo: 'Salvar respostas', acao: 'drive_salvar_respostas', proximo: 'n5' },
    { id: 'n5', tipo: 'encaminhar', titulo: 'Atendente', texto: 'Obrigada, {nome}! Já vou te encaminhar para um atendente.' },
  ] }),
};

@Component({
  selector: 'app-ia-fluxos',
  standalone: true,
  imports: [FormsModule],
  template: `
    @if (atual(); as f) {
      <div class="space-y-4">
        <!-- Dados do fluxo -->
        <section class="panel panel-pad meta">
          <div class="meta-grid">
            <div><label class="form-label" for="fl-nome">Nome (aparece no menu do cliente)</label>
              <input id="fl-nome" class="form-input" maxlength="40" [ngModel]="f.nome" (ngModelChange)="editar((x) => (x.nome = $event))" /></div>
            <div><label class="form-label" for="fl-op">Opção no menu</label>
              <select id="fl-op" class="form-input" [ngModel]="f.menuOpcao" (ngModelChange)="editar((x) => (x.menuOpcao = $event === null ? null : +$event))">
                <option [ngValue]="null">— nenhuma —</option>
                @for (n of [6, 7, 8, 9]; track n) { <option [ngValue]="n" [disabled]="opcaoUsada(n)">{{ n }}{{ opcaoUsada(n) ? ' (em uso)' : '' }}</option> }
              </select></div>
            <label class="switch-row"><span>Ativo <small>aparece no menu ao publicar</small></span>
              <button type="button" role="switch" class="switch" [class.switch-on]="f.ativo" [attr.aria-checked]="f.ativo" (click)="editar((x) => (x.ativo = !x.ativo))"><span class="switch-knob"></span></button></label>
          </div>
          <div class="meta-grid2">
            <div><label class="form-label" for="fl-desc">Descrição (só para você)</label>
              <input id="fl-desc" class="form-input" maxlength="200" [ngModel]="f.descricao ?? ''" (ngModelChange)="editar((x) => (x.descricao = $event))" /></div>
            <div class="flex gap-2 items-end flex-wrap">
              <button type="button" class="btn btn-accent btn-sm" (click)="abrirTeste()">▶ Testar este fluxo</button>
              <button type="button" class="btn btn-ghost btn-sm" style="color: var(--cmm-danger);" (click)="excluir()">Excluir fluxo</button>
            </div>
          </div>
        </section>

        <!-- Quadro de etapas -->
        <div>
          <h3 class="font-semibold mb-1">Etapas do fluxo</h3>
          <p class="text-sm mb-3" style="color: var(--cmm-muted);">O cliente começa na etapa 1 e segue o caminho que você definir. Clique numa etapa para editar.</p>
          <div class="board">
            @for (n of f.nos; track n.id; let i = $index) {
              <button type="button" class="card-node" [attr.data-tipo]="n.tipo" [class.card-warn]="incompleto(n)" (click)="noAberto.set(i)" [attr.aria-label]="'Editar etapa ' + (i + 1) + ': ' + n.titulo">
                <span class="cn-top"><span class="cn-num">{{ i + 1 }}</span><span class="cn-tipo">{{ info(n.tipo).icone }} {{ info(n.tipo).label }}</span>@if (i === 0) { <span class="badge badge-accent">Início</span> }</span>
                <b class="cn-title">{{ n.titulo || 'Sem nome' }}</b>
                <span class="cn-snip">{{ resumo(n) }}</span>
                <span class="cn-dest">
                  @for (d of destinosDe(n, f); track $index) { <span>{{ d }}</span> }
                </span>
                @if (incompleto(n)) { <span class="badge badge-warning">Faltam detalhes</span> }
              </button>
            }
            <div class="card-add">
              <p class="font-semibold text-sm mb-2">＋ Nova etapa</p>
              <div class="flex flex-wrap gap-1.5">
                @for (t of tipos; track t.tipo) { <button type="button" class="chip-type" [title]="t.ajuda" (click)="addNo(t.tipo)" [disabled]="f.nos.length >= 40">{{ t.icone }} {{ t.label }}</button> }
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Editar etapa (painel lateral) -->
      @if (noAberto() !== null && f.nos[noAberto()!]; as n) {
        <div class="sheet-backdrop" (click)="noAberto.set(null)" aria-hidden="true"></div>
        <aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="no-titulo" style="--sheet-w: 34rem;">
          <header class="sheet-head">
            <span class="text-xl" aria-hidden="true">{{ info(n.tipo).icone }}</span>
            <input id="no-titulo" class="node-title" maxlength="60" aria-label="Nome da etapa" [ngModel]="n.titulo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.titulo = $event))" />
            <span class="badge badge-neutral">{{ info(n.tipo).label }}</span>
            <button type="button" class="btn btn-ghost btn-sm !px-2" (click)="noAberto.set(null)" aria-label="Fechar">✕</button>
          </header>
          <div class="sheet-body space-y-4">
            <p class="text-xs" style="color: var(--cmm-muted);">{{ info(n.tipo).ajuda }}</p>

            @if (n.tipo !== 'acao') {
              <div>
                <label class="form-label" for="nt">{{ n.tipo === 'encaminhar' ? 'Mensagem ao encaminhar (opcional — se vazio, usa a padrão)' : n.tipo === 'fim' ? 'Mensagem final (opcional)' : 'O que o bot diz' }}</label>
                <textarea id="nt" class="form-input" rows="5" maxlength="1000" [ngModel]="n.texto ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.texto = $event))" placeholder="Use {nome} ou {sua_variavel} para citar respostas."></textarea>
              </div>
            }

            @if (n.tipo === 'pergunta') {
              <div class="grid sm:grid-cols-2 gap-3">
                <div><label class="form-label" for="nv">Guardar a resposta em</label>
                  <input class="form-input" id="nv" placeholder="nome, bairro…" [ngModel]="n.variavel ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.variavel = $event))" /></div>
                <div><label class="form-label" for="nval">Tipo de resposta</label>
                  <select class="form-input" id="nval" [ngModel]="n.validacao ?? 'texto'" (ngModelChange)="editarNo(noAberto()!, (x) => (x.validacao = $event))"><option value="texto">Texto livre</option><option value="nome">Nome de pessoa (valida)</option></select></div>
              </div>
            }

            @if (n.tipo === 'arquivos') {
              <div><label class="form-label" for="nm">Mínimo de arquivos antes do “OK”</label>
                <input class="form-input !w-28" type="number" min="0" max="20" id="nm" [ngModel]="n.minimo ?? 0" (ngModelChange)="editarNo(noAberto()!, (x) => (x.minimo = +$event))" /></div>
            }

            @if (n.tipo === 'acao') {
              <div>
                <label class="form-label" for="na">Ferramenta</label>
                <select class="form-input" id="na" [ngModel]="n.acao ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.acao = $event))">
                  <option value="">Escolha…</option>
                  @for (t of ferramentas(); track t.key) { <option [value]="t.key">{{ t.label }}{{ t.disponivel ? '' : ' (Drive não configurado)' }}</option> }
                </select>
                @if (ferramenta(n.acao); as t) {
                  <p class="text-xs mt-2" style="color: var(--cmm-muted);">{{ t.descricao }}</p>
                  @if (!t.disponivel) { <p class="text-xs mt-1" style="color: var(--cmm-warning);">O Drive não está configurado (pasta raiz): a ferramenta não fará nada até configurar na aba Ajustes.</p> }
                }
              </div>
            }

            @if (n.tipo === 'opcoes') {
              <div class="space-y-2">
                <div><label class="form-label" for="nvo">Guardar a escolha em (opcional)</label>
                  <input class="form-input" id="nvo" placeholder="ambiente" [ngModel]="n.variavel ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.variavel = $event))" /></div>
                <p class="form-label !mb-0">Opções (numeradas automaticamente)</p>
                @for (o of n.opcoes ?? []; track $index; let j = $index) {
                  <div class="opt">
                    <span class="opt-n">{{ j + 1 }}</span>
                    <input class="form-input" maxlength="60" [attr.aria-label]="'Texto da opção ' + (j + 1)" [ngModel]="o.rotulo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.opcoes![j].rotulo = $event))" placeholder="Texto da opção" />
                    <select class="form-input" [attr.aria-label]="'Destino da opção ' + (j + 1)" [ngModel]="o.proximo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.opcoes![j].proximo = $event))">
                      <option [ngValue]="null">→ escolha o destino</option>
                      @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">→ {{ d.rotulo }}</option> }
                    </select>
                    <button type="button" class="btn btn-ghost btn-sm !px-2" (click)="editarNo(noAberto()!, (x) => x.opcoes!.splice(j, 1))" [disabled]="(n.opcoes?.length ?? 0) <= 2" aria-label="Remover opção">✕</button>
                  </div>
                }
                <button type="button" class="btn btn-secondary btn-sm" (click)="editarNo(noAberto()!, (x) => x.opcoes!.push({ rotulo: '', proximo: null }))" [disabled]="(n.opcoes?.length ?? 0) >= 8">+ Opção</button>
              </div>
            }

            @if (n.tipo === 'mensagem' || n.tipo === 'pergunta' || n.tipo === 'arquivos' || n.tipo === 'acao') {
              <div class="next-box">
                <label class="form-label" for="nn">Depois desta etapa, ir para</label>
                <select class="form-input" id="nn" [ngModel]="n.proximo ?? null" (ngModelChange)="editarNo(noAberto()!, (x) => (x.proximo = $event))">
                  <option [ngValue]="null">escolha a próxima etapa</option>
                  @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">{{ d.rotulo }}</option> }
                </select>
              </div>
            } @else if (n.tipo === 'encaminhar' || n.tipo === 'fim') {
              <p class="text-sm next-box">{{ n.tipo === 'fim' ? 'O fluxo termina aqui e o cliente volta ao menu inicial.' : 'O fluxo termina aqui: um atendente assume (rodízio).' }}</p>
            }
          </div>
          <footer class="sheet-foot">
            <button type="button" class="btn btn-secondary btn-sm" (click)="mover(noAberto()!, -1)" [disabled]="noAberto() === 0">← Mover antes</button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="mover(noAberto()!, 1)" [disabled]="noAberto() === f.nos.length - 1">Mover depois →</button>
            <button type="button" class="btn btn-ghost btn-sm" style="color: var(--cmm-danger);" (click)="removerNo(noAberto()!)">Excluir</button>
            <button type="button" class="btn btn-primary btn-sm ml-auto" (click)="noAberto.set(null)">Pronto</button>
          </footer>
        </aside>
      }

      <!-- Testar (painel lateral) -->
      @if (testando()) {
        <div class="sheet-backdrop" (click)="testando.set(false)" aria-hidden="true"></div>
        <aside class="sheet" role="dialog" aria-modal="true" aria-label="Testar o fluxo" style="--sheet-w: 28rem;">
          <header class="sheet-head">
            <div class="min-w-0 flex-1"><h3 class="font-semibold">Testar este fluxo</h3><p class="text-xs" style="color: var(--cmm-muted);">Roda o rascunho sem enviar nada a clientes nem mexer no Drive.</p></div>
            <button type="button" class="btn btn-ghost btn-sm !px-2" (click)="testando.set(false)" aria-label="Fechar">✕</button>
          </header>
          <div class="sheet-body test-chat">
            @for (m of log(); track $index) { <div class="bubble" [class.bubble-user]="m.de === 'cliente'" [class.bubble-bot]="m.de === 'bot'" [class.bubble-fx]="m.de === 'efeito'">{{ m.texto }}</div> }
            @if (!log().length) { <p class="text-sm" style="color: var(--cmm-muted);">Clique em “Começar” para ver a primeira mensagem.</p> }
            @if (erros().length) { <ul class="test-err" role="alert">@for (e of erros(); track e) { <li>{{ e }}</li> }</ul> }
          </div>
          <form class="sheet-foot" (ngSubmit)="enviar()">
            @if (!estado() && !terminou()) { <button type="button" class="btn btn-primary btn-sm w-full" (click)="comecar()" [disabled]="carregando()">Começar</button> }
            @else if (terminou()) { <button type="button" class="btn btn-secondary btn-sm w-full" (click)="comecar()">Testar de novo</button> }
            @else {
              <input class="form-input flex-1" name="tx" [(ngModel)]="texto" placeholder="Resposta do cliente…" autocomplete="off" aria-label="Resposta do cliente" />
              <button type="submit" class="btn btn-primary btn-sm" [disabled]="carregando()">Enviar</button>
            }
          </form>
        </aside>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .meta-grid { display: grid; grid-template-columns: 1fr; gap: .75rem 1rem; align-items: end; }
    .meta-grid2 { display: grid; grid-template-columns: 1fr; gap: .75rem 1rem; margin-top: .75rem; align-items: end; }
    @media (min-width: 900px) { .meta-grid { grid-template-columns: 1fr 12rem auto; } .meta-grid2 { grid-template-columns: 1fr auto; } }
    .board { display: grid; grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr)); gap: .85rem; }
    .card-node { position: relative; display: flex; flex-direction: column; gap: .4rem; text-align: left; padding: .9rem 1rem 1rem; border: 1.5px solid var(--cmm-border); border-top-width: 4px; border-radius: 1rem; background: var(--cmm-panel); color: var(--cmm-ink); cursor: pointer; min-height: 11rem; transition: transform 350ms var(--ease-out-expo), border-color 200ms, box-shadow 350ms var(--ease-out-expo); }
    .card-node:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--cmm-accent) 55%, var(--cmm-border)); box-shadow: var(--cmm-shadow-lift); }
    .card-node[data-tipo='pergunta'] { border-top-color: #3b82f6; } .card-node[data-tipo='opcoes'] { border-top-color: #8b5cf6; }
    .card-node[data-tipo='arquivos'] { border-top-color: #f59e0b; } .card-node[data-tipo='acao'] { border-top-color: #10b981; }
    .card-node[data-tipo='encaminhar'] { border-top-color: var(--cmm-accent); } .card-node[data-tipo='fim'] { border-top-color: var(--cmm-muted); } .card-node[data-tipo='mensagem'] { border-top-color: #64748b; }
    .card-warn { border-color: color-mix(in srgb, var(--cmm-warning) 60%, var(--cmm-border)); }
    .cn-top { display: flex; align-items: center; gap: .45rem; flex-wrap: wrap; }
    .cn-num { width: 1.5rem; height: 1.5rem; border-radius: 99px; display: grid; place-items: center; font-size: .72rem; font-weight: 800; background: var(--cmm-accent-soft); color: var(--cmm-accent); }
    .cn-tipo { font-size: .72rem; font-weight: 700; color: var(--cmm-muted); text-transform: uppercase; letter-spacing: .05em; }
    .cn-title { font-size: .95rem; line-height: 1.2; }
    .cn-snip { font-size: .8rem; color: var(--cmm-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .cn-dest { margin-top: auto; display: flex; flex-direction: column; gap: .15rem; font-size: .75rem; font-weight: 600; color: var(--cmm-accent); }
    .cn-dest span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .card-add { border: 1.5px dashed var(--cmm-border); border-radius: 1rem; padding: .9rem 1rem; display: flex; flex-direction: column; justify-content: center; min-height: 11rem; }
    .chip-type { padding: .3rem .7rem; border-radius: 99px; border: 1px solid var(--cmm-border); background: var(--cmm-panel); font-size: .78rem; font-weight: 600; cursor: pointer; color: var(--cmm-ink); transition: background-color 200ms, border-color 200ms; }
    .chip-type:hover:not(:disabled) { background: var(--cmm-accent-soft); border-color: var(--cmm-accent); }
    .node-title { flex: 1 1 auto; min-width: 0; border: 1px solid transparent; background: transparent; font-weight: 700; font-size: 1.05rem; padding: .25rem .4rem; border-radius: .5rem; color: var(--cmm-ink); }
    .node-title:hover, .node-title:focus { border-color: var(--cmm-border); outline: none; }
    .next-box { padding: .9rem 1rem; border-radius: .9rem; background: color-mix(in srgb, var(--cmm-border) 28%, var(--cmm-panel)); }
    .opt { display: grid; grid-template-columns: 1.8rem 1fr 1fr auto; gap: .5rem; align-items: center; }
    @media (max-width: 700px) { .opt { grid-template-columns: 1.8rem 1fr auto; } .opt select { grid-column: 2 / 4; } }
    .opt-n { width: 1.6rem; height: 1.6rem; border-radius: 99px; display: grid; place-items: center; font-weight: 800; font-size: .75rem; background: var(--cmm-accent-soft); color: var(--cmm-accent); }
    .switch-row { display: flex; align-items: center; gap: .75rem; font-size: .875rem; font-weight: 600; justify-content: space-between; padding-bottom: .35rem; } .switch-row small { display: block; font-weight: 400; color: var(--cmm-muted); }
    .switch { flex-shrink: 0; width: 2.9rem; height: 1.6rem; border-radius: 99px; border: none; background: var(--cmm-border); position: relative; cursor: pointer; transition: background-color 300ms; }
    .switch-on { background: var(--cmm-accent); }
    .switch-knob { position: absolute; top: 3px; left: 3px; width: 1.2rem; height: 1.2rem; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); transition: transform 400ms var(--ease-out-expo); }
    .switch-on .switch-knob { transform: translateX(1.3rem); }
    .test-chat { display: flex; flex-direction: column; gap: .45rem; }
    .bubble { max-width: 90%; padding: .5rem .8rem; border-radius: 1rem; font-size: .8125rem; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere; animation: bubble-in 380ms var(--ease-out-expo) both; }
    @keyframes bubble-in { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }
    .bubble-user { align-self: flex-end; background: var(--cmm-ink); color: var(--cmm-panel); border-bottom-right-radius: .3rem; }
    .bubble-bot { align-self: flex-start; background: color-mix(in srgb, var(--cmm-success) 13%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-success) 25%, transparent); border-bottom-left-radius: .3rem; }
    .bubble-fx { align-self: center; background: var(--cmm-accent-soft); color: var(--cmm-accent); font-weight: 700; font-size: .72rem; border-radius: 99px; }
    .test-err { margin-top: .5rem; padding: .6rem .9rem .6rem 1.6rem; list-style: disc; font-size: .78rem; font-weight: 600; color: var(--cmm-danger); background: color-mix(in srgb, var(--cmm-danger) 8%, var(--cmm-panel)); border-radius: .75rem; }
  `],
})
export class IaFluxosComponent {
  private readonly api = inject(IaApiService);
  private readonly modal = inject(ModalService);

  fluxos = input.required<IaFlow[]>();
  ferramentas = input<IaTool[]>([]);
  indice = input.required<number>();
  mudou = output<IaFlow[]>();

  tipos = TIPOS;
  noAberto = signal<number | null>(null);
  testando = signal(false);
  atual = computed(() => this.fluxos()[this.indice()] ?? null);

  // teste
  estado = signal<IaFlowState | null>(null);
  log = signal<Array<{ de: 'cliente' | 'bot' | 'efeito'; texto: string }>>([]);
  erros = signal<string[]>([]);
  terminou = signal(false);
  carregando = signal(false);
  texto = '';

  @HostListener('document:keydown.escape')
  fechar(): void { if (this.noAberto() !== null) this.noAberto.set(null); else if (this.testando()) this.testando.set(false); }

  info(t: Tipo) { return TIPOS.find((x) => x.tipo === t)!; }
  ferramenta(k?: string) { return this.ferramentas().find((t) => t.key === k); }
  opcaoUsada(n: number): boolean { return this.fluxos().some((f, i) => i !== this.indice() && f.ativo && f.menuOpcao === n); }
  destinos(excluirId: string) {
    return (this.atual()?.nos ?? []).map((n, i) => ({ id: n.id, rotulo: `${i + 1}. ${this.info(n.tipo).icone} ${n.titulo || this.info(n.tipo).label}` })).filter((d) => d.id !== excluirId);
  }
  private nomeDe(f: IaFlow, id: string | null | undefined): string {
    const i = f.nos.findIndex((n) => n.id === id);
    return i < 0 ? '⚠ sem destino' : `→ ${i + 1}. ${f.nos[i].titulo || this.info(f.nos[i].tipo).label}`;
  }
  destinosDe(n: IaNode, f: IaFlow): string[] {
    if (n.tipo === 'encaminhar') return ['🤝 Passa a um atendente'];
    if (n.tipo === 'fim') return ['🏁 Volta ao menu'];
    if (n.tipo === 'opcoes') {
      const o = n.opcoes ?? [];
      return [...o.slice(0, 3).map((x, j) => `${j + 1} ${x.rotulo || '…'} ${this.nomeDe(f, x.proximo)}`), ...(o.length > 3 ? [`+ ${o.length - 3} opção(ões)`] : [])];
    }
    return [this.nomeDe(f, n.proximo)];
  }
  resumo(n: IaNode): string {
    if (n.tipo === 'acao') return this.ferramenta(n.acao)?.label ?? 'Escolha a ferramenta';
    if (n.tipo === 'arquivos') return (n.texto || 'Recebe arquivos') + ((n.minimo ?? 0) > 0 ? ` (mín. ${n.minimo})` : '');
    if (n.tipo === 'pergunta') return (n.texto || 'Sem texto') + (n.variavel ? `  → {${n.variavel}}` : '');
    return n.texto || (n.tipo === 'encaminhar' ? 'Usa a mensagem padrão de encaminhamento.' : n.tipo === 'fim' ? 'Sem mensagem final.' : 'Sem texto');
  }
  incompleto(n: IaNode): boolean {
    const precisaTexto = ['mensagem', 'opcoes', 'pergunta', 'arquivos'].includes(n.tipo);
    if (precisaTexto && !(n.texto ?? '').trim()) return true;
    if (['mensagem', 'pergunta', 'arquivos', 'acao'].includes(n.tipo) && !n.proximo) return true;
    if (n.tipo === 'acao' && !n.acao) return true;
    if (n.tipo === 'pergunta' && !n.variavel) return true;
    if (n.tipo === 'opcoes' && (n.opcoes ?? []).some((o) => !o.rotulo.trim() || !o.proximo)) return true;
    return false;
  }

  private emit(fn: (fs: IaFlow[]) => void): void {
    const copia: IaFlow[] = JSON.parse(JSON.stringify(this.fluxos()));
    fn(copia);
    this.mudou.emit(copia);
  }
  editar(fn: (f: IaFlow) => void): void { const i = this.indice(); this.emit((fs) => fn(fs[i])); this.zerarTeste(); }
  editarNo(idx: number, fn: (n: IaNode) => void): void { this.editar((f) => fn(f.nos[idx])); }

  async excluir(): Promise<void> {
    const f = this.atual();
    if (!f || !(await this.modal.confirm('Excluir este fluxo?', `“${f.nome}” sai do menu dos clientes quando você publicar. Quem estiver nele volta ao menu.`, 'Excluir'))) return;
    const i = this.indice();
    this.emit((fs) => fs.splice(i, 1));
  }

  addNo(tipo: Tipo): void {
    const novoIndice = this.atual()?.nos.length ?? 0;
    this.editar((f) => {
      const max = f.nos.reduce((m, n) => Math.max(m, Number(n.id.replace(/\D/g, '')) || 0), 0);
      const base: IaNode = { id: 'n' + (max + 1), tipo, titulo: this.info(tipo).label, proximo: null };
      if (tipo === 'mensagem' || tipo === 'pergunta' || tipo === 'arquivos') base.texto = '';
      if (tipo === 'pergunta') { base.variavel = ''; base.validacao = 'texto'; }
      if (tipo === 'arquivos') base.minimo = 1;
      if (tipo === 'opcoes') { base.texto = ''; base.opcoes = [{ rotulo: '', proximo: null }, { rotulo: '', proximo: null }]; }
      if (tipo === 'acao') base.acao = '';
      f.nos.push(base);
    });
    this.noAberto.set(novoIndice);
  }
  mover(i: number, d: number): void {
    this.editar((f) => { const j = i + d; if (j < 0 || j >= f.nos.length) return; [f.nos[i], f.nos[j]] = [f.nos[j], f.nos[i]]; });
    this.noAberto.set(Math.max(0, Math.min((this.atual()?.nos.length ?? 1) - 1, i + d)));
  }
  async removerNo(i: number): Promise<void> {
    const n = this.atual()?.nos[i];
    if (!n || !(await this.modal.confirm('Excluir esta etapa?', `“${n.titulo}” será removida e os caminhos que levavam a ela ficam sem destino.`, 'Excluir'))) return;
    this.editar((f) => {
      const [rm] = f.nos.splice(i, 1);
      for (const x of f.nos) {
        if (x.proximo === rm.id) x.proximo = null;
        x.opcoes?.forEach((o) => { if (o.proximo === rm.id) o.proximo = null; });
      }
    });
    this.noAberto.set(null);
  }

  // ───── teste
  abrirTeste(): void { this.testando.set(true); if (!this.log().length) this.comecar(); }
  private zerarTeste(): void { this.estado.set(null); this.log.set([]); this.erros.set([]); this.terminou.set(false); }
  comecar(): void { this.zerarTeste(); this.rodar(null, ''); }
  enviar(): void {
    const t = this.texto.trim();
    if (!t) return;
    this.log.update((l) => [...l, { de: 'cliente', texto: t }]);
    this.texto = '';
    this.rodar(this.estado(), t);
  }
  private rodar(estado: IaFlowState | null, texto: string): void {
    const f = this.atual();
    if (!f) return;
    this.carregando.set(true);
    this.api.previewFlow(f, estado, texto).subscribe({
      next: (r) => {
        this.erros.set([]);
        this.log.update((l) => [
          ...l,
          ...r.mensagens.map((m) => ({ de: 'bot' as const, texto: m })),
          ...r.efeitos.map((e) => ({ de: 'efeito' as const, texto: '⚙ ' + e })),
          ...(r.saiu ? [{ de: 'efeito' as const, texto: r.saiu === 'encaminhado' ? '🤝 Cliente encaminhado a um atendente' : '🏁 Volta ao menu inicial' }] : []),
        ]);
        this.estado.set(r.estado);
        this.terminou.set(!!r.saiu);
        this.carregando.set(false);
        setTimeout(() => { const el = document.querySelector('.test-chat'); el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, 50);
      },
      error: (e) => {
        const m = e?.error?.message;
        this.erros.set(Array.isArray(m) ? m : [m || 'Não foi possível testar.']);
        this.carregando.set(false);
      },
    });
  }
}
