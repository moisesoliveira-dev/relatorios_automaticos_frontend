import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/ui/toast.service';
import { ModalService } from '../../shared/services/modal.service';
import { IaApiService, IaContent, IaContentDoc, IaKb } from './ia-api.service';

type Secao = 'mensagens' | 'base' | 'ambientes' | 'guia';

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
  imports: [FormsModule],
  template: `
    @if (conteudo(); as c) {
      <div class="space-y-5 pb-24">
        <div class="panel panel-pad flex flex-wrap items-center gap-3 justify-between">
          <div class="text-sm">
            <p><b>Como funciona:</b> você edita aqui, <b>salva como rascunho</b> (nada muda para o cliente) e só então <b>publica</b>. Dá para voltar à versão anterior.</p>
            <p class="mt-1" style="color: var(--cmm-muted);">
              {{ c.publishedAt ? 'Publicado em ' + data(c.publishedAt) + (c.publishedBy ? ' por ' + c.publishedBy : '') : 'Nada personalizado ainda — o bot usa os textos originais.' }}
            </p>
          </div>
          @if (c.hasPrevious) { <button type="button" class="btn btn-secondary btn-sm" (click)="reverter()">Voltar à versão anterior</button> }
        </div>

        <div class="seg" role="tablist" aria-label="Conteúdo da IA">
          @for (s of secoes; track s.key) {
            <button type="button" role="tab" class="seg-btn" [class.seg-on]="secao() === s.key" [attr.aria-selected]="secao() === s.key" (click)="secao.set(s.key)">{{ s.label }}</button>
          }
        </div>

        @switch (secao()) {
          <!-- ═════ MENSAGENS ═════ -->
          @case ('mensagens') {
            <div class="grid grid-cols-1 lg:grid-cols-[16rem_1fr] gap-5 items-start">
              <nav class="rail panel" aria-label="Etapas do atendimento">
                <p class="rail-title">Fluxo do atendimento</p>
                @for (g of grupos; track g.id; let i = $index) {
                  <button type="button" class="rail-item" [class.rail-on]="grupoAtivo() === g.id" (click)="grupoAtivo.set(g.id)">
                    <span class="rail-num">{{ i + 1 }}</span>
                    <span class="min-w-0 flex-1 text-left"><span class="block font-semibold text-sm truncate">{{ g.icone }} {{ g.titulo }}</span></span>
                    @if (editadasNoGrupo(g.id) > 0) { <span class="rail-badge" title="Mensagens alteradas">{{ editadasNoGrupo(g.id) }}</span> }
                  </button>
                }
              </nav>

              <div class="space-y-4 min-w-0">
                @if (grupoAtual(); as g) {
                  <div><h2 class="sec-title">{{ g.icone }} {{ g.titulo }}</h2><p class="text-sm" style="color: var(--cmm-muted);">{{ g.texto }}</p></div>

                  @if (g.id === 'inicio') {
                    <div class="panel panel-pad">
                      <h3 class="font-semibold text-sm mb-1">Opções do menu inicial</h3>
                      <p class="text-xs mb-3" style="color: var(--cmm-muted);">Desative uma opção para o bot deixar de aceitá-la. Depois, tire a linha dela do texto do menu abaixo.</p>
                      <div class="grid sm:grid-cols-2 gap-2">
                        @for (o of opcoesMenu; track o.n) {
                          <label class="switch-row"><span>{{ o.n }} — {{ o.label }}</span>
                            <button type="button" role="switch" class="switch" [class.switch-on]="!menuDesativada(o.n)" [attr.aria-checked]="!menuDesativada(o.n)" (click)="alternarMenu(o.n)"><span class="switch-knob"></span></button></label>
                        }
                      </div>
                    </div>
                  }

                  @for (m of g.chaves; track m[0]) {
                    <article class="panel panel-pad msg" [class.msg-edit]="editada(m[0])">
                      <div class="flex items-start justify-between gap-3 flex-wrap">
                        <div class="min-w-0">
                          <h3 class="font-semibold">{{ m[1] }}</h3>
                          <code class="text-xs" style="color: var(--cmm-muted);">{{ m[0] }}</code>
                        </div>
                        <div class="flex items-center gap-2">
                          <span class="badge" [class.badge-accent]="editada(m[0])" [class.badge-neutral]="!editada(m[0])">{{ editada(m[0]) ? 'Editada' : 'Original' }}</span>
                          @if (editada(m[0])) { <button type="button" class="btn btn-ghost btn-sm" (click)="restaurarMsg(m[0])">Restaurar original</button> }
                        </div>
                      </div>
                      <div class="grid xl:grid-cols-2 gap-4 mt-3">
                        <div>
                          <textarea class="form-input msg-text" rows="7" [attr.aria-label]="'Texto de ' + m[1]" [ngModel]="textoMsg(m[0])" (ngModelChange)="setMsg(m[0], $event)"></textarea>
                          <div class="flex justify-between gap-2 mt-1 text-xs" style="color: var(--cmm-muted);">
                            <span>{{ textoMsg(m[0]).length }} caracteres · use *negrito* e quebras de linha como no WhatsApp</span>
                          </div>
                          @if (problema(m[0]); as p) { <p class="msg-erro" role="alert">{{ p }}</p> }
                          @if (spec(m[0]); as sp) {
                            @if (sp.placeholders.length) {
                              <p class="text-xs mt-2">Variáveis preenchidas pelo sistema (mantenha): @for (v of sp.placeholders; track v) { <code class="chip">{{ '{' + v + '}' }}</code> }</p>
                            }
                            @if (sp.objetivo) {
                              <p class="text-xs mt-2" style="color: var(--cmm-muted);"><b>Objetivo para a IA:</b> {{ sp.objetivo }}</p>
                            }
                          }
                        </div>
                        <div>
                          <p class="text-xs font-semibold mb-1" style="color: var(--cmm-muted);">Como o cliente vê</p>
                          <div class="wa"><div class="wa-bubble">{{ previa(m[0]) }}</div></div>
                        </div>
                      </div>
                    </article>
                  }
                }
              </div>
            </div>
          }

          <!-- ═════ BASE DE CONHECIMENTO ═════ -->
          @case ('base') {
            <div class="panel panel-pad">
              <h2 class="sec-title">Base de conhecimento</h2>
              <p class="text-sm mt-1" style="color: var(--cmm-muted);">Quando o cliente faz uma pergunta livre, a IA só pode responder com o que está escrito aqui — nada além. O que não estiver aqui vai para um atendente. Preços, prazos e links nunca são repetidos pela IA, mesmo que estejam escritos.</p>
            </div>
            @for (e of kb(); track $index; let i = $index) {
              <article class="panel panel-pad space-y-3">
                <div class="flex items-center justify-between gap-2">
                  <h3 class="font-semibold text-sm">Entrada {{ i + 1 }} <span class="text-xs" style="color: var(--cmm-muted);">({{ e.id }})</span></h3>
                  <button type="button" class="btn btn-ghost btn-sm" style="color: var(--cmm-danger);" (click)="removerKb(i)">Excluir</button>
                </div>
                <div><label class="form-label" [attr.for]="'kb-t-' + i">O que a IA pode afirmar</label>
                  <textarea class="form-input" rows="3" [id]="'kb-t-' + i" maxlength="600" [ngModel]="e.text" (ngModelChange)="editarKb(i, { text: $event })" placeholder="Ex.: A loja abre de segunda a sábado, das 9h às 18h."></textarea>
                  <p class="text-xs mt-1" style="color: var(--cmm-muted);">{{ e.text.length }}/600</p></div>
                <div><label class="form-label" [attr.for]="'kb-k-' + i">Palavras que ativam esta entrada (separe por vírgula)</label>
                  <input class="form-input" [id]="'kb-k-' + i" [value]="e.keywords.join(', ')" (change)="editarKb(i, { keywords: lista($any($event.target).value) })" placeholder="horário, abre, funciona" />
                  <p class="text-xs mt-1" style="color: var(--cmm-muted);">Se deixar vazio, o sistema escolhe pelas palavras do texto.</p></div>
              </article>
            } @empty {
              <div class="panel panel-pad"><div class="empty-state">A base está vazia: toda pergunta livre será encaminhada a um atendente.</div></div>
            }
            <div class="flex gap-2 flex-wrap">
              <button type="button" class="btn btn-primary" (click)="adicionarKb()" [disabled]="kb().length >= 50">Adicionar entrada</button>
              <button type="button" class="btn btn-secondary" (click)="restaurarKb()">Restaurar base original</button>
            </div>
          }

          <!-- ═════ AMBIENTES ═════ -->
          @case ('ambientes') {
            <div class="panel panel-pad">
              <h2 class="sec-title">Ambientes de interesse</h2>
              <p class="text-sm mt-1" style="color: var(--cmm-muted);">São as opções que o cliente escolhe (1 a 8) e que vão para a pasta dele no Drive. Aqui você troca o <b>nome</b>; o número é fixo. Depois, atualize a lista na mensagem de escolha dos ambientes.</p>
            </div>
            <div class="panel panel-pad grid sm:grid-cols-2 gap-3">
              @for (n of numerosAmbiente; track n) {
                <div><label class="form-label" [attr.for]="'amb-' + n">Opção {{ n }}</label>
                  <div class="flex gap-2"><input class="form-input" [id]="'amb-' + n" maxlength="40" [ngModel]="nomeAmbiente(n)" (ngModelChange)="setAmbiente(n, $event)" />
                    @if (doc().categorias[n]) { <button type="button" class="btn btn-ghost btn-sm" (click)="setAmbiente(n, null)" title="Restaurar">↺</button> }</div></div>
              }
            </div>
            <div class="flex gap-2 flex-wrap items-center">
              <button type="button" class="btn btn-secondary" (click)="sincronizarAmbientes()">Atualizar a lista na mensagem de ambientes</button>
              <span class="text-xs" style="color: var(--cmm-muted);">Reescreve as linhas “*1* - emoji Nome” da mensagem “Escolha dos ambientes”.</span>
            </div>
          }

          <!-- ═════ GUIA DA IA ═════ -->
          @case ('guia') {
            <div class="panel panel-pad">
              <h2 class="sec-title">Guia da IA</h2>
              <p class="text-sm mt-1" style="color: var(--cmm-muted);">Define o <b>jeito de falar</b> da Vera. A IA continua obrigada a comunicar tudo que cada mensagem precisa, nunca inventa preço, prazo ou promessa e só responde dúvidas pela base de conhecimento.</p>
            </div>
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
              <textarea id="guia-instr" class="form-input" rows="6" maxlength="1500" [ngModel]="doc().guidance.instructions" (ngModelChange)="setInstrucoes($event)" placeholder="Ex.: Trate o cliente por 'você'. Quando falar de visita, convide para conhecer o showroom. Nunca use gírias."></textarea>
              <p class="text-xs mt-1" style="color: var(--cmm-muted);">{{ doc().guidance.instructions.length }}/1500 · vale para as mensagens escritas pela IA e para as respostas de dúvidas.</p>
              <div class="flex gap-2 flex-wrap mt-3">
                @for (ex of sugestoes; track ex) { <button type="button" class="chip chip-btn" (click)="addSugestao(ex)">+ {{ ex }}</button> }
              </div>
            </div>
          }
        }
      </div>

      @if (alteracoes() > 0 || c.draft) {
        <div class="savebar" role="region" aria-label="Rascunho do conteúdo">
          <span>
            @if (alteracoes() > 0) { <b>{{ alteracoes() }}</b> alteração(ões) em relação ao publicado }
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
    .sec-title { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; letter-spacing: -0.01em; }
    .seg { display: inline-flex; gap: .25rem; padding: .3rem; border-radius: 999px; background: color-mix(in srgb, var(--cmm-border) 45%, var(--cmm-panel)); max-width: 100%; overflow-x: auto; }
    .seg-btn { padding: .5rem 1.1rem; border-radius: 999px; border: none; background: transparent; color: var(--cmm-muted); font-weight: 600; font-size: .875rem; cursor: pointer; white-space: nowrap; transition: color 200ms, background-color 250ms, box-shadow 250ms; }
    .seg-btn:hover { color: var(--cmm-ink); }
    .seg-on, .seg-on:hover { color: var(--cmm-accent-ink); background: linear-gradient(120deg, var(--cmm-accent), var(--cmm-accent-2)); box-shadow: 0 8px 20px -10px var(--cmm-accent); }
    .rail { padding: .75rem; position: sticky; top: 5rem; }
    .rail-title { font-size: .6875rem; font-weight: 700; text-transform: uppercase; letter-spacing: .09em; color: var(--cmm-muted); padding: .25rem .5rem .6rem; }
    .rail-item { display: flex; align-items: center; gap: .65rem; width: 100%; padding: .55rem .6rem; border: none; border-radius: .75rem; background: transparent; cursor: pointer; color: var(--cmm-ink); transition: background-color 200ms; }
    .rail-item:hover { background: color-mix(in srgb, var(--cmm-accent) 8%, transparent); }
    .rail-on { background: var(--cmm-accent-soft); }
    .rail-num { flex-shrink: 0; width: 1.5rem; height: 1.5rem; border-radius: 99px; display: grid; place-items: center; font-size: .72rem; font-weight: 800; background: color-mix(in srgb, var(--cmm-border) 70%, var(--cmm-panel)); }
    .rail-on .rail-num { background: var(--cmm-accent); color: var(--cmm-accent-ink); }
    .rail-badge { font-size: .68rem; font-weight: 800; padding: .05rem .45rem; border-radius: 99px; background: var(--cmm-accent); color: var(--cmm-accent-ink); }
    .msg { border-left: 3px solid transparent; transition: border-color 250ms; }
    .msg-edit { border-left-color: var(--cmm-accent); }
    .msg-text { font-size: .875rem; line-height: 1.5; resize: vertical; min-height: 8rem; }
    .msg-erro { margin-top: .5rem; font-size: .8125rem; font-weight: 600; color: var(--cmm-danger); }
    .wa { padding: 1rem; border-radius: 1rem; background: color-mix(in srgb, var(--cmm-success) 8%, var(--cmm-bg, var(--cmm-panel))); border: 1px solid var(--cmm-border); }
    .wa-bubble { max-width: 95%; padding: .6rem .85rem; border-radius: .25rem 1rem 1rem 1rem; background: var(--cmm-panel); box-shadow: 0 1px 2px rgba(0,0,0,.12); font-size: .875rem; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere; }
    .chip { display: inline-flex; align-items: center; padding: .1rem .55rem; margin: 0 .2rem; border-radius: 99px; font-size: .75rem; background: var(--cmm-accent-soft); color: var(--cmm-accent); font-weight: 600; }
    .chip-btn { border: 1px dashed color-mix(in srgb, var(--cmm-accent) 45%, transparent); cursor: pointer; margin: 0; }
    .chip-btn:hover { background: var(--cmm-accent); color: var(--cmm-accent-ink); }
    .switch-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-size: .875rem; font-weight: 600; padding: .4rem 0; }
    .switch { flex-shrink: 0; width: 2.9rem; height: 1.6rem; border-radius: 99px; border: none; background: var(--cmm-border); position: relative; cursor: pointer; transition: background-color 300ms; }
    .switch-on { background: var(--cmm-accent); }
    .switch-knob { position: absolute; top: 3px; left: 3px; width: 1.2rem; height: 1.2rem; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); transition: transform 400ms var(--ease-out-expo); }
    .switch-on .switch-knob { transform: translateX(1.3rem); }
    .tone { display: flex; flex-direction: column; gap: .35rem; text-align: left; padding: 1rem; border-radius: 1rem; border: 1.5px solid var(--cmm-border); background: var(--cmm-panel); cursor: pointer; color: var(--cmm-ink); transition: border-color 200ms, background-color 200ms, transform 300ms var(--ease-out-expo); }
    .tone:hover { transform: translateY(-2px); }
    .tone-on { border-color: var(--cmm-accent); background: var(--cmm-accent-soft); }
    .savebar { position: fixed; left: 50%; bottom: 1.25rem; transform: translateX(-50%); z-index: 90; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .75rem 1.5rem; padding: .7rem 1rem .7rem 1.4rem; border-radius: 1.5rem; background: var(--cmm-ink); color: var(--cmm-panel); box-shadow: 0 24px 60px -16px rgba(0,0,0,.6); font-size: .875rem; animation: bar-up 500ms var(--ease-out-expo) both; max-width: calc(100vw - 2rem); }
    @keyframes bar-up { from { opacity: 0; transform: translate(-50%, 30px); } to { opacity: 1; transform: translate(-50%, 0); } }
  `],
})
export class IaConteudoComponent implements OnInit {
  private readonly api = inject(IaApiService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(ModalService);

  grupos = GRUPOS;
  secoes: Array<{ key: Secao; label: string }> = [
    { key: 'mensagens', label: 'Mensagens' }, { key: 'base', label: 'Base de conhecimento' }, { key: 'ambientes', label: 'Ambientes' }, { key: 'guia', label: 'Guia da IA' },
  ];
  opcoesMenu = [{ n: 4, label: 'Pagamento por boleto' }, { n: 5, label: 'Endereço da loja' }];
  numerosAmbiente = [1, 2, 3, 4, 5, 6, 7, 8];
  sugestoes = [
    'Trate o cliente por “você”.', 'Nunca use gírias.', 'Convide o cliente a conhecer o showroom ao falar de visita.', 'Use linguagem neutra, sem presumir o gênero do cliente.', 'Seja breve: no máximo duas frases por mensagem.',
  ];

  conteudo = signal<IaContent | null>(null);
  doc = signal<IaContentDoc>(this.vazio());
  /** Cópia do último estado salvo no servidor (rascunho ou publicado), para saber se há algo não salvo. */
  private salvo = signal('');
  secao = signal<Secao>('mensagens');
  grupoAtivo = signal('inicio');
  ocupado = signal(false);

  grupoAtual = computed(() => GRUPOS.find((g) => g.id === this.grupoAtivo()));
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
    if (JSON.stringify([...d.menuDesativado].sort()) !== JSON.stringify([...p.menuDesativado].sort())) n++;
    return n;
  });

  ngOnInit(): void { this.carregar(); }

  private vazio(): IaContentDoc {
    return { messages: {}, kb: null, categorias: {}, guidance: { tone: 'padrao', instructions: '' }, menuDesativado: [] };
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

  // ───── mensagens
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
