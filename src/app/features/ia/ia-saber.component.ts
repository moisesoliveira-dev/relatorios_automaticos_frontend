import { Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalService } from '../../shared/services/modal.service';
import { IaKb } from './ia-api.service';

/** Base de conhecimento de UM fluxo: só o que está aqui pode ser afirmado pela IA ao responder dúvidas. */
@Component({
  selector: 'app-ia-saber',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-4">
      <p class="text-sm" style="color: var(--cmm-muted);">{{ explicacao() }}</p>
      @for (e of kb(); track $index; let i = $index) {
        <article class="panel panel-pad space-y-3">
          <div class="flex items-center justify-between gap-2">
            <h3 class="font-semibold text-sm">Assunto {{ i + 1 }}</h3>
            <button type="button" class="btn btn-ghost btn-sm" style="color: var(--cmm-danger);" (click)="remover(i)">Excluir</button>
          </div>
          <div><label class="form-label" [attr.for]="'sb-t-' + i">O que a IA pode afirmar</label>
            <textarea class="form-input" rows="3" [id]="'sb-t-' + i" maxlength="600" [ngModel]="e.text" (ngModelChange)="editar(i, { text: $event })" placeholder="Ex.: A loja abre de segunda a sábado, das 9h às 18h."></textarea>
            <p class="text-xs mt-1" style="color: var(--cmm-muted);">{{ e.text.length }}/600</p></div>
          <div><label class="form-label" [attr.for]="'sb-k-' + i">Quando o cliente falar disto (palavras separadas por vírgula)</label>
            <input class="form-input" [id]="'sb-k-' + i" [value]="e.keywords.join(', ')" (change)="editar(i, { keywords: lista($any($event.target).value) })" placeholder="horário, abre, funciona" />
            <p class="text-xs mt-1" style="color: var(--cmm-muted);">Se deixar vazio, o sistema escolhe pelas palavras do texto.</p></div>
        </article>
      } @empty {
        <div class="panel panel-pad"><div class="empty-state">{{ vazio() }}</div></div>
      }
      <div class="flex gap-2 flex-wrap">
        <button type="button" class="btn btn-primary" (click)="adicionar()" [disabled]="kb().length >= limite()">Adicionar assunto</button>
        @if (permiteRestaurar()) { <button type="button" class="btn btn-secondary" (click)="restaurarPedido()">Restaurar lista original</button> }
      </div>
    </div>
  `,
})
export class IaSaberComponent {
  private readonly modal = inject(ModalService);
  kb = input.required<IaKb[]>();
  explicacao = input('Quando o cliente faz uma pergunta livre, a IA só responde com o que estiver escrito aqui. O que não estiver vai para um atendente. Preços, prazos e links nunca são repetidos pela IA, mesmo que estejam escritos.');
  vazio = input('Nada liberado: toda pergunta livre será encaminhada a um atendente.');
  permiteRestaurar = input(false);
  limite = input(50);
  mudou = output<IaKb[]>();
  restaurar = output<void>();

  lista(v: string): string[] { return v.split(',').map((x) => x.trim()).filter(Boolean); }
  private copia(): IaKb[] { return JSON.parse(JSON.stringify(this.kb())); }
  editar(i: number, patch: Partial<IaKb>): void { const k = this.copia(); k[i] = { ...k[i], ...patch }; this.mudou.emit(k); }
  adicionar(): void { const k = this.copia(); k.push({ id: 'novo-' + (k.length + 1), keywords: [], text: '' }); this.mudou.emit(k); }
  async remover(i: number): Promise<void> {
    if (!(await this.modal.confirm('Excluir este assunto?', 'A IA deixa de poder responder isso (vai para um atendente).', 'Excluir'))) return;
    this.mudou.emit(this.copia().filter((_, j) => j !== i));
  }
  async restaurarPedido(): Promise<void> {
    if (!(await this.modal.confirm('Restaurar a lista original?', 'Seus assuntos deste rascunho serão trocados pelos originais.', 'Restaurar'))) return;
    this.restaurar.emit();
  }
}
