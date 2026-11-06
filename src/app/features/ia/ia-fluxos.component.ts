import { Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../shared/services/modal.service';
import { HintComponent } from '../../shared/components/hint.component';
import { IconComponent, IconName } from '../../shared/components/icon.component';
import { DialogComponent } from '../../shared/components/dialog.component';
import { SheetComponent } from '../../shared/components/sheet.component';
import { IaApiService, IaCondOp, IaFlow, IaFlowState, IaNode, IaNodeType, IaNodeTypeInfo, IaTool } from './ia-api.service';

const ICONE: Record<IaNodeType, IconName> = {
  mensagem: 'mensagem', confirmacao: 'confirmacao', opcoes: 'escolha', multipla: 'lista', pergunta: 'pergunta', arquivos: 'arquivo',
  ferramenta: 'ferramenta', condicao: 'fluxo', ir_para: 'seta_dir', encaminhar: 'atendente', fim: 'fim',
};

const DICAS = {
  ativo: 'Desativado, o fluxo não é usado por ninguém (nem pelo menu), mas continua salvo para você ligar depois.',
  papel: 'Início: todo cliente novo começa por este fluxo. Cliente conhecido: quem já foi atendido e abriu uma conversa nova. Só um fluxo pode ter cada papel.',
  texto: 'É a mensagem que o cliente recebe no WhatsApp. Escreva {nome} (ou {outra_resposta}) para citar algo que ele já respondeu. Só funciona para respostas dadas ANTES desta etapa.',
  textoFinal: 'Opcional. Se ficar vazio, o bot usa a mensagem padrão do sistema.',
  variavel: 'O nome interno da resposta: letras minúsculas, números e _. Use “nome” para o nome do cliente: ele é gravado no cadastro e é exigido para criar a pasta no Drive.',
  validacao: 'Nome de pessoa recusa respostas que não parecem um nome. Número, telefone e e-mail também são conferidos.',
  minimo: 'Quantos arquivos o cliente precisa enviar antes de o “OK” valer.',
  arquivos: 'Os arquivos vão para a pasta do cliente no Drive, se ela existir. Para garantir, coloque antes a ferramenta “Drive: criar a pasta do cliente”.',
  confirmacao: 'Sim e Não são fixos. Escolha para onde cada resposta leva o cliente.',
  opcoes: 'De 2 a 9 opções. O número é automático e o bot também aceita 0 (voltar) e 10 (recomeçar). Palavras-chave ajudam a entender texto livre sem IA.',
  multipla: 'O cliente manda os números na mesma mensagem (ex.: 2 1 3) e confirma com OK. A resposta fica na variável como lista.',
  proximo: 'Para onde o cliente vai quando esta etapa termina. Se for a etapa logo abaixo na lista, o fluxo anda sozinho.',
  ferramenta: 'Cada ferramenta diz o que precisa antes (ex.: nome do cliente, pasta criada). O aviso em âmbar mostra o que ainda falta.',
  falha: 'Se a ferramenta falhar (integração fora, horário ocupado...), o cliente segue por aqui. Vazio = segue para a próxima etapa.',
  semOpcoes: 'Ferramentas de escolha: quando não há nada para oferecer (ex.: sem horários livres).',
  condicao: 'A primeira regra que valer decide o caminho. Compara o que o cliente já respondeu.',
  ir_para: 'A conversa continua no outro fluxo, da primeira etapa. As respostas já dadas continuam disponíveis.',
  variaveis: 'Cada Pergunta, Escolha com variável ou Lista cria uma variável. Dentro de qualquer texto, escreva-a entre chaves para o bot trocar pelo que o cliente respondeu.',
  picker: 'Cada tipo já vem pronto. Algumas etapas dependem de outras: o aviso em âmbar mostra o que ainda falta antes deste ponto.',
  spec: 'Quando a IA reescreve a mensagem com voz natural, ela precisa manter estes pontos. Uma linha por ponto; alternativas separadas por “/”. Vazio = a IA só pode mudar o jeito de dizer.',
} as const;

const MODELOS: Record<string, () => IaFlow> = {
  branco: () => ({ id: '', nome: 'Novo fluxo', ativo: false, nos: [{ id: 'n1', tipo: 'mensagem', titulo: 'Boas-vindas', texto: 'Olá! Vou te ajudar com isso.', proximo: null }] }),
  coleta: () => ({
    id: '', nome: 'Coleta de dados', descricao: 'Pergunta o nome, cria a pasta no Drive, recebe arquivos e encaminha.', ativo: false, nos: <IaNode[]>[
      { id: 'n1', tipo: 'pergunta', titulo: 'Nome', texto: 'Para começar, qual é o seu nome?', variavel: 'nome', validacao: 'nome', proximo: 'n2' },
      { id: 'n2', tipo: 'ferramenta', titulo: 'Criar pasta no Drive', ferramenta: 'drive.criar_pasta', params: { modo: 'criar' }, proximo: 'n3', falha: 'n3' },
      { id: 'n3', tipo: 'arquivos', titulo: 'Receber arquivos', texto: 'Perfeito, {nome}! Pode me enviar os arquivos aqui.', minimo: 1, proximo: 'n4' },
      { id: 'n4', tipo: 'ferramenta', titulo: 'Salvar respostas', ferramenta: 'drive.salvar_respostas', params: {}, proximo: 'n5', falha: 'n5' },
      { id: 'n5', tipo: 'encaminhar', titulo: 'Atendente', texto: 'Obrigada, {nome}! Já vou te encaminhar para um atendente.' },
    ],
  }),
};
export { MODELOS };

interface Ctx { vars: Set<string>; pasta: boolean }
interface Variavel { nome: string; origem: string; usavel: boolean }

const guardaVar = (n: IaNode): string | null => ((n.tipo === 'pergunta' || n.tipo === 'multipla' || n.tipo === 'opcoes' || n.tipo === 'confirmacao' || n.tipo === 'ferramenta') && n.variavel ? n.variavel : null);
const sucessores = (n: IaNode): Array<string | null | undefined> => {
  switch (n.tipo) {
    case 'opcoes': case 'confirmacao': return (n.opcoes ?? []).map((o) => o.proximo);
    case 'condicao': return [...(n.regras ?? []).map((r) => r.proximo), n.senao];
    case 'ferramenta': return [n.proximo, n.falha, n.semOpcoes];
    case 'encaminhar': case 'fim': case 'ir_para': return [];
    default: return [n.proximo];
  }
};

@Component({
  selector: 'app-ia-fluxos',
  standalone: true,
  imports: [FormsModule, IconComponent, HintComponent, DialogComponent, SheetComponent],
  template: `
    @if (atual(); as f) {
      <div class="fx">
        <section class="fx-bar">
          <button type="button" role="switch" class="switch" [class.switch-on]="f.ativo" [attr.aria-checked]="f.ativo" aria-label="Fluxo ativo" (click)="editar((x) => (x.ativo = !x.ativo))"><span class="switch-knob"></span></button>
          <span class="fx-state">{{ f.ativo ? 'Ativo' : 'Desativado' }}</span><app-hint [texto]="dicas.ativo" />
          <label class="fx-opt">papel <app-hint [texto]="dicas.papel" />
            <select class="form-input bar-sel" aria-label="Papel do fluxo" [ngModel]="f.papel ?? ''" (ngModelChange)="editar((x) => (x.papel = $event ? $event : null))">
              <option value="">—</option>
              <option value="entrada">Início</option>
              <option value="reconhecimento">Cliente conhecido</option>
            </select></label>
          <span class="flex-1"></span>
          <button type="button" class="btn btn-ghost btn-sm" (click)="varDialogo.set(true)" title="Ver as respostas do cliente que o fluxo vai guardando"><app-icon name="variavel" [size]="15" />Variáveis</button>
          <button type="button" class="icon-btn" aria-label="Nome, descrição e excluir o fluxo" title="Nome, descrição e excluir" (click)="config.set(true)"><app-icon name="ajustes" /></button>
          <button type="button" class="btn btn-accent btn-sm" (click)="abrirTeste()"><app-icon name="play" [size]="13" />Testar</button>
        </section>

        <ol class="tl" aria-label="Etapas do fluxo, na ordem em que o cliente passa por elas">
          @for (n of f.nos; track n.id; let i = $index) {
            <li class="tl-li">
              @if (i > 0) {
                <button type="button" class="tl-add" (click)="picker.set(i)" [disabled]="f.nos.length >= 60" [attr.aria-label]="'Inserir etapa antes da etapa ' + (i + 1)" title="Inserir etapa aqui"><app-icon name="mais" [size]="13" [stroke]="2.4" /></button>
              }
              <div class="tl-step" [attr.data-tipo]="n.tipo" [class.tl-warn]="faltas(n).length > 0" role="button" tabindex="0" (click)="noAberto.set(i)" (keydown.enter)="noAberto.set(i)" [attr.aria-label]="'Editar etapa ' + (i + 1) + ': ' + n.titulo">
                <span class="tl-ico"><app-icon [name]="icone(n.tipo)" [size]="18" /></span>
                <span class="tl-main">
                  <span class="tl-top"><b class="tl-title">{{ n.titulo || 'Sem nome' }}</b><span class="tl-kind">{{ info(n.tipo).label }}</span>@if (i === 0) { <span class="tl-kind tl-start">início</span> }</span>
                  <span class="tl-sum">{{ resumo(n) }}</span>
                  @if (ramos(n, f).length) { <span class="tl-ramos">@for (r of ramos(n, f); track $index) { <span class="tl-ramo" [class.tl-ramo-bad]="r.ruim">{{ r.texto }}</span> }</span> }
                </span>
                @if (faltas(n).length) { <span class="tl-flag"><app-hint tom="aviso" rotulo="O que falta nesta etapa" [texto]="'Falta nesta etapa:\\n• ' + faltas(n).join('\\n• ')" /></span> }
                <span class="tl-acts">
                  <button type="button" class="icon-btn icon-btn-sm" aria-label="Mover para cima" title="Mover para cima" [disabled]="i === 0" (click)="mover(i, -1); $event.stopPropagation()"><app-icon name="cima" [size]="15" /></button>
                  <button type="button" class="icon-btn icon-btn-sm" aria-label="Mover para baixo" title="Mover para baixo" [disabled]="i === f.nos.length - 1" (click)="mover(i, 1); $event.stopPropagation()"><app-icon name="baixo" [size]="15" /></button>
                  <button type="button" class="icon-btn icon-btn-sm icon-danger" aria-label="Excluir etapa" title="Excluir" (click)="removerNo(i); $event.stopPropagation()"><app-icon name="lixeira" [size]="15" /></button>
                </span>
              </div>
            </li>
          }
          <li class="tl-li">
            <button type="button" class="tl-end" (click)="picker.set(f.nos.length)" [disabled]="f.nos.length >= 60"><app-icon name="mais" [size]="15" [stroke]="2.4" />{{ f.nos.length ? 'Adicionar etapa' : 'Criar a primeira etapa' }}</button>
          </li>
        </ol>
      </div>

      <!-- Escolher o tipo da nova etapa -->
      <app-dialog [open]="picker() !== null" title="O que acontece nesta etapa?" [subtitle]="dicas.picker" size="lg" (closed)="picker.set(null)">
        @if (picker() !== null) {
          <div class="pick-grid">
            @for (g of grupos(); track g) {
              <p class="pick-grupo">{{ g }}</p>
              @for (t of tiposDo(g); track t.tipo) {
                <div class="pick-wrap">
                  <button type="button" class="pick" [class.pick-warn]="faltaParaTipo(t.tipo, picker()!)" [attr.data-tipo]="t.tipo" (click)="addNo(t.tipo, picker()!)">
                    <span class="tl-ico"><app-icon [name]="icone(t.tipo)" [size]="18" /></span>
                    <span><b>{{ t.label }}</b><small>{{ t.ajuda }}</small>@if (faltaParaTipo(t.tipo, picker()!); as falta) { <small class="pick-falta">Falta: {{ falta }}</small> }</span>
                  </button>
                  <span class="pick-hint"><app-hint [texto]="t.regra" [tom]="faltaParaTipo(t.tipo, picker()!) ? 'aviso' : 'info'" rotulo="Regras deste tipo" /></span>
                </div>
              }
            }
          </div>
        }
      </app-dialog>

      <!-- Variáveis do fluxo -->
      <app-dialog [open]="varDialogo()" title="Respostas que o fluxo guarda" [subtitle]="dicas.variaveis" size="lg" (closed)="varDialogo.set(false)">
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
        } @else { <p class="text-sm" style="color: var(--cmm-muted);">Ainda não há respostas guardadas. Adicione uma Pergunta, uma Lista ou uma Escolha com variável.</p> }
        <p class="text-xs mt-3" style="color: var(--cmm-muted);">A ordem das etapas decide o que existe em cada ponto: uma variável só pode ser citada depois de respondida.</p>
      </app-dialog>

      <!-- Nome, descrição e excluir -->
      <app-dialog [open]="config()" title="Sobre este fluxo" size="sm" (closed)="config.set(false)">
        <div class="space-y-3">
          <div><label class="form-label" for="fl-nome">Nome</label>
            <input id="fl-nome" class="form-input" maxlength="40" [ngModel]="f.nome" (ngModelChange)="editar((x) => (x.nome = $event))" /></div>
          <div><label class="form-label" for="fl-desc">Descrição (só para você)</label>
            <input id="fl-desc" class="form-input" maxlength="200" [ngModel]="f.descricao ?? ''" (ngModelChange)="editar((x) => (x.descricao = $event))" /></div>
        </div>
        <ng-container dialog-footer>
          <button type="button" class="btn btn-ghost btn-sm mr-auto" style="color: var(--cmm-danger);" (click)="excluir()"><app-icon name="lixeira" [size]="15" />Excluir fluxo</button>
          <button type="button" class="btn btn-primary btn-sm" (click)="config.set(false)">Pronto</button>
        </ng-container>
      </app-dialog>

      <!-- Editar etapa (painel lateral) -->
      <app-sheet [open]="!!noAtual()" width="36rem" (closed)="noAberto.set(null)">
        <ng-container sheet-head>
          @if (noAtual(); as n) {
            <span class="tl-ico" [attr.data-tipo]="n.tipo"><app-icon [name]="icone(n.tipo)" [size]="18" /></span>
            <input id="no-titulo" class="node-title" maxlength="60" aria-label="Nome da etapa" [ngModel]="n.titulo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.titulo = $event))" />
            <span class="badge badge-neutral">{{ info(n.tipo).label }}</span>
          }
        </ng-container>
        @if (noAtual(); as n) {
          <div class="space-y-4">
            @if (faltas(n).length) {
              <div class="faltas" role="status"><b><app-icon name="alerta" [size]="15" />O que falta aqui</b><ul>@for (m of faltas(n); track m) { <li>{{ m }}</li> }</ul></div>
            }

            <!-- texto -->
            @if (temTexto(n.tipo)) {
              <div>
                <div class="flex items-center justify-between gap-2 mb-1"><label class="form-label !mb-0" for="nt">{{ n.tipo === 'encaminhar' ? 'Mensagem ao encaminhar' : n.tipo === 'fim' ? 'Mensagem final' : 'O que o bot diz' }} <app-hint [texto]="n.tipo === 'encaminhar' || n.tipo === 'fim' ? dicas.textoFinal : dicas.texto" /></label>
                  <button type="button" class="var-btn" [class.var-btn-on]="varPainel()" (click)="varPainel.update(v => !v)" [attr.aria-expanded]="varPainel()"><app-icon name="variavel" [size]="14" />Variáveis</button></div>
                <div class="ta-wrap">
                  <textarea #nta id="nt" class="form-input" rows="5" maxlength="1600" [ngModel]="n.texto ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.texto = $event))"
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

            <!-- pergunta -->
            @if (n.tipo === 'pergunta') {
              <div class="grid sm:grid-cols-2 gap-3">
                <div><label class="form-label" for="nv">Guardar a resposta como <app-hint [texto]="dicas.variavel" /></label>
                  <input class="form-input" id="nv" placeholder="ex.: nome, bairro" [ngModel]="n.variavel ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.variavel = $event))" /></div>
                <div><label class="form-label" for="nval">Conferir como <app-hint [texto]="dicas.validacao" /></label>
                  <select class="form-input" id="nval" [ngModel]="n.validacao ?? (n.variavel === 'nome' ? 'nome' : 'texto')" (ngModelChange)="editarNo(noAberto()!, (x) => (x.validacao = $event))">
                    <option value="texto">Texto livre</option><option value="nome">Nome de pessoa</option><option value="numero">Número</option><option value="telefone">Telefone</option><option value="email">E-mail</option>
                  </select></div>
              </div>
              <p class="text-xs" style="color: var(--cmm-muted);">Depois você pode citar a resposta nos textos escrevendo {{ '{' }}{{ n.variavel || 'nome' }}{{ '}' }}.</p>
            }

            <!-- arquivos -->
            @if (n.tipo === 'arquivos') {
              <p class="note text-xs">{{ dicas.arquivos }}</p>
              <details class="adv">
                <summary><app-icon name="ajustes" [size]="14" />Avançado</summary>
                <div class="space-y-3">
                  <div><label class="form-label" for="nm">Mínimo de arquivos antes do “OK” <app-hint [texto]="dicas.minimo" /></label>
                    <input class="form-input !w-28" type="number" min="0" max="20" id="nm" [ngModel]="n.minimo ?? 0" (ngModelChange)="editarNo(noAberto()!, (x) => (x.minimo = +$event))" /></div>
                  <div><label class="form-label" for="napos">Mensagem a cada arquivo recebido</label>
                    <input class="form-input" id="napos" placeholder="Padrão: pede o OK quando terminar" [ngModel]="n.textoApos ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.textoApos = $event))" /></div>
                </div>
              </details>
            }

            <!-- ferramenta -->
            @if (n.tipo === 'ferramenta') {
              <div>
                <label class="form-label" for="na">Ferramenta <app-hint [texto]="dicas.ferramenta" /></label>
                <select class="form-input" id="na" [ngModel]="n.ferramenta ?? ''" (ngModelChange)="trocarFerramenta($event)">
                  <option value="">Escolha…</option>
                  @for (g of gruposFerramentas(); track g) {
                    <optgroup [label]="g">
                      @for (t of ferramentasDo(g); track t.key) { <option [value]="t.key">{{ t.label }}{{ t.disponivel ? '' : ' (indisponível)' }}</option> }
                    </optgroup>
                  }
                </select>
                @if (ferramenta(n.ferramenta); as t) {
                  <p class="text-xs mt-2" style="color: var(--cmm-muted);">{{ t.descricao }}</p>
                  @if (!t.disponivel) { <p class="text-xs mt-1" style="color: var(--cmm-warning);">{{ t.motivo || 'Esta ferramenta não está configurada.' }} Até lá, o fluxo segue pelo caminho “se falhar”.</p> }
                }
              </div>
              @if (ferramenta(n.ferramenta); as t) {
                @if (t.params.length) {
                  <div class="space-y-3">
                    @for (ps of t.params; track ps.key) {
                      <div>
                        <label class="form-label" [attr.for]="'p-' + ps.key">{{ ps.label }}@if (ps.obrigatorio) { <span style="color: var(--cmm-danger);">*</span> }@if (ps.ajuda) { <app-hint [texto]="ps.ajuda" /> }</label>
                        @switch (ps.type) {
                          @case ('escolha') {
                            <select class="form-input" [id]="'p-' + ps.key" [ngModel]="param(n, ps.key, ps.padrao)" (ngModelChange)="setParam(ps.key, $event)">
                              @for (o of ps.opcoes ?? []; track o.value) { <option [value]="o.value">{{ o.label }}</option> }
                            </select>
                          }
                          @case ('booleano') {
                            <button type="button" role="switch" class="switch" [class.switch-on]="!!param(n, ps.key, ps.padrao)" [attr.aria-checked]="!!param(n, ps.key, ps.padrao)" (click)="setParam(ps.key, !param(n, ps.key, ps.padrao))"><span class="switch-knob"></span></button>
                          }
                          @case ('numero') {
                            <input class="form-input !w-40" type="number" [id]="'p-' + ps.key" [ngModel]="param(n, ps.key, ps.padrao)" (ngModelChange)="setParam(ps.key, +$event)" />
                          }
                          @case ('variavel') {
                            <input class="form-input" [id]="'p-' + ps.key" placeholder="ex.: horario" [ngModel]="param(n, ps.key, ps.padrao) ?? ''" (ngModelChange)="setParam(ps.key, $event)" list="vars-list" />
                          }
                          @default {
                            @if (ps.template && (param(n, ps.key, ps.padrao) + '').length > 60) {
                              <textarea class="form-input" rows="4" [id]="'p-' + ps.key" [ngModel]="param(n, ps.key, ps.padrao) ?? ''" (ngModelChange)="setParam(ps.key, $event)"></textarea>
                            } @else {
                              <input class="form-input" [id]="'p-' + ps.key" [ngModel]="param(n, ps.key, ps.padrao) ?? ''" (ngModelChange)="setParam(ps.key, $event)" />
                            }
                          }
                        }
                      </div>
                    }
                  </div>
                }
                @if (t.modo === 'escolha') {
                  <div><label class="form-label" for="nfv">Guardar a escolha como <app-hint [texto]="dicas.variavel" /></label>
                    <input class="form-input" id="nfv" placeholder="ex.: horario" [ngModel]="n.variavel ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.variavel = $event))" /></div>
                }
              }
              <datalist id="vars-list">@for (v of variaveisEm(n); track v.nome) { <option [value]="v.nome"></option> }</datalist>
            }

            <!-- confirmação -->
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
                <details class="adv"><summary><app-icon name="ajustes" [size]="14" />Avançado</summary>
                  <label class="form-label" for="ncv">Guardar a resposta como (opcional)</label>
                  <input class="form-input" id="ncv" placeholder="ex.: confirmou" [ngModel]="n.variavel ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.variavel = $event))" /></details>
              </div>
            }

            <!-- escolha -->
            @if (n.tipo === 'opcoes') {
              <div class="space-y-2">
                <p class="form-label !mb-0">Opções <app-hint [texto]="dicas.opcoes" /></p>
                @for (o of n.opcoes ?? []; track $index; let j = $index) {
                  <div class="opt">
                    <span class="opt-n">{{ j + 1 }}</span>
                    <input class="form-input" maxlength="80" [attr.aria-label]="'Texto da opção ' + (j + 1)" [ngModel]="o.rotulo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.opcoes![j].rotulo = $event))" placeholder="Texto da opção" />
                    <select class="form-input" [attr.aria-label]="'Destino da opção ' + (j + 1)" [ngModel]="o.proximo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.opcoes![j].proximo = $event))">
                      <option [ngValue]="null">→ escolha o destino</option>
                      @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">→ {{ d.rotulo }}</option> }
                    </select>
                    <button type="button" class="icon-btn icon-btn-sm" (click)="editarNo(noAberto()!, (x) => x.opcoes!.splice(j, 1))" [disabled]="(n.opcoes?.length ?? 0) <= 2" aria-label="Remover opção"><app-icon name="fechar" [size]="14" /></button>
                    <input class="form-input opt-words" [attr.aria-label]="'Palavras-chave da opção ' + (j + 1)" [ngModel]="(o.palavras ?? []).join(', ')" (change)="editarNo(noAberto()!, (x) => (x.opcoes![j].palavras = lista($any($event.target).value)))" placeholder="palavras-chave, separadas por vírgula (opcional)" />
                  </div>
                }
                <button type="button" class="btn btn-secondary btn-sm" (click)="editarNo(noAberto()!, (x) => x.opcoes!.push({ rotulo: '', proximo: null }))" [disabled]="(n.opcoes?.length ?? 0) >= 9"><app-icon name="mais" [size]="14" />Opção</button>
                <details class="adv"><summary><app-icon name="ajustes" [size]="14" />Avançado</summary>
                  <label class="form-label" for="nvo">Guardar a escolha como (opcional)</label>
                  <input class="form-input" id="nvo" placeholder="ex.: ambiente" [ngModel]="n.variavel ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.variavel = $event))" />
                  <p class="text-xs mt-1" style="color: var(--cmm-muted);">Guarda o texto da opção escolhida.</p></details>
              </div>
            }

            <!-- lista de itens -->
            @if (n.tipo === 'multipla') {
              <div class="space-y-2">
                <p class="form-label !mb-0">Itens <app-hint [texto]="dicas.multipla" /></p>
                @for (it of n.itens ?? []; track $index; let j = $index) {
                  <div class="flex items-center gap-2">
                    <span class="opt-n">{{ j + 1 }}</span>
                    <input class="form-input" maxlength="80" [attr.aria-label]="'Item ' + (j + 1)" [ngModel]="it.rotulo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.itens![j].rotulo = $event))" placeholder="Texto do item" />
                    <button type="button" class="icon-btn icon-btn-sm" (click)="editarNo(noAberto()!, (x) => x.itens!.splice(j, 1))" [disabled]="(n.itens?.length ?? 0) <= 1" aria-label="Remover item"><app-icon name="fechar" [size]="14" /></button>
                  </div>
                }
                <button type="button" class="btn btn-secondary btn-sm" (click)="editarNo(noAberto()!, (x) => (x.itens = [...(x.itens ?? []), { rotulo: '' }]))" [disabled]="(n.itens?.length ?? 0) >= 12"><app-icon name="mais" [size]="14" />Item</button>
                <div class="grid sm:grid-cols-2 gap-3 pt-2">
                  <div><label class="form-label" for="nmv">Guardar a lista como <app-hint [texto]="dicas.variavel" /></label>
                    <input class="form-input" id="nmv" placeholder="ex.: ambientes" [ngModel]="n.variavel ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.variavel = $event))" /></div>
                  <div><label class="form-label" for="nmn">Opção “nenhum destes”</label>
                    <input class="form-input" id="nmn" placeholder="vazio = sem essa opção" [ngModel]="n.nenhum ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.nenhum = $event))" /></div>
                </div>
                <details class="adv"><summary><app-icon name="ajustes" [size]="14" />Avançado</summary>
                  <label class="form-label" for="nma">Mensagem a cada escolha (antes do OK)</label>
                  <input class="form-input" id="nma" placeholder="Padrão: pede o OK quando terminar" [ngModel]="n.textoApos ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.textoApos = $event))" /></details>
              </div>
            }

            <!-- condição -->
            @if (n.tipo === 'condicao') {
              <div class="space-y-2">
                <p class="form-label !mb-0">Regras <app-hint [texto]="dicas.condicao" /></p>
                @for (r of n.regras ?? []; track $index; let j = $index) {
                  <div class="rule">
                    <span class="opt-n">{{ j + 1 }}</span>
                    <input class="form-input" list="vars-cond" placeholder="variável" [ngModel]="r.variavel" (ngModelChange)="editarNo(noAberto()!, (x) => (x.regras![j].variavel = $event))" [attr.aria-label]="'Variável da regra ' + (j + 1)" />
                    <select class="form-input" [ngModel]="r.op" (ngModelChange)="editarNo(noAberto()!, (x) => (x.regras![j].op = $event))" [attr.aria-label]="'Comparação da regra ' + (j + 1)">
                      <option value="igual">é igual a</option><option value="diferente">é diferente de</option><option value="contem">contém</option><option value="vazio">está vazia</option><option value="nao_vazio">foi respondida</option>
                    </select>
                    @if (r.op !== 'vazio' && r.op !== 'nao_vazio') {
                      <input class="form-input" placeholder="valor" [ngModel]="r.valor ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.regras![j].valor = $event))" [attr.aria-label]="'Valor da regra ' + (j + 1)" />
                    } @else { <span></span> }
                    <select class="form-input" [ngModel]="r.proximo" (ngModelChange)="editarNo(noAberto()!, (x) => (x.regras![j].proximo = $event))" [attr.aria-label]="'Destino da regra ' + (j + 1)">
                      <option [ngValue]="null">→ escolha o destino</option>
                      @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">→ {{ d.rotulo }}</option> }
                    </select>
                    <button type="button" class="icon-btn icon-btn-sm" (click)="editarNo(noAberto()!, (x) => x.regras!.splice(j, 1))" [disabled]="(n.regras?.length ?? 0) <= 1" aria-label="Remover regra"><app-icon name="fechar" [size]="14" /></button>
                  </div>
                }
                <button type="button" class="btn btn-secondary btn-sm" (click)="editarNo(noAberto()!, (x) => (x.regras = [...(x.regras ?? []), { variavel: '', op: 'igual', valor: '', proximo: null }]))" [disabled]="(n.regras?.length ?? 0) >= 10"><app-icon name="mais" [size]="14" />Regra</button>
                <datalist id="vars-cond">@for (v of variaveisEm(n); track v.nome) { <option [value]="v.nome"></option> }</datalist>
                <div class="next-box">
                  <label class="form-label" for="nsenao">Se nenhuma regra valer, ir para</label>
                  <select class="form-input" id="nsenao" [ngModel]="n.senao ?? null" (ngModelChange)="editarNo(noAberto()!, (x) => (x.senao = $event))">
                    <option [ngValue]="null">escolha a etapa</option>
                    @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">{{ d.rotulo }}</option> }
                  </select>
                </div>
              </div>
            }

            <!-- ir para -->
            @if (n.tipo === 'ir_para') {
              <div class="next-box">
                <label class="form-label" for="nflx">Continuar no fluxo <app-hint [texto]="dicas.ir_para" /></label>
                <select class="form-input" id="nflx" [ngModel]="n.fluxo ?? ''" (ngModelChange)="editarNo(noAberto()!, (x) => (x.fluxo = $event))">
                  <option value="">escolha o fluxo</option>
                  @for (o of outrosFluxos(); track o.id) { <option [value]="o.id">{{ o.nome }}{{ o.ativo ? '' : ' (desativado)' }}</option> }
                </select>
              </div>
            }

            <!-- encaminhar -->
            @if (n.tipo === 'encaminhar') {
              <label class="switch-row">
                <span>Devolver ao mesmo atendente<small>Quando o cliente já foi atendido antes, volta para quem o atendeu (se não, usa o rodízio).</small></span>
                <button type="button" role="switch" class="switch" [class.switch-on]="!!n.reutilizarAtendente" [attr.aria-checked]="!!n.reutilizarAtendente" (click)="editarNo(noAberto()!, (x) => (x.reutilizarAtendente = !x.reutilizarAtendente))"><span class="switch-knob"></span></button>
              </label>
            }

            <!-- próximo -->
            @if (temProximo(n.tipo)) {
              <div class="next-box space-y-3">
                <div>
                  <label class="form-label" for="nn">Depois desta etapa, ir para <app-hint [texto]="dicas.proximo" /></label>
                  <select class="form-input" id="nn" [ngModel]="n.proximo ?? null" (ngModelChange)="editarNo(noAberto()!, (x) => (x.proximo = $event))">
                    <option [ngValue]="null">escolha a próxima etapa</option>
                    @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">{{ d.rotulo }}</option> }
                  </select>
                </div>
                @if (n.tipo === 'ferramenta') {
                  <div>
                    <label class="form-label" for="nfalha">Se a ferramenta falhar, ir para <app-hint [texto]="dicas.falha" /></label>
                    <select class="form-input" id="nfalha" [ngModel]="n.falha ?? null" (ngModelChange)="editarNo(noAberto()!, (x) => (x.falha = $event))">
                      <option [ngValue]="null">seguir normalmente</option>
                      @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">{{ d.rotulo }}</option> }
                    </select>
                  </div>
                  @if (ferramenta(n.ferramenta)?.modo === 'escolha') {
                    <div>
                      <label class="form-label" for="nso">Sem opções para oferecer, ir para <app-hint [texto]="dicas.semOpcoes" /></label>
                      <select class="form-input" id="nso" [ngModel]="n.semOpcoes ?? null" (ngModelChange)="editarNo(noAberto()!, (x) => (x.semOpcoes = $event))">
                        <option [ngValue]="null">mesmo caminho de “se falhar”</option>
                        @for (d of destinos(n.id); track d.id) { <option [ngValue]="d.id">{{ d.rotulo }}</option> }
                      </select>
                    </div>
                  }
                }
              </div>
            } @else if (n.tipo === 'encaminhar' || n.tipo === 'fim') {
              <p class="text-sm next-box">{{ n.tipo === 'fim' ? 'O fluxo termina aqui e o cliente volta ao fluxo de início.' : 'O fluxo termina aqui: um atendente assume (rodízio).' }}</p>
            }

            <!-- pontos essenciais (IA) -->
            @if (temTexto(n.tipo)) {
              <details class="adv">
                <summary><app-icon name="brilho" [size]="14" />O que a IA precisa manter ao reescrever <app-hint [texto]="dicas.spec" /></summary>
                <div class="space-y-3">
                  <div><label class="form-label" for="nsobj">Objetivo da mensagem</label>
                    <input class="form-input" id="nsobj" maxlength="300" [ngModel]="n.spec?.objetivo ?? ''" (ngModelChange)="setSpec('objetivo', $event)" placeholder="Ex.: Pedir o nome do cliente antes de seguir" /></div>
                  <div><label class="form-label" for="nspts">Pontos essenciais (um por linha; alternativas com /)</label>
                    <textarea class="form-input" id="nspts" rows="3" [ngModel]="pontosTexto(n)" (change)="setPontos($any($event.target).value)" placeholder="nome&#10;projeto / planta"></textarea></div>
                </div>
              </details>
            }
          </div>
        }
        <ng-container sheet-footer>
          @if (noAtual()) {
            <button type="button" class="icon-btn icon-danger" (click)="removerNo(noAberto()!)" aria-label="Excluir esta etapa" title="Excluir esta etapa"><app-icon name="lixeira" /></button>
            <button type="button" class="btn btn-primary btn-sm ml-auto" (click)="noAberto.set(null)">Pronto</button>
          }
        </ng-container>
      </app-sheet>

      <!-- Testar (painel lateral) -->
      <app-sheet [open]="testando()" title="Testar este fluxo" subtitle="Roda o rascunho sem enviar nada a clientes. Ferramentas rodam em modo simulado." width="28rem" (closed)="testando.set(false)">
        <div class="test-chat chat">
          @for (m of log(); track $index) { <div class="bubble" [class.bubble-user]="m.de === 'cliente'" [class.bubble-bot]="m.de === 'bot'" [class.bubble-fx]="m.de === 'efeito'">{{ m.texto }}</div> }
          @if (!log().length) { <p class="text-sm" style="color: var(--cmm-muted);">Clique em “Começar” para ver a primeira mensagem.</p> }
          @if (erros().length) { <ul class="test-err" role="alert">@for (e of erros(); track e) { <li>{{ e }}</li> }</ul> }
        </div>
        <ng-container sheet-footer>
          <form class="flex gap-2 w-full" (ngSubmit)="enviar($event)">
            @if (!estado() && !terminou()) { <button type="button" class="btn btn-primary btn-sm w-full" (click)="comecar()" [disabled]="carregando()">Começar</button> }
            @else if (terminou()) { <button type="button" class="btn btn-secondary btn-sm w-full" (click)="comecar()">Testar de novo</button> }
            @else {
              <input class="form-input flex-1" name="tx" [value]="texto()" (input)="texto.set($any($event.target).value)" placeholder="Resposta do cliente…" autocomplete="off" aria-label="Resposta do cliente" />
              <button type="submit" class="btn btn-primary btn-sm" [disabled]="carregando()">Enviar</button>
            }
          </form>
        </ng-container>
      </app-sheet>
    }
  `,
  styles: [`
    :host { display: block; }
    .fx { display: flex; flex-direction: column; gap: 1rem; max-width: 46rem; }
    .fx-bar { display: flex; align-items: center; gap: .6rem .9rem; flex-wrap: wrap; padding: .55rem .75rem; border: 1px solid var(--cmm-border); border-radius: 1rem; background: var(--cmm-panel); }
    .fx-state { font-size: .8125rem; font-weight: 600; }
    .fx-opt { display: inline-flex; align-items: center; gap: .45rem; font-size: .8125rem; color: var(--cmm-muted); }
    .bar-sel { width: auto; min-height: 0; padding-block: .25rem; }
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
    [data-tipo='mensagem'] { --tc: #64748b; } [data-tipo='confirmacao'] { --tc: #10b981; } [data-tipo='opcoes'] { --tc: #8b5cf6; } [data-tipo='multipla'] { --tc: #a855f7; } [data-tipo='pergunta'] { --tc: #3b82f6; }
    [data-tipo='arquivos'] { --tc: #f59e0b; } [data-tipo='ferramenta'] { --tc: #14b8a6; } [data-tipo='condicao'] { --tc: #0ea5e9; } [data-tipo='ir_para'] { --tc: #6366f1; } [data-tipo='encaminhar'] { --tc: var(--cmm-accent); } [data-tipo='fim'] { --tc: #94a3b8; }
    .tl-step .tl-ico, .sheet-head .tl-ico, .pick .tl-ico { color: var(--tc); }
    .test-chat .bubble { max-width: 90%; font-size: .8125rem; }
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
    .opt-fix { padding: .5rem .75rem; border-radius: .5rem; background: rgba(128,128,128,.1); font-weight: 600; min-width: 4rem; }
    .node-title { flex: 1 1 auto; min-width: 0; border: 1px solid transparent; background: transparent; font-weight: 700; font-size: 1.05rem; padding: .25rem .4rem; border-radius: .5rem; color: var(--cmm-ink); }
    .node-title:hover, .node-title:focus { border-color: var(--cmm-border); outline: none; }
    .next-box { padding: .9rem 1rem; border-radius: .9rem; background: color-mix(in srgb, var(--cmm-border) 28%, var(--cmm-panel)); }
    .opt { display: grid; grid-template-columns: 1.8rem 1fr 1fr auto; gap: .5rem; align-items: center; }
    .opt-words { grid-column: 2 / -1; font-size: .8rem; min-height: 2.2rem; }
    .rule { display: grid; grid-template-columns: 1.8rem 1fr auto 1fr 1fr auto; gap: .4rem; align-items: center; }
    @media (max-width: 700px) { .opt { grid-template-columns: 1.8rem 1fr auto; } .opt select { grid-column: 2 / 4; } .rule { grid-template-columns: 1.8rem 1fr auto; } .rule select, .rule input { grid-column: 2 / 4; } }
    .opt-n { width: 1.6rem; height: 1.6rem; border-radius: 99px; display: grid; place-items: center; font-weight: 800; font-size: .75rem; background: var(--cmm-accent-soft); color: var(--cmm-accent); flex-shrink: 0; }
    .test-chat { gap: .45rem; }
    .test-err { margin-top: .5rem; padding: .6rem .9rem .6rem 1.6rem; list-style: disc; font-size: .78rem; font-weight: 600; color: var(--cmm-danger); background: color-mix(in srgb, var(--cmm-danger) 8%, var(--cmm-panel)); border-radius: .75rem; }
  `],
})
export class IaFluxosComponent {
  private readonly api = inject(IaApiService);
  private readonly modal = inject(ModalService);

  fluxos = input.required<IaFlow[]>();
  ferramentas = input<IaTool[]>([]);
  tipos = input<IaNodeTypeInfo[]>([]);
  indice = input.required<number>();
  mudou = output<IaFlow[]>();

  dicas = DICAS;
  picker = signal<number | null>(null);
  varDialogo = signal(false);
  varPainel = signal(false);
  sug = signal<{ lista: Variavel[]; idx: number; inicio: number } | null>(null);
  config = signal(false);
  noAberto = signal<number | null>(null);
  testando = signal(false);
  atual = computed(() => this.fluxos()[this.indice()] ?? null);
  /** Etapa aberta no painel lateral (null quando fechado). */
  noAtual = computed(() => { const i = this.noAberto(); return i === null ? null : this.atual()?.nos[i] ?? null; });
  outrosFluxos = computed(() => this.fluxos().filter((_, i) => i !== this.indice()));
  grupos = computed(() => [...new Set(this.tipos().map((t) => t.grupo))]);
  gruposFerramentas = computed(() => [...new Set(this.ferramentas().map((t) => t.grupo))]);

  // teste
  estado = signal<IaFlowState | null>(null);
  log = signal<Array<{ de: 'cliente' | 'bot' | 'efeito'; texto: string }>>([]);
  erros = signal<string[]>([]);
  terminou = signal(false);
  carregando = signal(false);
  texto = signal('');

  icone(t: IaNodeType): IconName { return ICONE[t] ?? 'mensagem'; }
  info(t: IaNodeType): IaNodeTypeInfo { return this.tipos().find((x) => x.tipo === t) ?? { tipo: t, grupo: '', label: t, ajuda: '', regra: '' }; }
  tiposDo(g: string) { return this.tipos().filter((t) => t.grupo === g); }
  ferramenta(k?: string) { return this.ferramentas().find((t) => t.key === k); }
  ferramentasDo(g: string) { return this.ferramentas().filter((t) => t.grupo === g); }
  temTexto(t: IaNodeType): boolean { return ['mensagem', 'pergunta', 'opcoes', 'confirmacao', 'multipla', 'arquivos', 'encaminhar', 'fim'].includes(t); }
  temProximo(t: IaNodeType): boolean { return ['mensagem', 'pergunta', 'arquivos', 'multipla', 'ferramenta'].includes(t); }
  lista(v: string): string[] { return v.split(',').map((x) => x.trim()).filter(Boolean).slice(0, 10); }

  destinos(excluirId: string) {
    return (this.atual()?.nos ?? []).map((n, i) => ({ id: n.id, rotulo: `${i + 1}. ${n.titulo || this.info(n.tipo).label}` })).filter((d) => d.id !== excluirId);
  }

  /** Para onde a etapa leva, em chips curtos (só o que foge do óbvio "segue para a próxima"). */
  ramos(n: IaNode, f: IaFlow): Array<{ texto: string; ruim: boolean }> {
    const alvo = (id: string | null | undefined) => { const k = f.nos.findIndex((x) => x.id === id); return k < 0 ? null : k + 1; };
    const i = f.nos.findIndex((x) => x.id === n.id);
    if (n.tipo === 'encaminhar' || n.tipo === 'fim') return [];
    if (n.tipo === 'ir_para') { const o = this.fluxos().find((x) => x.id === n.fluxo); return [{ texto: o ? `→ fluxo “${o.nome}”` : 'sem fluxo de destino', ruim: !o }]; }
    if (n.tipo === 'opcoes' || n.tipo === 'confirmacao') {
      return (n.opcoes ?? []).map((o, j) => { const k = alvo(o.proximo); return { texto: `${n.tipo === 'confirmacao' ? o.rotulo : `${j + 1}. ${o.rotulo || '…'}`} → ${k ? 'etapa ' + k : 'sem destino'}`, ruim: !k }; });
    }
    if (n.tipo === 'condicao') {
      const out = (n.regras ?? []).map((r, j) => { const k = alvo(r.proximo); return { texto: `regra ${j + 1} → ${k ? 'etapa ' + k : 'sem destino'}`, ruim: !k }; });
      const s = alvo(n.senao);
      out.push({ texto: `senão → ${s ? 'etapa ' + s : 'sem destino'}`, ruim: !s });
      return out;
    }
    const out: Array<{ texto: string; ruim: boolean }> = [];
    const k = alvo(n.proximo);
    if (!k) out.push({ texto: 'sem próxima etapa', ruim: true });
    else if (k !== i + 2) out.push({ texto: `segue para a etapa ${k}`, ruim: false });
    if (n.tipo === 'ferramenta') {
      const fk = alvo(n.falha);
      if (fk) out.push({ texto: `se falhar → etapa ${fk}`, ruim: false });
      const sk = alvo(n.semOpcoes);
      if (sk) out.push({ texto: `sem opções → etapa ${sk}`, ruim: false });
    }
    return out;
  }

  resumo(n: IaNode): string {
    switch (n.tipo) {
      case 'ferramenta': { const t = this.ferramenta(n.ferramenta); return t ? t.label + (n.variavel ? `  → {${n.variavel}}` : '') : 'Escolha a ferramenta'; }
      case 'arquivos': return (n.texto || 'Recebe arquivos') + ((n.minimo ?? 0) > 0 ? ` (mín. ${n.minimo})` : '');
      case 'pergunta': return (n.texto || 'Sem texto') + (n.variavel ? `  → {${n.variavel}}` : '');
      case 'multipla': return `${n.itens?.length ?? 0} itens` + (n.variavel ? `  → {${n.variavel}}` : '') + (n.texto ? ` · ${n.texto}` : '');
      case 'condicao': return `${n.regras?.length ?? 0} regra(s)`;
      case 'ir_para': return 'Continua em outro fluxo';
      default: return n.texto || (n.tipo === 'encaminhar' ? 'Usa a mensagem padrão de encaminhamento.' : n.tipo === 'fim' ? 'Sem mensagem final.' : 'Sem texto');
    }
  }

  // ── análise (espelha a validação do servidor, que é quem decide ao publicar)
  private produz(n: IaNode): { vars: string[]; pasta: boolean } {
    const vars: string[] = [];
    const v = guardaVar(n);
    if (v) vars.push(v);
    let pasta = false;
    if (n.tipo === 'ferramenta') {
      const t = this.ferramenta(n.ferramenta);
      pasta = !!t?.produz.pasta;
      vars.push(...(t?.produz.vars ?? []));
      for (const ps of t?.params ?? []) if (ps.define && typeof n.params?.[ps.key] === 'string' && n.params[ps.key]) vars.push(String(n.params[ps.key]));
    }
    return { vars, pasta };
  }

  analise = computed(() => {
    const f = this.atual();
    const ent = new Map<string, Ctx>();
    if (!f?.nos.length) return ent;
    const por = new Map(f.nos.map((n) => [n.id, n]));
    ent.set(f.nos[0].id, { vars: new Set(), pasta: false });
    const fila = [f.nos[0].id];
    for (let g = 0; fila.length && g < 5000; g++) {
      const n = por.get(fila.shift()!)!;
      const e = ent.get(n.id)!;
      const prod = this.produz(n);
      const saida: Ctx = { vars: new Set([...e.vars, ...prod.vars]), pasta: e.pasta || prod.pasta };
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
  });

  private contextoEm(pos: number): Ctx {
    const f = this.atual();
    const ant = f?.nos[pos - 1];
    if (!f || !ant) return { vars: new Set(), pasta: false };
    const ent = this.analise().get(ant.id) ?? { vars: new Set<string>(), pasta: false };
    const prod = this.produz(ant);
    return { vars: new Set([...ent.vars, ...prod.vars]), pasta: ent.pasta || prod.pasta };
  }

  /** O que ainda falta antes de inserir este tipo naquele ponto da lista. */
  faltaParaTipo(tipo: IaNodeType, pos: number): string | null {
    const c = this.contextoEm(pos);
    if (tipo === 'arquivos' && !c.pasta) return 'Crie antes a pasta do cliente (ferramenta “Drive: criar a pasta do cliente”) para os arquivos serem guardados.';
    if (tipo === 'condicao' && !c.vars.size) return 'Ainda não há respostas para comparar: coloque antes uma Pergunta ou Escolha com variável.';
    if ((tipo === 'encaminhar' || tipo === 'fim' || tipo === 'ir_para') && pos < (this.atual()?.nos.length ?? 0)) return 'As etapas abaixo só serão alcançadas por outros caminhos.';
    return null;
  }

  variaveisEm(n: IaNode): Variavel[] {
    const f = this.atual();
    if (!f) return [];
    const ctx = this.analise().get(n.id);
    const out: Variavel[] = [];
    f.nos.forEach((x, i) => {
      for (const v of this.produz(x).vars) {
        if (out.some((o) => o.nome === v)) continue;
        out.push({ nome: v, origem: `Etapa ${i + 1} · ${x.titulo || this.info(x.tipo).label}`, usavel: x.id !== n.id && !!ctx?.vars.has(v) });
      }
    });
    if (!out.some((o) => o.nome === 'nome')) out.unshift({ nome: 'nome', origem: 'Cadastro do cliente (quando já é conhecido)', usavel: true });
    else { const k = out.findIndex((o) => o.nome === 'nome'); const [nm] = out.splice(k, 1); out.unshift(nm); }
    return out;
  }
  naoUsaveis(n: IaNode): Variavel[] { return this.variaveisEm(n).filter((v) => !v.usavel); }

  resumoVariaveis = computed(() => {
    const f = this.atual();
    if (!f) return [] as Array<{ nome: string; origem: string; usos: string[]; cedo: string[] }>;
    const ana = this.analise();
    const vistos = new Set<string>();
    const out: Array<{ nome: string; origem: string; usos: string[]; cedo: string[] }> = [];
    f.nos.forEach((x, i) => {
      for (const v of this.produz(x).vars) {
        if (vistos.has(v)) continue;
        vistos.add(v);
        const usos: string[] = []; const cedo: string[] = [];
        f.nos.forEach((y, k) => {
          if (![...(y.texto ?? '').matchAll(/\{(\w+)\}/g)].some((m) => m[1] === v)) return;
          usos.push(`etapa ${k + 1}`);
          if (v !== 'nome' && !ana.get(y.id)?.vars.has(v)) cedo.push(`etapa ${k + 1}`);
        });
        out.push({ nome: v, origem: `Etapa ${i + 1} · ${x.titulo || this.info(x.tipo).label}`, usos, cedo });
      }
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
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') { ev.preventDefault(); const d = ev.key === 'ArrowDown' ? 1 : -1; this.sug.set({ ...sg, idx: (sg.idx + d + sg.lista.length) % sg.lista.length }); }
    else if (ev.key === 'Enter' || ev.key === 'Tab') { ev.preventDefault(); this.escolherSug(el, sg.lista[sg.idx].nome); }
    else if (ev.key === 'Escape') { ev.preventDefault(); ev.stopPropagation(); this.sug.set(null); }
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
    this.editarNo(this.noAberto()!, (x) => (x.texto = texto.slice(0, 1600)));
    setTimeout(() => { el.focus(); el.setSelectionRange(cursor, cursor); });
  }

  /** Tudo que falta numa etapa para ela funcionar (em frases curtas). */
  faltas(n: IaNode): string[] {
    const f = this.atual();
    const out: string[] = [];
    if (!f) return out;
    const c = this.analise().get(n.id);
    const precisaTexto = ['mensagem', 'opcoes', 'confirmacao', 'pergunta', 'arquivos', 'multipla'].includes(n.tipo);
    if (precisaTexto && !(n.texto ?? '').trim()) out.push('Escreva o que o bot diz.');
    if (this.temProximo(n.tipo) && !n.proximo) out.push('Escolha a próxima etapa.');
    if ((n.tipo === 'pergunta' || n.tipo === 'multipla') && !n.variavel) out.push('Dê um nome à resposta (ex.: nome, bairro).');
    if (n.tipo === 'ferramenta') {
      const t = this.ferramenta(n.ferramenta);
      if (!t) out.push('Escolha a ferramenta.');
      else {
        for (const ps of t.params) { const v = n.params?.[ps.key]; if (ps.obrigatorio && (v === undefined || v === null || v === '')) out.push(`Preencha “${ps.label}”.`); }
        if (t.modo === 'escolha' && !n.variavel) out.push('Dê um nome à variável que guarda a escolha.');
        if (c) {
          for (const v of t.requer.vars ?? []) if (!c.vars.has(v)) out.push(`“${t.label}” precisa de {${v}} respondida antes.`);
          if (t.requer.pasta && !c.pasta) out.push(`“${t.label}” precisa da pasta do cliente criada antes.`);
        }
      }
    }
    if (n.tipo === 'multipla' && !(n.itens?.length)) out.push('Adicione ao menos um item.');
    if (n.tipo === 'ir_para' && !this.fluxos().some((x) => x.id === n.fluxo)) out.push('Escolha o fluxo de destino.');
    if (n.tipo === 'condicao') {
      (n.regras ?? []).forEach((r, j) => { if (!r.variavel) out.push(`Escolha a variável da regra ${j + 1}.`); if (!r.proximo) out.push(`Escolha o destino da regra ${j + 1}.`); });
      if (!n.senao) out.push('Escolha para onde ir se nenhuma regra valer.');
    }
    if (n.tipo === 'opcoes' || n.tipo === 'confirmacao')
      (n.opcoes ?? []).forEach((o, j) => { if (!o.rotulo.trim()) out.push(`Dê um texto à opção ${j + 1}.`); if (!o.proximo) out.push(`Escolha o destino de “${o.rotulo || 'opção ' + (j + 1)}”.`); });
    if (!c) { out.push('Nenhum caminho chega até esta etapa: ligue-a a uma anterior.'); return out; }
    for (const m of (n.texto ?? '').matchAll(/\{(\w+)\}/g)) {
      const definida = f.nos.some((x) => this.produz(x).vars.includes(m[1]));
      if (m[1] !== 'nome' && definida && !c.vars.has(m[1])) out.push(`{${m[1]}} ainda não foi respondida aqui: coloque a pergunta antes.`);
    }
    return out;
  }

  private emit(fn: (fs: IaFlow[]) => void): void {
    const copia: IaFlow[] = JSON.parse(JSON.stringify(this.fluxos()));
    fn(copia);
    this.mudou.emit(copia);
  }
  editar(fn: (f: IaFlow) => void): void { const i = this.indice(); this.emit((fs) => fn(fs[i])); this.zerarTeste(); }
  editarNo(idx: number, fn: (n: IaNode) => void): void { this.editar((f) => fn(f.nos[idx])); }

  param(n: IaNode, key: string, padrao: unknown): unknown { const v = n.params?.[key]; return v === undefined ? padrao : v; }
  setParam(key: string, v: unknown): void { this.editarNo(this.noAberto()!, (x) => { x.params = { ...(x.params ?? {}), [key]: v as string }; }); }
  trocarFerramenta(key: string): void {
    const t = this.ferramenta(key);
    this.editarNo(this.noAberto()!, (x) => {
      x.ferramenta = key;
      const params: Record<string, string | number | boolean | null> = {};
      for (const ps of t?.params ?? []) if (ps.padrao !== undefined) params[ps.key] = ps.padrao;
      x.params = params;
      if (t?.modo === 'escolha' && !x.variavel) x.variavel = 'escolha';
    });
  }
  setSpec(k: 'objetivo', v: string): void { this.editarNo(this.noAberto()!, (x) => { x.spec = { ...(x.spec ?? {}), [k]: v }; }); }
  pontosTexto(n: IaNode): string { return (n.spec?.pontos ?? []).map((p) => p.join(' / ')).join('\n'); }
  setPontos(v: string): void {
    const pontos = v.split('\n').map((l) => l.split('/').map((x) => x.trim()).filter(Boolean)).filter((p) => p.length);
    this.editarNo(this.noAberto()!, (x) => { x.spec = { ...(x.spec ?? {}), pontos }; });
  }

  async excluir(): Promise<void> {
    const f = this.atual();
    if (!f || !(await this.modal.confirm('Excluir este fluxo?', `“${f.nome}” deixa de existir quando você publicar. Etapas “Ir para” que apontam para ele precisarão de outro destino.`, 'Excluir'))) return;
    const i = this.indice();
    this.emit((fs) => fs.splice(i, 1));
  }

  addNo(tipo: IaNodeType, em?: number): void {
    const f0 = this.atual();
    const pos = Math.max(0, Math.min(em ?? f0?.nos.length ?? 0, f0?.nos.length ?? 0));
    this.picker.set(null);
    this.editar((f) => {
      const max = f.nos.reduce((m, n) => Math.max(m, Number(n.id.replace(/\D/g, '')) || 0), 0);
      const depois = f.nos[pos]?.id ?? null;
      const base: IaNode = { id: 'n' + (max + 1), tipo, titulo: this.info(tipo).label };
      if (['mensagem', 'pergunta', 'arquivos', 'multipla'].includes(tipo)) { base.texto = ''; base.proximo = depois; }
      if (tipo === 'pergunta') { base.variavel = ''; base.validacao = 'texto'; }
      if (tipo === 'arquivos') base.minimo = 1;
      if (tipo === 'multipla') { base.variavel = ''; base.itens = [{ rotulo: '' }]; }
      if (tipo === 'confirmacao') { base.texto = ''; base.opcoes = [{ rotulo: 'Sim', proximo: depois }, { rotulo: 'Não', proximo: null }]; }
      if (tipo === 'opcoes') { base.texto = ''; base.opcoes = [{ rotulo: '', proximo: depois }, { rotulo: '', proximo: null }]; }
      if (tipo === 'ferramenta') { base.ferramenta = ''; base.params = {}; base.proximo = depois; base.falha = null; }
      if (tipo === 'condicao') { base.regras = [{ variavel: '', op: 'igual' as IaCondOp, valor: '', proximo: depois }]; base.senao = null; }
      if (tipo === 'ir_para') base.fluxo = '';
      // Liga sozinho a etapa anterior à nova, para o caminho linear já nascer pronto.
      const ant = f.nos[pos - 1];
      if (ant && this.temProximo(ant.tipo) && (!ant.proximo || ant.proximo === depois)) ant.proximo = base.id;
      f.nos.splice(pos, 0, base);
    });
    this.noAberto.set(pos);
  }
  mover(i: number, d: number): void {
    this.editar((f) => { const j = i + d; if (j < 0 || j >= f.nos.length) return; [f.nos[i], f.nos[j]] = [f.nos[j], f.nos[i]]; });
  }
  async removerNo(i: number): Promise<void> {
    const n = this.atual()?.nos[i];
    if (!n || !(await this.modal.confirm('Excluir esta etapa?', `“${n.titulo}” será removida e quem chegava nela passa direto para a etapa seguinte.`, 'Excluir'))) return;
    this.editar((f) => {
      const [rm] = f.nos.splice(i, 1);
      const sub = rm.proximo ?? null;
      for (const x of f.nos) {
        if (x.proximo === rm.id) x.proximo = sub;
        if (x.falha === rm.id) x.falha = sub;
        if (x.semOpcoes === rm.id) x.semOpcoes = sub;
        if (x.senao === rm.id) x.senao = sub;
        x.opcoes?.forEach((o) => { if (o.proximo === rm.id) o.proximo = sub; });
        x.regras?.forEach((r) => { if (r.proximo === rm.id) r.proximo = sub; });
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
    this.api.previewFlow(this.fluxos(), f.id, estado, texto).subscribe({
      next: (r) => {
        this.erros.set([]);
        this.log.update((l) => [
          ...l,
          ...r.mensagens.map((m) => ({ de: 'bot' as const, texto: m })),
          ...r.efeitos.map((e) => ({ de: 'efeito' as const, texto: e })),
          ...(r.saiu ? [{ de: 'efeito' as const, texto: r.saiu === 'encaminhado' ? 'Cliente encaminhado a um atendente' : 'Volta ao fluxo de início' }] : []),
        ]);
        this.estado.set(r.estado);
        this.terminou.set(!!r.saiu);
        this.carregando.set(false);
        setTimeout(() => { const el = document.querySelector('.test-chat')?.closest('.sheet-body'); el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, 50);
      },
      error: (e) => {
        const m = e?.error?.message;
        this.erros.set(Array.isArray(m) ? m : [m || 'Não foi possível testar.']);
        this.carregando.set(false);
      },
    });
  }
}
