import { Component, HostListener, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../shared/services/modal.service';
import { HintComponent } from '../../shared/components/hint.component';
import { IconComponent, IconName } from '../../shared/components/icon.component';
import { IaApiService, IaFlow, IaFlowState, IaNode, IaTool } from './ia-api.service';

type Tipo = IaNode['tipo'];

type Grupo = 'Falar' | 'Receber do cliente' | 'Fazer' | 'Terminar';

/** Cada tipo é um modelo: já nasce com o formato certo (o que pergunta, quantas opções, o que faz sozinho). */
const TIPOS: Array<{ tipo: Tipo; grupo: Grupo; label: string; icon: IconName; ajuda: string; regra: string }> = [
  { tipo: 'mensagem', grupo: 'Falar', label: 'Mensagem', icon: 'mensagem', ajuda: 'Informa algo e segue sozinho.', regra: 'Sem requisitos. Segue sozinha para a próxima etapa.' },
  { tipo: 'confirmacao', grupo: 'Falar', label: 'Confirmação', icon: 'confirmacao', ajuda: 'Pergunta com Sim ou Não.', regra: 'Sempre duas respostas, Sim e Não, cada uma com o seu caminho.' },
  { tipo: 'opcoes', grupo: 'Receber do cliente', label: 'Escolha', icon: 'escolha', ajuda: 'Menu numerado, cada opção segue um caminho.', regra: 'De 2 a 8 opções, cada uma com o seu caminho.' },
  { tipo: 'pergunta', grupo: 'Receber do cliente', label: 'Pergunta', icon: 'pergunta', ajuda: 'Espera uma resposta escrita e guarda.', regra: 'Dê um nome à resposta. Use “nome” para o nome do cliente.' },
  { tipo: 'arquivos', grupo: 'Receber do cliente', label: 'Solicitação', icon: 'arquivo', ajuda: 'Pede arquivos; pode guardar no Drive.', regra: 'Para guardar no Drive, o nome do cliente precisa ter sido perguntado antes.' },
  { tipo: 'acao', grupo: 'Fazer', label: 'Ferramenta', icon: 'ferramenta', ajuda: 'Faz algo sozinho, como salvar no Drive.', regra: 'Criar a pasta pede o nome antes. Salvar as respostas pede a pasta criada antes.' },
  { tipo: 'encaminhar', grupo: 'Terminar', label: 'Encaminhar', icon: 'atendente', ajuda: 'Passa a um atendente e termina.', regra: 'Termina o fluxo: nada pode vir depois.' },
  { tipo: 'fim', grupo: 'Terminar', label: 'Encerrar', icon: 'fim', ajuda: 'Termina e volta ao menu.', regra: 'Termina o fluxo: nada pode vir depois.' },
];
const GRUPOS: Grupo[] = ['Falar', 'Receber do cliente', 'Fazer', 'Terminar'];

const DICAS = {
  ativo: 'Desativado, o fluxo some do menu dos clientes, mas continua salvo para você ligar depois.',
  menu: 'O número que o cliente digita no menu inicial para entrar neste fluxo. Vai de 6 a 9, e cada número serve a um único fluxo ativo.',
  texto: 'É a mensagem que o cliente recebe no WhatsApp. Escreva {nome} (ou {outra_resposta}) para citar algo que ele já respondeu. Só funciona para respostas dadas ANTES desta etapa.',
  textoFinal: 'Opcional. Se ficar vazio, o bot usa a mensagem padrão.',
  variavel: 'O nome interno da resposta: letras minúsculas, números e _. Use “nome” para o nome do cliente. Ele é gravado no cadastro e é exigido para guardar arquivos no Drive.',
  conferir: 'Nome de pessoa recusa respostas que não parecem um nome e pede de novo.',
  minimo: 'Quantos arquivos o cliente precisa enviar antes de o “OK” valer.',
  guardar: 'Os arquivos só são guardados se a pasta do cliente existir. Aqui você cria a pasta (ou reaproveita a que já existe) ou usa a pasta criada em uma etapa anterior. Criar a pasta exige o nome do cliente perguntado antes.',
  pasta: 'Criar a pasta se faltar: procura a pasta do cliente e cria se não achar. Só usar se já existir: nunca cria nada.',
  confirmacao: 'Sim e Não são fixos. Escolha para onde cada resposta leva o cliente.',
  opcoes: 'De 2 a 8 opções. O número é automático e o bot também aceita 0 (voltar) e 10 (recomeçar).',
  proximo: 'Para onde o cliente vai quando esta etapa termina. Se for a etapa logo abaixo na lista, o fluxo anda sozinho.',
  ferramenta: 'Criar a pasta precisa do nome do cliente perguntado antes. Salvar as respostas precisa da pasta criada antes.',
  variaveis: 'Cada Pergunta (ou Escolha com “Guardar como”) cria uma variável. Dentro de qualquer texto, escreva-a entre chaves para o bot trocar pelo que o cliente respondeu.',
  picker: 'Cada tipo já vem pronto. Algumas etapas dependem de outras: o aviso em âmbar mostra o que ainda falta antes deste ponto.',
} as const;

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

interface Ctx { vars: Set<string>; pasta: boolean }
interface Variavel { nome: string; origem: string; usavel: boolean }
const criaPasta = (n: IaNode): boolean => (n.tipo === 'acao' && n.acao === 'drive_criar_pasta') || (n.tipo === 'arquivos' && n.armazenar === 'drive');
const guardaVar = (n: IaNode): string | null => ((n.tipo === 'pergunta' || n.tipo === 'opcoes' || n.tipo === 'confirmacao') && n.variavel ? n.variavel : null);
const sucessores = (n: IaNode): Array<string | null | undefined> =>
  n.tipo === 'opcoes' || n.tipo === 'confirmacao' ? (n.opcoes ?? []).map((o) => o.proximo) : n.tipo === 'encaminhar' || n.tipo === 'fim' ? [] : [n.proximo];

/** Mesma análise do servidor: o que já aconteceu, em TODOS os caminhos que chegam a cada etapa. */
function contextos(f: IaFlow | null): Map<string, Ctx> {
  const ent = new Map<string, Ctx>();
  if (!f?.nos.length) return ent;
  const por = new Map(f.nos.map((n) => [n.id, n]));
  ent.set(f.nos[0].id, { vars: new Set(), pasta: false });
  const fila = [f.nos[0].id];
  for (let g = 0; fila.length && g < 5000; g++) {
    const n = por.get(fila.shift()!)!;
    const e = ent.get(n.id)!;
    const saida: Ctx = { vars: new Set(e.vars), pasta: e.pasta || criaPasta(n) };
    const v = guardaVar(n);
    if (v) saida.vars.add(v);
    for (const s of sucessores(n)) {
      if (!s || !por.has(s)) continue;
      const cur = ent.get(s);
      if (!cur) { ent.set(s, { vars: new Set(saida.vars), pasta: saida.pasta }); fila.push(s); continue; }
      const vars = new Set([...cur.vars].filter((x) => saida.vars.has(x)));
      const pasta = cur.pasta && saida.pasta;
      if (vars.size !== cur.vars.size || pasta !== cur.pasta) { ent.set(s, { vars, pasta }); fila.push(s); }
    }
  }
  return ent;
}

@Component({
  selector: 'app-ia-fluxos',
  standalone: true,
  imports: [FormsModule, IconComponent, HintComponent],
  template: `
    @if (atual(); as f) {
      <div class="fx">
        <section class="fx-bar">
          <button type="button" role="switch" class="switch" [class.switch-on]="f.ativo" [attr.aria-checked]="f.ativo" aria-label="Fluxo ativo no menu" (click)="editar((x) => (x.ativo = !x.ativo))"><span class="switch-knob"></span></button>
          <span class="fx-state">{{ f.ativo ? 'Ativo' : 'Desativado' }}</span><app-hint [texto]="dicas.ativo" />
          <label class="fx-opt" title="Número que o cliente digita no menu inicial">no menu como <app-hint [texto]="dicas.menu" />
            <select class="form-input bar-sel" aria-label="Opção no menu" [ngModel]="f.menuOpcao" (ngModelChange)="editar((x) => (x.menuOpcao = $event === null ? null : +$event))">
              <option [ngValue]="null">—</option>
              @for (n of [6, 7, 8, 9]; track n) { <option [ngValue]="n" [disabled]="opcaoUsada(n)">{{ n }}{{ opcaoUsada(n) ? ' (em uso)' : '' }}</option> }
            </select></label>
          <span class="flex-1"></span>
          <button type="button" class="btn btn-ghost btn-sm inline-flex items-center gap-1.5" (click)="varDialogo.set(true)" title="Ver as respostas do cliente que o fluxo vai guardando"><app-icon name="variavel" [size]="15" />Variáveis</button>
          <button type="button" class="icon-btn" aria-label="Nome, descrição e excluir o fluxo" title="Nome, descrição e excluir" (click)="config.set(true)"><app-icon name="ajustes" /></button>
          <button type="button" class="btn btn-accent btn-sm inline-flex items-center gap-1.5" (click)="abrirTeste()"><app-icon name="play" [size]="13" />Testar</button>
        </section>

        <ol class="tl" aria-label="Etapas do fluxo, na ordem em que o cliente passa por elas">
          @for (n of f.nos; track n.id; let i = $index) {
            <li class="tl-li">
              @if (i > 0) {
                <button type="button" class="tl-add" (click)="picker.set(i)" [disabled]="f.nos.length >= 40" [attr.aria-label]="'Inserir etapa antes da etapa ' + (i + 1)" title="Inserir etapa aqui"><app-icon name="mais" [size]="13" [stroke]="2.4" /></button>
              }
              <div class="tl-step" [attr.data-tipo]="n.tipo" [class.tl-warn]="incompleto(n)" role="button" tabindex="0" (click)="noAberto.set(i)" (keydown.enter)="noAberto.set(i)" [attr.aria-label]="'Editar etapa ' + (i + 1) + ': ' + n.titulo">
                <span class="tl-ico"><app-icon [name]="info(n.tipo).icon" [size]="18" /></span>
                <span class="tl-main">
                  <span class="tl-top"><b class="tl-title">{{ n.titulo || 'Sem nome' }}</b>@if (n.titulo !== info(n.tipo).label) { <span class="tl-kind">{{ info(n.tipo).label }}</span> }@if (i === 0) { <span class="tl-kind tl-start">início</span> }</span>
                  <span class="tl-sum">{{ resumo(n) }}</span>
                  @if (ramos(n, f).length) { <span class="tl-ramos">@for (r of ramos(n, f); track $index) { <span class="tl-ramo" [class.tl-ramo-bad]="r.ruim">{{ r.texto }}</span> }</span> }
                </span>
                @if (faltas(n).length) { <span class="tl-flag"><app-hint tom="aviso" rotulo="O que falta nesta etapa" [texto]="'Falta nesta etapa:\n• ' + faltas(n).join('\n• ')" /></span> }
                <span class="tl-acts">
                  <button type="button" class="icon-btn icon-btn-sm" aria-label="Mover para cima" title="Mover para cima" [disabled]="i === 0" (click)="mover(i, -1, false); $event.stopPropagation()"><app-icon name="cima" [size]="15" /></button>
                  <button type="button" class="icon-btn icon-btn-sm" aria-label="Mover para baixo" title="Mover para baixo" [disabled]="i === f.nos.length - 1" (click)="mover(i, 1, false); $event.stopPropagation()"><app-icon name="baixo" [size]="15" /></button>
                  <button type="button" class="icon-btn icon-btn-sm icon-danger" aria-label="Excluir etapa" title="Excluir" (click)="removerNo(i); $event.stopPropagation()"><app-icon name="lixeira" [size]="15" /></button>
                </span>
              </div>
            </li>
          }
          <li class="tl-li">
            <button type="button" class="tl-end" (click)="picker.set(f.nos.length)" [disabled]="f.nos.length >= 40"><app-icon name="mais" [size]="15" [stroke]="2.4" />{{ f.nos.length ? 'Adicionar etapa' : 'Criar a primeira etapa' }}</button>
          </li>
        </ol>
      </div>

      <!-- Escolher o tipo da nova etapa -->
      @if (picker() !== null) {
        <div class="dlg-backdrop" (click)="picker.set(null)" aria-hidden="true"></div>
        <div class="dlg dlg-wide" role="dialog" aria-modal="true" aria-label="Escolha o tipo da etapa">
          <header class="dlg-head"><h3>O que acontece nesta etapa? <app-hint [texto]="dicas.picker" /></h3><button type="button" class="icon-btn icon-btn-sm" (click)="picker.set(null)" aria-label="Fechar"><app-icon name="fechar" /></button></header>
          <div class="pick-grid">
            @for (g of grupos; track g) {
              <p class="pick-grupo">{{ g }}</p>
              @for (t of tiposDo(g); track t.tipo) {
                <div class="pick-wrap">
                  <button type="button" class="pick" [class.pick-warn]="faltaParaTipo(t.tipo, picker()!)" [attr.data-tipo]="t.tipo" (click)="addNo(t.tipo, picker()!)">
                    <span class="tl-ico"><app-icon [name]="t.icon" [size]="18" /></span>
                    <span><b>{{ t.label }}</b><small>{{ t.ajuda }}</small>@if (faltaParaTipo(t.tipo, picker()!); as falta) { <small class="pick-falta">Falta: {{ falta }}</small> }</span>
                  </button>
                  <span class="pick-hint"><app-hint [texto]="t.regra" [tom]="faltaParaTipo(t.tipo, picker()!) ? 'aviso' : 'info'" rotulo="Regras deste tipo" /></span>
                </div>
              }
            }
          </div>
        </div>
      }

      <!-- Variáveis do fluxo -->
      @if (varDialogo()) {
        <div class="dlg-backdrop" (click)="varDialogo.set(false)" aria-hidden="true"></div>
        <div class="dlg dlg-wide" role="dialog" aria-modal="true" aria-label="Variáveis do fluxo">
          <header class="dlg-head"><h3>Respostas que o fluxo guarda <app-hint [texto]="dicas.variaveis" /></h3><button type="button" class="icon-btn icon-btn-sm" (click)="varDialogo.set(false)" aria-label="Fechar"><app-icon name="fechar" /></button></header>
          @if (resumoVariaveis().length) {
            <ul class="vlist">
              @for (v of resumoVariaveis(); track v.nome) {
                <li>
                  <code>{{ '{' + v.nome + '}' }}</code>
                  <span class="vl-main"><b>{{ v.origem }}</b>
                    <small>{{ v.usos.length ? 'Usada em: ' + v.usos.join(', ') : 'Ainda não usada em nenhum texto' }}</small>
                    @if (v.cedo.length) { <small class="vl-bad">Citada antes de ser respondida em: {{ v.cedo.join(', ') }}</small> }
                  </span>
                </li>
              }
            </ul>
          } @else { <p class="text-sm" style="color: var(--cmm-muted);">Ainda não há respostas guardadas. Adicione uma Pergunta ou uma Escolha com “Guardar como” para criar variáveis.</p> }
          <p class="text-xs mt-3" style="color: var(--cmm-muted);">A ordem das etapas decide o que existe em cada ponto: uma variável só pode ser citada depois de respondida.</p>
        </div>
      }

      <!-- Nome, descrição e excluir -->
      @if (config()) {
        <div class="dlg-backdrop" (click)="config.set(false)" aria-hidden="true"></div>
        <div class="dlg" role="dialog" aria-modal="true" aria-label="Configurar o fluxo">
          <header class="dlg-head"><h3>Sobre este fluxo</h3><button type="button" class="icon-btn icon-btn-sm" (click)="config.set(false)" aria-label="Fechar"><app-icon name="fechar" /></button></header>
          <div class="space-y-3">
            <div><label class="form-label" for="fl-nome">Nome (o cliente vê no menu)</label>
              <input id="fl-nome" class="form-input" maxlength="40" [ngModel]="f.nome" (ngModelChange)="editar((x) => (x.nome = $event))" /></div>
            <div><label class="form-label" for="fl-desc">Descrição (só para você)</label>
              <input id="fl-desc" class="form-input" maxlength="200" [ngModel]="f.descricao ?? ''" (ngModelChange)="editar((x) => (x.descricao = $event))" /></div>
          </div>
          <footer class="dlg-foot">
            <button type="button" class="btn btn-ghost btn-sm inline-flex items-center gap-1.5" style="color: var(--cmm-danger);" (click)="excluir()"><app-icon name="lixeira" [size]="15" />Excluir fluxo</button>
            <button type="button" class="btn btn-primary btn-sm" (click)="config.set(false)">Pronto</button>
          </footer>
        </div>
      }

      <!-- Editar etapa (painel lateral) -->
      @if (noAberto() !== null && f.nos[noAberto()!]; as n) {
        <div class="sheet-backdrop" (click)="noAberto.set(null)" aria-hidden="true"></div>
        <aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="no-titulo" style="--sheet-w: 34rem;">
          <header class="sheet-head">
            <span class="tl-ico" [attr.data-tipo]="n.tipo"><app-icon [name]="info(n.tipo).icon" [size]="18" /></span>
            <input id="no-titulo" class="node-title" maxlength="60" aria-label="Nome da etapa" [ngModel]="n.titulo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.titulo = $event))" />
            <span class="badge badge-neutral">{{ info(n.tipo).label }}</span>
            <button type="button" class="icon-btn icon-btn-sm" (click)="noAberto.set(null)" aria-label="Fechar"><app-icon name="fechar" /></button>
          </header>
          <div class="sheet-body space-y-4">
            @if (faltas(n).length) {
              <div class="faltas" role="status"><b><app-icon name="alerta" [size]="15" />O que falta aqui</b><ul>@for (m of faltas(n); track m) { <li>{{ m }}</li> }</ul></div>
            }
                        @if (n.tipo !== 'acao') {
              <div>
                <div class="flex items-center justify-between gap-2 mb-1"><label class="form-label !mb-0" for="nt">{{ n.tipo === 'encaminhar' ? 'Mensagem ao encaminhar' : n.tipo === 'fim' ? 'Mensagem final' : 'O que o bot diz' }} <app-hint [texto]="n.tipo === 'encaminhar' || n.tipo === 'fim' ? dicas.textoFinal : dicas.texto" /></label>
                  <button type="button" class="var-btn" [class.var-btn-on]="varPainel()" (click)="varPainel.update(v => !v)" [attr.aria-expanded]="varPainel()"><app-icon name="variavel" [size]="14" />Variáveis</button></div>
                <div class="ta-wrap">
                  <textarea #nta id="nt" class="form-input" rows="5" maxlength="1000" [ngModel]="n.texto ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.texto = $event))"
                    (input)="sugerir(nta, n)" (click)="sugerir(nta, n)" (keyup.arrowleft)="sugerir(nta, n)" (keyup.arrowright)="sugerir(nta, n)" (keydown)="tecla($event, nta)" (blur)="fecharSug()"
                    placeholder="Escreva a mensagem. Digite { para inserir uma resposta do cliente."></textarea>
                  @if (sug(); as sg) {
                    <ul class="sug" role="listbox" aria-label="Respostas disponíveis">
                      @for (v of sg.lista; track v.nome; let k = $index) {
                        <li role="option" [attr.aria-selected]="k === sg.idx" [class.sug-on]="k === sg.idx" (mousedown)="$event.preventDefault(); escolherSug(nta, v.nome)">
                          <code>{{ '{' + v.nome + '}' }}</code><small>{{ v.origem }}</small>
                        </li>
                      }
                    </ul>
                  }
                </div>
                @if (varPainel()) {
                  <div class="vars-panel">
                    <p class="vars-t">Respostas que você já tem neste ponto. Clique para inserir no texto.</p>
                    <div class="vars-chips">
                      @for (v of variaveisEm(n); track v.nome) {
                        @if (v.usavel) { <button type="button" class="var-chip" (click)="inserirVar(nta, v.nome)"><code>{{ '{' + v.nome + '}' }}</code><small>{{ v.origem }}</small></button> }
                      }
                    </div>
                    @if (naoUsaveis(n).length) {
                      <p class="vars-t vars-muted">Ainda não respondidas aqui (coloque a pergunta antes para usar):</p>
                      <div class="vars-chips">@for (v of naoUsaveis(n); track v.nome) { <span class="var-chip var-off"><code>{{ '{' + v.nome + '}' }}</code><small>{{ v.origem }}</small></span> }</div>
                    }
                  </div>
                }
              </div>
            }

            @if (n.tipo === 'pergunta') {
              <div><label class="form-label" for="nv">Guardar a resposta como <app-hint [texto]="dicas.variavel" /></label>
                <input class="form-input" id="nv" placeholder="ex.: nome, bairro" [ngModel]="n.variavel ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.variavel = $event))" />
                <p class="text-xs mt-1" style="color: var(--cmm-muted);">Depois você pode citar a resposta nos textos escrevendo {{ '{' }}{{ n.variavel || 'nome' }}{{ '}' }}.</p></div>
              <details class="adv">
                <summary><app-icon name="ajustes" [size]="14" />Avançado</summary>
                <label class="form-label" for="nval">Conferir a resposta como <app-hint [texto]="dicas.conferir" /></label>
                <select class="form-input" id="nval" [ngModel]="n.validacao ?? 'texto'" (ngModelChange)="editarNo(noAberto()!, (x) => (x.validacao = $event))"><option value="texto">Texto livre</option><option value="nome">Nome de pessoa</option></select>
              </details>
            }

            @if (n.tipo === 'arquivos') {
              <div>
                <label class="form-label" for="nd">Onde guardar o que o cliente enviar <app-hint [texto]="dicas.guardar" /></label>
                <select class="form-input" id="nd" [ngModel]="n.armazenar ?? ''" (ngModelChange)="armazenar($event)">
                  <option value="">Usar a pasta criada numa etapa anterior</option>
                  <option value="drive">Guardar no Google Drive</option>
                </select>
                @if (n.armazenar === 'drive') {
                  <div class="flex items-center gap-2 mt-2"><div class="pasta-seg" role="radiogroup" aria-label="Pasta do cliente no Drive">
                    <button type="button" role="radio" [attr.aria-checked]="(n.pasta ?? 'criar') === 'criar'" [class.on]="(n.pasta ?? 'criar') === 'criar'" (click)="editarNo(noAberto()!, (x) => (x.pasta = 'criar'))">Criar a pasta se faltar</button>
                    <button type="button" role="radio" [attr.aria-checked]="n.pasta === 'existente'" [class.on]="n.pasta === 'existente'" (click)="editarNo(noAberto()!, (x) => (x.pasta = 'existente'))">Só usar se já existir</button>
                  </div><app-hint [texto]="dicas.pasta" /></div>
                  <p class="text-xs mt-2" style="color: var(--cmm-muted);">{{ n.pasta === 'existente' ? 'Procura a pasta do cliente. Se não existir, nada é criado e os arquivos não são guardados.' : 'Procura a pasta do cliente; se não existir, cria (ano/mês/ANDAMENTO). Precisa do nome do cliente, perguntado antes com a variável “nome”.' }}</p>
                }
              </div>
              <details class="adv">
                <summary><app-icon name="ajustes" [size]="14" />Avançado</summary>
                <label class="form-label" for="nm">Mínimo de arquivos antes do “OK” <app-hint [texto]="dicas.minimo" /></label>
                <input class="form-input !w-28" type="number" min="0" max="20" id="nm" [ngModel]="n.minimo ?? 0" (ngModelChange)="editarNo(noAberto()!, (x) => (x.minimo = +$event))" />
              </details>
            }

            @if (n.tipo === 'acao') {
              <div>
                <label class="form-label" for="na">Ferramenta <app-hint [texto]="dicas.ferramenta" /></label>
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

            @if (n.tipo === 'confirmacao') {
              <div class="space-y-2">
                <p class="form-label !mb-0">Caminho de cada resposta <app-hint [texto]="dicas.confirmacao" /></p>
                @for (o of n.opcoes ?? []; track $index; let j = $index) {
                  <div class="opt">
                    <span class="opt-n">{{ j + 1 }}</span>
                    <span class="opt-fix">{{ o.rotulo }}</span>
                    <select class="form-input" [attr.aria-label]="'Destino de ' + o.rotulo" [ngModel]="o.proximo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.opcoes![j].proximo = $event))">
                      <option [ngValue]="null">→ escolha o destino</option>
                      @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">→ {{ d.rotulo }}</option> }
                    </select>
                  </div>
                }
              </div>
            }

            @if (n.tipo === 'opcoes') {
              <div class="space-y-2">
                <p class="form-label !mb-0">Opções <app-hint [texto]="dicas.opcoes" /></p>
                @for (o of n.opcoes ?? []; track $index; let j = $index) {
                  <div class="opt">
                    <span class="opt-n">{{ j + 1 }}</span>
                    <input class="form-input" maxlength="60" [attr.aria-label]="'Texto da opção ' + (j + 1)" [ngModel]="o.rotulo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.opcoes![j].rotulo = $event))" placeholder="Texto da opção" />
                    <select class="form-input" [attr.aria-label]="'Destino da opção ' + (j + 1)" [ngModel]="o.proximo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.opcoes![j].proximo = $event))">
                      <option [ngValue]="null">→ escolha o destino</option>
                      @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">→ {{ d.rotulo }}</option> }
                    </select>
                    <button type="button" class="btn btn-ghost btn-sm !px-2" (click)="editarNo(noAberto()!, (x) => x.opcoes!.splice(j, 1))" [disabled]="(n.opcoes?.length ?? 0) <= 2" aria-label="Remover opção"><app-icon name="fechar" [size]="14" /></button>
                  </div>
                }
                <details class="adv mb-2"><summary><app-icon name="ajustes" [size]="14" />Avançado</summary>
                  <label class="form-label" for="nvo">Guardar a escolha como (opcional)</label>
                  <input class="form-input" id="nvo" placeholder="ex.: ambiente" [ngModel]="n.variavel ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.variavel = $event))" /></details>
                <button type="button" class="btn btn-secondary btn-sm inline-flex items-center gap-1.5" (click)="editarNo(noAberto()!, (x) => x.opcoes!.push({ rotulo: '', proximo: null }))" [disabled]="(n.opcoes?.length ?? 0) >= 8"><app-icon name="mais" [size]="14" />Opção</button>
              </div>
            }

            @if (n.tipo === 'mensagem' || n.tipo === 'pergunta' || n.tipo === 'arquivos' || n.tipo === 'acao') {
              <div class="next-box">
                <label class="form-label" for="nn">Depois desta etapa, ir para <app-hint [texto]="dicas.proximo" /></label>
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
            <button type="button" class="icon-btn icon-danger" (click)="removerNo(noAberto()!)" aria-label="Excluir esta etapa" title="Excluir esta etapa"><app-icon name="lixeira" /></button>
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
            <button type="button" class="icon-btn icon-btn-sm" (click)="testando.set(false)" aria-label="Fechar"><app-icon name="fechar" /></button>
          </header>
          <div class="sheet-body test-chat">
            @for (m of log(); track $index) { <div class="bubble" [class.bubble-user]="m.de === 'cliente'" [class.bubble-bot]="m.de === 'bot'" [class.bubble-fx]="m.de === 'efeito'">{{ m.texto }}</div> }
            @if (!log().length) { <p class="text-sm" style="color: var(--cmm-muted);">Clique em “Começar” para ver a primeira mensagem.</p> }
            @if (erros().length) { <ul class="test-err" role="alert">@for (e of erros(); track e) { <li>{{ e }}</li> }</ul> }
          </div>
          <form class="sheet-foot" (ngSubmit)="enviar($event)">
            @if (!estado() && !terminou()) { <button type="button" class="btn btn-primary btn-sm w-full" (click)="comecar()" [disabled]="carregando()">Começar</button> }
            @else if (terminou()) { <button type="button" class="btn btn-secondary btn-sm w-full" (click)="comecar()">Testar de novo</button> }
            @else {
              <input class="form-input flex-1" name="tx" [value]="texto()" (input)="texto.set($any($event.target).value)" placeholder="Resposta do cliente…" autocomplete="off" aria-label="Resposta do cliente" />
              <button type="submit" class="btn btn-primary btn-sm" [disabled]="carregando()">Enviar</button>
            }
          </form>
        </aside>
      }
    }
  `,
  styles: [`
    :host { display: block; }
    .fx { display: flex; flex-direction: column; gap: 1rem; max-width: 46rem; }
    .fx-bar { display: flex; align-items: center; gap: .6rem .9rem; flex-wrap: wrap; padding: .55rem .75rem; border: 1px solid var(--cmm-border); border-radius: 1rem; background: var(--cmm-panel); }
    .fx-state { font-size: .8125rem; font-weight: 600; }
    .fx-opt { display: inline-flex; align-items: center; gap: .45rem; font-size: .8125rem; color: var(--cmm-muted); }
    .bar-sel { width: 4.6rem; min-height: 0; padding-block: .25rem; }
    .icon-btn { display: inline-grid; place-items: center; width: 2.25rem; height: 2.25rem; border-radius: .65rem; border: 1px solid transparent; background: transparent; color: var(--cmm-muted); cursor: pointer; transition: background-color 180ms, color 180ms, border-color 180ms; }
    .icon-btn:hover:not(:disabled) { background: color-mix(in srgb, var(--cmm-border) 45%, transparent); color: var(--cmm-ink); }
    .icon-btn:disabled { opacity: .35; cursor: default; }
    .icon-btn-sm { width: 1.9rem; height: 1.9rem; border-radius: .5rem; }
    .icon-danger:hover:not(:disabled) { color: var(--cmm-danger); background: color-mix(in srgb, var(--cmm-danger) 10%, transparent); }
    /* linha do tempo */
    .tl { list-style: none; margin: 0; padding: 0; }
    .tl-li { position: relative; padding-left: 0; }
    .tl-li + .tl-li { padding-top: 1.6rem; }
    .tl-li + .tl-li::before { content: ''; position: absolute; left: 1.55rem; top: 0; height: 1.6rem; width: 2px; background: color-mix(in srgb, var(--cmm-muted) 40%, var(--cmm-border)); border-radius: 2px; }
    .tl-add { position: absolute; left: 1.05rem; top: .3rem; z-index: 2; width: 1.05rem; height: 1.05rem; border-radius: 99px; border: 1px solid var(--cmm-border); background: var(--cmm-panel); color: var(--cmm-muted); display: grid; place-items: center; cursor: pointer; opacity: 0; transform: scale(.7); transition: opacity 160ms, transform 200ms, background-color 160ms, color 160ms; padding: 0; }
    .tl-li:hover > .tl-add, .tl-add:focus-visible { opacity: 1; transform: scale(1); }
    .tl-add:hover { background: var(--cmm-accent); color: #fff; border-color: var(--cmm-accent); }
    @media (hover: none) { .tl-add { opacity: 1; transform: none; } }
    .tl-step { --tc: #64748b; display: flex; align-items: flex-start; gap: .85rem; padding: .8rem .9rem; border: 1px solid var(--cmm-border); border-radius: 1rem; background: var(--cmm-panel); cursor: pointer; transition: border-color 180ms, box-shadow 250ms, transform 250ms var(--ease-out-expo); }
    .tl-step:hover { border-color: color-mix(in srgb, var(--tc) 55%, var(--cmm-border)); box-shadow: var(--cmm-shadow-lift); }
    .tl-step:focus-visible { outline: 2px solid var(--cmm-accent); outline-offset: 2px; }
    .tl-warn { border-color: color-mix(in srgb, var(--cmm-warning) 65%, var(--cmm-border)); }
    .tl-ico { flex-shrink: 0; width: 2.4rem; height: 2.4rem; border-radius: .8rem; display: grid; place-items: center; color: var(--tc); background: color-mix(in srgb, var(--tc) 13%, var(--cmm-panel)); }
    [data-tipo='mensagem'] { --tc: #64748b; } [data-tipo='confirmacao'] { --tc: #10b981; } [data-tipo='opcoes'] { --tc: #8b5cf6; } [data-tipo='pergunta'] { --tc: #3b82f6; }
    [data-tipo='arquivos'] { --tc: #f59e0b; } [data-tipo='acao'] { --tc: #14b8a6; } [data-tipo='encaminhar'] { --tc: var(--cmm-accent); } [data-tipo='fim'] { --tc: #94a3b8; }
    .tl-step .tl-ico, .sheet-head .tl-ico, .pick .tl-ico { color: var(--tc); }
    .tl-main { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: .15rem; }
    .tl-top { display: flex; align-items: baseline; gap: .5rem; flex-wrap: wrap; }
    .tl-title { font-size: .95rem; }
    .tl-kind { font-size: .72rem; color: var(--cmm-muted); }
    .tl-start { font-weight: 700; color: var(--cmm-accent); text-transform: uppercase; letter-spacing: .05em; font-size: .65rem; }
    .tl-sum { font-size: .8125rem; color: var(--cmm-muted); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
    .tl-ramos { display: flex; flex-wrap: wrap; gap: .3rem; margin-top: .3rem; }
    .tl-ramo { font-size: .72rem; font-weight: 600; padding: .12rem .55rem; border-radius: 99px; background: color-mix(in srgb, var(--tc) 11%, var(--cmm-panel)); color: var(--cmm-ink); }
    .tl-ramo-bad { background: color-mix(in srgb, var(--cmm-warning) 16%, var(--cmm-panel)); color: var(--cmm-warning); }
    .tl-flag { color: var(--cmm-warning); display: inline-flex; margin-top: .45rem; }
    .tl-acts { display: flex; gap: .1rem; opacity: 0; transition: opacity 160ms; margin: -.1rem -.2rem 0 0; }
    .tl-step:hover .tl-acts, .tl-step:focus-within .tl-acts { opacity: 1; }
    @media (hover: none) { .tl-acts { opacity: 1; } }
    .tl-end { display: inline-flex; align-items: center; gap: .45rem; margin-left: .5rem; padding: .5rem .9rem; border: 1.5px dashed var(--cmm-border); border-radius: 99px; background: transparent; color: var(--cmm-muted); font-weight: 600; font-size: .85rem; cursor: pointer; transition: border-color 180ms, color 180ms, background-color 180ms; }
    .tl-end:hover:not(:disabled) { border-color: var(--cmm-accent); color: var(--cmm-accent); background: var(--cmm-accent-soft); }
    /* janelas centrais */
    .dlg-backdrop { position: fixed; inset: 0; z-index: 140; background: rgba(15,15,20,.45); backdrop-filter: blur(2px); animation: fade 200ms both; }
    .dlg { position: fixed; z-index: 141; left: 50%; top: 50%; transform: translate(-50%, -50%); width: min(26rem, calc(100vw - 2rem)); max-height: calc(100dvh - 2rem); overflow: auto; padding: 1.1rem 1.25rem 1.25rem; border-radius: 1.25rem; background: var(--cmm-panel); border: 1px solid var(--cmm-border); box-shadow: var(--cmm-shadow-lift); animation: dlg-in 260ms var(--ease-out-expo) both; }
    .dlg-wide { width: min(34rem, calc(100vw - 2rem)); }
    @keyframes fade { from { opacity: 0; } } @keyframes dlg-in { from { opacity: 0; transform: translate(-50%, -46%) scale(.97); } }
    .dlg-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .9rem; } .dlg-head h3 { font-weight: 700; font-size: 1.05rem; }
    .dlg-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 1.1rem; }
    .pick-grid { display: grid; grid-template-columns: 1fr 1fr; gap: .45rem; }
    .pick-grupo { grid-column: 1 / -1; font-size: .7rem; font-weight: 700; letter-spacing: .05em; text-transform: uppercase; color: var(--cmm-muted); margin: .5rem 0 0; }
    .pick-grupo:first-child { margin-top: 0; }
    .pick { display: flex; align-items: center; gap: .65rem; text-align: left; padding: .6rem .7rem; border: 1px solid var(--cmm-border); border-radius: .9rem; background: var(--cmm-panel); color: var(--cmm-ink); cursor: pointer; transition: border-color 160ms, background-color 160ms; }
    .pick:hover { border-color: var(--tc); background: color-mix(in srgb, var(--tc) 7%, var(--cmm-panel)); }
    .pick b { display: block; font-size: .875rem; } .pick small { display: block; font-size: .72rem; line-height: 1.3; color: var(--cmm-muted); }
    @media (max-width: 560px) { .pick-grid { grid-template-columns: 1fr; } .tl-step { padding: .7rem; } }
    .pick-wrap { position: relative; display: flex; } .pick-wrap .pick { flex: 1; padding-right: 2rem; }
    .pick-hint { position: absolute; right: .55rem; top: .55rem; }
    .pick-warn { border-color: color-mix(in srgb, var(--cmm-warning) 55%, var(--cmm-border)); }
    .pick-falta { color: var(--cmm-warning); font-weight: 600; margin-top: .2rem; }
    .faltas { padding: .7rem .9rem; border-radius: .9rem; background: color-mix(in srgb, var(--cmm-warning) 11%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-warning) 35%, var(--cmm-border)); font-size: .8125rem; }
    .faltas b { display: inline-flex; align-items: center; gap: .4rem; color: var(--cmm-warning); margin-bottom: .25rem; }
    .faltas ul { list-style: disc; padding-left: 1.2rem; display: grid; gap: .15rem; }
    .ta-wrap { position: relative; }
    .sug { position: absolute; left: 0; right: 0; top: calc(100% + .3rem); z-index: 30; list-style: none; margin: 0; padding: .3rem; max-height: 14rem; overflow: auto; border-radius: .9rem; background: var(--cmm-panel); border: 1px solid var(--cmm-border); box-shadow: var(--cmm-shadow-lift); }
    .sug li { display: flex; align-items: baseline; gap: .6rem; padding: .45rem .6rem; border-radius: .6rem; cursor: pointer; }
    .sug li small, .var-chip small, .vl-main small { font-size: .72rem; color: var(--cmm-muted); }
    .sug-on { background: var(--cmm-accent-soft); }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .8rem; font-weight: 700; color: var(--cmm-accent); }
    .var-btn { display: inline-flex; align-items: center; gap: .35rem; padding: .25rem .6rem; border-radius: 99px; border: 1px solid var(--cmm-border); background: var(--cmm-panel); color: var(--cmm-muted); font-size: .75rem; font-weight: 600; cursor: pointer; transition: border-color 160ms, color 160ms, background-color 160ms; }
    .var-btn:hover, .var-btn-on { border-color: var(--cmm-accent); color: var(--cmm-accent); background: var(--cmm-accent-soft); }
    .vars-panel { margin-top: .6rem; padding: .75rem .85rem; border-radius: .9rem; background: color-mix(in srgb, var(--cmm-border) 28%, var(--cmm-panel)); }
    .vars-t { font-size: .75rem; font-weight: 600; margin-bottom: .45rem; } .vars-muted { margin-top: .7rem; color: var(--cmm-muted); }
    .vars-chips { display: flex; flex-wrap: wrap; gap: .4rem; }
    .var-chip { display: inline-flex; flex-direction: column; align-items: flex-start; gap: .05rem; padding: .35rem .65rem; border-radius: .7rem; border: 1px solid var(--cmm-border); background: var(--cmm-panel); cursor: pointer; text-align: left; }
    button.var-chip:hover { border-color: var(--cmm-accent); } .var-off { opacity: .55; cursor: default; }
    .vlist { list-style: none; margin: 0; padding: 0; display: grid; gap: .5rem; }
    .vlist li { display: flex; gap: .75rem; align-items: flex-start; padding: .65rem .8rem; border: 1px solid var(--cmm-border); border-radius: .9rem; }
    .vl-main { display: flex; flex-direction: column; gap: .1rem; font-size: .85rem; } .vl-bad { color: var(--cmm-warning) !important; font-weight: 600; }
    details.adv { border-top: 1px solid var(--cmm-border); padding-top: .75rem; } details.adv > summary { cursor: pointer; font-size: .8125rem; font-weight: 600; color: var(--cmm-muted); list-style: none; display: flex; align-items: center; gap: .35rem; } details.adv > summary::-webkit-details-marker { display: none; } details.adv[open] > summary { margin-bottom: .75rem; }
    .pasta-seg { display: inline-flex; gap: .25rem; padding: .25rem; border-radius: .6rem; background: color-mix(in srgb, var(--cmm-border) 45%, var(--cmm-panel)); max-width: 100%; flex-wrap: wrap; }
    .pasta-seg button { padding: .4rem .8rem; border: none; border-radius: .45rem; background: transparent; color: var(--cmm-muted); font-weight: 600; font-size: .8rem; cursor: pointer; }
    .pasta-seg button.on { background: var(--cmm-panel); color: var(--cmm-ink); box-shadow: 0 1px 4px rgba(0,0,0,.15); }
    .opt-fix { padding: .5rem .75rem; border-radius: .5rem; background: var(--cmm-surface-2, rgba(128,128,128,.1)); font-weight: 600; min-width: 4rem; }
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

  dicas = DICAS;
  tipos = TIPOS;
  grupos = GRUPOS;
  picker = signal<number | null>(null);
  varDialogo = signal(false);
  varPainel = signal(false);
  sug = signal<{ lista: Variavel[]; idx: number; inicio: number } | null>(null);
  config = signal(false);
  tiposDo(g: Grupo) { return TIPOS.filter((t) => t.grupo === g); }
  noAberto = signal<number | null>(null);
  testando = signal(false);
  atual = computed(() => this.fluxos()[this.indice()] ?? null);

  // teste
  estado = signal<IaFlowState | null>(null);
  log = signal<Array<{ de: 'cliente' | 'bot' | 'efeito'; texto: string }>>([]);
  erros = signal<string[]>([]);
  terminou = signal(false);
  carregando = signal(false);
  texto = signal('');

  @HostListener('document:keydown.escape')
  fechar(): void { if (this.picker() !== null) this.picker.set(null); else if (this.config()) this.config.set(false); else if (this.noAberto() !== null) this.noAberto.set(null); else if (this.testando()) this.testando.set(false); }

  info(t: Tipo) { return TIPOS.find((x) => x.tipo === t)!; }
  ferramenta(k?: string) { return this.ferramentas().find((t) => t.key === k); }
  opcaoUsada(n: number): boolean { return this.fluxos().some((f, i) => i !== this.indice() && f.ativo && f.menuOpcao === n); }
  destinos(excluirId: string) {
    return (this.atual()?.nos ?? []).map((n, i) => ({ id: n.id, rotulo: `${i + 1}. ${n.titulo || this.info(n.tipo).label}` })).filter((d) => d.id !== excluirId);
  }
  private nomeDe(f: IaFlow, id: string | null | undefined): string {
    const i = f.nos.findIndex((n) => n.id === id);
    return i < 0 ? '⚠ sem destino' : `→ ${i + 1}. ${f.nos[i].titulo || this.info(f.nos[i].tipo).label}`;
  }
  /** Para onde a etapa leva, em chips curtos (só o que foge do óbvio "segue para a próxima"). */
  ramos(n: IaNode, f: IaFlow): Array<{ texto: string; ruim: boolean }> {
    const alvo = (id: string | null | undefined) => {
      const k = f.nos.findIndex((x) => x.id === id);
      return k < 0 ? null : k + 1;
    };
    const i = f.nos.findIndex((x) => x.id === n.id);
    if (n.tipo === 'encaminhar' || n.tipo === 'fim') return [];
    if (n.tipo === 'opcoes' || n.tipo === 'confirmacao') {
      return (n.opcoes ?? []).map((o, j) => {
        const k = alvo(o.proximo);
        return { texto: `${n.tipo === 'confirmacao' ? o.rotulo : `${j + 1}. ${o.rotulo || '…'}`} → ${k ? 'etapa ' + k : 'sem destino'}`, ruim: !k };
      });
    }
    const k = alvo(n.proximo);
    if (!k) return [{ texto: 'sem próxima etapa', ruim: true }];
    return k === i + 2 ? [] : [{ texto: `segue para a etapa ${k}`, ruim: false }];
  }
  resumo(n: IaNode): string {
    if (n.tipo === 'acao') return this.ferramenta(n.acao)?.label ?? 'Escolha a ferramenta';
    if (n.tipo === 'arquivos') return (n.texto || 'Recebe arquivos') + ((n.minimo ?? 0) > 0 ? ` (mín. ${n.minimo})` : '') + (n.armazenar === 'drive' ? (n.pasta === 'existente' ? '  📁 Drive: só se a pasta existir' : '  📁 Drive: cria a pasta se faltar') : '');
    if (n.tipo === 'pergunta') return (n.texto || 'Sem texto') + (n.variavel ? `  → {${n.variavel}}` : '');
    return n.texto || (n.tipo === 'encaminhar' ? 'Usa a mensagem padrão de encaminhamento.' : n.tipo === 'fim' ? 'Sem mensagem final.' : 'Sem texto');
  }
  /** O que já aconteceu antes de cada etapa (espelha a validação do servidor, que é quem decide ao publicar). */
  analise = computed(() => contextos(this.atual()));
  private contextoEm(pos: number): Ctx {
    const f = this.atual();
    const ant = f?.nos[pos - 1];
    if (!f || !ant) return { vars: new Set(), pasta: false };
    const ent = this.analise().get(ant.id) ?? { vars: new Set<string>(), pasta: false };
    const v = guardaVar(ant);
    return { vars: new Set([...ent.vars, ...(v ? [v] : [])]), pasta: ent.pasta || criaPasta(ant) };
  }
  /** O que ainda falta antes de inserir este tipo naquele ponto da lista. */
  faltaParaTipo(tipo: Tipo, pos: number): string | null {
    const c = this.contextoEm(pos);
    if (tipo === 'arquivos' && !c.vars.has('nome')) return 'Antes, pergunte o nome do cliente (Pergunta guardada como “nome”) para poder guardar no Drive.';
    if (tipo === 'acao' && !c.pasta && !c.vars.has('nome')) return 'Antes, pergunte o nome do cliente: criar a pasta precisa dele.';
    if ((tipo === 'encaminhar' || tipo === 'fim') && pos < (this.atual()?.nos.length ?? 0)) return 'As etapas abaixo só serão alcançadas por outros caminhos.';
    return null;
  }
  /** Todas as variáveis do fluxo, de onde vêm e se dá para usar no ponto dado. */
  variaveisEm(n: IaNode): Variavel[] {
    const f = this.atual();
    if (!f) return [];
    const ctx = this.analise().get(n.id);
    const out: Variavel[] = [];
    f.nos.forEach((x, i) => {
      const v = guardaVar(x);
      if (!v || out.some((o) => o.nome === v)) return;
      out.push({ nome: v, origem: `Etapa ${i + 1} · ${x.titulo || this.info(x.tipo).label}`, usavel: x.id !== n.id && !!ctx?.vars.has(v) });
    });
    if (!out.some((o) => o.nome === 'nome')) out.unshift({ nome: 'nome', origem: 'Cadastro do cliente (quando já é conhecido)', usavel: true });
    else { const k = out.findIndex((o) => o.nome === 'nome'); const [nm] = out.splice(k, 1); out.unshift(nm); }
    return out;
  }
  naoUsaveis(n: IaNode): Variavel[] { return this.variaveisEm(n).filter((v) => !v.usavel); }
  /** Visão do fluxo inteiro: onde cada variável nasce, onde é usada e se alguma é citada cedo demais. */
  resumoVariaveis = computed(() => {
    const f = this.atual();
    if (!f) return [] as Array<{ nome: string; origem: string; usos: string[]; cedo: string[] }>;
    const ana = this.analise();
    const vistos = new Set<string>();
    const out: Array<{ nome: string; origem: string; usos: string[]; cedo: string[] }> = [];
    f.nos.forEach((x, i) => {
      const v = guardaVar(x);
      if (!v || vistos.has(v)) return;
      vistos.add(v);
      const usos: string[] = []; const cedo: string[] = [];
      f.nos.forEach((y, k) => {
        if (![...(y.texto ?? '').matchAll(/\{(\w+)\}/g)].some((m) => m[1] === v)) return;
        const rot = `etapa ${k + 1}`;
        usos.push(rot);
        if (v !== 'nome' && !ana.get(y.id)?.vars.has(v)) cedo.push(rot);
      });
      out.push({ nome: v, origem: `Etapa ${i + 1} · ${x.titulo || this.info(x.tipo).label}`, usos, cedo });
    });
    return out;
  });
  // ── escolher a variável ao digitar { (ou pelo botão Variáveis)
  sugerir(el: HTMLTextAreaElement, n: IaNode): void {
    const antes = el.value.slice(0, el.selectionStart ?? 0);
    const m = /\{(\w*)$/.exec(antes);
    if (!m) { this.sug.set(null); return; }
    const lista = this.variaveisEm(n).filter((v) => v.usavel && v.nome.startsWith(m[1].toLowerCase()));
    this.sug.set(lista.length ? { lista, idx: 0, inicio: antes.length - m[0].length } : null);
  }
  fecharSug(): void { this.sug.set(null); }
  tecla(ev: KeyboardEvent, el: HTMLTextAreaElement): void {
    const sg = this.sug();
    if (!sg) return;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      const d = ev.key === 'ArrowDown' ? 1 : -1;
      this.sug.set({ ...sg, idx: (sg.idx + d + sg.lista.length) % sg.lista.length });
    } else if (ev.key === 'Enter' || ev.key === 'Tab') {
      ev.preventDefault();
      this.escolherSug(el, sg.lista[sg.idx].nome);
    } else if (ev.key === 'Escape') {
      ev.preventDefault(); ev.stopPropagation();
      this.sug.set(null);
    }
  }
  escolherSug(el: HTMLTextAreaElement, nome: string): void {
    const sg = this.sug();
    const fim = el.selectionStart ?? el.value.length;
    const inicio = sg?.inicio ?? fim;
    const resto = el.value.slice(fim).replace(/^\}/, '');
    this.aplicarTexto(el, el.value.slice(0, inicio) + `{${nome}}` + resto, inicio + nome.length + 2);
    this.sug.set(null);
  }
  inserirVar(el: HTMLTextAreaElement, nome: string): void {
    const a = el.selectionStart ?? el.value.length;
    const b = el.selectionEnd ?? a;
    this.aplicarTexto(el, el.value.slice(0, a) + `{${nome}}` + el.value.slice(b), a + nome.length + 2);
  }
  private aplicarTexto(el: HTMLTextAreaElement, texto: string, cursor: number): void {
    this.editarNo(this.noAberto()!, (x) => (x.texto = texto.slice(0, 1000)));
    setTimeout(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
  }
  /** Tudo que falta numa etapa para ela funcionar (em frases curtas). */
  faltas(n: IaNode): string[] {
    const f = this.atual();
    const out: string[] = [];
    if (!f) return out;
    const c = this.analise().get(n.id);
    const precisaTexto = ['mensagem', 'opcoes', 'confirmacao', 'pergunta', 'arquivos'].includes(n.tipo);
    if (precisaTexto && !(n.texto ?? '').trim()) out.push('Escreva o que o bot diz.');
    if (['mensagem', 'pergunta', 'arquivos', 'acao'].includes(n.tipo) && !n.proximo) out.push('Escolha a próxima etapa.');
    if (n.tipo === 'pergunta' && !n.variavel) out.push('Dê um nome à resposta (ex.: nome, bairro).');
    if (n.tipo === 'acao' && !n.acao) out.push('Escolha a ferramenta.');
    if (n.tipo === 'opcoes' || n.tipo === 'confirmacao')
      (n.opcoes ?? []).forEach((o, j) => {
        if (!o.rotulo.trim()) out.push(`Dê um texto à opção ${j + 1}.`);
        if (!o.proximo) out.push(`Escolha o destino de “${o.rotulo || 'opção ' + (j + 1)}”.`);
      });
    if (!c) { out.push('Nenhum caminho chega até esta etapa: ligue-a a uma anterior.'); return out; }
    for (const m of (n.texto ?? '').matchAll(/\{(\w+)\}/g)) {
      const definida = f.nos.some((x) => guardaVar(x) === m[1]);
      if (m[1] !== 'nome' && definida && !c.vars.has(m[1])) out.push(`{${m[1]}} ainda não foi respondida aqui: coloque a pergunta antes.`);
    }
    if (criaPasta(n) && !c.vars.has('nome')) out.push('Pergunte o nome do cliente antes (Pergunta guardada como “nome”).');
    if (n.tipo === 'acao' && n.acao === 'drive_salvar_respostas' && !c.pasta) out.push('Crie a pasta do cliente antes (Ferramenta ou Solicitação com Drive).');
    if (n.tipo === 'arquivos' && !criaPasta(n) && !c.pasta) out.push('Marque “Guardar no Drive” ou crie a pasta em uma etapa anterior.');
    return out;
  }
  incompleto(n: IaNode): boolean { return this.faltas(n).length > 0; }

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

  addNo(tipo: Tipo, em?: number): void {
    const f0 = this.atual();
    const pos = Math.max(0, Math.min(em ?? f0?.nos.length ?? 0, f0?.nos.length ?? 0));
    this.picker.set(null);
    this.editar((f) => {
      const max = f.nos.reduce((m, n) => Math.max(m, Number(n.id.replace(/\D/g, '')) || 0), 0);
      const depois = f.nos[pos]?.id ?? null;
      const base: IaNode = { id: 'n' + (max + 1), tipo, titulo: this.info(tipo).label, proximo: null };
      if (tipo === 'mensagem' || tipo === 'pergunta' || tipo === 'arquivos') { base.texto = ''; base.proximo = depois; }
      if (tipo === 'pergunta') { base.variavel = ''; base.validacao = 'texto'; }
      if (tipo === 'arquivos') { base.minimo = 1; base.armazenar = 'drive'; base.pasta = 'criar'; }
      if (tipo === 'confirmacao') { base.texto = ''; base.opcoes = [{ rotulo: 'Sim', proximo: depois }, { rotulo: 'Não', proximo: null }]; }
      if (tipo === 'opcoes') { base.texto = ''; base.opcoes = [{ rotulo: '', proximo: depois }, { rotulo: '', proximo: null }]; }
      if (tipo === 'acao') { base.acao = ''; base.proximo = depois; }
      // Liga sozinho a etapa anterior à nova, para o caminho linear já nascer pronto.
      const ant = f.nos[pos - 1];
      if (ant && ['mensagem', 'pergunta', 'arquivos', 'acao'].includes(ant.tipo) && (!ant.proximo || ant.proximo === depois)) ant.proximo = base.id;
      f.nos.splice(pos, 0, base);
    });
    this.noAberto.set(pos);
  }
  armazenar(v: string): void {
    this.editarNo(this.noAberto()!, (x) => { x.armazenar = v === 'drive' ? 'drive' : undefined; x.pasta = v === 'drive' ? (x.pasta ?? 'criar') : undefined; });
  }
  mover(i: number, d: number, abrir = true): void {
    this.editar((f) => { const j = i + d; if (j < 0 || j >= f.nos.length) return; [f.nos[i], f.nos[j]] = [f.nos[j], f.nos[i]]; });
    if (abrir) this.noAberto.set(Math.max(0, Math.min((this.atual()?.nos.length ?? 1) - 1, i + d)));
  }
  async removerNo(i: number): Promise<void> {
    const n = this.atual()?.nos[i];
    if (!n || !(await this.modal.confirm('Excluir esta etapa?', `“${n.titulo}” será removida e quem chegava nela passa direto para a etapa seguinte.`, 'Excluir'))) return;
    this.editar((f) => {
      const [rm] = f.nos.splice(i, 1);
      for (const x of f.nos) {
        if (x.proximo === rm.id) x.proximo = rm.proximo ?? null;
        x.opcoes?.forEach((o) => { if (o.proximo === rm.id) o.proximo = rm.proximo ?? null; });
      }
    });
    this.noAberto.set(null);
  }

  // ───── teste
  abrirTeste(): void { this.testando.set(true); if (!this.log().length) this.comecar(); }
  private zerarTeste(): void { this.estado.set(null); this.log.set([]); this.erros.set([]); this.terminou.set(false); }
  comecar(): void { this.zerarTeste(); this.rodar(null, ''); }
  enviar(ev?: Event): void {
    const t = this.texto().trim();
    if (!t) return;
    const campo = (ev?.target as HTMLElement | null)?.querySelector?.('input[name=tx]') as HTMLInputElement | null;
    if (campo) campo.value = '';
    this.log.update((l) => [...l, { de: 'cliente', texto: t }]);
    this.texto.set('');
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
          ...r.efeitos.map((e) => ({ de: 'efeito' as const, texto: e })),
          ...(r.saiu ? [{ de: 'efeito' as const, texto: r.saiu === 'encaminhado' ? 'Cliente encaminhado a um atendente' : 'Volta ao menu inicial' }] : []),
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
