import { Component, HostListener, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../core/ui/toast.service';
import { ModalService } from '../../shared/services/modal.service';
import { IaFluxosComponent, MODELOS } from './ia-fluxos.component';
import { IaGuidance, IaTomComponent } from './ia-tom.component';
import { IaSaberComponent } from './ia-saber.component';
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
  imports: [FormsModule, IaFluxosComponent, IaTomComponent, IaSaberComponent],
  template: `
    @if (conteudo(); as c) {
      <div class="space-y-5 pb-24">
        @if (aberto() === null) {
          <!-- ═════ GALERIA DE FLUXOS ═════ -->
          <header class="gal-head">
            <div>
              <h2 class="sec-title">Fluxos de atendimento</h2>
              <p class="text-sm mt-1" style="color: var(--cmm-muted);">Cada cartão é um caminho de conversa. Abra um para editar etapas, jeito de falar e o que a IA sabe.</p>
            </div>
            <p class="pub-info">
              {{ c.publishedAt ? 'Publicado em ' + data(c.publishedAt) : 'Usando os textos originais' }}
              @if (c.hasPrevious) { · <button type="button" class="link" (click)="reverter()">voltar à versão anterior</button> }
            </p>
          </header>
          @if (c.problemas.length) {
            <div class="panel panel-pad text-sm" style="background: color-mix(in srgb, var(--cmm-warning) 10%, var(--cmm-panel));">
              <p class="font-semibold mb-1">Para publicar, corrija:</p>
              <ul class="list-disc pl-5 space-y-0.5">@for (p of c.problemas; track p) { <li>{{ p }}</li> }</ul>
            </div>
          }
          <div class="gallery">
            <button type="button" class="gcard gcard-std" (click)="abrir('padrao')">
              <span class="g-ico" aria-hidden="true">⭐</span>
              <b class="g-title">Fluxo padrão</b>
              <span class="g-desc">O atendimento que a Vera já faz: menu com 5 opções, nome, arquivos, ambientes, agendamento e encaminhamento.</span>
              <span class="g-meta">Opções 1 a 5 · {{ tomLabel(doc().guidance.tone) }} · {{ kb().length }} assunto(s)@if (editadasPadrao() > 0) { · <b class="g-edit">{{ editadasPadrao() }} alteração(ões)</b> }</span>
            </button>
            @for (f of doc().fluxos; track $index; let i = $index) {
              <button type="button" class="gcard" (click)="abrir('f' + i)">
                <span class="g-ico" aria-hidden="true">🧭</span>
                <b class="g-title">{{ f.nome || 'Sem nome' }}</b>
                <span class="g-desc">{{ f.descricao || 'Sem descrição.' }}</span>
                <span class="g-meta"><span class="g-dot" [class.g-dot-on]="f.ativo"></span>{{ f.ativo ? 'Ativo' : 'Desativado' }}@if (f.menuOpcao) { · opção {{ f.menuOpcao }} }  · {{ f.nos.length }} etapa(s)</span>
              </button>
            }
            <div class="gcard gcard-new">
              <span class="g-ico" aria-hidden="true">＋</span>
              <b class="g-title">Criar novo fluxo</b>
              <span class="g-desc">Monte seu caminho de conversa, usando o Google Drive se precisar.</span>
              <span class="g-chips">
                <button type="button" class="btn btn-primary btn-sm" (click)="novoFluxo('coleta')" [disabled]="doc().fluxos.length >= 10">Coleta de dados + Drive</button>
                <button type="button" class="btn btn-secondary btn-sm" (click)="novoFluxo('branco')" [disabled]="doc().fluxos.length >= 10">Em branco</button>
              </span>
            </div>
          </div>
        } @else {
          <!-- ═════ DENTRO DE UM FLUXO ═════ -->
          <div class="ws-head">
            <button type="button" class="btn btn-ghost btn-sm" (click)="fecharFluxo()">← Todos os fluxos</button>
            <h2 class="sec-title flex-1 min-w-[9rem]">{{ ehPadrao() ? '⭐ Fluxo padrão' : '🧭 ' + (fluxoAtual()!.nome || 'Sem nome') }}</h2>
          </div>
          <div class="seg" role="tablist" aria-label="Áreas do fluxo">
            <button type="button" role="tab" class="seg-btn" [class.seg-on]="aba() === 'etapas'" [attr.aria-selected]="aba() === 'etapas'" (click)="aba.set('etapas')">Etapas</button>
            <button type="button" role="tab" class="seg-btn" [class.seg-on]="aba() === 'jeito'" [attr.aria-selected]="aba() === 'jeito'" (click)="aba.set('jeito')">Jeito de falar</button>
            <button type="button" role="tab" class="seg-btn" [class.seg-on]="aba() === 'saber'" [attr.aria-selected]="aba() === 'saber'" (click)="aba.set('saber')">O que ela sabe</button>
          </div>

          @switch (aba()) {
            @case ('etapas') {
              @if (ehPadrao()) {
                <p class="text-sm" style="color: var(--cmm-muted);">As etapas na ordem em que o cliente passa por elas. Clique numa para editar os textos.</p>
                <div class="board">
                  @for (g of grupos; track g.id; let i = $index) {
                    <button type="button" class="card-node" (click)="abrirGrupo(g.id)" [attr.aria-label]="'Editar etapa ' + (i + 1) + ': ' + g.titulo">
                      <span class="cn-top"><span class="cn-num">{{ i + 1 }}</span><span class="cn-tipo">{{ g.chaves.length }} mensagem(ns)</span></span>
                      <b class="cn-title">{{ g.icone }} {{ g.titulo }}</b>
                      <span class="cn-snip">{{ g.texto }}</span>
                      <span class="cn-dest">@if (editadasNoGrupo(g.id) > 0) { <span class="badge badge-accent">{{ editadasNoGrupo(g.id) }} editada(s)</span> }</span>
                    </button>
                  }
                </div>
              } @else if (fluxoIdx() >= 0 && fluxoAtual()) {
                <app-ia-fluxos [fluxos]="doc().fluxos" [indice]="fluxoIdx()" [ferramentas]="c.ferramentas" (mudou)="setFluxos($event)" />
              }
            }
            @case ('jeito') {
              <app-ia-tom [guidance]="guidanceAtual()" [tones]="c.tones" [mostrarReescrever]="!ehPadrao()" [reescrever]="fluxoAtual()?.reescrever ?? false"
                [explicacao]="ehPadrao() ? 'Como a Vera fala no fluxo padrão. A IA continua obrigada a comunicar tudo que cada mensagem precisa, nunca inventa preço, prazo ou promessa e só responde dúvidas pela base de conhecimento.' : 'Como a IA fala SÓ dentro deste fluxo. Não afeta o fluxo padrão nem os outros fluxos.'"
                (mudou)="setGuidance($event)" (reescreverMudou)="setReescrever($event)" />
            }
            @case ('saber') {
              <app-ia-saber [kb]="kbAtualLista()" [permiteRestaurar]="ehPadrao()" [limite]="ehPadrao() ? 50 : 30"
                [explicacao]="ehPadrao() ? 'Quando o cliente faz uma pergunta livre no fluxo padrão, a IA só responde com o que estiver escrito aqui. O que não estiver vai para um atendente. Preços, prazos e links nunca são repetidos pela IA.' : 'Quando o cliente faz uma pergunta durante este fluxo, a IA responde só com o que estiver aqui e depois retoma a pergunta em que ele estava. Sem assuntos, a dúvida conta como resposta inválida.'"
                (mudou)="setKb($event)" (restaurar)="restaurarKbPadrao()" />
            }
          }
        }
      </div>

      <!-- Editar uma etapa do fluxo padrão (painel lateral) -->
      @if (grupoSheet(); as gid) {
        @if (grupoPorId(gid); as g) {
          <div class="sheet-backdrop" (click)="grupoSheet.set(null)" aria-hidden="true"></div>
          <aside class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="g.titulo" style="--sheet-w: 44rem;">
            <header class="sheet-head">
              <span class="text-xl" aria-hidden="true">{{ g.icone }}</span>
              <div class="min-w-0 flex-1"><h3 class="font-semibold">{{ g.titulo }}</h3><p class="text-xs" style="color: var(--cmm-muted);">{{ g.texto }}</p></div>
              <button type="button" class="btn btn-ghost btn-sm !px-2" (click)="grupoSheet.set(null)" aria-label="Fechar">✕</button>
            </header>
            <div class="sheet-body space-y-3">
              @if (g.id === 'inicio') {
                <div class="sub-box">
                  <h4 class="font-semibold text-sm">Opções do menu</h4>
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
                  <h4 class="font-semibold text-sm">Nomes dos ambientes</h4>
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
            <footer class="sheet-foot"><button type="button" class="btn btn-primary btn-sm ml-auto" (click)="grupoSheet.set(null)">Pronto</button></footer>
          </aside>
        }
      }

      @if (alteracoes() > 0 || c.draft) {
        <div class="savebar" role="region" aria-label="Rascunho do conteúdo">
          <span>
            @if (alteracoes() > 0) { <b>{{ alteracoes() }}</b> alteração(ões) não publicada(s) }
            @else { Rascunho igual ao publicado }
            @if (sujo()) { · <i>não salvo</i> } @else if (c.draftAt) { · rascunho salvo }
          </span>
          <div class="flex gap-2">
            <button type="button" class="btn btn-ghost btn-sm" (click)="descartar()" [disabled]="ocupado()">Descartar</button>
            <button type="button" class="btn btn-secondary btn-sm" title="Guarda sem publicar: nada muda para os clientes" (click)="salvarRascunho()" [disabled]="ocupado() || !sujo()">Salvar rascunho</button>
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
    .gal-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
    .pub-info { font-size: .8125rem; color: var(--cmm-muted); }
    .link { border: none; background: none; color: var(--cmm-accent); font-weight: 600; cursor: pointer; padding: 0; font-size: inherit; }
    .link:hover { text-decoration: underline; }
    .g-meta { margin-top: auto; font-size: .78rem; color: var(--cmm-muted); display: inline-flex; align-items: center; gap: .35rem; flex-wrap: wrap; }
    .g-edit { color: var(--cmm-accent); }
    .g-dot { width: .5rem; height: .5rem; border-radius: 99px; background: var(--cmm-border); } .g-dot-on { background: var(--cmm-success); }
    .gallery { display: grid; grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr)); gap: 1rem; }
    .gcard { display: flex; flex-direction: column; align-items: flex-start; gap: .5rem; text-align: left; padding: 1.25rem; min-height: 10.5rem; border-radius: 1.1rem; border: 1.5px solid var(--cmm-border); background: var(--cmm-panel); color: var(--cmm-ink); cursor: pointer; transition: transform 400ms var(--ease-out-expo), border-color 250ms, box-shadow 400ms var(--ease-out-expo); }
    .gcard:hover { transform: translateY(-4px); border-color: color-mix(in srgb, var(--cmm-accent) 55%, var(--cmm-border)); box-shadow: var(--cmm-shadow-lift); }
    .gcard-std { background: linear-gradient(160deg, var(--cmm-accent-soft), var(--cmm-panel) 60%); }
    .gcard-new { border-style: dashed; cursor: default; background: transparent; } .gcard-new .g-chips { margin-top: auto; } .gcard-new:hover { transform: none; box-shadow: none; }
    .g-ico { width: 2.6rem; height: 2.6rem; border-radius: .85rem; display: grid; place-items: center; font-size: 1.3rem; background: var(--cmm-accent-soft); }
    .g-title { font-family: var(--font-display); font-size: 1.1rem; line-height: 1.15; }
    .g-desc { font-size: .8125rem; color: var(--cmm-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .g-chips { margin-top: auto; display: flex; flex-wrap: wrap; gap: .4rem; }
    .ws-head { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
    .seg { display: inline-flex; gap: .15rem; padding: .25rem; border-radius: .8rem; background: color-mix(in srgb, var(--cmm-border) 45%, var(--cmm-panel)); max-width: 100%; overflow-x: auto; }
    .seg-btn { padding: .4rem 1rem; border-radius: .6rem; border: none; background: transparent; color: var(--cmm-muted); font-weight: 600; font-size: .875rem; cursor: pointer; white-space: nowrap; transition: color 200ms, background-color 250ms, box-shadow 250ms; }
    .seg-btn:hover { color: var(--cmm-ink); }
    .seg-on, .seg-on:hover { color: var(--cmm-ink); background: var(--cmm-panel); box-shadow: 0 1px 4px rgba(0,0,0,.12); }
    .board { display: grid; grid-template-columns: repeat(auto-fill, minmax(15.5rem, 1fr)); gap: .85rem; }
    .card-node { display: flex; flex-direction: column; gap: .4rem; text-align: left; padding: .9rem 1rem 1rem; border: 1.5px solid var(--cmm-border); border-top: 4px solid var(--cmm-accent); border-radius: 1rem; background: var(--cmm-panel); color: var(--cmm-ink); cursor: pointer; min-height: 9.5rem; transition: transform 350ms var(--ease-out-expo), border-color 200ms, box-shadow 350ms var(--ease-out-expo); }
    .card-node:hover { transform: translateY(-3px); border-color: color-mix(in srgb, var(--cmm-accent) 55%, var(--cmm-border)); box-shadow: var(--cmm-shadow-lift); }
    .cn-top { display: flex; align-items: center; gap: .45rem; flex-wrap: wrap; }
    .cn-num { width: 1.5rem; height: 1.5rem; border-radius: 99px; display: grid; place-items: center; font-size: .72rem; font-weight: 800; background: var(--cmm-accent-soft); color: var(--cmm-accent); }
    .cn-tipo { font-size: .72rem; font-weight: 700; color: var(--cmm-muted); text-transform: uppercase; letter-spacing: .05em; }
    .cn-title { font-size: .95rem; line-height: 1.2; }
    .cn-snip { font-size: .8rem; color: var(--cmm-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .cn-dest { margin-top: auto; display: flex; gap: .35rem; }
    .acc-chev { color: var(--cmm-muted); transition: transform 300ms var(--ease-out-expo); flex-shrink: 0; }
    .msg-head[aria-expanded='true'] .acc-chev { transform: rotate(180deg); }
    .sub-box { padding: .9rem 1rem; border-radius: .9rem; background: color-mix(in srgb, var(--cmm-border) 28%, var(--cmm-panel)); }
    .msg { border: 1px solid var(--cmm-border); border-radius: .9rem; background: var(--cmm-panel); border-left: 3px solid transparent; }
    .msg-edit { border-left-color: var(--cmm-accent); }
    .msg-head { display: flex; align-items: center; gap: .6rem; width: 100%; padding: .7rem .9rem; border: none; background: transparent; cursor: pointer; color: var(--cmm-ink); }
    .msg-prev { display: block; font-size: .78rem; color: var(--cmm-muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
    .msg-body { display: grid; grid-template-columns: 1fr; gap: 1rem; padding: .25rem .9rem 1rem; }
    .msg-text { font-size: .875rem; line-height: 1.5; resize: vertical; min-height: 8rem; }
    .msg-erro { margin-top: .5rem; font-size: .8125rem; font-weight: 600; color: var(--cmm-danger); }
    .wa { padding: 1rem; border-radius: 1rem; background: color-mix(in srgb, var(--cmm-success) 8%, var(--cmm-bg, var(--cmm-panel))); border: 1px solid var(--cmm-border); }
    .wa-bubble { max-width: 95%; padding: .6rem .85rem; border-radius: .25rem 1rem 1rem 1rem; background: var(--cmm-panel); box-shadow: 0 1px 2px rgba(0,0,0,.12); font-size: .875rem; line-height: 1.45; white-space: pre-line; overflow-wrap: anywhere; }
    .chip { display: inline-flex; align-items: center; padding: .1rem .55rem; margin: 0 .2rem; border-radius: 99px; font-size: .75rem; background: var(--cmm-accent-soft); color: var(--cmm-accent); font-weight: 600; }
    .opt-n { flex-shrink: 0; width: 1.6rem; height: 1.6rem; border-radius: 99px; display: grid; place-items: center; font-weight: 800; font-size: .75rem; background: var(--cmm-accent-soft); color: var(--cmm-accent); }
    .switch-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-size: .875rem; font-weight: 600; padding: .4rem 0; }
    .switch { flex-shrink: 0; width: 2.9rem; height: 1.6rem; border-radius: 99px; border: none; background: var(--cmm-border); position: relative; cursor: pointer; transition: background-color 300ms; }
    .switch-on { background: var(--cmm-accent); }
    .switch-knob { position: absolute; top: 3px; left: 3px; width: 1.2rem; height: 1.2rem; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); transition: transform 400ms var(--ease-out-expo); }
    .switch-on .switch-knob { transform: translateX(1.3rem); }
    .savebar { position: fixed; left: 50%; bottom: 1.25rem; transform: translateX(-50%); z-index: 90; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .75rem 1.5rem; padding: .7rem 1rem .7rem 1.4rem; border-radius: 1.5rem; background: var(--cmm-ink); color: var(--cmm-panel); box-shadow: 0 24px 60px -16px rgba(0,0,0,.6); font-size: .875rem; animation: bar-up 500ms var(--ease-out-expo) both; max-width: calc(100vw - 2rem); }
    @media (max-width: 640px) {
      .steps small { display: none; }
      .savebar { left: .75rem; right: .75rem; transform: none; bottom: max(.75rem, env(safe-area-inset-bottom)); justify-content: space-between; border-radius: 1.1rem; padding: .65rem .8rem; animation: bar-up-m 500ms var(--ease-out-expo) both; }
      .savebar > div { width: 100%; } .savebar .btn { flex: 1 1 auto; }
      .gallery { grid-template-columns: 1fr; }
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
  conteudo = signal<IaContent | null>(null);
  doc = signal<IaContentDoc>(this.vazio());
  /** Cópia do último estado salvo no servidor (rascunho ou publicado), para saber se há algo não salvo. */
  private salvo = signal('');
  /** null = galeria de fluxos; 'padrao' | 'f<n>' = dentro de um fluxo. */
  aberto = signal<string | null>(null);
  aba = signal<'etapas' | 'jeito' | 'saber'>('etapas');
  grupoSheet = signal<string | null>(null);
  aberta = signal<string | null>(null);
  ocupado = signal(false);

  ehPadrao = computed(() => this.aberto() === 'padrao');
  fluxoIdx = computed(() => { const a = this.aberto(); return a && a.startsWith('f') ? Number(a.slice(1)) : -1; });
  fluxoAtual = computed(() => this.doc().fluxos[this.fluxoIdx()] ?? null);
  guidanceAtual = computed<IaGuidance>(() => (this.ehPadrao() ? this.doc().guidance : this.fluxoAtual()?.guidance) ?? { tone: 'padrao', instructions: '' });
  /** Base de conhecimento do fluxo aberto (padrão: a lista do fluxo padrão, com os originais se nada foi alterado). */
  kbAtualLista = computed(() => (this.ehPadrao() ? this.kb() : (this.fluxoAtual()?.kb ?? [])));
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
  abrir(id: string): void { this.aberto.set(id); this.aba.set('etapas'); this.aberta.set(null); }
  fecharFluxo(): void { this.aberto.set(null); this.grupoSheet.set(null); }
  abrirGrupo(id: string): void { this.aberta.set(null); this.grupoSheet.set(id); }
  grupoPorId(id: string) { return GRUPOS.find((g) => g.id === id); }
  tomLabel(k?: string): string { return this.conteudo()?.tones.find((t) => t.key === (k ?? 'padrao'))?.label ?? 'Padrão da Vera'; }
  @HostListener('document:keydown.escape') esc(): void { if (this.grupoSheet()) this.grupoSheet.set(null); }
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

  // ───── base de conhecimento (do fluxo aberto)
  setKb(lista: IaKb[]): void {
    if (this.ehPadrao()) this.mudar((d) => { d.kb = lista; });
    else { const i = this.fluxoIdx(); this.mudar((d) => { d.fluxos[i].kb = lista; }); }
  }
  restaurarKbPadrao(): void { this.mudar((d) => { d.kb = null; }); }

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
    if (this.fluxoIdx() >= f.length) this.fecharFluxo(); // o fluxo aberto foi excluído
  }
  novoFluxo(modelo: 'branco' | 'coleta'): void {
    const novo = MODELOS[modelo]();
    const idx = this.doc().fluxos.length;
    this.mudar((d) => { d.fluxos = [...d.fluxos, novo]; });
    this.abrir('f' + idx);
  }

  // ───── jeito de falar (do fluxo aberto)
  setGuidance(g: IaGuidance): void {
    if (this.ehPadrao()) this.mudar((d) => { d.guidance = { ...g }; });
    else { const i = this.fluxoIdx(); this.mudar((d) => { d.fluxos[i].guidance = { ...g }; }); }
  }
  setReescrever(v: boolean): void { const i = this.fluxoIdx(); this.mudar((d) => { if (d.fluxos[i]) d.fluxos[i].reescrever = v; }); }

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
