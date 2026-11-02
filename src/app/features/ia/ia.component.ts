import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CounterDirective } from '../../core/motion/counter.directive';
import { ToastService } from '../../core/ui/toast.service';
import { ModalService } from '../../shared/services/modal.service';
import {
  IaApiService, IaCatalog, IaConfigField, IaConversationDetail, IaConversationSummary, IaList, IaOverview, IaSimulation,
} from './ia-api.service';

type Aba = 'visao' | 'conversas' | 'simulador' | 'config' | 'mensagens';

const ETAPAS: Array<{ key: string; label: string }> = [
  { key: 'MENU', label: 'Menu inicial' },
  { key: 'NOME', label: 'Pediu o nome' },
  { key: 'CONFIRMA_NOME', label: 'Confirmando o nome' },
  { key: 'ENVIO_ARQUIVOS', label: 'Enviando arquivos' },
  { key: 'CATEGORIAS', label: 'Escolhendo ambientes' },
  { key: 'CASA_AP', label: 'Casa ou apartamento' },
  { key: 'PLANTA_ACHOU', label: 'Planta baixa' },
  { key: 'AGENDAR', label: 'Quer agendar medição?' },
  { key: 'HORARIO', label: 'Escolhendo horário' },
  { key: 'VISITA', label: 'Quer visitar a loja?' },
  { key: 'RECONHECIMENTO', label: 'Voltou (reconhecimento)' },
  { key: 'HUMANO', label: 'Com atendente humano' },
];
const TRILHAS: Record<string, string> = {
  projeto: 'Já tem projeto', planta: 'Só planta baixa', semNada: 'Não tem nada', boleto: 'Boleto', loja: 'Endereço da loja', sem_trilha: 'Ainda no menu',
};
const DECISOES: Record<string, string> = {
  fluxo: 'Texto livre entendido', duvida_respondida: 'Dúvidas respondidas', fora_escopo: 'Recusadas (fora de escopo)', prefilter_bloqueou: 'Barradas pelo pré-filtro',
  duvida_sem_base: 'Dúvida sem base → humano', duvida_reprovada: 'Resposta reprovada → humano', escopo_indisponivel: 'Escopo indisponível → humano',
  ia_indisponivel: 'IA indisponível (regras fixas)', sem_interpretacao: 'Sem interpretação',
};
const COMUNICACAO: Record<string, string> = {
  escrita_ok: 'Mensagens naturais enviadas', fallback_validacao: 'Reprovadas pelo revisor → texto padrão', fallback_erro: 'IA falhou → texto padrão',
  fallback_limite: 'Limite diário → texto padrão', sem_spec: 'Texto livre (sem revisão)',
};
const GRUPOS: Array<{ key: IaConfigField['group']; titulo: string; texto: string }> = [
  { key: 'geral', titulo: 'Operação', texto: 'O que está ligado agora.' },
  { key: 'ia', titulo: 'Inteligência artificial', texto: 'Chave e modelos usados pelos agentes.' },
  { key: 'comunicacao', titulo: 'Comunicação', texto: 'Como as mensagens chegam ao cliente.' },
  { key: 'limites', titulo: 'Limites e custo', texto: 'Proteções contra abuso e gasto.' },
  { key: 'atendimento', titulo: 'Atendimento humano', texto: 'Para onde o cliente vai quando o bot passa a vez.' },
  { key: 'integracoes', titulo: 'Integrações', texto: 'Drive e Pontta.' },
];

@Component({
  selector: 'app-ia',
  standalone: true,
  imports: [FormsModule, CounterDirective],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho com estado ao vivo -->
      <div class="page-header">
        <div>
          <div class="flex items-center gap-3 flex-wrap">
            <h1 class="page-title">IA <span class="text-gradient">Vera D'Or</span></h1>
            @if (overview(); as o) {
              <span class="live-pill" [class.live-on]="o.sistema.enabled" [class.live-off]="!o.sistema.enabled">
                <span class="live-dot"></span>{{ o.sistema.enabled ? 'No ar' : 'Desligada' }}
              </span>
              @if (o.sistema.enabled && o.sistema.aiBreakerOpen) {
                <span class="badge badge-warning">IA pausada (falhas seguidas)</span>
              }
              @if (o.sistema.enabled && !o.sistema.aiEnabled) {
                <span class="badge badge-neutral">Só regras fixas</span>
              }
            }
          </div>
          <p class="page-subtitle">Acompanhe, teste e configure o atendimento automático do WhatsApp.</p>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs" style="color: var(--cmm-muted);" aria-live="off">{{ atualizadoLabel() }}</span>
          <button type="button" class="btn btn-secondary btn-sm" (click)="refreshAll()" [disabled]="loading()">Atualizar</button>
        </div>
      </div>

      <!-- Abas -->
      <div class="seg" role="tablist" aria-label="Seções da IA">
        @for (t of abas; track t.key) {
          <button type="button" role="tab" class="seg-btn" [class.seg-on]="aba() === t.key" [attr.aria-selected]="aba() === t.key" (click)="setAba(t.key)">
            {{ t.label }}
            @if (t.key === 'conversas' && overview()?.totais?.comErro) { <span class="seg-count">{{ overview()!.totais.comErro }}</span> }
          </button>
        }
      </div>

      @switch (aba()) {
        <!-- ═══════════ VISÃO GERAL ═══════════ -->
        @case ('visao') {
          @if (overview(); as o) {
            <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
              @for (k of kpis(); track k.label) {
                <div class="panel panel-pad kpi">
                  <p class="kpi-label">{{ k.label }}</p>
                  <p class="kpi-value font-display" [appCounter]="k.value">{{ k.value }}</p>
                  @if (k.hint) { <p class="kpi-hint">{{ k.hint }}</p> }
                </div>
              }
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div class="panel panel-pad xl:col-span-2">
                <div class="flex items-baseline justify-between mb-4">
                  <h2 class="sec-title">Conversas novas — últimos 14 dias</h2>
                  <span class="text-xs" style="color: var(--cmm-muted);">{{ o.totais.novos7d }} nos últimos 7 dias</span>
                </div>
                <div class="chart" role="img" [attr.aria-label]="'Conversas novas por dia: ' + serieTexto()">
                  @for (d of o.serie; track d.dia; let i = $index) {
                    <div class="chart-col" [title]="d.dia + ': ' + d.total">
                      <span class="chart-num">{{ d.total || '' }}</span>
                      <div class="chart-bar" [style.height.%]="ready() ? altura(d.total) : 0" [style.transition-delay.ms]="i * 40"></div>
                      <span class="chart-day">{{ diaCurto(d.dia) }}</span>
                    </div>
                  }
                </div>
              </div>

              <div class="panel panel-pad">
                <h2 class="sec-title mb-4">O que o cliente escolheu</h2>
                <div class="space-y-3">
                  @for (t of trilhasList(); track t.label) {
                    <div>
                      <div class="flex justify-between text-sm mb-1"><span>{{ t.label }}</span><span class="font-semibold">{{ t.value }}</span></div>
                      <div class="bar"><div class="bar-fill" [style.width.%]="ready() ? t.pct : 0"></div></div>
                    </div>
                  } @empty {
                    <p class="text-sm" style="color: var(--cmm-muted);">Ainda sem conversas.</p>
                  }
                </div>
              </div>
            </div>

            <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div class="panel panel-pad xl:col-span-2">
                <h2 class="sec-title mb-1">Onde as conversas estão</h2>
                <p class="text-sm mb-4" style="color: var(--cmm-muted);">Funil por etapa. Clique para ver as conversas daquela etapa.</p>
                <div class="space-y-2">
                  @for (e of funilList(); track e.key; let i = $index) {
                    <button type="button" class="funnel-row" (click)="verEtapa(e.key)">
                      <span class="funnel-label">{{ e.label }}</span>
                      <span class="bar flex-1"><span class="bar-fill" [class.bar-human]="e.key === 'HUMANO'" [style.width.%]="ready() ? e.pct : 0" [style.transition-delay.ms]="i * 50"></span></span>
                      <span class="funnel-n">{{ e.value }}</span>
                    </button>
                  }
                </div>
              </div>

              <div class="panel panel-pad">
                <h2 class="sec-title mb-4">Saúde dos agentes</h2>
                <dl class="kv">
                  <div><dt>Modelo</dt><dd class="font-mono text-xs">{{ o.sistema.model }}</dd></div>
                  <div><dt>Pontta</dt><dd>{{ o.sistema.ponttaEnabled ? 'Ligado' : 'Desligado' }}</dd></div>
                  <div><dt>Mensagens naturais</dt><dd>{{ o.sistema.comunicacao.humanizada ? 'Ligadas' : 'Desligadas' }}</dd></div>
                  <div><dt>Falhas de entrega</dt><dd [style.color]="o.totais.comErro ? 'var(--cmm-danger)' : ''">{{ o.totais.comErro }}</dd></div>
                </dl>
                <h3 class="mini-title">Decisões dos agentes <span>(desde que o servidor iniciou)</span></h3>
                <ul class="plain-list">
                  @for (d of decisoes(); track d.label) { <li><span>{{ d.label }}</span><b>{{ d.value }}</b></li> } @empty { <li class="muted">Nenhuma ainda.</li> }
                </ul>
                <h3 class="mini-title">Qualidade da comunicação</h3>
                <ul class="plain-list">
                  @for (d of comunicacao(); track d.label) { <li><span>{{ d.label }}</span><b>{{ d.value }}</b></li> } @empty { <li class="muted">Nenhuma ainda.</li> }
                </ul>
              </div>
            </div>
          } @else {
            <div class="grid grid-cols-2 lg:grid-cols-6 gap-3">
              @for (i of [1,2,3,4,5,6]; track i) { <div class="panel panel-pad"><div class="skeleton h-3 w-2/3 mb-3"></div><div class="skeleton h-8 w-1/2"></div></div> }
            </div>
          }
        }

        <!-- ═══════════ CONVERSAS ═══════════ -->
        @case ('conversas') {
          <div class="toolbar">
            <input class="form-input toolbar-search" type="search" placeholder="Buscar por nome, telefone ou ticket…" aria-label="Buscar conversa" [(ngModel)]="busca" (keyup.enter)="aplicarFiltros()" />
            <select class="form-input toolbar-select" aria-label="Filtrar por etapa" [(ngModel)]="filtroEtapa" (ngModelChange)="aplicarFiltros()">
              <option value="">Todas as etapas</option>
              @for (e of etapas; track e.key) { <option [value]="e.key">{{ e.label }}</option> }
            </select>
            <label class="check-chip"><input type="checkbox" [(ngModel)]="soErros" (ngModelChange)="aplicarFiltros()" /> Só com erro</label>
            <button type="button" class="btn btn-primary btn-sm" (click)="aplicarFiltros()">Buscar</button>
          </div>

          <div class="table-shell">
            <table>
              <thead><tr><th>Cliente</th><th>Etapa</th><th>Escolha</th><th>Sinais</th><th>Última mensagem</th></tr></thead>
              <tbody>
                @for (c of lista()?.itens ?? []; track c.id) {
                  <tr class="row-click" tabindex="0" (click)="abrir(c)" (keyup.enter)="abrir(c)" [class.row-on]="detalhe()?.id === c.id">
                    <td>
                      <div class="flex items-center gap-3">
                        <span class="avatar-sm" aria-hidden="true">{{ iniciais(c) }}</span>
                        <div class="min-w-0"><p class="font-semibold truncate">{{ c.nome || 'Sem nome' }}</p><p class="text-xs" style="color: var(--cmm-muted);">{{ c.numero }} · ticket {{ c.ticketId }}</p></div>
                      </div>
                    </td>
                    <td><span class="badge" [class.badge-accent]="c.etapa === 'HUMANO'" [class.badge-neutral]="c.etapa !== 'HUMANO'">{{ etapaLabel(c.etapa) }}</span></td>
                    <td class="text-sm">{{ trilhaLabel(c.trilha) }}</td>
                    <td>
                      <div class="flex gap-1.5 flex-wrap">
                        @if (c.erroEntrega) { <span class="badge badge-danger">Erro</span> }
                        @if (c.foraEscopo > 0) { <span class="badge badge-warning">Fora de escopo ×{{ c.foraEscopo }}</span> }
                        @if (c.invalidas > 0) { <span class="badge badge-neutral">Inválidas ×{{ c.invalidas }}</span> }
                      </div>
                    </td>
                    <td class="text-sm" style="color: var(--cmm-muted);">{{ rel(c.ultimaMensagem) }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5"><div class="empty-state">{{ listaCarregando() ? 'Carregando…' : 'Nenhuma conversa encontrada.' }}</div></td></tr>
                }
              </tbody>
            </table>
          </div>

          @if (lista(); as l) {
            <div class="flex items-center justify-between">
              <p class="text-sm" style="color: var(--cmm-muted);">{{ l.total }} conversa(s) · página {{ l.pagina }} de {{ paginas() }}</p>
              <div class="flex gap-2">
                <button type="button" class="btn btn-secondary btn-sm" [disabled]="l.pagina <= 1" (click)="irPagina(l.pagina - 1)">Anterior</button>
                <button type="button" class="btn btn-secondary btn-sm" [disabled]="l.pagina >= paginas()" (click)="irPagina(l.pagina + 1)">Próxima</button>
              </div>
            </div>
          }
        }

        <!-- ═══════════ SIMULADOR ═══════════ -->
        @case ('simulador') {
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <div class="panel panel-pad lg:col-span-2 space-y-4 self-start">
              <div>
                <h2 class="sec-title">Simulador</h2>
                <p class="text-sm mt-1" style="color: var(--cmm-muted);">Veja o que o bot faria com uma mensagem, sem enviar nada a clientes reais.</p>
              </div>
              <div><label class="form-label" for="sim-etapa">Etapa em que o cliente está</label>
                <select id="sim-etapa" class="form-input" [(ngModel)]="simEtapa">@for (e of etapas; track e.key) { <option [value]="e.key">{{ e.label }}</option> }</select></div>
              <div><label class="form-label" for="sim-trilha">Escolha anterior</label>
                <select id="sim-trilha" class="form-input" [(ngModel)]="simTrilha"><option value="">(nenhuma)</option>@for (t of trilhaOpcoes; track t.key) { <option [value]="t.key">{{ t.label }}</option> }</select></div>
              <div><label class="form-label" for="sim-nome">Nome do cliente (opcional)</label><input id="sim-nome" class="form-input" [(ngModel)]="simNome" placeholder="Ana Paula" /></div>
              <label class="switch-row"><span>Permitir que a IA interprete <small>conta no uso do dia</small></span>
                <button type="button" role="switch" class="switch" [class.switch-on]="simUsarIA()" [attr.aria-checked]="simUsarIA()" (click)="simUsarIA.set(!simUsarIA())"><span class="switch-knob"></span></button></label>
            </div>

            <div class="panel lg:col-span-3 flex flex-col" style="min-height: 28rem;">
              <div class="chat" #chat aria-live="polite">
                @for (m of simLog(); track $index) {
                  <div class="bubble bubble-user">{{ m.texto }}</div>
                  @if (m.resultado; as r) {
                    <div class="sim-meta">
                      <span class="badge" [class.badge-accent]="r.origem === 'ia'" [class.badge-neutral]="r.origem !== 'ia'">{{ r.origem === 'ia' ? 'IA interpretou' : r.origem === 'regras' ? 'Regras fixas' : 'Sem IA' }}</span>
                      <span class="chip">{{ etapaLabel(r.etapaAntes) }} → <b>{{ etapaLabel(r.etapaDepois) }}</b></span>
                      <span class="chip">entrada: {{ r.entrada.kind }}</span>
                      @for (e of r.efeitos; track e) { <span class="chip chip-fx">efeito: {{ e }}</span> }
                    </div>
                    @for (msg of r.mensagens; track $index) { <div class="bubble bubble-bot">{{ msg }}</div> }
                    @if (!r.mensagens.length) { <div class="bubble bubble-none">(o bot não responde nada nesta situação)</div> }
                    <p class="sim-note">{{ r.observacao }}</p>
                  } @else { <div class="bubble bubble-none">{{ m.erro }}</div> }
                } @empty {
                  <div class="empty-state">Escreva como um cliente escreveria. Ex.: <b>2</b>, <b>quero uma cozinha</b>, <b>onde fica a loja?</b></div>
                }
              </div>
              <form class="chat-input" (ngSubmit)="simular()">
                <input class="form-input" name="simTexto" [(ngModel)]="simTexto" placeholder="Mensagem do cliente…" aria-label="Mensagem do cliente" maxlength="600" autocomplete="off" />
                <button type="submit" class="btn btn-primary" [disabled]="simCarregando() || !simTexto.trim()">{{ simCarregando() ? 'Simulando…' : 'Enviar' }}</button>
                @if (simLog().length) { <button type="button" class="btn btn-ghost" (click)="simLog.set([])">Limpar</button> }
              </form>
            </div>
          </div>
        }

        <!-- ═══════════ CONFIGURAÇÃO ═══════════ -->
        @case ('config') {
          <div class="space-y-5 pb-24">
            @for (g of grupos; track g.key) {
              <section class="panel">
                <div class="panel-pad" style="border-bottom: 1px solid var(--cmm-border);">
                  <h2 class="sec-title">{{ g.titulo }}</h2>
                  <p class="text-sm" style="color: var(--cmm-muted);">{{ g.texto }}</p>
                </div>
                <div class="divide-y">
                  @for (f of camposDo(g.key); track f.key) {
                    <div class="cfg-row">
                      <div class="min-w-0">
                        <label class="font-semibold text-sm" [attr.for]="'cfg-' + f.key">{{ f.label }}</label>
                        @if (f.sensitive) { <span class="badge badge-warning ml-2">Afeta clientes</span> }
                        <p class="text-xs mt-1" style="color: var(--cmm-muted);">{{ f.description }}</p>
                      </div>
                      <div class="cfg-ctl">
                        @switch (f.type) {
                          @case ('boolean') {
                            <button type="button" role="switch" [id]="'cfg-' + f.key" class="switch" [class.switch-on]="valorBool(f)" [attr.aria-checked]="valorBool(f)" (click)="setCampo(f, !valorBool(f))"><span class="switch-knob"></span></button>
                          }
                          @case ('number') {
                            <input class="form-input cfg-num" type="number" [id]="'cfg-' + f.key" [min]="f.min ?? null" [max]="f.max ?? null" [ngModel]="valorCampo(f)" (ngModelChange)="setCampo(f, $event)" />
                          }
                          @case ('secret') {
                            <div class="flex flex-col gap-1.5 items-end w-full">
                              <input class="form-input" type="password" autocomplete="new-password" [id]="'cfg-' + f.key" [placeholder]="f.configured ? '•••••••• (já configurada)' : f.placeholder || ''" [ngModel]="draft()[f.key] ?? ''" (ngModelChange)="setCampo(f, $event)" />
                              <span class="badge" [class.badge-success]="f.configured" [class.badge-danger]="!f.configured">{{ f.configured ? 'Chave configurada' : 'Sem chave' }}</span>
                            </div>
                          }
                          @default {
                            <input class="form-input" type="text" [id]="'cfg-' + f.key" [placeholder]="f.placeholder || ''" [ngModel]="valorCampo(f) ?? ''" (ngModelChange)="setCampo(f, $event)" />
                          }
                        }
                        <span class="src" [class.src-tela]="f.source === 'tela'" [title]="'Origem do valor atual: ' + f.source">{{ f.source }}</span>
                        @if (f.source === 'tela' && f.type !== 'secret') {
                          <button type="button" class="btn btn-ghost btn-sm !px-2" (click)="restaurar(f)" aria-label="Voltar ao padrão de {{ f.label }}" title="Voltar ao padrão">↺</button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </section>
            }
          </div>

          @if (alteracoes() > 0) {
            <div class="savebar" role="region" aria-label="Alterações não salvas">
              <span><b>{{ alteracoes() }}</b> alteração(ões) não salva(s)</span>
              <div class="flex gap-2">
                <button type="button" class="btn btn-ghost btn-sm" (click)="descartar()">Descartar</button>
                <button type="button" class="btn btn-accent btn-sm" (click)="salvar()" [disabled]="salvando()">{{ salvando() ? 'Salvando…' : 'Salvar alterações' }}</button>
              </div>
            </div>
          }
        }

        <!-- ═══════════ MENSAGENS ═══════════ -->
        @case ('mensagens') {
          @if (catalogo(); as c) {
            <div class="panel panel-pad flex items-start gap-3" style="background: color-mix(in srgb, var(--cmm-warning) 8%, var(--cmm-panel));">
              <p class="text-sm">Aqui você <b>vê</b> o que o bot diz e o que cada mensagem precisa comunicar. A IA escreve com voz natural, mas só envia se todos os pontos essenciais estiverem presentes. Para <b>mudar</b> textos ou a base de conhecimento é preciso alterar o código (<code>chatbot.messages.ts</code> e <code>knowledge-base.ts</code>).</p>
            </div>
            <input class="form-input" type="search" placeholder="Filtrar mensagens…" aria-label="Filtrar mensagens" [(ngModel)]="filtroMsg" />
            <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
              @for (m of mensagensFiltradas(); track m.chave) {
                <article class="panel panel-pad">
                  <div class="flex items-center justify-between gap-2 mb-2"><code class="text-xs">{{ m.chave }}</code></div>
                  @if (m.objetivo) { <p class="text-sm mb-2" style="color: var(--cmm-muted);">{{ m.objetivo }}</p> }
                  @if (m.pontosEssenciais.length) { <div class="flex gap-1.5 flex-wrap mb-3">@for (p of m.pontosEssenciais; track p) { <span class="chip">{{ p }}</span> }</div> }
                  <div class="bubble bubble-bot whitespace-pre-line">{{ m.texto }}</div>
                </article>
              }
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div class="panel panel-pad"><h2 class="sec-title mb-3">Base de conhecimento</h2><p class="text-sm mb-3" style="color: var(--cmm-muted);">Só isto pode ser afirmado nas respostas livres.</p>
                <ul class="space-y-2">@for (k of c.baseConhecimento; track k.id) { <li class="text-sm"><code class="text-xs">{{ k.id }}</code> — {{ k.texto }}</li> }</ul></div>
              <div class="panel panel-pad"><h2 class="sec-title mb-3">Ambientes</h2>
                <div class="flex gap-2 flex-wrap">@for (k of categoriasLista(c); track k.n) { <span class="chip">{{ k.n }} · {{ k.nome }}</span> }</div></div>
            </div>
          } @else { <div class="panel panel-pad"><div class="skeleton h-4 w-1/2 mb-3"></div><div class="skeleton h-24 w-full"></div></div> }
        }
      }
    </div>

    <!-- Gaveta de detalhe da conversa -->
    @if (detalhe(); as d) {
      <div class="drawer-backdrop" (click)="fecharDetalhe()" aria-hidden="true"></div>
      <aside class="drawer" role="dialog" aria-modal="true" aria-labelledby="drawer-title">
        <header class="drawer-head">
          <div class="min-w-0">
            <h2 id="drawer-title" class="font-display text-xl font-bold truncate">{{ d.nome || 'Sem nome' }}</h2>
            <p class="text-xs" style="color: var(--cmm-muted);">{{ d.numero }} · contato {{ d.contactId }} · ticket {{ d.ticketId }}</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm !px-2" (click)="fecharDetalhe()" aria-label="Fechar detalhes">✕</button>
        </header>
        <div class="drawer-body">
          <div class="flex gap-2 flex-wrap">
            <span class="badge" [class.badge-accent]="d.etapa === 'HUMANO'" [class.badge-neutral]="d.etapa !== 'HUMANO'">{{ etapaLabel(d.etapa) }}</span>
            <span class="badge badge-neutral">{{ trilhaLabel(d.trilha) }}</span>
            @if (d.pastaDrive) { <span class="badge badge-success">Pasta no Drive</span> }
            @if (d.erroEntrega) { <span class="badge badge-danger">Falha na entrega</span> }
          </div>
          @if (d.erroEntrega) { <p class="text-sm p-3 rounded-lg" style="background: color-mix(in srgb, var(--cmm-danger) 10%, var(--cmm-panel)); color: var(--cmm-danger);">{{ d.erroEntrega }}</p> }
          <dl class="kv">
            <div><dt>Ambientes de interesse</dt><dd>{{ d.categorias.length ? d.categorias.join(', ') : '—' }}</dd></div>
            <div><dt>Arquivos enviados</dt><dd>{{ d.arquivos }}</dd></div>
            <div><dt>Respostas inválidas</dt><dd>{{ d.invalidas }}</dd></div>
            <div><dt>Advertências fora de escopo</dt><dd>{{ d.foraEscopo }}</dd></div>
            <div><dt>Mensagens com IA hoje</dt><dd>{{ d.iaHoje }}</dd></div>
            <div><dt>Atendente (GOSAC)</dt><dd>{{ d.atendenteId ?? '—' }}</dd></div>
          </dl>
          <h3 class="mini-title">Conversa recente</h3>
          <div class="chat chat-flat">
            @for (h of d.historico; track $index) { <div class="bubble" [class.bubble-user]="h.role === 'cliente'" [class.bubble-bot]="h.role === 'bot'">{{ h.text }}</div> }
            @if (!d.historico.length) { <p class="text-sm" style="color: var(--cmm-muted);">Histórico apagado após o encaminhamento (privacidade).</p> }
          </div>
        </div>
        <footer class="drawer-foot">
          @if (d.etapa !== 'HUMANO') { <button type="button" class="btn btn-secondary" (click)="silenciar(d)">Silenciar o bot (assumir)</button> }
          <button type="button" class="btn btn-primary" (click)="devolver(d)">Devolver ao bot (recomeçar)</button>
        </footer>
      </aside>
    }
  `,
  styles: [`
    :host { display: block; }
    .sec-title { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; letter-spacing: -0.01em; }
    .mini-title { margin: 1.25rem 0 .5rem; font-size: .6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: .09em; color: var(--cmm-muted); }
    .mini-title span { text-transform: none; letter-spacing: 0; font-weight: 500; }
    .live-pill { display: inline-flex; align-items: center; gap: .45rem; padding: .25rem .8rem; border-radius: 999px; font-size: .75rem; font-weight: 700; border: 1px solid transparent; }
    .live-on { color: var(--cmm-success); background: color-mix(in srgb, var(--cmm-success) 14%, var(--cmm-panel)); border-color: color-mix(in srgb, var(--cmm-success) 30%, transparent); }
    .live-off { color: var(--cmm-muted); background: color-mix(in srgb, var(--cmm-border) 55%, var(--cmm-panel)); }
    .live-dot { width: 8px; height: 8px; border-radius: 99px; background: currentColor; }
    .live-on .live-dot { animation: pulse-dot 1.6s ease-in-out infinite; box-shadow: 0 0 10px currentColor; }
    .seg { display: inline-flex; gap: .25rem; padding: .3rem; border-radius: 999px; background: color-mix(in srgb, var(--cmm-border) 45%, var(--cmm-panel)); max-width: 100%; overflow-x: auto; }
    .seg-btn { position: relative; padding: .5rem 1.1rem; border-radius: 999px; border: none; background: transparent; color: var(--cmm-muted); font-weight: 600; font-size: .875rem; cursor: pointer; white-space: nowrap; transition: color 200ms, background-color 250ms, box-shadow 250ms; }
    .seg-btn:hover { color: var(--cmm-ink); }
    .seg-on { color: var(--cmm-accent-ink); background: linear-gradient(120deg, var(--cmm-accent), var(--cmm-accent-2)); box-shadow: 0 8px 20px -10px var(--cmm-accent); }
    .seg-on:hover { color: var(--cmm-accent-ink); }
    .seg-count { margin-left: .4rem; padding: 0 .45rem; border-radius: 99px; background: var(--cmm-danger); color: #fff; font-size: .7rem; }
    .kpi-label { font-size: .75rem; font-weight: 600; color: var(--cmm-muted); }
    .kpi-value { margin-top: .35rem; font-size: clamp(1.8rem, 1.4rem + 1vw, 2.5rem); font-weight: 800; line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
    .kpi-hint { margin-top: .4rem; font-size: .75rem; color: var(--cmm-muted); }
    .chart { display: flex; align-items: flex-end; gap: .5rem; height: 12.5rem; padding-top: 1rem; }
    .chart-col { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: .35rem; min-width: 0; }
    .chart-bar { width: 100%; min-height: 3px; border-radius: .6rem .6rem .25rem .25rem; background: linear-gradient(180deg, var(--cmm-accent-2), var(--cmm-accent)); transition: height 900ms var(--ease-out-expo); box-shadow: 0 10px 24px -14px var(--cmm-accent); }
    .chart-col:last-child .chart-bar { box-shadow: 0 0 0 2px color-mix(in srgb, var(--cmm-accent) 40%, transparent), 0 10px 24px -10px var(--cmm-accent); }
    .chart-num { font-size: .7rem; font-weight: 700; min-height: 1em; }
    .chart-day { font-size: .65rem; color: var(--cmm-muted); }
    .bar { display: block; height: .6rem; border-radius: 99px; background: color-mix(in srgb, var(--cmm-border) 60%, var(--cmm-panel)); overflow: hidden; }
    .bar-fill { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--cmm-accent), var(--cmm-accent-2)); transition: width 1000ms var(--ease-out-expo); }
    .bar-human { background: linear-gradient(90deg, var(--cmm-success), color-mix(in srgb, var(--cmm-success) 55%, var(--cmm-accent-2))); }
    .funnel-row { display: flex; align-items: center; gap: .75rem; width: 100%; padding: .4rem .5rem; border: none; border-radius: .6rem; background: transparent; cursor: pointer; text-align: left; transition: background-color 200ms, transform 300ms var(--ease-out-expo); }
    .funnel-row:hover { background: color-mix(in srgb, var(--cmm-accent) 8%, transparent); transform: translateX(4px); }
    .funnel-label { width: 10.5rem; flex-shrink: 0; font-size: .8125rem; font-weight: 500; }
    .funnel-n { width: 2.5rem; text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
    .kv > div { display: flex; justify-content: space-between; gap: 1rem; padding: .5rem 0; border-bottom: 1px dashed var(--cmm-border); font-size: .875rem; }
    .kv dt { color: var(--cmm-muted); } .kv dd { font-weight: 600; text-align: right; }
    .plain-list li { display: flex; justify-content: space-between; gap: .75rem; padding: .3rem 0; font-size: .8125rem; }
    .plain-list b { font-variant-numeric: tabular-nums; } .plain-list .muted { color: var(--cmm-muted); }
    .toolbar { display: flex; flex-wrap: wrap; gap: .6rem; align-items: center; }
    .toolbar-search { flex: 1 1 16rem; } .toolbar-select { flex: 0 1 14rem; }
    .check-chip { display: inline-flex; align-items: center; gap: .5rem; padding: .55rem .9rem; border: 1px solid var(--cmm-border); border-radius: .75rem; font-size: .875rem; font-weight: 500; background: var(--cmm-panel); cursor: pointer; }
    .row-click { cursor: pointer; } .row-on td { background: color-mix(in srgb, var(--cmm-accent) 9%, var(--cmm-panel)) !important; }
    .avatar-sm { flex-shrink: 0; width: 2.25rem; height: 2.25rem; border-radius: 99px; display: grid; place-items: center; font-size: .75rem; font-weight: 800; background: var(--cmm-accent-soft); color: var(--cmm-accent); }
    .chip { display: inline-flex; align-items: center; gap: .3rem; padding: .15rem .6rem; border-radius: 99px; font-size: .75rem; background: color-mix(in srgb, var(--cmm-border) 55%, var(--cmm-panel)); }
    .chip-fx { background: var(--cmm-accent-soft); color: var(--cmm-accent); font-weight: 600; }
    .chat { flex: 1; display: flex; flex-direction: column; gap: .5rem; padding: 1.25rem; overflow-y: auto; max-height: 34rem; }
    .chat-flat { max-height: none; padding: 0; }
    .bubble { max-width: 85%; padding: .6rem .9rem; border-radius: 1rem; font-size: .875rem; line-height: 1.45; white-space: pre-line; animation: bubble-in 420ms var(--ease-out-expo) both; }
    @keyframes bubble-in { from { opacity: 0; transform: translateY(10px) scale(.96); } to { opacity: 1; transform: none; } }
    .bubble-user { align-self: flex-end; background: var(--cmm-ink); color: var(--cmm-panel); border-bottom-right-radius: .3rem; }
    .bubble-bot { align-self: flex-start; background: color-mix(in srgb, var(--cmm-success) 13%, var(--cmm-panel)); border: 1px solid color-mix(in srgb, var(--cmm-success) 25%, transparent); border-bottom-left-radius: .3rem; }
    .bubble-none { align-self: flex-start; font-style: italic; color: var(--cmm-muted); background: color-mix(in srgb, var(--cmm-border) 45%, var(--cmm-panel)); }
    .sim-meta { display: flex; flex-wrap: wrap; gap: .4rem; align-items: center; margin: .15rem 0; }
    .sim-note { font-size: .7rem; color: var(--cmm-muted); margin: 0 0 .75rem; }
    .chat-input { display: flex; gap: .5rem; padding: 1rem; border-top: 1px solid var(--cmm-border); }
    .switch-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-size: .875rem; font-weight: 600; } .switch-row small { display: block; font-weight: 400; color: var(--cmm-muted); }
    .switch { flex-shrink: 0; width: 2.9rem; height: 1.6rem; border-radius: 99px; border: none; background: var(--cmm-border); position: relative; cursor: pointer; transition: background-color 300ms; }
    .switch-on { background: var(--cmm-accent); }
    .switch-knob { position: absolute; top: 3px; left: 3px; width: 1.2rem; height: 1.2rem; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); transition: transform 400ms var(--ease-out-expo); }
    .switch-on .switch-knob { transform: translateX(1.3rem); }
    .cfg-row { display: grid; grid-template-columns: 1fr; gap: .75rem; padding: 1rem 1.5rem; }
    @media (min-width: 900px) { .cfg-row { grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr); align-items: center; } }
    .cfg-ctl { display: flex; align-items: center; justify-content: flex-end; gap: .6rem; }
    .cfg-num { max-width: 9rem; }
    .src { font-size: .65rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; color: var(--cmm-muted); padding: .15rem .5rem; border-radius: 99px; border: 1px solid var(--cmm-border); white-space: nowrap; }
    .src-tela { color: var(--cmm-accent); border-color: color-mix(in srgb, var(--cmm-accent) 45%, transparent); background: var(--cmm-accent-soft); }
    .savebar { position: fixed; left: 50%; bottom: 1.25rem; transform: translateX(-50%); z-index: 90; display: flex; align-items: center; gap: 1.5rem; padding: .7rem 1rem .7rem 1.4rem; border-radius: 999px; background: var(--cmm-ink); color: var(--cmm-panel); box-shadow: 0 24px 60px -16px rgba(0,0,0,.6); font-size: .875rem; animation: bar-up 500ms var(--ease-out-expo) both; max-width: calc(100vw - 2rem); }
    @keyframes bar-up { from { opacity: 0; transform: translate(-50%, 30px); } to { opacity: 1; transform: translate(-50%, 0); } }
    .drawer-backdrop { position: fixed; inset: 0; z-index: 1000; background: color-mix(in srgb, #0c0a07 50%, transparent); animation: cmm-fade-in 250ms both; }
    .drawer { position: fixed; z-index: 1001; top: 0; right: 0; bottom: 0; width: min(30rem, 100vw); display: flex; flex-direction: column; background: var(--cmm-panel); border-left: 1px solid var(--cmm-border); box-shadow: -30px 0 80px -30px rgba(0,0,0,.5); animation: drawer-in 520ms var(--ease-out-expo) both; }
    @keyframes drawer-in { from { transform: translateX(100%); } to { transform: none; } }
    .drawer-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--cmm-border); }
    .drawer-body { flex: 1; overflow-y: auto; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1rem; }
    .drawer-foot { display: flex; gap: .6rem; flex-wrap: wrap; padding: 1rem 1.5rem; border-top: 1px solid var(--cmm-border); }
    .drawer-foot .btn { flex: 1 1 auto; }
  `],
})
export class IaComponent implements OnInit, OnDestroy {
  private readonly api = inject(IaApiService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(ModalService);

  abas: Array<{ key: Aba; label: string }> = [
    { key: 'visao', label: 'Visão geral' }, { key: 'conversas', label: 'Conversas' }, { key: 'simulador', label: 'Simulador' },
    { key: 'config', label: 'Configuração' }, { key: 'mensagens', label: 'Mensagens' },
  ];
  etapas = ETAPAS;
  grupos = GRUPOS;
  trilhaOpcoes = Object.entries(TRILHAS).filter(([k]) => k !== 'sem_trilha').map(([key, label]) => ({ key, label }));

  aba = signal<Aba>('visao');
  loading = signal(false);
  ready = signal(false);
  atualizadoEm = signal<number | null>(null);
  agora = signal(Date.now());
  private timer?: ReturnType<typeof setInterval>;

  overview = signal<IaOverview | null>(null);

  // conversas
  busca = '';
  filtroEtapa = '';
  soErros = false;
  lista = signal<IaList | null>(null);
  listaCarregando = signal(false);
  detalhe = signal<IaConversationDetail | null>(null);
  paginas = computed(() => Math.max(1, Math.ceil((this.lista()?.total ?? 0) / (this.lista()?.tamanho || 20))));

  // simulador
  simEtapa = 'MENU';
  simTrilha = '';
  simNome = '';
  simTexto = '';
  simUsarIA = signal(true);
  simCarregando = signal(false);
  simLog = signal<Array<{ texto: string; resultado?: IaSimulation; erro?: string }>>([]);

  // config
  campos = signal<IaConfigField[]>([]);
  draft = signal<Record<string, unknown>>({});
  salvando = signal(false);
  alteracoes = computed(() => Object.keys(this.draft()).length);

  // mensagens
  catalogo = signal<IaCatalog | null>(null);
  filtroMsg = '';

  kpis = computed(() => {
    const t = this.overview()?.totais;
    const o = this.overview();
    if (!t || !o) return [];
    return [
      { label: 'Conversas hoje', value: t.novosHoje, hint: `${t.total} no total` },
      { label: 'Entregues a humanos hoje', value: t.entreguesHoje, hint: 'triagem concluída' },
      { label: 'Com atendente agora', value: t.emHumano, hint: 'bot em silêncio' },
      { label: 'Falhas de entrega', value: t.comErro, hint: t.comErro ? 'precisam de atenção' : 'tudo certo' },
      { label: 'Usos da IA hoje', value: o.iaHoje, hint: 'mensagens interpretadas' },
      { label: 'Fora de escopo (7d)', value: o.foraEscopo7d, hint: 'advertências' },
    ];
  });

  funilList = computed(() => {
    const f = this.overview()?.funil ?? {};
    const max = Math.max(1, ...Object.values(f));
    return ETAPAS.map((e) => ({ ...e, value: f[e.key] ?? 0, pct: ((f[e.key] ?? 0) / max) * 100 }));
  });
  trilhasList = computed(() => {
    const t = this.overview()?.trilhas ?? {};
    const max = Math.max(1, ...Object.values(t));
    return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: TRILHAS[k] ?? k, value: v, pct: (v / max) * 100 }));
  });
  decisoes = computed(() => this.pares(this.overview()?.sistema.agentDecisions, DECISOES));
  comunicacao = computed(() => this.pares(this.overview()?.sistema.comunicacao.resultados, COMUNICACAO));
  atualizadoLabel = computed(() => {
    const t = this.atualizadoEm();
    if (!t) return '';
    const s = Math.max(0, Math.round((this.agora() - t) / 1000));
    return s < 5 ? 'atualizado agora' : `atualizado há ${s}s`;
  });
  mensagensFiltradas = computed(() => {
    const q = this.filtroMsg.trim().toLowerCase();
    const all = this.catalogo()?.mensagens ?? [];
    return q ? all.filter((m) => (m.chave + ' ' + m.texto + ' ' + (m.objetivo ?? '')).toLowerCase().includes(q)) : all;
  });

  ngOnInit(): void {
    this.refreshAll();
    this.timer = setInterval(() => {
      this.agora.set(Date.now());
      if (!document.hidden && this.aba() === 'visao' && Date.now() - (this.atualizadoEm() ?? 0) > 20000) this.carregarOverview();
    }, 1000);
  }
  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  setAba(a: Aba): void {
    this.aba.set(a);
    if (a === 'conversas' && !this.lista()) this.carregarLista();
    if (a === 'config' && !this.campos().length) this.carregarConfig();
    if (a === 'mensagens' && !this.catalogo()) this.api.catalog().subscribe({ next: (c) => this.catalogo.set(c), error: () => this.toast.error('Não foi possível carregar o catálogo.') });
    if (a === 'visao') this.carregarOverview();
  }

  refreshAll(): void {
    this.carregarOverview();
    this.carregarConfig();
    if (this.aba() === 'conversas') this.carregarLista();
  }

  private carregarOverview(): void {
    this.loading.set(true);
    this.api.overview().subscribe({
      next: (o) => {
        this.overview.set(o);
        this.atualizadoEm.set(Date.now());
        this.loading.set(false);
        setTimeout(() => this.ready.set(true), 60);
      },
      error: () => { this.loading.set(false); this.toast.error('Não foi possível carregar a visão geral.'); },
    });
  }

  // ───── conversas
  aplicarFiltros(): void { this.pagina = 1; this.carregarLista(); }
  private pagina = 1;
  irPagina(p: number): void { this.pagina = p; this.carregarLista(); }
  verEtapa(step: string): void { this.filtroEtapa = step; this.setAba('conversas'); this.aplicarFiltros(); }
  carregarLista(): void {
    this.listaCarregando.set(true);
    this.api.conversations({ step: this.filtroEtapa, busca: this.busca.trim(), erros: this.soErros, pagina: this.pagina, tamanho: 20 }).subscribe({
      next: (l) => { this.lista.set(l); this.listaCarregando.set(false); },
      error: () => { this.listaCarregando.set(false); this.toast.error('Não foi possível carregar as conversas.'); },
    });
  }
  abrir(c: IaConversationSummary): void {
    this.api.conversation(c.id).subscribe({ next: (d) => this.detalhe.set(d), error: () => this.toast.error('Não foi possível abrir a conversa.') });
  }
  fecharDetalhe(): void { this.detalhe.set(null); }
  async silenciar(d: IaConversationDetail): Promise<void> {
    if (!(await this.modal.confirm('Silenciar o bot?', 'O bot para de responder esta conversa. Um atendente humano segue daqui.', 'Silenciar'))) return;
    this.api.silenciar(d.id).subscribe({ next: () => { this.toast.success('Bot silenciado nesta conversa.'); this.abrir(d); this.carregarLista(); this.carregarOverview(); }, error: () => this.toast.error('Não foi possível silenciar.') });
  }
  async devolver(d: IaConversationDetail): Promise<void> {
    if (!(await this.modal.confirm('Devolver ao bot?', 'A conversa recomeça do menu inicial e o bot volta a responder esse cliente.', 'Devolver'))) return;
    this.api.devolver(d.id).subscribe({ next: () => { this.toast.success('Conversa devolvida ao bot.'); this.abrir(d); this.carregarLista(); this.carregarOverview(); }, error: () => this.toast.error('Não foi possível devolver.') });
  }

  // ───── simulador
  simular(): void {
    const texto = this.simTexto.trim();
    if (!texto) return;
    this.simCarregando.set(true);
    this.api.simulate({ text: texto, step: this.simEtapa, trilha: this.simTrilha || null, nome: this.simNome.trim() || null, usarIA: this.simUsarIA() }).subscribe({
      next: (r) => { this.simLog.update((l) => [...l, { texto, resultado: r }]); this.simTexto = ''; this.simCarregando.set(false); this.rolarChat(); },
      error: (e) => { this.simLog.update((l) => [...l, { texto, erro: e?.error?.message || 'A simulação falhou.' }]); this.simCarregando.set(false); },
    });
  }
  private rolarChat(): void { setTimeout(() => { const el = document.querySelector('.chat'); el?.scrollTo({ top: el.scrollHeight, behavior: 'smooth' }); }, 50); }

  // ───── configuração
  carregarConfig(): void { this.api.config().subscribe({ next: (c) => this.campos.set(c), error: () => this.toast.error('Não foi possível carregar a configuração.') }); }
  camposDo(g: IaConfigField['group']): IaConfigField[] { return this.campos().filter((c) => c.group === g); }
  valorCampo(f: IaConfigField): unknown { return f.key in this.draft() ? this.draft()[f.key] : f.value; }
  valorBool(f: IaConfigField): boolean { return !!this.valorCampo(f); }
  setCampo(f: IaConfigField, v: unknown): void {
    this.draft.update((d) => {
      const next = { ...d };
      const igual = f.type !== 'secret' && (v === f.value || (v === '' && (f.value === null || f.value === '')));
      if (igual || (f.type === 'secret' && !v)) delete next[f.key]; else next[f.key] = v;
      return next;
    });
  }
  restaurar(f: IaConfigField): void { this.draft.update((d) => ({ ...d, [f.key]: null })); }
  descartar(): void { this.draft.set({}); }
  async salvar(): Promise<void> {
    const mudancas = this.draft();
    const sensiveis = this.campos().filter((c) => c.sensitive && c.key in mudancas);
    if (sensiveis.length) {
      const lista = sensiveis.map((c) => `• ${c.label}`).join('\n');
      const ok = await this.modal.confirm('Alterar o atendimento real?', `Estas mudanças afetam clientes agora:\n${lista}\n\nSe for ligar o chatbot, desative antes o fluxo CMM no n8n.`, 'Aplicar agora');
      if (!ok) return;
    }
    this.salvando.set(true);
    this.api.saveConfig(mudancas).subscribe({
      next: (c) => { this.campos.set(c); this.draft.set({}); this.salvando.set(false); this.toast.success('Configuração aplicada.'); this.carregarOverview(); },
      error: (e) => { this.salvando.set(false); void this.modal.error(Array.isArray(e?.error?.message) ? e.error.message.join('\n') : e?.error?.message || 'Não foi possível salvar.', 'Configuração recusada'); },
    });
  }

  // ───── utilidades de exibição
  etapaLabel(k: string): string { return ETAPAS.find((e) => e.key === k)?.label ?? k; }
  trilhaLabel(k: string | null): string { return TRILHAS[k ?? 'sem_trilha'] ?? (k ?? '—'); }
  iniciais(c: IaConversationSummary): string { return (c.nome || '?').split(/\s+/).map((p) => p[0]).join('').slice(0, 2).toUpperCase(); }
  rel(iso: string): string {
    const s = Math.max(0, Math.round((this.agora() - new Date(iso).getTime()) / 1000));
    if (s < 60) return 'agora há pouco';
    if (s < 3600) return `há ${Math.round(s / 60)} min`;
    if (s < 86400) return `há ${Math.round(s / 3600)} h`;
    return `há ${Math.round(s / 86400)} d`;
  }
  diaCurto(d: string): string { return d.slice(8, 10); }
  altura(n: number): number { const max = Math.max(1, ...(this.overview()?.serie ?? []).map((x) => x.total)); return n ? Math.max(6, (n / max) * 78) : 0; }
  serieTexto(): string { return (this.overview()?.serie ?? []).map((d) => `${d.dia.slice(8)}: ${d.total}`).join(', '); }
  categoriasLista(c: IaCatalog) { return Object.entries(c.categorias).map(([n, nome]) => ({ n, nome })); }
  private pares(src: Record<string, number> | undefined, nomes: Record<string, string>) {
    return Object.entries(src ?? {}).filter(([, v]) => v > 0).map(([k, v]) => ({ label: nomes[k] ?? k, value: v }));
  }
}
