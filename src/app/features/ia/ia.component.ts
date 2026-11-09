import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent, IconName } from '../../shared/components/icon.component';
import { CounterDirective } from '../../core/motion/counter.directive';
import { ToastService } from '../../core/ui/toast.service';
import { ModalService } from '../../shared/services/modal.service';
import { IaConteudoComponent } from './ia-conteudo.component';
import { SheetComponent } from '../../shared/components/sheet.component';
import {
  IaApiService, IaConfigField, IaConversationDetail, IaConversationSummary, IaList, IaOverview, IaSimResposta,
} from './ia-api.service';

type Aba = 'visao' | 'conversas' | 'atendimento' | 'simulador' | 'config';

const DECISOES: Record<string, string> = {
  fluxo: 'Texto livre entendido', duvida_respondida: 'Dúvidas respondidas', fora_escopo: 'Recusadas (fora de escopo)', prefilter_bloqueou: 'Barradas pelo pré-filtro',
  duvida_sem_base: 'Dúvida sem base → retomou a etapa', duvida_reprovada: 'Resposta reprovada → retomou a etapa', escopo_indisponivel: 'Escopo indisponível → retomou a etapa',
  ia_indisponivel: 'IA indisponível (regras fixas)', sem_interpretacao: 'Sem interpretação',
};
const COMUNICACAO: Record<string, string> = {
  turno_ok: 'Respostas da atendente enviadas', escrita_ok: 'Mensagens naturais enviadas', fallback_validacao: 'Reprovadas pelo revisor → texto padrão', fallback_erro: 'IA falhou → texto padrão',
  fallback_limite: 'Limite diário → texto padrão', sem_spec: 'Texto livre (sem revisão)',
};
const GRUPOS: Array<{ key: IaConfigField['group']; titulo: string; texto: string }> = [
  { key: 'geral', titulo: 'Operação', texto: 'O que está ligado agora.' },
  { key: 'ia', titulo: 'Inteligência artificial', texto: 'Chave e modelos usados pelos agentes.' },
  { key: 'comunicacao', titulo: 'Comunicação', texto: 'Como as mensagens chegam ao cliente.' },
  { key: 'limites', titulo: 'Limites e custo', texto: 'Proteções contra abuso e gasto.' },
  { key: 'atendimento', titulo: 'Atendimento humano', texto: 'Para onde o cliente vai quando o bot passa a vez.' },
  { key: 'integracoes', titulo: 'Integrações', texto: 'Google Drive e funil comercial (CMSYS).' },
];

@Component({
  selector: 'app-ia',
  standalone: true,
  imports: [FormsModule, CounterDirective, IconComponent, IaConteudoComponent, SheetComponent],
  template: `
    <div class="space-y-6">
      <!-- Cabeçalho: nome, estado (clique para ligar/desligar) e o propósito da tela -->
      <header class="ia-head">
        <div class="flex items-center gap-3 flex-wrap">
          <h1 class="page-title">Vera <span class="text-gradient">D'Or</span></h1>
          @if (overview(); as o) {
            <button type="button" class="live-pill live-btn" [class.live-on]="o.sistema.enabled" [class.live-off]="!o.sistema.enabled" (click)="alternarLigado()" [disabled]="loading()" [title]="o.sistema.enabled ? 'No ar — clique para desligar' : 'Desligada — clique para ligar'">
              <span class="live-dot"></span>{{ o.sistema.enabled ? 'No ar' : 'Desligada' }}<span class="live-hint">{{ o.sistema.enabled ? 'desligar' : 'ligar' }}</span>
            </button>
          }
        </div>
        <p class="page-subtitle">{{ propositos[aba()] }}</p>
      </header>

      <div class="tabs" role="tablist" aria-label="Seções da IA">
        @for (t of abas; track t.key) {
          <button type="button" role="tab" class="tab" [class.tab-on]="aba() === t.key" [attr.aria-selected]="aba() === t.key" (click)="setAba(t.key)">
            <app-icon [name]="icones[t.key]" [size]="16" />{{ t.label }}
            @if (t.key === 'conversas' && overview()?.totais?.comErro) { <span class="tab-count tab-count-alert">{{ overview()!.totais.comErro }}</span> }
          </button>
        }
      </div>

      @switch (aba()) {
        <!-- ═══════════ PAINEL ═══════════ -->
        @case ('visao') {
          @if (overview(); as o) {
            <!-- O que precisa de você agora -->
            <section class="attn panel panel-pad" [class.attn-ok]="!alertas().length" aria-label="Precisa de atenção">
              @if (alertas().length) {
                <h2 class="sec-title mb-3">Precisa de atenção</h2>
                <ul class="space-y-2">
                  @for (a of alertas(); track a.texto) {
                    <li class="attn-item"><app-icon [name]="a.icone" [size]="18" /><span class="flex-1 text-sm">{{ a.texto }}</span>
                      <button type="button" class="btn btn-secondary btn-sm" (click)="a.acao()">{{ a.botao }}</button></li>
                  }
                </ul>
              } @else {
                <p class="text-sm font-semibold inline-flex items-center gap-2"><app-icon name="check" [size]="16" style="color: var(--cmm-success);" /> Tudo certo: nada precisa da sua atenção agora.</p>
              }
            </section>

            <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
                <p class="text-sm mb-4" style="color: var(--cmm-muted);">Em que fluxo e etapa cada conversa está agora.</p>
                <div class="space-y-2">
                  @for (e of funilList(); track e.key; let i = $index) {
                    <button type="button" class="funnel-row" (click)="verEtapa(e.humano ? 'HUMANO' : 'BOT')">
                      <span class="funnel-label">{{ e.label }}</span>
                      <span class="bar flex-1"><span class="bar-fill" [class.bar-human]="e.humano" [style.width.%]="ready() ? e.pct : 0" [style.transition-delay.ms]="i * 50"></span></span>
                      <span class="funnel-n">{{ e.value }}</span>
                    </button>
                  }
                </div>
              </div>

              <details class="panel panel-pad tech">
                <summary class="sec-title cursor-pointer">Detalhes técnicos da IA</summary>
                <div class="mt-4">
                <dl class="kv">
                  <div><dt>Modelo</dt><dd class="font-mono text-xs">{{ o.sistema.model }}</dd></div>
                  <div><dt>Funil comercial (CMSYS)</dt><dd>{{ o.sistema.crmEnabled ? 'Ligado' : 'Desligado' }}</dd></div>
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
              </details>
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
            <select class="form-input toolbar-select" aria-label="Filtrar por situação" [(ngModel)]="filtroEtapa" (ngModelChange)="aplicarFiltros()">
              <option value="">Todas</option>
              <option value="BOT">Com o bot</option>
              <option value="HUMANO">Com atendente</option>
            </select>
            <label class="check-chip"><input type="checkbox" [(ngModel)]="soErros" (ngModelChange)="aplicarFiltros()" /> Só com erro</label>
            <button type="button" class="btn btn-primary btn-sm" (click)="aplicarFiltros()">Buscar</button>
          </div>

          <div class="table-shell">
            <table>
              <thead><tr><th>Cliente</th><th>Onde está</th><th>Caminho</th><th>Sinais</th><th>Última mensagem</th></tr></thead>
              <tbody>
                @for (c of lista()?.itens ?? []; track c.id) {
                  <tr class="row-click" tabindex="0" (click)="abrir(c)" (keyup.enter)="abrir(c)" [class.row-on]="detalhe()?.id === c.id">
                    <td>
                      <div class="flex items-center gap-3">
                        <span class="avatar-sm" aria-hidden="true">{{ iniciais(c) }}</span>
                        <div class="min-w-0"><p class="font-semibold truncate">{{ c.nome || 'Sem nome' }}</p><p class="text-xs" style="color: var(--cmm-muted);">{{ c.numero }} · ticket {{ c.ticketId }}</p></div>
                      </div>
                    </td>
                    <td>
                      @if (c.etapa === 'HUMANO') { <span class="state state-on">Com atendente</span> }
                      @else { <span class="text-sm"><b>{{ c.onde.fluxo || 'Início' }}</b>@if (c.onde.etapa) { <span style="color: var(--cmm-muted);"> › {{ c.onde.etapa }}</span> }</span> }
                    </td>
                    <td class="text-sm">{{ c.trilha }}</td>
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

        <!-- ═══════════ TESTAR ═══════════ -->
        @case ('simulador') {
          <div class="max-w-3xl space-y-3">
            <section class="panel panel-pad wa-card" aria-label="Testar pelo WhatsApp de verdade">
              <h2 class="sec-title">Testar pelo WhatsApp de verdade</h2>
              <p class="text-xs mt-1" style="color: var(--cmm-muted);">O WhatsApp Web não aceita ser embutido em outra página (ele bloqueia iframes), então abrimos numa janela ao lado. Entre nele com <b>outro</b> WhatsApp (o seu, não o do bot) e mande mensagem para o número do bot.</p>
              <div class="wa-row">
                <input class="form-input" type="tel" inputmode="tel" aria-label="Número do WhatsApp do bot" placeholder="Número do bot, ex.: 92 99123-4567" [ngModel]="waNumero()" (ngModelChange)="waSalvar($event)" />
                <button type="button" class="btn btn-primary btn-sm" (click)="waAbrirWeb()" [disabled]="!waValido()">Abrir WhatsApp Web</button>
                <button type="button" class="btn btn-secondary btn-sm" (click)="waAbrirCelular()" [disabled]="!waValido()">Abrir no celular</button>
              </div>
              @if (overview()?.sistema?.testMode) {
                <p class="text-xs mt-2" style="color: var(--cmm-warning);">Modo teste ligado: o bot só responde aos números da lista em Ajustes. Confira se o seu WhatsApp está nela.</p>
              } @else if (overview() && !overview()!.sistema.enabled) {
                <p class="text-xs mt-2" style="color: var(--cmm-warning);">O chatbot está desligado: ele não vai responder pelo WhatsApp até ser ligado.</p>
              }
            </section>
            <div class="sim-controls">
              <select id="sim-fluxo" class="form-input" aria-label="O que testar" [ngModel]="simFluxo()" (ngModelChange)="simEscolherFluxo($event)">
                <option value="">Jornada completa (fluxo de início)</option>
                @for (f of simFluxos(); track f.id) { <option [value]="f.id">{{ f.nome }}{{ f.ativo ? '' : ' (desativado)' }}</option> }
              </select>
              <label class="ia-toggle" title="Interpreta texto livre, responde dúvidas e escreve no tom de cada fluxo (conta no uso)">
                <span>IA</span>
                <button type="button" role="switch" class="switch" [class.switch-on]="simUsarIA()" [attr.aria-checked]="simUsarIA()" aria-label="Usar a IA no teste" (click)="simUsarIA.set(!simUsarIA())"><span class="switch-knob"></span></button>
              </label>
              <button type="button" class="btn btn-secondary btn-sm" (click)="simComecar()" [disabled]="simCarregando()"><app-icon name="atualizar" [size]="14" /> Recomeçar</button>
            </div>

            <div class="panel flex flex-col sim" style="min-height: 28rem;">
              <div class="sim-bar"><span class="text-xs" style="color: var(--cmm-muted);">Cliente em</span> <b>{{ simOnde() }}</b></div>
              <div class="chat" aria-live="polite">
                @for (m of simLog(); track $index) {
                  <div class="bubble" [class.bubble-user]="m.de === 'cliente'" [class.bubble-bot]="m.de === 'bot'" [class.bubble-none]="m.de === 'sistema'" [class.bubble-fx]="m.de === 'efeito'">{{ m.texto }}</div>
                }
                @if (simCarregando()) { <div class="bubble bubble-bot bubble-typing" aria-label="Digitando">•••</div> }
              </div>
              @if (simAviso()) { <p class="sim-aviso" role="status">{{ simAviso() }}</p> }
              <form class="chat-input" (ngSubmit)="simEnviar($event)">
                @if (simTerminou()) {
                  <button type="button" class="btn btn-primary w-full" (click)="simComecar()">Testar de novo</button>
                } @else {
                  <input class="form-input" name="simTexto" [value]="simTexto()" (input)="simTexto.set($any($event.target).value)" placeholder="Responda como o cliente…" aria-label="Mensagem do cliente" maxlength="600" autocomplete="off" />
                  <button type="submit" class="btn btn-primary" [disabled]="simCarregando()">Enviar</button>
                }
              </form>
            </div>

            <p class="text-xs" style="color: var(--cmm-muted);">Testa o que está <b>publicado</b>; nada é enviado, gravado nem encaminhado. Ferramentas (Drive, agenda) rodam em modo simulado. Fluxo em rascunho: teste-o dentro do próprio fluxo, em Atendimento.</p>
            <div class="flex gap-1.5 flex-wrap items-center">
              <span class="text-xs" style="color: var(--cmm-muted);">Atalhos:</span>
              @for (ex of exemplos; track ex) { <button type="button" class="chip chip-btn" (click)="simTexto.set(ex)" [disabled]="simTerminou()">{{ ex }}</button> }
            </div>
          </div>
        }

        <!-- ═══════════ AJUSTES ═══════════ -->
        @case ('config') {
          <div class="cfg-tree panel" [class.mb-24]="alteracoes() > 0">
            <nav class="tree" role="tablist" aria-label="Seções dos ajustes">
              @for (g of grupos; track g.key) {
                <button type="button" role="tab" class="tree-node tree-parent" [class.tree-sel]="grupoSel().key === g.key" [attr.aria-selected]="grupoSel().key === g.key" (click)="grupoAtivo.set(g.key)">
                  <span class="tree-name">{{ g.titulo }}</span>
                  @if (alteradosDo(g.key)) { <span class="tree-badge" title="Alterações sem salvar">{{ alteradosDo(g.key) }}</span> }
                </button>
              }
            </nav>

            <section class="tree-detail">
              <h2 class="sec-title">{{ grupoSel().titulo }}</h2>
              @if (grupoSel().texto) { <p class="text-sm mt-1" style="color: var(--cmm-muted);">{{ grupoSel().texto }}</p> }
              @for (f of camposDo(grupoSel().key); track f.key) {
                <div class="cfg-row">
                  <div class="min-w-0">
                    <label class="font-semibold text-sm" [attr.for]="'cfg-' + f.key">{{ f.label }}@if (f.sensitive) { <span class="cfg-warn" title="Afeta o atendimento aos clientes na hora"> ⚠</span> }</label>
                    <p class="text-xs mt-0.5" style="color: var(--cmm-muted);">{{ f.description }}</p>
                  </div>
                  <div class="cfg-ctl">
                    @if (f.source === 'tela' && f.type !== 'secret') {
                      <button type="button" class="cfg-reset" (click)="restaurar(f)" title="Alterado aqui. Voltar ao padrão" [attr.aria-label]="'Voltar ao padrão de ' + f.label">↺ padrão</button>
                    }
                    @switch (f.type) {
                      @case ('boolean') {
                        <button type="button" role="switch" [id]="'cfg-' + f.key" class="switch" [class.switch-on]="valorBool(f)" [attr.aria-checked]="valorBool(f)" [attr.aria-label]="f.label" (click)="setCampo(f, !valorBool(f))"><span class="switch-knob"></span></button>
                      }
                      @case ('number') {
                        <input class="form-input cfg-num" type="number" [id]="'cfg-' + f.key" [min]="f.min ?? null" [max]="f.max ?? null" [ngModel]="valorCampo(f)" (ngModelChange)="setCampo(f, $event)" />
                      }
                      @case ('list') {
                        <div class="num-list">
                          <div class="num-chips">
                            @for (n of listaDe(f); track n) {
                              <span class="chip num-chip">{{ formatarNumero(n) }}<button type="button" class="num-x" (click)="removerNumero(f, n)" [attr.aria-label]="'Remover ' + formatarNumero(n)">×</button></span>
                            } @empty {
                              <span class="text-xs" style="color: var(--cmm-muted);">Nenhum número ainda.</span>
                            }
                          </div>
                          <div class="num-add">
                            <input class="form-input" type="tel" inputmode="tel" [id]="'cfg-' + f.key" [placeholder]="f.placeholder || ''" [ngModel]="novoNumero()" (ngModelChange)="novoNumero.set($event)" (keydown.enter)="adicionarNumero(f); $event.preventDefault()" />
                            <button type="button" class="btn btn-secondary btn-sm" (click)="adicionarNumero(f)">Adicionar</button>
                          </div>
                        </div>
                      }
                      @case ('secret') {
                        <div class="cfg-secret">
                          <input class="form-input" type="password" autocomplete="new-password" [id]="'cfg-' + f.key" [placeholder]="f.configured ? '•••••••• configurada' : f.placeholder || ''" [ngModel]="draft()[f.key] ?? ''" (ngModelChange)="setCampo(f, $event)" />
                          @if (!f.configured) { <span class="text-xs" style="color: var(--cmm-danger);">Nenhuma chave configurada</span> }
                        </div>
                      }
                      @default {
                        <input class="form-input" type="text" [id]="'cfg-' + f.key" [placeholder]="f.placeholder || ''" [ngModel]="valorCampo(f) ?? ''" (ngModelChange)="setCampo(f, $event)" />
                      }
                    }
                  </div>
                </div>
              } @empty {
                <p class="text-sm mt-4" style="color: var(--cmm-muted);">Carregando…</p>
              }
            </section>
          </div>

          @if (alteracoes() > 0) {
            <div class="savebar" role="region" aria-label="Alterações não salvas">
              <span><b>{{ alteracoes() }}</b> {{ alteracoes() === 1 ? 'alteração' : 'alterações' }} sem salvar</span>
              <div class="flex gap-2">
                <button type="button" class="btn btn-ghost btn-sm" (click)="descartar()">Descartar</button>
                <button type="button" class="btn btn-accent btn-sm" (click)="salvar()" [disabled]="salvando()">{{ salvando() ? 'Salvando…' : 'Salvar alterações' }}</button>
              </div>
            </div>
          }
        }

        <!-- ═══════════ ATENDIMENTO ═══════════ -->
        @case ('atendimento') { <app-ia-conteudo /> }
      }
    </div>

    <!-- Detalhe da conversa -->
    <app-sheet [open]="!!detalhe()" [title]="detalhe()?.nome || 'Sem nome'" [subtitle]="detalhe() ? detalhe()!.numero + ' · contato ' + detalhe()!.contactId + ' · ticket ' + detalhe()!.ticketId : ''" width="30rem" (closed)="fecharDetalhe()">
      @if (detalhe(); as d) {
        <div class="space-y-4">
          <div class="flex gap-2 flex-wrap">
            @if (d.etapa === 'HUMANO') { <span class="badge badge-accent">Com atendente</span> } @else { <span class="badge badge-neutral">{{ d.onde.fluxo || 'Início' }}{{ d.onde.etapa ? ' › ' + d.onde.etapa : '' }}</span> }
            <span class="badge badge-neutral">{{ d.trilha }}</span>
            @if (d.pastaDrive) { <span class="badge badge-success">Pasta no Drive</span> }
            @if (d.erroEntrega) { <span class="badge badge-danger">Falha na entrega</span> }
          </div>
          @if (d.erroEntrega) { <p class="note note-error">{{ d.erroEntrega }}</p> }
          <dl class="kv">
            @for (r of d.respostas; track r.variavel) { <div><dt>{{ r.variavel }}</dt><dd>{{ r.valor || '—' }}</dd></div> }
            <div><dt>Arquivos enviados</dt><dd>{{ d.arquivos }}</dd></div>
            <div><dt>Respostas inválidas</dt><dd>{{ d.invalidas }}</dd></div>
            <div><dt>Advertências fora de escopo</dt><dd>{{ d.foraEscopo }}</dd></div>
            <div><dt>Mensagens com IA hoje</dt><dd>{{ d.iaHoje }}</dd></div>
            <div><dt>Atendente (GOSAC)</dt><dd>{{ d.atendenteId ?? '—' }}</dd></div>
          </dl>
          <h3 class="mini-title">Conversa recente</h3>
          <div class="chat">
            @for (h of d.historico; track $index) { <div class="bubble" [class.bubble-user]="h.role === 'cliente'" [class.bubble-bot]="h.role === 'bot'">{{ h.text }}</div> }
            @if (!d.historico.length) { <p class="text-sm" style="color: var(--cmm-muted);">Histórico apagado após o encaminhamento (privacidade).</p> }
          </div>
        </div>
      }
      <ng-container sheet-footer>
        @if (detalhe(); as d) {
          @if (d.etapa !== 'HUMANO') { <button type="button" class="btn btn-secondary flex-1" (click)="silenciar(d)">Silenciar o bot (assumir)</button> }
          <button type="button" class="btn btn-primary flex-1" (click)="devolver(d)">Devolver ao bot</button>
        }
      </ng-container>
    </app-sheet>
  `,
  styles: [`
    :host { display: block; }
    .attn { border-left: 4px solid var(--cmm-warning); background: color-mix(in srgb, var(--cmm-warning) 7%, var(--cmm-panel)); }
    .attn-ok { border-left-color: var(--cmm-success); background: color-mix(in srgb, var(--cmm-success) 7%, var(--cmm-panel)); }
    .attn-item { display: flex; align-items: center; gap: .75rem; color: var(--cmm-warning); }
    .attn-item span { color: var(--cmm-ink); }
    .tech > summary { list-style: none; } .tech > summary::-webkit-details-marker { display: none; }
    .tech > summary::after { content: '▾'; float: right; color: var(--cmm-muted); transition: transform 300ms; } .tech[open] > summary::after { transform: rotate(180deg); }
    .live-pill { display: inline-flex; align-items: center; gap: .45rem; padding: .25rem .8rem; border-radius: 999px; font-size: .75rem; font-weight: 700; border: 1px solid transparent; }
    .live-on { color: var(--cmm-success); background: color-mix(in srgb, var(--cmm-success) 14%, var(--cmm-panel)); border-color: color-mix(in srgb, var(--cmm-success) 30%, transparent); }
    .live-off { color: var(--cmm-muted); background: color-mix(in srgb, var(--cmm-border) 55%, var(--cmm-panel)); }
    .live-dot { width: 8px; height: 8px; border-radius: 99px; background: currentColor; }
    .live-on .live-dot { animation: pulse-dot 1.6s ease-in-out infinite; box-shadow: 0 0 10px currentColor; }
    .live-btn { cursor: pointer; transition: background-color 200ms, border-color 200ms; } .live-btn:hover { border-color: currentColor; }
    .live-hint { margin-left: .35rem; padding-left: .5rem; border-left: 1px solid color-mix(in srgb, currentColor 30%, transparent); font-weight: 600; opacity: 0; max-width: 0; overflow: hidden; white-space: nowrap; transition: opacity 200ms, max-width 300ms; }
    .live-btn:hover .live-hint, .live-btn:focus-visible .live-hint { opacity: .8; max-width: 6rem; }
    .ia-head { margin-bottom: .25rem; }
    .tabs { margin-bottom: .5rem; }
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
    .plain-list li { display: flex; justify-content: space-between; gap: .75rem; padding: .3rem 0; font-size: .8125rem; }
    .plain-list b { font-variant-numeric: tabular-nums; } .plain-list .muted { color: var(--cmm-muted); }
    .avatar-sm { flex-shrink: 0; width: 2.25rem; height: 2.25rem; border-radius: 99px; display: grid; place-items: center; font-size: .75rem; font-weight: 800; background: var(--cmm-accent-soft); color: var(--cmm-accent); }
    .sim .chat { flex: 1; padding: 1.25rem; overflow-y: auto; max-height: 34rem; }
    .sim-controls { display: flex; gap: .75rem; align-items: center; flex-wrap: wrap; } .sim-controls select { flex: 1 1 16rem; min-width: 0; }
    .ia-toggle { display: inline-flex; align-items: center; gap: .5rem; font-size: .8125rem; font-weight: 700; color: var(--cmm-muted); }
    .sim-bar { display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding: .75rem 1.25rem; border-bottom: 1px solid var(--cmm-border); flex-wrap: wrap; }
    .sim-aviso { margin: 0 1.25rem .5rem; font-size: .78rem; color: var(--cmm-warning); font-weight: 600; }
    .chat-input { display: flex; gap: .5rem; padding: 1rem; border-top: 1px solid var(--cmm-border); }
    .cfg-tree { display: grid; grid-template-columns: minmax(11rem, 14rem) minmax(0, 1fr); padding: 0; overflow: hidden; }
    .tree { padding: .75rem; border-right: 1px solid var(--cmm-border); max-height: 38rem; overflow-y: auto; }
    .tree-node { display: flex; align-items: center; gap: .5rem; width: 100%; padding: .4rem .55rem; border: none; border-radius: .55rem; background: transparent; color: inherit; text-align: left; cursor: pointer; font-size: .8125rem; transition: background-color 150ms; }
    .tree-node:hover { background: color-mix(in srgb, var(--cmm-accent) 7%, transparent); }
    .tree-parent { font-weight: 600; padding: .55rem .7rem; }
    .tree-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .tree-badge { font-size: .65rem; font-weight: 800; padding: 0 .4rem; border-radius: 99px; background: var(--cmm-accent-soft); color: var(--cmm-accent); }
    .tree-sel { background: var(--cmm-accent-soft); color: var(--cmm-accent); font-weight: 700; }
    .tree-detail { padding: 1.5rem; min-width: 0; }
    @media (max-width: 760px) { .cfg-tree { grid-template-columns: 1fr; } .tree { border-right: none; border-bottom: 1px solid var(--cmm-border); max-height: none; } }
    .num-list { display: flex; flex-direction: column; gap: .6rem; width: 100%; }
    .num-chips { display: flex; flex-wrap: wrap; gap: .4rem; }
    .num-chip { display: inline-flex; align-items: center; gap: .35rem; font-variant-numeric: tabular-nums; }
    .num-x { border: none; background: transparent; cursor: pointer; color: var(--cmm-muted); font-size: 1rem; line-height: 1; padding: 0 .1rem; } .num-x:hover { color: var(--cmm-danger); }
    .num-add { display: flex; gap: .5rem; } .num-add .form-input { flex: 1; min-width: 0; }
    .wa-row { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .75rem; } .wa-row .form-input { flex: 1 1 14rem; min-width: 0; }
    .cfg-secret { display: flex; flex-direction: column; gap: .25rem; align-items: flex-end; width: 100%; }
    @media (max-width: 640px) {
      .funnel-label { width: 7.5rem; }
      .chart { gap: .25rem; } .chart-num { font-size: .6rem; } .chart-day { font-size: .55rem; }
    }
  `],
})
export class IaComponent implements OnInit, OnDestroy {
  private readonly api = inject(IaApiService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(ModalService);

  grupoAtivo = signal<string>(GRUPOS[0].key);
  grupoSel = computed(() => GRUPOS.find((g) => g.key === this.grupoAtivo()) ?? GRUPOS[0]);
  icones: Record<Aba, IconName> = { visao: 'painel', conversas: 'conversas', atendimento: 'fluxo', simulador: 'teste', config: 'ajustes' };
  abas: Array<{ key: Aba; label: string }> = [
    { key: 'visao', label: 'Painel' }, { key: 'conversas', label: 'Conversas' }, { key: 'atendimento', label: 'Atendimento' },
    { key: 'simulador', label: 'Testar' }, { key: 'config', label: 'Ajustes' },
  ];
  /** O que cada tela serve — aparece sob o título e muda junto com a aba. */
  propositos: Record<Aba, string> = {
    visao: 'Como o atendimento está agora: volume, onde os clientes estão e o que precisa de atenção.',
    conversas: 'Veja cada cliente, leia a conversa e assuma ou devolva ao bot.',
    atendimento: 'Monte os caminhos de conversa e o jeito de falar. Nada vale para o cliente até você publicar.',
    simulador: 'Escreva como um cliente e veja a resposta do bot, sem enviar nada a ninguém.',
    config: 'Liga/desliga, chave da OpenAI, modelos, limites de uso e integrações.',
  };
  exemplos = ['1', '2', '3', 'quero uma cozinha', 'onde fica a loja?', '0', '10'];
  grupos = GRUPOS;

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
  simTexto = signal('');
  simUsarIA = signal(true);
  simCarregando = signal(false);
  simLog = signal<Array<{ de: 'cliente' | 'bot' | 'efeito' | 'sistema'; texto: string }>>([]);
  simEstado = signal<Record<string, unknown> | null>(null);
  simOnde = signal('—');
  simAviso = signal<string | null>(null);
  simTerminou = signal(false);
  /** Fluxos próprios já publicados (os únicos que o teste consegue seguir). */
  simFluxos = signal<Array<{ id: string; nome: string; ativo: boolean }>>([]);
  simFluxo = signal('');

  // config
  campos = signal<IaConfigField[]>([]);
  draft = signal<Record<string, unknown>>({});
  salvando = signal(false);
  alteracoes = computed(() => Object.keys(this.draft()).length);


  kpis = computed(() => {
    const t = this.overview()?.totais;
    const o = this.overview();
    if (!t || !o) return [];
    return [
      { label: 'Conversas hoje', value: t.novosHoje, hint: '' },
      { label: 'Com atendente agora', value: t.emHumano, hint: '' },
      { label: 'Falhas de entrega', value: t.comErro, hint: '' },
      { label: 'Usos da IA hoje', value: o.iaHoje, hint: '' },
    ];
  });

  funilList = computed(() => {
    const f = this.overview()?.funil ?? {};
    const max = Math.max(1, ...Object.values(f));
    return Object.entries(f)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([k, v]) => ({ key: k, label: k, value: v, pct: (v / max) * 100, humano: k === 'Com atendente' }));
  });
  trilhasList = computed(() => {
    const t = this.overview()?.trilhas ?? {};
    const max = Math.max(1, ...Object.values(t));
    return Object.entries(t).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: k, value: v, pct: (v / max) * 100 }));
  });
  decisoes = computed(() => this.pares(this.overview()?.sistema.agentDecisions, DECISOES));
  comunicacao = computed(() => this.pares(this.overview()?.sistema.comunicacao.resultados, COMUNICACAO));
  /** Tudo que exige uma ação do operador, em ordem de importância. */
  alertas = computed(() => {
    const o = this.overview();
    if (!o) return [];
    const out: Array<{ icone: IconName; texto: string; botao: string; acao: () => void }> = [];
    const chave = this.campos().find((c) => c.key === 'OPENAI_API_KEY');
    if (!o.sistema.enabled)
      out.push({ icone: 'pausa', texto: 'O bot está desligado: ninguém está sendo atendido automaticamente.', botao: 'Ver ajustes', acao: () => this.setAba('config') });
    if (o.sistema.enabled && o.sistema.aiEnabled && chave && !chave.configured)
      out.push({ icone: 'chave', texto: 'A IA está ligada, mas não há chave da OpenAI: o bot só usa regras fixas.', botao: 'Configurar chave', acao: () => this.setAba('config') });
    if (o.sistema.testMode)
      out.push({ icone: 'alerta', texto: `Modo teste ligado: o bot só atende ${o.sistema.testNumbers === 1 ? '1 número' : o.sistema.testNumbers + ' números'}. Os demais clientes não recebem resposta do bot.`, botao: 'Ver ajustes', acao: () => this.setAba('config') });
    if (o.sistema.aiBreakerOpen)
      out.push({ icone: 'alerta', texto: 'A IA foi pausada por falhas seguidas e voltará sozinha em instantes.', botao: 'Atualizar', acao: () => this.refreshAll() });
    if (o.totais.comErro > 0)
      out.push({ icone: 'alerta', texto: `${o.totais.comErro === 1 ? '1 conversa' : o.totais.comErro + ' conversas'} com falha na entrega ao atendente. O cliente pode estar esperando.`, botao: 'Ver conversas', acao: () => { this.soErros = true; this.filtroEtapa = ''; this.setAba('conversas'); this.aplicarFiltros(); } });
    return out;
  });

  atualizadoLabel = computed(() => {
    const t = this.atualizadoEm();
    if (!t) return '';
    const s = Math.max(0, Math.round((this.agora() - t) / 1000));
    return s < 5 ? 'atualizado agora' : `atualizado há ${s}s`;
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

  async alternarLigado(): Promise<void> {
    const ligado = this.overview()?.sistema.enabled;
    const ok = await this.modal.confirm(
      ligado ? 'Desligar o bot?' : 'Ligar o bot?',
      ligado
        ? 'O bot para de responder novos clientes imediatamente (em até 30 segundos). Quem está com atendente humano não é afetado.'
        : 'O bot passa a responder os clientes pelo WhatsApp. Se o fluxo CMM do n8n ainda estiver ativo, desative-o antes para não duplicar mensagens.',
      ligado ? 'Desligar' : 'Ligar',
    );
    if (!ok) return;
    this.api.saveConfig({ CHATBOT_ENABLED: !ligado }).subscribe({
      next: (c) => { this.campos.set(c); this.toast.success(ligado ? 'Bot desligado.' : 'Bot ligado.'); this.carregarOverview(); },
      error: (e) => void this.modal.error(Array.isArray(e?.error?.message) ? e.error.message.join('\n') : e?.error?.message || 'Não foi possível alterar.', 'Não foi possível alterar'),
    });
  }

  setAba(a: Aba): void {
    this.aba.set(a);
    if (a === 'conversas' && !this.lista()) this.carregarLista();
    if (a === 'simulador') { this.simCarregarFluxos(); if (!this.simEstado() && !this.simLog().length) this.simComecar(); }
    if (a === 'config' && !this.campos().length) this.carregarConfig();
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

  // ───── testar (conversa simulada)
  simComecar(): void {
    this.simLog.set([]); this.simEstado.set(null); this.simTerminou.set(false); this.simAviso.set(null); this.simTexto.set('');
    this.simPasso(null, '', this.simFluxo() ? { fluxoId: this.simFluxo() } : undefined);
  }
  simEscolherFluxo(id: string): void { this.simFluxo.set(id); this.simComecar(); }
  /** Lê os fluxos publicados (não o rascunho): é o que o cliente consegue seguir de verdade. */
  private simCarregarFluxos(): void {
    this.api.content().subscribe({
      next: (c) => {
        this.simFluxos.set((c.published.fluxos ?? []).map((f) => ({ id: f.id, nome: f.nome, ativo: f.ativo })));
        if (this.simFluxo() && !this.simFluxos().some((f) => f.id === this.simFluxo())) this.simFluxo.set('');
      },
      error: () => undefined,
    });
  }
  simEnviar(ev?: Event): void {
    const texto = this.simTexto().trim();
    if (!texto || this.simCarregando()) return;
    // Limpa o campo já: se o Enter vier colado na última tecla, o Angular ainda não viu o texto e ignoraria a limpeza
    const campo = (ev?.target as HTMLElement | null)?.querySelector?.('input[name=simTexto]') as HTMLInputElement | null;
    if (campo) campo.value = '';
    this.simLog.update((l) => [...l, { de: 'cliente', texto }]);
    this.simTexto.set('');
    this.simPasso(this.simEstado(), texto);
  }
  private simPasso(estado: Record<string, unknown> | null, texto: string, inicio?: { fluxoId?: string; nome?: string | null }): void {
    this.simCarregando.set(true);
    this.api.simulate({ texto, estado, inicio, usarIA: this.simUsarIA() }).subscribe({
      next: (r) => {
        this.simLog.update((l) => [
          ...l,
          ...r.mensagens.map((m) => ({ de: 'bot' as const, texto: m })),
          ...r.efeitos.map((e) => ({ de: 'efeito' as const, texto: e })),
          ...(r.terminou ? [{ de: 'efeito' as const, texto: 'Conversa encaminhada a um atendente. Fim do teste.' }] : []),
          ...(r.reescrita ? [{ de: 'sistema' as const, texto: 'A IA reescreveu esta resposta no tom do fluxo.' }] : []),
        ]);
        this.simEstado.set(r.estado);
        this.simTerminou.set(r.terminou);
        this.simAviso.set(r.aviso);
        this.simOnde.set(this.descreverOnde(r.onde));
        this.simCarregando.set(false);
        this.rolarChat();
      },
      error: (e) => {
        const m = e?.error?.message;
        this.simLog.update((l) => [...l, { de: 'sistema', texto: Array.isArray(m) ? m.join(' ') : m || 'O teste falhou.' }]);
        this.simCarregando.set(false);
      },
    });
  }
  private descreverOnde(o: IaSimResposta['onde']): string {
    if (o.fluxo) return `${o.fluxo.nome}${o.bloco ? ` › etapa ${o.bloco.numero}: ${o.bloco.titulo}` : ''}`;
    return o.etapa === 'HUMANO' ? 'Com atendente' : 'Início';
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
  novoNumero = signal('');
  // ───── teste pelo WhatsApp (abre o WhatsApp Web numa janela, pois ele não pode ser embutido)
  waNumero = signal(this.waLer());
  private waLer(): string { try { return localStorage.getItem('ia_wa_numero') ?? ''; } catch { return ''; } }
  waSalvar(v: string): void { this.waNumero.set(v); try { localStorage.setItem('ia_wa_numero', v); } catch { /* sem armazenamento: segue sem lembrar */ } }
  private waDigitos(): string {
    const d = this.waNumero().replace(/@.*$/, '').replace(/\D/g, '');
    return d.length === 10 || d.length === 11 ? `55${d}` : d;
  }
  waValido(): boolean { const d = this.waDigitos(); return d.length >= 10 && d.length <= 15; }
  waAbrirWeb(): void {
    if (!this.waValido()) return;
    const w = Math.min(1100, window.screen.availWidth), h = Math.min(850, window.screen.availHeight);
    window.open(`https://web.whatsapp.com/send?phone=${this.waDigitos()}`, 'whatsapp-teste', `popup=yes,width=${w},height=${h},noopener`);
  }
  waAbrirCelular(): void { if (this.waValido()) window.open(`https://wa.me/${this.waDigitos()}`, '_blank', 'noopener'); }
  listaDe(f: IaConfigField): string[] { return String(this.valorCampo(f) ?? '').split(',').map((x) => x.trim()).filter(Boolean); }
  formatarNumero(n: string): string {
    const d = n.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return n;
  }
  adicionarNumero(f: IaConfigField): void {
    const n = this.novoNumero().replace(/@.*$/, '').replace(/\D/g, '');
    if (n.length < 8 || n.length > 15) { this.toast.warning('Informe o telefone (pelo menos 8 números), ex.: 92 99123-4567.'); return; }
    if (this.listaDe(f).some((x) => x.slice(-8) === n.slice(-8))) { this.toast.info('Esse número já está na lista.'); this.novoNumero.set(''); return; }
    const atual = this.listaDe(f);
    this.setCampo(f, [...atual, n].join(','));
    this.novoNumero.set('');
  }
  removerNumero(f: IaConfigField, n: string): void { this.setCampo(f, this.listaDe(f).filter((x) => x !== n).join(',')); }
  alterado(f: IaConfigField): boolean { return f.key in this.draft(); }
  alteradosDo(g: IaConfigField['group']): number { return this.camposDo(g).filter((f) => this.alterado(f)).length; }
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
  private pares(src: Record<string, number> | undefined, nomes: Record<string, string>) {
    return Object.entries(src ?? {}).filter(([, v]) => v > 0).map(([k, v]) => ({ label: nomes[k] ?? k, value: v }));
  }
}
