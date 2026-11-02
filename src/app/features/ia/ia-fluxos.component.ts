import { Component, computed, inject, input, output, signal } from '@angular/core';
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
  branco: () => ({ id: '', nome: 'Novo fluxo', ativo: false, menuOpcao: null, nos: [
    { id: 'n1', tipo: 'mensagem', titulo: 'Boas-vindas', texto: 'Olá! Vou te ajudar com isso.', proximo: null },
  ] }),
  coleta: () => ({ id: '', nome: 'Coleta de dados', descricao: 'Pergunta o nome, cria a pasta no Drive, recebe arquivos e encaminha.', ativo: false, menuOpcao: null, nos: [
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
    <div>
      @if (atual(); as f) {
        <div class="space-y-4 min-w-0">
          <!-- Dados do fluxo -->
          <section class="panel panel-pad space-y-3">
            <div class="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
              <div><label class="form-label" for="fl-nome">Nome (aparece no menu do cliente)</label>
                <input id="fl-nome" class="form-input" maxlength="40" [ngModel]="f.nome" (ngModelChange)="editar((x) => (x.nome = $event))" /></div>
              <div class="flex items-center gap-3">
                <label class="form-label !mb-0" for="fl-op">Opção no menu</label>
                <select id="fl-op" class="form-input !w-24" [ngModel]="f.menuOpcao" (ngModelChange)="editar((x) => (x.menuOpcao = $event === 'null' || $event === null ? null : +$event))">
                  <option [ngValue]="null">—</option>
                  @for (n of [6, 7, 8, 9]; track n) { <option [ngValue]="n" [disabled]="opcaoUsada(n)">{{ n }}{{ opcaoUsada(n) ? ' (em uso)' : '' }}</option> }
                </select>
              </div>
            </div>
            <div><label class="form-label" for="fl-desc">Descrição (só para você)</label>
              <input id="fl-desc" class="form-input" maxlength="200" [ngModel]="f.descricao ?? ''" (ngModelChange)="editar((x) => (x.descricao = $event))" /></div>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <label class="switch-row gap-3"><span>Ativo para os clientes <small>aparece no menu inicial assim que publicar</small></span>
                <button type="button" role="switch" class="switch" [class.switch-on]="f.ativo" [attr.aria-checked]="f.ativo" (click)="editar((x) => (x.ativo = !x.ativo))"><span class="switch-knob"></span></button></label>
              <button type="button" class="btn btn-ghost btn-sm" style="color: var(--cmm-danger);" (click)="excluir()">Excluir fluxo</button>
            </div>
          </section>

          <div class="grid grid-cols-1 2xl:grid-cols-[1fr_22rem] gap-4 items-start">
            <!-- Blocos -->
            <section class="space-y-0 min-w-0">
              @for (n of f.nos; track n.id; let i = $index) {
                <article class="node" [attr.data-tipo]="n.tipo">
                  <header class="node-head">
                    <span class="node-ico" aria-hidden="true">{{ info(n.tipo).icone }}</span>
                    <input class="node-title" [attr.aria-label]="'Nome do bloco ' + (i + 1)" maxlength="60" [ngModel]="n.titulo" (ngModelChange)="editarNo(i, (x) => (x.titulo = $event))" />
                    @if (i === 0) { <span class="badge badge-accent">Início</span> }
                    <span class="badge badge-neutral">{{ info(n.tipo).label }}</span>
                    <span class="node-actions">
                      <button type="button" class="btn btn-ghost btn-sm !px-2" (click)="mover(i, -1)" [disabled]="i === 0" aria-label="Subir bloco">↑</button>
                      <button type="button" class="btn btn-ghost btn-sm !px-2" (click)="mover(i, 1)" [disabled]="i === f.nos.length - 1" aria-label="Descer bloco">↓</button>
                      <button type="button" class="btn btn-ghost btn-sm !px-2" style="color: var(--cmm-danger);" (click)="removerNo(i)" aria-label="Excluir bloco">✕</button>
                    </span>
                  </header>

                  @if (n.tipo !== 'acao') {
                      <div class="node-body">
                        <label class="form-label" [attr.for]="'nt-' + n.id">{{ n.tipo === 'encaminhar' ? 'Mensagem ao encaminhar (opcional — se vazio, usa a padrão)' : n.tipo === 'fim' ? 'Mensagem final (opcional)' : 'O que o bot diz' }}</label>
                        <textarea class="form-input" rows="3" [id]="'nt-' + n.id" maxlength="1000" [ngModel]="n.texto ?? ''" (ngModelChange)="editarNo(i, (x) => (x.texto = $event))" placeholder="Use {nome} ou {sua_variavel} para citar respostas."></textarea>
                      </div>
                  }

                  @if (n.tipo === 'pergunta') {
                    <div class="node-body grid sm:grid-cols-2 gap-3">
                      <div><label class="form-label" [attr.for]="'nv-' + n.id">Guardar a resposta em</label>
                        <input class="form-input" [id]="'nv-' + n.id" placeholder="nome, bairro…" [ngModel]="n.variavel ?? ''" (ngModelChange)="editarNo(i, (x) => (x.variavel = $event))" /></div>
                      <div><label class="form-label" [attr.for]="'nval-' + n.id">Tipo de resposta</label>
                        <select class="form-input" [id]="'nval-' + n.id" [ngModel]="n.validacao ?? 'texto'" (ngModelChange)="editarNo(i, (x) => (x.validacao = $event))"><option value="texto">Texto livre</option><option value="nome">Nome de pessoa (valida)</option></select></div>
                    </div>
                  }

                  @if (n.tipo === 'arquivos') {
                    <div class="node-body"><label class="form-label" [attr.for]="'nm-' + n.id">Mínimo de arquivos antes do “OK”</label>
                      <input class="form-input !w-28" type="number" min="0" max="20" [id]="'nm-' + n.id" [ngModel]="n.minimo ?? 0" (ngModelChange)="editarNo(i, (x) => (x.minimo = +$event))" /></div>
                  }

                  @if (n.tipo === 'acao') {
                    <div class="node-body">
                      <label class="form-label" [attr.for]="'na-' + n.id">Ferramenta</label>
                      <select class="form-input" [id]="'na-' + n.id" [ngModel]="n.acao ?? ''" (ngModelChange)="editarNo(i, (x) => (x.acao = $event))">
                        <option value="">Escolha…</option>
                        @for (t of ferramentas(); track t.key) { <option [value]="t.key">{{ t.label }}{{ t.disponivel ? '' : ' (Drive não configurado)' }}</option> }
                      </select>
                      @if (ferramenta(n.acao); as t) { <p class="text-xs mt-2" style="color: var(--cmm-muted);">{{ t.descricao }}</p>
                        @if (!t.disponivel) { <p class="text-xs mt-1" style="color: var(--cmm-warning);">O Drive não está configurado (pasta raiz) — a ferramenta não fará nada até configurar na aba Configuração.</p> } }
                    </div>
                  }

                  @if (n.tipo === 'opcoes') {
                    <div class="node-body space-y-2">
                      <div><label class="form-label" [attr.for]="'nvo-' + n.id">Guardar a escolha em (opcional)</label>
                        <input class="form-input" [id]="'nvo-' + n.id" placeholder="ambiente" [ngModel]="n.variavel ?? ''" (ngModelChange)="editarNo(i, (x) => (x.variavel = $event))" /></div>
                      <p class="form-label !mb-0">Opções (numeradas automaticamente)</p>
                      @for (o of n.opcoes ?? []; track $index; let j = $index) {
                        <div class="opt">
                          <span class="opt-n">{{ j + 1 }}</span>
                          <input class="form-input" maxlength="60" [attr.aria-label]="'Texto da opção ' + (j + 1)" [ngModel]="o.rotulo" (ngModelChange)="editarNo(i, (x) => (x.opcoes![j].rotulo = $event))" placeholder="Texto da opção" />
                          <select class="form-input" [attr.aria-label]="'Destino da opção ' + (j + 1)" [ngModel]="o.proximo" (ngModelChange)="editarNo(i, (x) => (x.opcoes![j].proximo = $event))">
                            <option [ngValue]="null">→ escolha o destino</option>
                            @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">→ {{ d.rotulo }}</option> }
                          </select>
                          <button type="button" class="btn btn-ghost btn-sm !px-2" (click)="editarNo(i, (x) => x.opcoes!.splice(j, 1))" [disabled]="(n.opcoes?.length ?? 0) <= 2" aria-label="Remover opção">✕</button>
                        </div>
                      }
                      <button type="button" class="btn btn-secondary btn-sm" (click)="editarNo(i, (x) => x.opcoes!.push({ rotulo: '', proximo: null }))" [disabled]="(n.opcoes?.length ?? 0) >= 8">+ Opção</button>
                    </div>
                  }

                  @if (n.tipo === 'mensagem' || n.tipo === 'pergunta' || n.tipo === 'arquivos' || n.tipo === 'acao') {
                    <footer class="node-next">
                      <span>Depois →</span>
                      <select class="form-input" [attr.aria-label]="'Próximo bloco depois de ' + n.titulo" [ngModel]="n.proximo ?? null" (ngModelChange)="editarNo(i, (x) => (x.proximo = $event))">
                        <option [ngValue]="null">escolha o próximo bloco</option>
                        @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">{{ d.rotulo }}</option> }
                      </select>
                    </footer>
                  } @else if (n.tipo === 'encaminhar' || n.tipo === 'fim') {
                    <footer class="node-next"><span>{{ n.tipo === 'fim' ? 'Volta ao menu inicial.' : 'O fluxo termina aqui (atendente assume).' }}</span></footer>
                  }
                </article>
                @if (i < f.nos.length - 1) { <div class="node-link" aria-hidden="true"></div> }
              }

              <div class="panel panel-pad mt-4">
                <p class="text-sm font-semibold mb-2">Adicionar bloco</p>
                <div class="flex flex-wrap gap-2">
                  @for (t of tipos; track t.tipo) { <button type="button" class="btn btn-secondary btn-sm" [title]="t.ajuda" (click)="addNo(t.tipo)" [disabled]="f.nos.length >= 40">{{ t.icone }} {{ t.label }}</button> }
                </div>
              </div>
            </section>

            <!-- Testar -->
            <aside class="panel test 2xl:sticky 2xl:top-20">
              <div class="panel-pad" style="border-bottom: 1px solid var(--cmm-border);">
                <h3 class="font-semibold">Testar este fluxo</h3>
                <p class="text-xs" style="color: var(--cmm-muted);">Roda o rascunho sem enviar nada a clientes nem mexer no Drive.</p>
              </div>
              <div class="test-chat" #chat>
                @for (m of log(); track $index) { <div class="bubble" [class.bubble-user]="m.de === 'cliente'" [class.bubble-bot]="m.de === 'bot'" [class.bubble-fx]="m.de === 'efeito'">{{ m.texto }}</div> }
                @if (!log().length) { <p class="text-sm" style="color: var(--cmm-muted);">Clique em “Começar” para ver a primeira mensagem.</p> }
              </div>
              @if (erros().length) { <ul class="test-err" role="alert">@for (e of erros(); track e) { <li>{{ e }}</li> }</ul> }
              <form class="test-in" (ngSubmit)="enviar()">
                @if (!estado() && !terminou()) { <button type="button" class="btn btn-primary btn-sm w-full" (click)="comecar()" [disabled]="carregando()">Começar</button> }
                @else if (terminou()) { <button type="button" class="btn btn-secondary btn-sm w-full" (click)="comecar()">Testar de novo</button> }
                @else {
                  <input class="form-input" name="tx" [(ngModel)]="texto" placeholder="Resposta do cliente…" autocomplete="off" aria-label="Resposta do cliente" />
                  <button type="submit" class="btn btn-primary btn-sm" [disabled]="carregando()">Enviar</button>
                }
              </form>
            </aside>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; }
    .flow-card { display: flex; flex-direction: column; align-items: flex-start; width: 100%; text-align: left; padding: .75rem .9rem; border-radius: .9rem; border: 1.5px solid var(--cmm-border); background: var(--cmm-panel); cursor: pointer; color: var(--cmm-ink); transition: border-color 200ms, background-color 200ms; }
    .flow-fixed { cursor: default; background: color-mix(in srgb, var(--cmm-border) 35%, var(--cmm-panel)); }
    .flow-card:not(.flow-fixed):hover { border-color: color-mix(in srgb, var(--cmm-accent) 50%, var(--cmm-border)); }
    .flow-on { border-color: var(--cmm-accent); background: var(--cmm-accent-soft); }
    .node { border: 1.5px solid var(--cmm-border); border-left-width: 5px; border-radius: 1rem; background: var(--cmm-panel); overflow: hidden; }
    .node[data-tipo='pergunta'] { border-left-color: #3b82f6; } .node[data-tipo='opcoes'] { border-left-color: #8b5cf6; }
    .node[data-tipo='arquivos'] { border-left-color: #f59e0b; } .node[data-tipo='acao'] { border-left-color: #10b981; }
    .node[data-tipo='encaminhar'] { border-left-color: var(--cmm-accent); } .node[data-tipo='fim'] { border-left-color: var(--cmm-muted); }
    .node[data-tipo='mensagem'] { border-left-color: #64748b; }
    .node-head { display: flex; align-items: center; gap: .5rem; padding: .6rem .8rem; flex-wrap: wrap; }
    .node-ico { font-size: 1.15rem; }
    .node-title { flex: 1 1 10rem; min-width: 0; border: 1px solid transparent; background: transparent; font-weight: 700; font-size: .95rem; padding: .25rem .4rem; border-radius: .5rem; color: var(--cmm-ink); }
    .node-title:hover, .node-title:focus { border-color: var(--cmm-border); background: var(--cmm-bg, var(--cmm-panel)); outline: none; }
    .node-actions { margin-left: auto; display: inline-flex; }
    .node-body { padding: .25rem 1rem 1rem; }
    .node-next { display: flex; align-items: center; gap: .6rem; padding: .6rem 1rem; border-top: 1px dashed var(--cmm-border); font-size: .8125rem; font-weight: 600; color: var(--cmm-muted); background: color-mix(in srgb, var(--cmm-border) 22%, var(--cmm-panel)); }
    .node-next select { max-width: 22rem; }
    .node-link { width: 2px; height: 1.1rem; margin: 0 0 0 2rem; background: var(--cmm-border); }
    .opt { display: grid; grid-template-columns: 1.8rem 1fr 1fr auto; gap: .5rem; align-items: center; }
    @media (max-width: 700px) { .opt { grid-template-columns: 1.8rem 1fr auto; } .opt select { grid-column: 2 / 4; } }
    .opt-n { width: 1.6rem; height: 1.6rem; border-radius: 99px; display: grid; place-items: center; font-weight: 800; font-size: .75rem; background: var(--cmm-accent-soft); color: var(--cmm-accent); }
    .switch-row { display: flex; align-items: center; font-size: .875rem; font-weight: 600; } .switch-row small { display: block; font-weight: 400; color: var(--cmm-muted); }
    .switch { flex-shrink: 0; width: 2.9rem; height: 1.6rem; border-radius: 99px; border: none; background: var(--cmm-border); position: relative; cursor: pointer; transition: background-color 300ms; }
    .switch-on { background: var(--cmm-accent); }
    .switch-knob { position: absolute; top: 3px; left: 3px; width: 1.2rem; height: 1.2rem; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); transition: transform 400ms var(--ease-out-expo); }
    .switch-on .switch-knob { transform: translateX(1.3rem); }
    .test-chat { display: flex; flex-direction: column; gap: .45rem; padding: 1rem; min-height: 12rem; max-height: 28rem; overflow-y: auto; }
    .bubble { max-width: 90%; padding: .5rem .8rem; border-radius: 1rem; font-size: .8125rem; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere; animation: bubble-in 380ms var(--ease-out-expo) both; }
    @keyframes bubble-in { from { opacity: 0; transform: translateY(8px) scale(.97); } to { opacity: 1; transform: none; } }
    .bubble-user { align-self: flex-end; background: var(--cmm-ink); color: var(--cmm-panel); border-bottom-right-radius: .3rem; }
    .bubble-bot { align-self: flex-start; background: color-mix(in srgb, var(--cmm-success) 13%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-success) 25%, transparent); border-bottom-left-radius: .3rem; }
    .bubble-fx { align-self: center; background: var(--cmm-accent-soft); color: var(--cmm-accent); font-weight: 700; font-size: .72rem; border-radius: 99px; }
    .test-in { display: flex; gap: .5rem; padding: .75rem 1rem 1rem; border-top: 1px solid var(--cmm-border); }
    .test-err { margin: 0 1rem .5rem; padding: .6rem .9rem .6rem 1.6rem; list-style: disc; font-size: .78rem; font-weight: 600; color: var(--cmm-danger); background: color-mix(in srgb, var(--cmm-danger) 8%, var(--cmm-panel)); border-radius: .75rem; }
  `],
})
export class IaFluxosComponent {
  private readonly api = inject(IaApiService);
  private readonly modal = inject(ModalService);

  fluxos = input.required<IaFlow[]>();
  ferramentas = input<IaTool[]>([]);
  mudou = output<IaFlow[]>();

  tipos = TIPOS;
  indice = input.required<number>();
  sel = computed(() => this.indice());
  atual = computed(() => this.fluxos()[this.sel()] ?? this.fluxos()[0] ?? null);

  // teste
  estado = signal<IaFlowState | null>(null);
  log = signal<Array<{ de: 'cliente' | 'bot' | 'efeito'; texto: string }>>([]);
  erros = signal<string[]>([]);
  terminou = signal(false);
  carregando = signal(false);
  texto = '';

  info(t: Tipo) { return TIPOS.find((x) => x.tipo === t)!; }
  ferramenta(k?: string) { return this.ferramentas().find((t) => t.key === k); }
  opcaoUsada(n: number): boolean { return this.fluxos().some((f, i) => i !== this.sel() && f.ativo && f.menuOpcao === n); }
  destinos(excluirId: string) {
    return (this.atual()?.nos ?? []).map((n, i) => ({ id: n.id, rotulo: `${i + 1}. ${this.info(n.tipo).icone} ${n.titulo || this.info(n.tipo).label}` })).filter((d) => d.id !== excluirId);
  }

  private emit(fn: (fs: IaFlow[]) => void): void {
    const copia: IaFlow[] = JSON.parse(JSON.stringify(this.fluxos()));
    fn(copia);
    this.mudou.emit(copia);
  }
  editar(fn: (f: IaFlow) => void): void { const i = this.sel(); this.emit((fs) => fn(fs[i])); this.zerarTeste(); }
  editarNo(idx: number, fn: (n: IaNode) => void): void { this.editar((f) => fn(f.nos[idx])); }

  async excluir(): Promise<void> {
    const f = this.atual();
    if (!f || !(await this.modal.confirm('Excluir este fluxo?', `“${f.nome}” sai do menu dos clientes quando você publicar. Quem estiver nele volta ao menu.`, 'Excluir'))) return;
    const i = this.sel();
    this.emit((fs) => fs.splice(i, 1));
    this.zerarTeste();
  }

  addNo(tipo: Tipo): void {
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
  }
  mover(i: number, d: number): void { this.editar((f) => { const j = i + d; if (j < 0 || j >= f.nos.length) return; [f.nos[i], f.nos[j]] = [f.nos[j], f.nos[i]]; }); }
  async removerNo(i: number): Promise<void> {
    const n = this.atual()?.nos[i];
    if (!n || !(await this.modal.confirm('Excluir este bloco?', `“${n.titulo}” será removido e os caminhos que levavam a ele ficam sem destino.`, 'Excluir'))) return;
    this.editar((f) => {
      const [rm] = f.nos.splice(i, 1);
      for (const x of f.nos) {
        if (x.proximo === rm.id) x.proximo = null;
        x.opcoes?.forEach((o) => { if (o.proximo === rm.id) o.proximo = null; });
      }
    });
  }

  // ───── teste
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
