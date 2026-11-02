import { Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface IaGuidance { tone: string; instructions: string }

const EXEMPLO: Record<string, string> = {
  padrao: 'Calorosa e natural, como a Vera é hoje.',
  acolhedor: 'Mais próxima, quase de amiga; um emoji a mais.',
  formal: 'Respeitosa e elegante, sem gírias.',
  objetivo: 'Frases curtas, direto ao ponto.',
};
const SUGESTOES = [
  'Trate o cliente por “você”.', 'Nunca use gírias.', 'Convide o cliente a conhecer o showroom ao falar de visita.',
  'Use linguagem neutra, sem presumir o gênero do cliente.', 'Seja breve: no máximo duas frases por mensagem.',
];

/** Jeito de falar de UM fluxo: tom + instruções (+ opção de a IA reescrever os textos do fluxo). */
@Component({
  selector: 'app-ia-tom',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="space-y-4">
      <p class="text-sm" style="color: var(--cmm-muted);">{{ explicacao() }}</p>
      <div class="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        @for (t of tones(); track t.key) {
          <button type="button" class="tone" [class.tone-on]="guidance().tone === t.key" (click)="mudou.emit({ tone: t.key, instructions: guidance().instructions })">
            <span class="font-semibold text-sm">{{ t.label }}</span>
            <span class="text-xs" style="color: var(--cmm-muted);">{{ exemplo(t.key) }}</span>
          </button>
        }
      </div>
      @if (mostrarReescrever()) {
        <label class="panel panel-pad switch-row">
          <span>A IA reescreve as mensagens deste fluxo neste tom
            <small>Sempre revisadas: se a IA mudar o sentido, esquecer a pergunta ou inventar preço/número, vai o texto que você escreveu. Desligado = os textos vão exatamente como você escreveu.</small></span>
          <button type="button" role="switch" class="switch" [class.switch-on]="reescrever()" [attr.aria-checked]="reescrever()" (click)="reescreverMudou.emit(!reescrever())"><span class="switch-knob"></span></button>
        </label>
      }
      <div class="panel panel-pad">
        <label class="form-label" for="tom-instr">Instruções extras (opcional)</label>
        <textarea id="tom-instr" class="form-input" rows="6" maxlength="1500" [ngModel]="guidance().instructions" (ngModelChange)="mudou.emit({ tone: guidance().tone, instructions: $event })" placeholder="Ex.: Trate o cliente por 'você'. Quando falar de visita, convide para conhecer o showroom."></textarea>
        <p class="text-xs mt-1" style="color: var(--cmm-muted);">{{ guidance().instructions.length }}/1500</p>
        <p class="text-xs font-semibold mt-3 mb-1" style="color: var(--cmm-muted);">Sugestões (clique para adicionar)</p>
        <div class="flex gap-2 flex-wrap">
          @for (s of sugestoes; track s) { <button type="button" class="chip chip-btn" (click)="add(s)">+ {{ s }}</button> }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .tone { display: flex; flex-direction: column; gap: .35rem; text-align: left; padding: 1rem; border-radius: 1rem; border: 1.5px solid var(--cmm-border); background: var(--cmm-panel); cursor: pointer; color: var(--cmm-ink); transition: border-color 200ms, background-color 200ms, transform 300ms var(--ease-out-expo); }
    .tone:hover { transform: translateY(-2px); } .tone-on { border-color: var(--cmm-accent); background: var(--cmm-accent-soft); }
    .chip { display: inline-flex; align-items: center; padding: .15rem .65rem; border-radius: 99px; font-size: .75rem; background: var(--cmm-accent-soft); color: var(--cmm-accent); font-weight: 600; }
    .chip-btn { border: 1px dashed color-mix(in srgb, var(--cmm-accent) 45%, transparent); cursor: pointer; text-align: left; }
    .chip-btn:hover { background: var(--cmm-accent); color: var(--cmm-accent-ink); }
    .switch-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; font-size: .875rem; font-weight: 600; } .switch-row small { display: block; font-weight: 400; color: var(--cmm-muted); margin-top: .2rem; }
    .switch { flex-shrink: 0; width: 2.9rem; height: 1.6rem; border-radius: 99px; border: none; background: var(--cmm-border); position: relative; cursor: pointer; transition: background-color 300ms; }
    .switch-on { background: var(--cmm-accent); }
    .switch-knob { position: absolute; top: 3px; left: 3px; width: 1.2rem; height: 1.2rem; border-radius: 99px; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.3); transition: transform 400ms var(--ease-out-expo); }
    .switch-on .switch-knob { transform: translateX(1.3rem); }
  `],
})
export class IaTomComponent {
  guidance = input.required<IaGuidance>();
  tones = input.required<Array<{ key: string; label: string }>>();
  mostrarReescrever = input(false);
  reescrever = input(false);
  explicacao = input('Escolha o tom e, se quiser, dê instruções suas. A IA continua obrigada a comunicar tudo que cada mensagem precisa e nunca inventa preço, prazo ou promessa.');
  mudou = output<IaGuidance>();
  reescreverMudou = output<boolean>();
  sugestoes = SUGESTOES;
  exemplo(k: string): string { return EXEMPLO[k] ?? ''; }
  add(s: string): void { const t = this.guidance().instructions.trim(); this.mudou.emit({ tone: this.guidance().tone, instructions: (t ? t + '\n' : '') + s }); }
}
