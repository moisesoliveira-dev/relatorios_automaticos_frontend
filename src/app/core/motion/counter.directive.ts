import { Directive, ElementRef, Input, OnChanges, inject } from '@angular/core';
import { animate } from 'motion';

/**
 * Conta de 0 até o valor, com easing expressivo. Aceita número ou texto com número
 * ("1.234", "98%", "R$ 12,5"): anima só a parte numérica e preserva o resto.
 *   <span [appCounter]="stat.value"></span>
 */
@Directive({ selector: '[appCounter]', standalone: true })
export class CounterDirective implements OnChanges {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private current = 0;
  @Input('appCounter') value: number | string | null | undefined = 0;

  ngOnChanges(): void {
    const raw = String(this.value ?? '');
    const match = /-?\d[\d.,]*/.exec(raw);
    const motionOn = document.documentElement.getAttribute('data-motion') !== 'off';
    if (!match || !motionOn) {
      this.el.nativeElement.textContent = raw;
      return;
    }
    const prefix = raw.slice(0, match.index);
    const suffix = raw.slice(match.index + match[0].length);
    const numeric = parseFloat(match[0].replace(/\./g, '').replace(',', '.'));
    if (!Number.isFinite(numeric)) {
      this.el.nativeElement.textContent = raw;
      return;
    }
    const decimals = /[.,]\d{1,2}$/.test(match[0]) ? (match[0].split(/[.,]/).pop() ?? '').length : 0;
    const fmt = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

    animate(this.current, numeric, {
      duration: 1.6,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        this.current = v;
        this.el.nativeElement.textContent = `${prefix}${fmt.format(v)}${suffix}`;
      },
      onComplete: () => {
        this.current = numeric;
        this.el.nativeElement.textContent = raw;
      },
    });
  }
}
