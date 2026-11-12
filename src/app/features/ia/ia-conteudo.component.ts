import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../../shared/components/icon.component';
import { SheetComponent } from '../../shared/components/sheet.component';
import { ToastService } from '../../core/ui/toast.service';
import { ModalService } from '../../shared/services/modal.service';
import { IaFluxosComponent, MODELOS } from './ia-fluxos.component';
import { IaGuidance, IaTomComponent } from './ia-tom.component';
import { IaSaberComponent } from './ia-saber.component';
import { IaApiService, IaContent, IaContentDoc, IaFlow, IaKb, IaSystemKey } from './ia-api.service';

type AbaFluxo = 'etapas' | 'jeito' | 'saber';
type AbaGeral = 'avisos' | 'jeito' | 'saber';

/**
 * Atendimento: galeria de fluxos (o atendimento da Vera é um deles) e, dentro de cada fluxo,
 * as etapas, o jeito de falar e o que a IA sabe. Rascunho → publicar na barra inferior.
 */
@Component({
  selector: 'app-ia-conteudo',
  standalone: true,
  imports: [FormsModule, IconComponent, SheetComponent, IaFluxosComponent, IaTomComponent, IaSaberComponent],
  template: `
    @if (conteudo(); as c) {
      <div class="space-y-5 pb-24">
        @if (aberto() === null) {
          <!-- ═════ GALERIA DE FLUXOS ═════ -->
          <header class="gal-head">
            <div>
              <h2 class="sec-title">Fluxos de atendimento</h2>
              <p class="text-sm mt-1" style="color: var(--cmm-muted);">Cada cartão é um caminho de conversa. O marcado como <b>Início</b> recebe todo cliente novo.</p>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="pub-info">
                @if (c.publishedAt) { Publicado em {{ data(c.publishedAt) }} }
                @if (c.hasPrevious) { · <button type="button" class="link inline-flex items-center gap-1" (click)="reverter()" title="Volta para a versão publicada antes desta"><app-icon name="desfazer" [size]="13" />Versão anterior</button> }
              </span>
              <button type="button" class="btn btn-secondary btn-sm" (click)="geral.set('avisos')"><app-icon name="ajustes" [size]="15" />Avisos e padrões</button>
            </div>
          </header>
          @if (c.problemas.length) {
            <div class="note note-warn text-sm">
              <p class="font-semibold mb-1">Para publicar, corrija:</p>
              <ul class="list-disc pl-5 space-y-0.5">@for (p of c.problemas; track p) { <li>{{ p }}</li> }</ul>
            </div>
          }
          <div class="gallery">
            @for (f of doc().fluxos; track f.id; let i = $index) {
              <button type="button" class="gcard" [class.gcard-std]="f.papel === 'entrada'" (click)="abrir(i)">
                <span class="g-ico" aria-hidden="true"><app-icon [name]="f.papel === 'entrada' ? 'estrela' : f.papel === 'reconhecimento' ? 'usuario' : 'fluxo'" [size]="20" /></span>
                <b class="g-title">{{ f.nome || 'Sem nome' }}</b>
                <span class="g-desc">{{ f.descricao || 'Sem descrição' }}</span>
                <span class="g-meta">
                  <span class="g-dot" [class.g-dot-on]="f.ativo"></span>{{ f.ativo ? 'Ativo' : 'Desativado' }}
                  @if (f.papel === 'entrada') { · <b class="g-edit">Início</b> }
                  @if (f.papel === 'reconhecimento') { · <b class="g-edit">Cliente conhecido</b> }
                  · {{ f.nos.length }} {{ f.nos.length === 1 ? 'etapa' : 'etapas' }}
                  @if (problemasDo(f.nome)) { · <b style="color: var(--cmm-warning);">corrigir</b> }
                </span>
              </button>
            }
            <div class="gcard gcard-new">
              <span class="g-ico" aria-hidden="true"><app-icon name="mais" [size]="20" /></span>
              <b class="g-title">Novo fluxo</b>
              <span class="g-desc">Crie um atendimento do seu jeito e ligue-o ao menu com uma etapa “Ir para”.</span>
              <span class="g-chips">
                <button type="button" class="btn btn-primary btn-sm" (click)="novoFluxo('coleta')" [disabled]="doc().fluxos.length >= c.limites.fluxos" title="Pergunta o nome, cria a pasta no Drive, recebe arquivos e encaminha">Coleta com Drive</button>
                <button type="button" class="btn btn-secondary btn-sm" (click)="novoFluxo('branco')" [disabled]="doc().fluxos.length >= c.limites.fluxos">Em branco</button>
              </span>
            </div>
          </div>
        } @else if (fluxoAtual(); as f) {
          <!-- ═════ DENTRO DE UM FLUXO ═════ -->
          <div class="ws-head">
            <button type="button" class="icon-btn icon-btn-outline" (click)="fecharFluxo()" aria-label="Voltar para todos os fluxos" title="Todos os fluxos"><app-icon name="voltar" [size]="18" /></button>
            <h2 class="sec-title flex-1 min-w-[9rem]">{{ f.nome || 'Sem nome' }}</h2>
          </div>
          <div class="seg" role="tablist" aria-label="Áreas do fluxo">
            <button type="button" role="tab" class="seg-btn" [class.seg-on]="aba() === 'etapas'" [attr.aria-selected]="aba() === 'etapas'" (click)="aba.set('etapas')"><app-icon name="fluxo" [size]="15" />Etapas</button>
            <button type="button" role="tab" class="seg-btn" [class.seg-on]="aba() === 'jeito'" [attr.aria-selected]="aba() === 'jeito'" (click)="aba.set('jeito')"><app-icon name="brilho" [size]="15" />Jeito de falar</button>
            <button type="button" role="tab" class="seg-btn" [class.seg-on]="aba() === 'saber'" [attr.aria-selected]="aba() === 'saber'" (click)="aba.set('saber')"><app-icon name="livro" [size]="15" />O que ela sabe</button>
          </div>

          @switch (aba()) {
            @case ('etapas') {
              <app-ia-fluxos [rascunho]="doc()" [fluxos]="doc().fluxos" [indice]="aberto()!" [ferramentas]="c.ferramentas" [tipos]="c.tipos" (mudou)="setFluxos($event)" />
            }
            @case ('jeito') {
              <app-ia-tom [guidance]="f.guidance ?? doc().guidance" [tones]="c.tones" [mostrarReescrever]="true" [reescrever]="!!f.reescrever"
                explicacao="Como a IA fala SÓ dentro deste fluxo. Sem ajuste próprio, vale o jeito de falar padrão (em “Avisos e padrões”)."
                (mudou)="setGuidance($event)" (reescreverMudou)="setReescrever($event)" />
            }
            @case ('saber') {
              <app-ia-saber [kb]="f.kb ?? []" [permiteRestaurar]="false" [limite]="30"
                explicacao="Quando o cliente faz uma pergunta durante este fluxo, a IA responde só com o que estiver aqui e depois retoma a etapa. Sem assuntos próprios, vale a base padrão."
                vazio="Sem assuntos próprios: a IA usa a base de conhecimento padrão."
                (mudou)="setKb($event)" />
            }
          }
        }
      </div>

      <!-- Avisos do sistema, jeito de falar e base padrão -->
      <app-sheet [open]="geral() !== null" title="Avisos e padrões" subtitle="Valem para todos os fluxos que não têm ajuste próprio." width="40rem" (closed)="geral.set(null)">
        <div class="seg mb-4" role="tablist" aria-label="Ajustes gerais">
          <button type="button" role="tab" class="seg-btn" [class.seg-on]="geral() === 'avisos'" (click)="geral.set('avisos')">Avisos do sistema</button>
          <button type="button" role="tab" class="seg-btn" [class.seg-on]="geral() === 'jeito'" (click)="geral.set('jeito')">Jeito de falar</button>
          <button type="button" role="tab" class="seg-btn" [class.seg-on]="geral() === 'saber'" (click)="geral.set('saber')">O que ela sabe</button>
        </div>
        @switch (geral()) {
          @case ('avisos') {
            <p class="text-sm mb-3" style="color: var(--cmm-muted);">Mensagens que o motor envia sozinho (resposta inválida, áudio, encaminhamento, rodapés). Vazio = texto padrão.</p>
            <div class="space-y-3">
              @for (k of chavesSistema(c); track k) {
                <div>
                  <div class="flex items-center justify-between gap-2 mb-1">
                    <label class="form-label !mb-0" [attr.for]="'sys-' + k">{{ c.sistema.rotulos[k] }}</label>
                    @if (doc().sistema[k] !== undefined) { <button type="button" class="btn btn-ghost btn-sm" (click)="setSistema(k, null)">Restaurar padrão</button> }
                  </div>
                  <textarea class="form-input" [id]="'sys-' + k" rows="2" [ngModel]="doc().sistema[k] ?? c.sistema.padrao[k]" (ngModelChange)="setSistema(k, $event)"></textarea>
                </div>
              }
            </div>
          }
          @case ('jeito') {
            <app-ia-tom [guidance]="doc().guidance" [tones]="c.tones" [mostrarReescrever]="false" explicacao="Como a Vera fala por padrão. Fluxos com ajuste próprio usam o deles." (mudou)="setGuidanceGlobal($event)" />
          }
          @case ('saber') {
            <app-ia-saber [kb]="doc().kb ?? c.defaults.kb" [permiteRestaurar]="true" [limite]="50"
              explicacao="Quando o cliente faz uma pergunta livre, a IA só responde com o que estiver escrito aqui. O que não estiver vai para um atendente. Preços, prazos e links nunca são repetidos pela IA."
              (mudou)="setKbGlobal($event)" (restaurar)="restaurarKbGlobal()" />
          }
        }
      </app-sheet>

      @if (alteracoes() > 0 || c.draft) {
        <div class="savebar" role="region" aria-label="Alterações em rascunho">
          <span class="sb-msg">
            <span class="sb-dot" [class.sb-dot-saved]="!sujo()"></span>
            @if (alteracoes() > 0) { <b>{{ alteracoes() }}</b> {{ alteracoes() === 1 ? 'alteração' : 'alterações' }} sem publicar } @else { Sem alterações }
            <span class="sb-sub">{{ sujo() ? 'não salvo' : c.draftAt ? 'rascunho salvo' : '' }}</span>
          </span>
          <div class="flex items-center gap-1.5">
            <button type="button" class="sb-icon" (click)="descartar()" [disabled]="ocupado()" aria-label="Descartar alterações" title="Descartar alterações"><app-icon name="desfazer" [size]="16" /></button>
            <button type="button" class="btn btn-secondary btn-sm" title="Guarda sem publicar: nada muda para os clientes" (click)="salvarRascunho()" [disabled]="ocupado() || !sujo()">Salvar</button>
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
    .sb-msg { display: inline-flex; align-items: center; gap: .5rem; } .sb-sub { opacity: .6; font-size: .78rem; }
    .sb-dot { width: .5rem; height: .5rem; border-radius: 99px; background: var(--cmm-warning); } .sb-dot-saved { background: var(--cmm-success); }
    .sb-icon { display: inline-grid; place-items: center; width: 2rem; height: 2rem; border-radius: .6rem; border: none; background: transparent; color: inherit; opacity: .7; cursor: pointer; } .sb-icon:hover:not(:disabled) { opacity: 1; background: rgba(255,255,255,.12); } .sb-icon:disabled { opacity: .3; }
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
    .g-ico { flex-shrink: 0; width: 2.6rem; height: 2.6rem; border-radius: .85rem; display: grid; place-items: center; color: var(--cmm-accent); background: var(--cmm-accent-soft); }
    .g-title { font-family: var(--font-display); font-size: 1.1rem; line-height: 1.15; }
    .g-desc { font-size: .8125rem; color: var(--cmm-muted); display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
    .g-chips { margin-top: auto; display: flex; flex-wrap: wrap; gap: .4rem; }
    .ws-head { display: flex; align-items: center; gap: .75rem; flex-wrap: wrap; }
    @media (max-width: 640px) { .gallery { grid-template-columns: 1fr; } }
  `],
})
export class IaConteudoComponent implements OnInit {
  private readonly api = inject(IaApiService);
  private readonly toast = inject(ToastService);
  private readonly modal = inject(ModalService);

  conteudo = signal<IaContent | null>(null);
  doc = signal<IaContentDoc>(this.vazio());
  /** Cópia do último estado salvo no servidor (rascunho ou publicado), para saber se há algo não salvo. */
  private salvo = signal('');
  /** null = galeria; índice do fluxo aberto. */
  aberto = signal<number | null>(null);
  aba = signal<AbaFluxo>('etapas');
  geral = signal<AbaGeral | null>(null);
  ocupado = signal(false);

  fluxoAtual = computed(() => { const i = this.aberto(); return i === null ? null : this.doc().fluxos[i] ?? null; });
  sujo = computed(() => JSON.stringify(this.doc()) !== this.salvo());
  alteracoes = computed(() => {
    const c = this.conteudo();
    if (!c) return 0;
    const d = this.doc(), p = c.published;
    let n = 0;
    const ids = new Set([...d.fluxos.map((f) => f.id), ...p.fluxos.map((f) => f.id)]);
    for (const id of ids) if (JSON.stringify(d.fluxos.find((f) => f.id === id) ?? null) !== JSON.stringify(p.fluxos.find((f) => f.id === id) ?? null)) n++;
    if (JSON.stringify(d.kb) !== JSON.stringify(p.kb)) n++;
    if (JSON.stringify(d.guidance) !== JSON.stringify(p.guidance)) n++;
    if (JSON.stringify(d.sistema) !== JSON.stringify(p.sistema)) n++;
    return n;
  });

  ngOnInit(): void { this.carregar(); }

  private vazio(): IaContentDoc {
    return { versao: 2, fluxos: [], guidance: { tone: 'padrao', instructions: '' }, kb: null, sistema: {} };
  }
  private clone<T>(d: T): T { return JSON.parse(JSON.stringify(d)); }

  private aplicar(c: IaContent): void {
    this.conteudo.set(c);
    const base = this.clone(c.draft ?? c.published);
    this.doc.set(base);
    this.salvo.set(JSON.stringify(base));
    if (this.aberto() !== null && this.aberto()! >= base.fluxos.length) this.fecharFluxo();
  }

  carregar(): void {
    this.api.content().subscribe({ next: (c) => this.aplicar(c), error: () => this.toast.error('Não foi possível carregar os fluxos.') });
  }

  data(iso: string): string { return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }); }
  chavesSistema(c: IaContent): IaSystemKey[] { return Object.keys(c.sistema.rotulos) as IaSystemKey[]; }
  problemasDo(nome: string): boolean { return (this.conteudo()?.problemas ?? []).some((p) => p.startsWith(nome + ':')); }
  private mudar(fn: (d: IaContentDoc) => void): void { this.doc.update((d) => { const n = this.clone(d); fn(n); return n; }); }

  abrir(i: number): void { this.aberto.set(i); this.aba.set('etapas'); }
  fecharFluxo(): void { this.aberto.set(null); }

  // ───── fluxos
  setFluxos(f: IaFlow[]): void {
    this.mudar((d) => { d.fluxos = f; });
    if ((this.aberto() ?? -1) >= f.length) this.fecharFluxo(); // o fluxo aberto foi excluído
  }
  novoFluxo(modelo: 'branco' | 'coleta'): void {
    const novo = MODELOS[modelo]();
    let id = modelo === 'coleta' ? 'coleta' : 'novo';
    while (this.doc().fluxos.some((f) => f.id === id)) id = `${id}_x`;
    novo.id = id;
    const idx = this.doc().fluxos.length;
    this.mudar((d) => { d.fluxos = [...d.fluxos, novo]; });
    this.abrir(idx);
  }
  setGuidance(g: IaGuidance): void { const i = this.aberto()!; this.mudar((d) => { d.fluxos[i].guidance = { ...g }; }); }
  setReescrever(v: boolean): void { const i = this.aberto()!; this.mudar((d) => { d.fluxos[i].reescrever = v; }); }
  setKb(lista: IaKb[]): void { const i = this.aberto()!; this.mudar((d) => { d.fluxos[i].kb = lista; }); }

  // ───── padrões
  setSistema(k: IaSystemKey, v: string | null): void {
    const padrao = this.conteudo()?.sistema.padrao[k];
    this.mudar((d) => { if (v === null || v === padrao) delete d.sistema[k]; else d.sistema[k] = v; });
  }
  setGuidanceGlobal(g: IaGuidance): void { this.mudar((d) => { d.guidance = { ...g }; }); }
  setKbGlobal(lista: IaKb[]): void { this.mudar((d) => { d.kb = lista; }); }
  restaurarKbGlobal(): void { this.mudar((d) => { d.kb = null; }); }

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
    if (!(await this.modal.confirm('Publicar para os clientes?', `${n === 1 ? '1 alteração passa' : n + ' alterações passam'} a valer em até 30 segundos para todas as conversas. Você poderá voltar à versão anterior.`, 'Publicar agora'))) return;
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
