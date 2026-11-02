import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/ui/toast.service';
import { ModalService } from '../../shared/services/modal.service';
import { IaFluxosComponent, MODELOS } from './ia-fluxos.component';
import { IaApiService, IaContent, IaContentDoc, IaFlow, IaKb } from './ia-api.service';


/** Mensagens agrupadas pela etapa do atendimento em que o cliente as lê. */
const GRUPOS: Array<{ id: string; titulo: string; texto: string; icone: string; chaves: Array<[string, string]> }> = [
  { id: 'inicio', titulo: 'Início e menu', icone: '👋', texto: 'A primeira conversa e quando o cliente volta.', chaves: [
    ['menu_inicial', 'Boas-vindas e menu'], ['menu_reapresentado', 'Menu reapresentado'], ['reconhecimento', 'Cliente que já foi atendido'], ['reinicio_por_pausa', 'Reinício após pausa'] ] },
  { id: 'nome', titulo: 'Nome', icone: '🪪', texto: 'Como o bot pede e confirma o nome.', chaves: [
    ['pedir_nome', 'Pedir o nome'], ['confirmar_nome', 'Confirmar o nome'] ] },
  { id: 'arquivos', titulo: 'Arquivos', icone: '📎', texto: 'Envio de projeto e planta.', chaves: [
    ['pedir_projeto', 'Pedir o projeto'], ['aguardar_ok_atendente', 'Aguardar OK (vai ao atendente)'], ['aguardar_ok_continuar', 'Aguardar OK (continua o bot)'], ['referencias_ok', 'Aguardar OK das referências'] ] },
  { id: 'imovel', titulo: 'Imóvel e ambientes', icone: '🏠', texto: 'Casa ou apartamento, planta e ambientes de interesse.', chaves: [
    ['casa_ou_ap', 'Casa ou apartamento?'], ['planta_instrucoes', 'Como achar a planta'], ['planta_achou_ou_nao', 'Achou a planta?'], ['ambientes_categorias', 'Escolha dos ambientes'] ] },
  { id: 'agenda', titulo: 'Agendamento', icone: '📅', texto: 'Medição e escolha de horário.', chaves: [
    ['agendar_medicao_pergunta', 'Quer agendar medição?'], ['escolher_horario', 'Escolher o horário'], ['horario_agendado', 'Horário agendado'], ['horario_indisponivel', 'Horário indisponível'], ['nao_quer_agendar', 'Não quer agendar'] ] },
  { id: 'loja', titulo: 'Pagamento e loja', icone: '📍', texto: 'Boleto e endereço da loja física.', chaves: [
    ['info_boleto', 'Informações de boleto'], ['pergunta_visita_boleto', 'Visita após o boleto'], ['endereco_loja', 'Endereço da loja'], ['pergunta_visita_loja', 'Visita à loja'] ] },
  { id: 'fim', titulo: 'Encaminhamento', icone: '🤝', texto: 'Quando o cliente passa ao projetista.', chaves: [
    ['redirecionando_projetistas', 'Encaminhando ao projetista'], ['redirecionando_projetistas_com_nome', 'Encaminhando (com nome)'] ] },
  { id: 'avisos', titulo: 'Avisos e erros', icone: '⚠️', texto: 'Resposta inválida, assunto fora do tema, áudio.', chaves: [
    ['invalida_generica', 'Opção inválida'], ['invalida_nome', 'Nome inválido'], ['invalida_nome_1_etapa', 'Nome inválido (falta 1 etapa)'], ['invalida_nome_2_etapas', 'Nome inválido (faltam 2 etapas)'], ['invalida_arquivos', 'Arquivo não enviado'], ['invalida_ambientes', 'Ambientes inválidos'], ['invalida_horario', 'Horário inválido'], ['fora_escopo', 'Fora do assunto'], ['fora_escopo_limite', 'Limite de fora do assunto'], ['audio_nao_suportado', 'Áudio recebido'] ] },
];

const EXEMPLO: Record<string, string> = { nome: 'Ana', horario1: 'Seg 09:00', horario2: 'Seg 11:00', horario3: 'Ter 09:00', horario4: 'Ter 11:00', horario5: 'Qua 09:00', horario6: 'Qua 11:00', horario7: 'Qui 09:00', horario8: 'Qui 11:00' };

@Component({
  selector: 'app-ia-conteudo',
  standalone: true,
  imports: [FormsModule, IaFluxosComponent],
  template: `
    @if (conteudo(); as c) {
      <div class="space-y-5 pb-24">
        <!-- Estado da publicação e como funciona, numa linha -->
        <div class="panel panel-pad status">
          <div class="steps" aria-label="Como funciona">
            <span class="step"><b>1</b> Edite</span><span class="step-sep">→</span>
            <span class="step"><b>2</b> Salve o rascunho <small>(nada muda para o cliente)</small></span><span class="step-sep">→</span>
            <span class="step"><b>3</b> Publique</span>
          </div>
          <div class="flex items-center gap-3 flex-wrap">
            <span class="text-sm" style="color: var(--cmm-muted);">{{ c.publishedAt ? 'Publicado em ' + data(c.publishedAt) + (c.publishedBy ? ' por ' + c.publishedBy : '') : 'Ainda usando os textos originais' }}</span>
            @if (c.hasPrevious) { <button type="button" class="btn btn-ghost btn-sm" (click)="reverter()">Voltar à versão anterior</button> }
          </div>
        </div>

        <!-- Celular/tablet: a navegação lateral vira um seletor -->
        <div class="lg:hidden">
          <label class="form-label" for="pg-sel">Seção</label>
          <select id="pg-sel" class="form-input" [ngModel]="pagina()" (ngModelChange)="pagina.set($event)">
            <optgroup label="O que o cliente vê">
              <option value="padrao">⭐ Fluxo padrão</option>
              @for (f of doc().fluxos; track $index; let i = $index) { <option [value]="'f' + i">🧭 {{ f.nome || 'Sem nome' }}{{ f.ativo ? '' : ' (desativado)' }}</option> }
            </optgroup>
            <optgroup label="Como a IA fala e responde">
              <option value="jeito">🗣️ Jeito de falar</option>
              <option value="saber">📚 O que ela sabe</option>
            </optgroup>
          </select>
          <div class="flex gap-2 mt-2">
            <button type="button" class="btn btn-secondary btn-sm flex-1" (click)="novoFluxo('coleta')" [disabled]="doc().fluxos.length >= 10">+ Fluxo (coleta + Drive)</button>
            <button type="button" class="btn btn-secondary btn-sm flex-1" (click)="novoFluxo('branco')" [disabled]="doc().fluxos.length >= 10">+ Em branco</button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-[15.5rem_1fr] gap-5 items-start">
          <!-- Navegação única -->
          <nav class="nav panel hidden lg:block" aria-label="Seções do atendimento">
            <p class="nav-title">O que o cliente vê</p>
            <button type="button" class="nav-item" [class.nav-on]="pagina() === 'padrao'" (click)="pagina.set('padrao')">
              <span class="nav-ico">⭐</span><span class="nav-txt"><b>Fluxo padrão</b><small>Menu com 5 opções</small></span>
              @if (editadasPadrao() > 0) { <span class="nav-badge" title="Itens alterados">{{ editadasPadrao() }}</span> }
            </button>
            @for (f of doc().fluxos; track $index; let i = $index) {
              <button type="button" class="nav-item" [class.nav-on]="pagina() === 'f' + i" (click)="pagina.set('f' + i)">
                <span class="nav-ico">🧭</span><span class="nav-txt"><b>{{ f.nome || 'Sem nome' }}</b><small>{{ f.ativo ? (f.menuOpcao ? 'Ativo · opção ' + f.menuOpcao : 'Ativo sem opção') : 'Desativado' }}</small></span>
                <span class="dot" [class.dot-on]="f.ativo"></span>
              </button>
            }
            @if (!novoAberto()) {
              <button type="button" class="nav-add" (click)="novoAberto.set(true)" [disabled]="doc().fluxos.length >= 10">+ Criar novo fluxo</button>
            } @else {
              <div class="nav-new">
                <p class="text-xs mb-2" style="color: var(--cmm-muted);">Como começar?</p>
                <button type="button" class="btn btn-primary btn-sm w-full mb-2" (click)="novoFluxo('coleta')">Coleta de dados + Drive</button>
                <button type="button" class="btn btn-secondary btn-sm w-full mb-2" (click)="novoFluxo('branco')">Em branco</button>
                <button type="button" class="btn btn-ghost btn-sm w-full" (click)="novoAberto.set(false)">Cancelar</button>
              </div>
            }

            <p class="nav-title mt-4">Como a IA fala e responde</p>
            <button type="button" class="nav-item" [class.nav-on]="pagina() === 'jeito'" (click)="pagina.set('jeito')">
              <span class="nav-ico">🗣️</span><span class="nav-txt"><b>Jeito de falar</b><small>Tom e instruções</small></span>
            </button>
            <button type="button" class="nav-item" [class.nav-on]="pagina() === 'saber'" (click)="pagina.set('saber')">
              <span class="nav-ico">📚</span><span class="nav-txt"><b>O que ela sabe</b><small>{{ kb().length }} assunto(s) liberado(s)</small></span>
            </button>
          </nav>

          <div class="min-w-0 space-y-4">
            @switch (pagina().startsWith('f') ? 'flow' : pagina()) {
              <!-- ═════ FLUXO PADRÃO ═════ -->
              @case ('padrao') {
                <header>
                  <h2 class="sec-title">⭐ Fluxo padrão</h2>
                  <p class="text-sm mt-1" style="color: var(--cmm-muted);">É o atendimento que a Vera já faz: o cliente escolhe uma das 5 opções do menu e é conduzido etapa por etapa até um atendente. Abaixo estão as etapas na ordem em que o cliente passa por elas — abra uma para editar os textos.</p>
                </header>

                @for (g of grupos; track g.id; let i = $index) {
                  <section class="acc panel" [class.acc-open]="grupoAberto() === g.id">
                    <button type="button" class="acc-head" (click)="alternarGrupo(g.id)" [attr.aria-expanded]="grupoAberto() === g.id">
                      <span class="acc-num">{{ i + 1 }}</span>
                      <span class="min-w-0 flex-1 text-left"><b class="block">{{ g.icone }} {{ g.titulo }}</b><small class="block" style="color: var(--cmm-muted);">{{ g.texto }}</small></span>
                      @if (editadasNoGrupo(g.id) > 0) { <span class="badge badge-accent">{{ editadasNoGrupo(g.id) }} editada(s)</span> }
                      <span class="acc-chev" aria-hidden="true">▾</span>
                    </button>

                    @if (grupoAberto() === g.id) {
                      <div class="acc-body">
                        @if (g.id === 'inicio') {
                          <div class="sub-box">
                            <h3 class="font-semibold text-sm">Opções do menu</h3>
                            <p class="text-xs mb-2" style="color: var(--cmm-muted);">Desative uma opção para o bot deixar de aceitá-la. Depois, tire a linha dela do texto do menu logo abaixo.</p>
                            <div class="grid sm:grid-cols-2 gap-x-6">
                              @for (o of opcoesMenu; track o.n) {
                                <label class="switch-row"><span>{{ o.n }} — {{ o.label }}</span>
                                  <button type="button" role="switch" class="switch" [class.switch-on]="!menuDesativada(o.n)" [attr.aria-checked]="!menuDesativada(o.n)" (click)="alternarMenu(o.n)"><span class="switch-knob"></span></button></label>
                              }
                            </div>
                          </div>
                        }
                        @if (g.id === 'imovel') {
                          <div class="sub-box">
                            <h3 class="font-semibold text-sm">Nomes dos ambientes</h3>
                            <p class="text-xs mb-2" style="color: var(--cmm-muted);">São as opções 1 a 8 da escolha de ambientes (vão para a pasta do cliente no Drive). Troque o nome e use o botão para refletir na mensagem.</p>
                            <div class="grid sm:grid-cols-2 gap-2">
                              @for (n of numerosAmbiente; track n) {
                                <div class="flex gap-2 items-center"><span class="opt-n">{{ n }}</span>
                                  <input class="form-input" [attr.aria-label]="'Nome do ambiente ' + n" maxlength="40" [ngModel]="nomeAmbiente(n)" (ngModelChange)="setAmbiente(n, $event)" />
                                  @if (doc().categorias[n]) { <button type="button" class="btn btn-ghost btn-sm !px-2" (click)="setAmbiente(n, null)" title="Restaurar nome original">↺</button> }</div>
                              }
                            </div>
                            <button type="button" class="btn btn-secondary btn-sm mt-3" (click)="sincronizarAmbientes()">Atualizar a lista na mensagem “Escolha dos ambientes”</button>
                          </div>
                        }

                        @for (m of g.chaves; track m[0]) {
                          <article class="msg" [class.msg-edit]="editada(m[0])">
                            <button type="button" class="msg-head" (click)="alternarMsg(m[0])" [attr.aria-expanded]="aberta() === m[0]">
                              <span class="min-w-0 flex-1 text-left"><b class="block text-sm">{{ m[1] }}</b><span class="msg-prev">{{ resumo(m[0]) }}</span></span>
                              @if (problema(m[0])) { <span class="badge badge-danger">Corrigir</span> }
                              @if (editada(m[0])) { <span class="badge badge-accent">Editada</span> }
                              <span class="acc-chev" aria-hidden="true">▾</span>
                            </button>
                            @if (aberta() === m[0]) {
                              <div class="msg-body">
                                <div>
                                  <textarea class="form-input msg-text" rows="7" [attr.aria-label]="'Texto de ' + m[1]" [ngModel]="textoMsg(m[0])" (ngModelChange)="setMsg(m[0], $event)"></textarea>
                                  <p class="text-xs mt-1" style="color: var(--cmm-muted);">{{ textoMsg(m[0]).length }} caracteres · *negrito* e quebras de linha como no WhatsApp</p>
                                  @if (problema(m[0]); as p) { <p class="msg-erro" role="alert">{{ p }}</p> }
                                  @if (spec(m[0]); as sp) {
                                    @if (sp.placeholders.length) { <p class="text-xs mt-2">Variáveis que o sistema preenche (mantenha): @for (v of sp.placeholders; track v) { <code class="chip">{{ '{' + v + '}' }}</code> }</p> }
                                    @if (sp.objetivo) { <p class="text-xs mt-2" style="color: var(--cmm-muted);"><b>O que a IA precisa comunicar aqui:</b> {{ sp.objetivo }}</p> }
                                  }
                                  @if (editada(m[0])) { <button type="button" class="btn btn-ghost btn-sm mt-2" (click)="restaurarMsg(m[0])">Restaurar texto original</button> }
                                </div>
                                <div>
                                  <p class="text-xs font-semibold mb-1" style="color: var(--cmm-muted);">Como o cliente vê</p>
                                  <div class="wa"><div class="wa-bubble">{{ previa(m[0]) }}</div></div>
                                </div>
                              </div>
                            }
                          </article>
                        }
                      </div>
                    }
                  </section>
                }
              }

              <!-- ═════ MEUS FLUXOS ═════ -->
              @case ('flow') {
                @if (c.problemas.length) {
                  <div class="panel panel-pad text-sm" style="background: color-mix(in srgb, var(--cmm-warning) 10%, var(--cmm-panel));">
                    <p class="font-semibold mb-1">Para publicar, corrija:</p>
                    <ul class="list-disc pl-5 space-y-0.5">@for (p of c.problemas; track p) { <li>{{ p }}</li> }</ul>
                  </div>
                }
                @if (fluxoIdx() >= 0 && doc().fluxos[fluxoIdx()]) {
                  <app-ia-fluxos [fluxos]="doc().fluxos" [indice]="fluxoIdx()" [ferramentas]="c.ferramentas" (mudou)="setFluxos($event)" />
                }
              }

              <!-- ═════ JEITO DE FALAR ═════ -->
              @case ('jeito') {
                <header>
                  <h2 class="sec-title">🗣️ Jeito de falar</h2>
                  <p class="text-sm mt-1" style="color: var(--cmm-muted);">Escolha o tom da Vera e, se quiser, dê instruções suas. A IA continua obrigada a comunicar tudo que cada mensagem precisa, nunca inventa preço, prazo ou promessa e só responde dúvidas pela base de conhecimento.</p>
                </header>
                <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  @for (t of c.tones; track t.key) {
                    <button type="button" class="tone" [class.tone-on]="doc().guidance.tone === t.key" (click)="setTom(t.key)">
                      <span class="font-semibold text-sm">{{ t.label }}</span>
                      <span class="text-xs" style="color: var(--cmm-muted);">{{ exemploTom(t.key) }}</span>
                    </button>
                  }
                </div>
                <div class="panel panel-pad">
                  <label class="form-label" for="guia-instr">Instruções extras (opcional)</label>
                  <textarea id="guia-instr" class="form-input" rows="6" maxlength="1500" [ngModel]="doc().guidance.instructions" (ngModelChange)="setInstrucoes($event)" placeholder="Ex.: Trate o cliente por 'você'. Quando falar de visita, convide para conhecer o showroom."></textarea>
                  <p class="text-xs mt-1" style="color: var(--cmm-muted);">{{ doc().guidance.instructions.length }}/1500 · vale para as mensagens escritas pela IA e para respostas de dúvidas.</p>
                  <p class="text-xs font-semibold mt-3 mb-1" style="color: var(--cmm-muted);">Sugestões (clique para adicionar)</p>
                  <div class="flex gap-2 flex-wrap">
                    @for (ex of sugestoes; track ex) { <button type="button" class="chip chip-btn" (click)="addSugestao(ex)">+ {{ ex }}</button> }
                  </div>
                </div>
              }

              <!-- ═════ O QUE ELA SABE ═════ -->
              @case ('saber') {
                <header>
                  <h2 class="sec-title">📚 O que ela sabe</h2>
                  <p class="text-sm mt-1" style="color: var(--cmm-muted);">Quando o cliente faz uma pergunta livre, a IA só responde com o que estiver escrito aqui. O que não estiver vai para um atendente. Preços, prazos e links nunca são repetidos pela IA, mesmo que estejam escritos.</p>
                </header>
                @for (e of kb(); track $index; let i = $index) {
                  <article class="panel panel-pad space-y-3">
                    <div class="flex items-center justify-between gap-2">
                      <h3 class="font-semibold text-sm">Assunto {{ i + 1 }}</h3>
                      <button type="button" class="btn btn-ghost btn-sm" style="color: var(--cmm-danger);" (click)="removerKb(i)">Excluir</button>
                    </div>
                    <div><label class="form-label" [attr.for]="'kb-t-' + i">O que a IA pode afirmar</label>
                      <textarea class="form-input" rows="3" [id]="'kb-t-' + i" maxlength="600" [ngModel]="e.text" (ngModelChange)="editarKb(i, { text: $event })" placeholder="Ex.: A loja abre de segunda a sábado, das 9h às 18h."></textarea>
                      <p class="text-xs mt-1" style="color: var(--cmm-muted);">{{ e.text.length }}/600</p></div>
                    <div><label class="form-label" [attr.for]="'kb-k-' + i">Quando o cliente falar disto (palavras separadas por vírgula)</label>
                      <input class="form-input" [id]="'kb-k-' + i" [value]="e.keywords.join(', ')" (change)="editarKb(i, { keywords: lista($any($event.target).value) })" placeholder="horário, abre, funciona" />
                      <p class="text-xs mt-1" style="color: var(--cmm-muted);">Se deixar vazio, o sistema escolhe pelas palavras do texto.</p></div>
                  </article>
                } @empty {
                  <div class="panel panel-pad"><div class="empty-state">Nada liberado: toda pergunta livre será encaminhada a um atendente.</div></div>
                }
                <div class="flex gap-2 flex-wrap">
                  <button type="button" class="btn btn-primary" (click)="adicionarKb()" [disabled]="kb().length >= 50">Adicionar assunto</button>
                  <button type="button" class="btn btn-secondary" (click)="restaurarKb()">Restaurar lista original</button>
                </div>
              }
            }
          </div>
        </div>
      </div>

      @if (alteracoes() > 0 || c.draft) {
        <div class="savebar" role="region" aria-label="Rascunho do conteúdo">
          <span>
            @if (alteracoes() > 0) { <b>{{ alteracoes() }}</b> alteração(ões) ainda não publicada(s) }
            @else { Rascunho igual ao publicado }
            @if (sujo()) { · <i>não salvo</i> } @else if (c.draftAt) { · rascunho salvo }
          </span>
          <div class="flex gap-2">
            <button type="button" class="btn btn-ghost btn-sm" (click)="descartar()" [disabled]="ocupado()">Descartar</button>
            <button type="button" class="btn btn-secondary btn-sm" (click)="salvarRascunho()" [disabled]="ocupado() || !sujo()">Salvar rascunho</button>
            <button type="button" class="btn btn-accent btn-sm" (click)="publicar()" [disabled]="ocupado() || alteracoes() === 0">Publicar</button>
          </div>
        </div>
      }
    } @else {
      <div class="panel panel-pad"><div class="skeleton h-4 w-1/2 mb-3"></div><div class="skeleton h-24 w-full"></div></div>
    }
  `,
  styles: [`
    :host { display: block; }
    .sec-title { font-family: var(--font-display); font-weight: 700; font-size: 1.15rem; letter-spacing: -0.01em; }
    .status { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: .75rem 1.5rem; }
    .steps { display: flex; flex-wrap: wrap; align-items: center; gap: .4rem; font-size: .8125rem; }
    .step { display: inline-flex; align-items: center; gap: .35rem; } .step small { color: var(--cmm-muted); }
    .step b { width: 1.35rem; height: 1.35rem; border-radius: 99px; display: grid; place-items: center; font-size: .7rem; background: var(--cmm-accent-soft); color: var(--cmm-accent); }
    .step-sep { color: var(--cmm-muted); }
    .nav { padding: .75rem; position: sticky; top: 5rem; }
    .nav-title { font-size: .6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: .09em; color: var(--cmm-muted); padding: .25rem .5rem .5rem; }
    .nav-item { display: flex; align-items: center; gap: .65rem; width: 100%; padding: .55rem .6rem; border: none; border-radius: .75rem; background: transparent; cursor: pointer; color: var(--cmm-ink); text-align: left; transition: background-color 200ms; }
    .nav-item:hover { background: color-mix(in srgb, var(--cmm-accent) 8%, transparent); }
    .nav-on { background: var(--cmm-accent-soft); }
    .nav-ico { font-size: 1.1rem; flex-shrink: 0; }
    .nav-txt { display: flex; flex-direction: column; min-width: 0; flex: 1; } .nav-txt b { font-size: .875rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; } .nav-txt small { font-size: .72rem; color: var(--cmm-muted); }
    .nav-badge { font-size: .68rem; font-weight: 800; padding: .05rem .45rem; border-radius: 99px; background: var(--cmm-accent); color: var(--cmm-accent-ink); }
    .dot { width: .55rem; height: .55rem; border-radius: 99px; background: var(--cmm-border); flex-shrink: 0; } .dot-on { background: var(--cmm-success); }
    .nav-add { width: 100%; margin-top: .25rem; padding: .5rem; border: 1.5px dashed var(--cmm-border); border-radius: .75rem; background: transparent; color: var(--cmm-accent); font-weight: 600; font-size: .8125rem; cursor: pointer; }
    .nav-add:hover { border-color: var(--cmm-accent); background: var(--cmm-accent-soft); }
    .nav-new { padding: .6rem; border: 1px solid var(--cmm-border); border-radius: .75rem; margin-top: .25rem; }
    .acc { overflow: hidden; }
    .acc-head { display: flex; align-items: center; gap: .85rem; width: 100%; padding: 1rem 1.25rem; border: none; background: transparent; cursor: pointer; color: var(--cmm-ink); }
    .acc-head:hover { background: color-mix(in srgb, var(--cmm-accent) 5%, transparent); }
    .acc-num { flex-shrink: 0; width: 1.8rem; height: 1.8rem; border-radius: 99px; display: grid; place-items: center; font-weight: 800; font-size: .8rem; background: color-mix(in srgb, var(--cmm-border) 70%, var(--cmm-panel)); }
    .acc-open .acc-num { background: var(--cmm-accent); color: var(--cmm-accent-ink); }
    .acc-chev { color: var(--cmm-muted); transition: transform 300ms var(--ease-out-expo); flex-shrink: 0; }
    .acc-open > .acc-head .acc-chev, .msg-head[aria-expanded='true'] .acc-chev { transform: rotate(180deg); }
    .acc-body { padding: 0 1.25rem 1.25rem; display: flex; flex-direction: column; gap: .6rem; border-top: 1px solid var(--cmm-border); padding-top: 1rem; }
    .sub-box { padding: .9rem 1rem; border-radius: .9rem; background: color-mix(in srgb, var(--cmm-border) 28%, var(--cmm-panel)); }
    .msg { border: 1px solid var(--cmm-border); border-radius: .9rem; background: var(--cmm-panel); border-left: 3px solid transparent; }
    .msg-edit { border-left-color: var(--cmm-accent); }
    .msg-head { display: flex; align-items: center; gap: .6rem; width: 100%; padding: .7rem .9rem; border: none; background: transparent; cursor: pointer; color: var(--cmm-ink); }
    .msg-prev { display: block; font-size: .78rem; color: var(--cmm-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .msg-body { display: grid; grid-template-columns: 1fr; gap: 1rem; padding: .25rem .9rem 1rem; }
    @media (min-width: 1280px) { .msg-body { grid-template-columns: 1fr 1fr; } }
    .msg-text { font-size: .875rem; line-height: 1.5; resize: vertical; min-height: 8rem; }
    .msg-erro { margin-top: .5rem; font-size: .8125rem; font-weight: 600; color: var(--cmm-danger); }
    .wa { padding: 1rem; border-radius: 1rem; background: color-mix(in srgb, var(--cmm-success) 8%, var(--cmm-bg, var(--cmm-panel))); border: 1px solid var(--cmm-border); }
    .wa-bubble { max-width: 95%; padding: .6rem .85rem; border-radius: .25rem 1rem 1rem 1rem; background: var(--cmm-panel); box-shadow: 0 1px 2px rgba(0,0,0,.12); font-size: .875rem; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere; }
    .chip { display: inline-flex; align-items: center; padding: .1rem .55rem; margin: 0 .2rem; border-radius: 99px; font-size: .75rem; background: var(--cmm-accent-soft); color: var(--cmm-accent); font-weight: 600; }
    .chip-btn { border: 1px dashed color-mix(in srgb, var(--cmm-accent) 45%, transparent); cursor: pointer; margin: 0; }
    .chip-btn:hover { background: var(--cmm-accent); color: var(--cmm-accent-ink); }
    .opt-n { flex-shrink: 0; width: 1.6rem; height: 1.6rem; border-radius: 99px; display: grid; place-items: center; font-weight: 800; font-size: .75rem; background: var(--cmm-accent-soft); color: var(--cmm-accent); }
    .switch-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-size: .875rem; font-weight: 600; padding: .4rem 0; }
    .switch { flex-shrink: 0; width: 2.9rem; height: 1.6rem; border-radius: 99px; border: none; background: var(--cmm-border); position: relative; cursor: pointer; transition: background-color 300ms; }
    .switch-on { background: var(--cmm-accent); }
    .switch-knob { position: absolute; top: 3px; left: 3px; width: 1.2rem; height: 1.2rem; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); transition: transform 400ms var(--ease-out-expo); }
    .switch-on .switch-knob { transform: translateX(1.3rem); }
    .tone { display: flex; flex-direction: column; gap: .35rem; text-align: left; padding: 1rem; border-radius: 1rem; border: 1.5px solid var(--cmm-border); background: var(--cmm-panel); cursor: pointer; color: var(--cmm-ink); transition: border-color 200ms, background-color 200ms, transform 300ms var(--ease-out-expo); }
    .tone:hover { transform: translateY(-2px); }
    .tone-on { border-color: var(--cmm-accent); background: var(--cmm-accent-soft); }
    .savebar { position: fixed; left: 50%; bottom: 1.25rem; transform: translateX(-50%); z-index: 90; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .75rem 1.5rem; padding: .7rem 1rem .7rem 1.4rem; border-radius: 1.5rem; background: var(--cmm-ink); color: var(--cmm-panel); box-shadow: 0 24px 60px -16px rgba(0,0,0,.6); font-size: .875rem; animation: bar-up 500ms var(--ease-out-expo) both; max-width: calc(100vw - 2rem); }
    @media (max-width: 640px) {
      .steps small { display: none; }
      .acc-head { padding: .85rem .9rem; gap: .65rem; }
      .acc-body { padding-inline: .8rem; }
      .savebar { left: .75rem; right: .75rem; transform: none; bottom: max(.75rem, env(safe-area-inset-bottom)); justify-content: space-between; border-radius: 1.1rem; padding: .65rem .8rem; animation: bar-up-m 500ms var(--ease-out-expo) both; }
      .savebar > div { width: 100%; } .savebar .btn { flex: 1 1 auto; }
    }
    @keyframes bar-up-m { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
    @keyframes bar-up { from { opacity: 0; transform: translate(-50%, 30px); } to { opacity: 1; transform: translate(-50%, 0); } }
  `],
})
export class IaConteudoComponent implements OnInit {
  private readonly api = inject(IaApiService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(ModalService);

  grupos = GRUPOS;
  opcoesMenu = [{ n: 4, label: 'Pagamento por boleto' }, { n: 5, label: 'Endereço da loja' }];
  numerosAmbiente = [1, 2, 3, 4, 5, 6, 7, 8];
  sugestoes = [
    'Trate o cliente por “você”.', 'Nunca use gírias.', 'Convide o cliente a conhecer o showroom ao falar de visita.', 'Use linguagem neutra, sem presumir o gênero do cliente.', 'Seja breve: no máximo duas frases por mensagem.',
  ];

  conteudo = signal<IaContent | null>(null);
  doc = signal<IaContentDoc>(this.vazio());
  /** Cópia do último estado salvo no servidor (rascunho ou publicado), para saber se há algo não salvo. */
  private salvo = signal('');
  /** Uma única navegação: 'padrao' | 'f<n>' (fluxo próprio) | 'jeito' | 'saber'. */
  pagina = signal('padrao');
  novoAberto = signal(false);
  grupoAberto = signal<string | null>('inicio');
  aberta = signal<string | null>(null);
  ocupado = signal(false);

  fluxoIdx = computed(() => (this.pagina().startsWith('f') ? Number(this.pagina().slice(1)) : -1));
  editadasPadrao = computed(() => {
    const d = this.doc();
    return Object.keys(d.messages).length + Object.keys(d.categorias).length + d.menuDesativado.length;
  });
  kb = computed(() => this.doc().kb ?? this.conteudo()?.defaults.kb ?? []);
  sujo = computed(() => JSON.stringify(this.doc()) !== this.salvo());
  alteracoes = computed(() => {
    const c = this.conteudo();
    if (!c) return 0;
    const d = this.doc(), p = c.published;
    let n = 0;
    const keys = new Set([...Object.keys(d.messages), ...Object.keys(p.messages)]);
    for (const k of keys) if ((d.messages[k] ?? '') !== (p.messages[k] ?? '')) n++;
    if (JSON.stringify(d.kb) !== JSON.stringify(p.kb)) n++;
    const cats = new Set([...Object.keys(d.categorias), ...Object.keys(p.categorias)]);
    for (const k of cats) if ((d.categorias[k] ?? '') !== (p.categorias[k] ?? '')) n++;
    if (JSON.stringify(d.guidance) !== JSON.stringify(p.guidance)) n++;
    if (JSON.stringify(d.fluxos) !== JSON.stringify(p.fluxos)) n++;
    if (JSON.stringify([...d.menuDesativado].sort()) !== JSON.stringify([...p.menuDesativado].sort())) n++;
    return n;
  });

  ngOnInit(): void { this.carregar(); }

  private vazio(): IaContentDoc {
    return { messages: {}, kb: null, categorias: {}, guidance: { tone: 'padrao', instructions: '' }, menuDesativado: [], fluxos: [] };
  }
  private clone(d: IaContentDoc): IaContentDoc { return JSON.parse(JSON.stringify(d)); }

  private aplicar(c: IaContent): void {
    this.conteudo.set(c);
    const base = this.clone(c.draft ?? c.published);
    this.doc.set(base);
    this.salvo.set(JSON.stringify(base));
  }

  carregar(): void {
    this.api.content().subscribe({ next: (c) => this.aplicar(c), error: () => this.toast.error('Não foi possível carregar o conteúdo da IA.') });
  }

  data(iso: string): string { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
  private mudar(fn: (d: IaContentDoc) => void): void { this.doc.update((d) => { const n = this.clone(d); fn(n); return n; }); }

  // ───── fluxo padrão (mensagens)
  alternarGrupo(id: string): void { this.grupoAberto.set(this.grupoAberto() === id ? null : id); this.aberta.set(null); }
  alternarMsg(k: string): void { this.aberta.set(this.aberta() === k ? null : k); }
  resumo(k: string): string { return this.textoMsg(k).replace(/\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 110); }
  spec(k: string) { return this.conteudo()?.specs[k]; }
  textoMsg(k: string): string { return this.doc().messages[k] ?? this.conteudo()?.defaults.messages[k] ?? ''; }
  editada(k: string): boolean { return k in this.doc().messages; }
  editadasNoGrupo(id: string): number { return (GRUPOS.find((g) => g.id === id)?.chaves ?? []).filter((c) => this.editada(c[0])).length; }
  setMsg(k: string, v: string): void {
    const padrao = this.conteudo()?.defaults.messages[k];
    this.mudar((d) => { if (v === padrao) delete d.messages[k]; else d.messages[k] = v; });
  }
  restaurarMsg(k: string): void { this.mudar((d) => { delete d.messages[k]; }); }
  previa(k: string): string {
    return this.textoMsg(k).replace(/\{(\w+)\}/g, (_, v) => EXEMPLO[v] ?? '…').replace(/\*([^*\n]+)\*/g, '$1');
  }
  /** Mesmas regras do servidor, para avisar enquanto digita. O servidor continua sendo quem decide. */
  problema(k: string): string | null {
    const t = this.textoMsg(k).trim();
    if (!t) return 'O texto não pode ficar vazio.';
    const sp = this.spec(k);
    const base = this.conteudo()?.defaults.messages[k] ?? '';
    const tem = (s: string) => [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];
    const faltam = (sp?.placeholders ?? []).filter((p) => !tem(t).includes(p));
    if (faltam.length) return `Falta ${faltam.map((p) => '{' + p + '}').join(', ')} — o sistema preenche isso ao enviar.`;
    const extras = tem(t).filter((p) => !(sp?.placeholders ?? []).includes(p));
    if (extras.length) return `${extras.map((p) => '{' + p + '}').join(', ')} não existe nesta mensagem.`;
    const nums = (s: string) => [...new Set([...s.matchAll(/\*(\d{1,2})\*/g)].map((m) => Number(m[1])))];
    const menu = k === 'menu_inicial' || k === 'menu_reapresentado';
    const perdidas = nums(base).filter((n) => !(menu && this.menuDesativada(n)) && !nums(t).includes(n));
    if (perdidas.length) return `As opções ${perdidas.map((n) => '*' + n + '*').join(', ')} precisam continuar: o cliente responde com esses números.`;
    return null;
  }
  menuDesativada(n: number): boolean { return this.doc().menuDesativado.includes(n); }
  alternarMenu(n: number): void { this.mudar((d) => { d.menuDesativado = d.menuDesativado.includes(n) ? d.menuDesativado.filter((x) => x !== n) : [...d.menuDesativado, n]; }); }

  // ───── base de conhecimento
  private kbAtual(d: IaContentDoc): IaKb[] { return d.kb ?? this.clone({ ...this.vazio(), kb: this.conteudo()?.defaults.kb ?? [] }).kb!; }
  lista(v: string): string[] { return v.split(',').map((x) => x.trim()).filter(Boolean); }
  editarKb(i: number, patch: Partial<IaKb>): void { this.mudar((d) => { d.kb = this.kbAtual(d); d.kb[i] = { ...d.kb[i], ...patch }; }); }
  adicionarKb(): void { this.mudar((d) => { d.kb = [...this.kbAtual(d), { id: 'novo-' + (this.kbAtual(d).length + 1), keywords: [], text: '' }]; }); }
  async removerKb(i: number): Promise<void> {
    if (!(await this.modal.confirm('Excluir esta entrada?', 'A IA deixa de poder responder esse assunto (vai para um atendente).', 'Excluir'))) return;
    this.mudar((d) => { d.kb = this.kbAtual(d).filter((_, j) => j !== i); });
  }
  async restaurarKb(): Promise<void> {
    if (!(await this.modal.confirm('Restaurar a base original?', 'Suas entradas editadas neste rascunho serão trocadas pelas originais.', 'Restaurar'))) return;
    this.mudar((d) => { d.kb = null; });
  }

  // ───── ambientes
  nomeAmbiente(n: number): string { return this.doc().categorias[n] ?? this.conteudo()?.defaults.categorias[n] ?? ''; }
  setAmbiente(n: number, v: string | null): void {
    const padrao = this.conteudo()?.defaults.categorias[n];
    this.mudar((d) => { if (v === null || v === padrao) delete d.categorias[n]; else d.categorias[n] = v; });
  }
  sincronizarAmbientes(): void {
    let t = this.textoMsg('ambientes_categorias');
    for (const n of this.numerosAmbiente)
      t = t.replace(new RegExp(`^(\\*${n}\\* - )(\\p{Extended_Pictographic}\\S*\\s+)?(.*)$`, 'mu'), (_, a, emoji) => `${a}${emoji ?? ''}${this.nomeAmbiente(n)}`);
    this.setMsg('ambientes_categorias', t);
    this.toast.success('Lista atualizada na mensagem de ambientes (veja em Mensagens).');
  }

  // ───── fluxos
  setFluxos(f: IaFlow[]): void {
    this.mudar((d) => { d.fluxos = f; });
    if (this.fluxoIdx() >= f.length) this.pagina.set('padrao'); // o fluxo aberto foi excluído
  }
  novoFluxo(modelo: 'branco' | 'coleta'): void {
    const novo = MODELOS[modelo]();
    this.mudar((d) => { d.fluxos = [...d.fluxos, novo]; });
    this.pagina.set('f' + (this.doc().fluxos.length - 1));
    this.novoAberto.set(false);
  }

  // ───── guia
  setTom(k: string): void { this.mudar((d) => { d.guidance.tone = k; }); }
  setInstrucoes(v: string): void { this.mudar((d) => { d.guidance.instructions = v; }); }
  addSugestao(s: string): void { this.mudar((d) => { const t = d.guidance.instructions.trim(); d.guidance.instructions = (t ? t + '\n' : '') + s; }); }
  exemploTom(k: string): string {
    return ({ padrao: 'Calorosa e natural, como a Vera é hoje.', acolhedor: 'Mais próxima, quase de amiga; um emoji a mais.', formal: 'Respeitosa e elegante, sem gírias.', objetivo: 'Frases curtas, direto ao ponto.' } as Record<string, string>)[k] ?? '';
  }

  // ───── rascunho / publicação
  private erro(e: { error?: { message?: string | string[] } }, titulo: string): void {
    const m = e?.error?.message;
    void this.modal.error(Array.isArray(m) ? m.join('\n') : m || 'Não foi possível concluir.', titulo);
  }
  salvarRascunho(): void {
    this.ocupado.set(true);
    this.api.saveDraft(this.doc()).subscribe({
      next: (c) => { this.aplicar(c); this.ocupado.set(false); this.toast.success('Rascunho salvo. Nada mudou para os clientes ainda.'); },
      error: (e) => { this.ocupado.set(false); this.erro(e, 'Rascunho recusado'); },
    });
  }
  async publicar(): Promise<void> {
    const n = this.alteracoes();
    if (!(await this.modal.confirm('Publicar para os clientes?', `${n} alteração(ões) passam a valer em até 30 segundos para todas as conversas. Você poderá voltar à versão anterior.`, 'Publicar agora'))) return;
    this.ocupado.set(true);
    this.api.saveDraft(this.doc()).subscribe({
      next: () => this.api.publish().subscribe({
        next: (c) => { this.aplicar(c); this.ocupado.set(false); this.toast.success('Publicado.'); },
        error: (e) => { this.ocupado.set(false); this.erro(e, 'Publicação recusada'); },
      }),
      error: (e) => { this.ocupado.set(false); this.erro(e, 'Publicação recusada'); },
    });
  }
  async descartar(): Promise<void> {
    if (!(await this.modal.confirm('Descartar alterações?', 'Volta para o que está publicado e apaga o rascunho.', 'Descartar'))) return;
    this.api.discardDraft().subscribe({ next: (c) => { this.aplicar(c); this.toast.success('Rascunho descartado.'); }, error: (e) => this.erro(e, 'Não foi possível descartar') });
  }
  async reverter(): Promise<void> {
    if (!(await this.modal.confirm('Voltar à versão anterior?', 'A versão publicada agora será trocada pela anterior, para todos os clientes.', 'Voltar'))) return;
    this.api.rollback().subscribe({ next: (c) => { this.aplicar(c); this.toast.success('Versão anterior restaurada.'); }, error: (e) => this.erro(e, 'Não foi possível voltar') });
  }
}
