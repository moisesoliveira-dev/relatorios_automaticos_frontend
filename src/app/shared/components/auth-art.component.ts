import { Component } from '@angular/core';

/** Lado "arte" das telas de autenticação: aurora, grade em movimento, órbitas e frase que se revela palavra a palavra. */
@Component({
  selector: 'app-auth-art',
  standalone: true,
  template: `
    <aside class="auth-art" aria-hidden="true">
      <span class="auth-orb" style="width: 18rem; height: 18rem; top: -5rem; right: -4rem;"></span>
      <span class="auth-orb" style="width: 11rem; height: 11rem; bottom: 22%; left: -3rem; animation-delay: -3s;"></span>
      <span class="auth-orb" style="width: 6rem; height: 6rem; top: 38%; right: 14%; animation-delay: -6s;"></span>

      <div class="flex items-center gap-3 art-in" style="--d: 0">
        <div class="art-mark"><span>CM</span></div>
        <div>
          <div class="font-display text-lg font-bold tracking-tight">CMM System</div>
          <div class="text-[10px] uppercase tracking-[0.25em] opacity-60">Ops console</div>
        </div>
      </div>

      <div>
        <h2 class="font-display font-extrabold leading-[0.95] tracking-tight" style="font-size: clamp(2.6rem, 5vw, 4.6rem);">
          @for (w of headline; track $index; let i = $index) {
            <span class="art-word" [style.--w]="i">{{ w }}</span>
          }
        </h2>
        <p class="mt-6 max-w-md text-base opacity-70 art-in" style="--d: 9">
          Relatórios, rodízios e automações do GOSAC e do Pontta, num só lugar.
        </p>

        <div class="mt-8 flex flex-wrap gap-2.5">
          @for (c of chips; track c; let i = $index) {
            <span class="art-chip art-in" [style.--d]="10 + i">{{ c }}</span>
          }
        </div>
      </div>

      <p class="text-xs opacity-50 art-in" style="--d: 14">CMM System © 2026</p>
    </aside>
  `,
  styles: [
    `
      :host { display: contents; }
      .art-mark {
        position: relative; width: 2.75rem; height: 2.75rem; border-radius: 0.9rem; display: grid; place-items: center;
        font-weight: 800; color: #1c0900; background: linear-gradient(135deg, #ff4d17, #ffb020);
        box-shadow: 0 12px 34px -8px #ff4d17;
        animation: art-pulse 4s ease-in-out infinite;
      }
      @keyframes art-pulse { 50% { transform: scale(1.08) rotate(-4deg); box-shadow: 0 18px 44px -8px #ff4d17; } }
      .art-word {
        display: inline-block; margin-right: 0.28em;
        animation: art-word 1100ms var(--ease-out-expo) both;
        animation-delay: calc(var(--w) * 110ms + 250ms);
      }
      @keyframes art-word { from { opacity: 0; transform: translateY(70%) rotate(6deg); filter: blur(12px); } to { opacity: 1; transform: none; filter: none; } }
      .art-in { animation: art-rise 900ms var(--ease-out-expo) both; animation-delay: calc(var(--d, 0) * 100ms + 200ms); }
      @keyframes art-rise { from { opacity: 0; transform: translateY(24px); filter: blur(6px); } to { opacity: 1; transform: none; filter: none; } }
      .art-chip {
        padding: 0.4rem 0.9rem; font-size: 0.8125rem; font-weight: 600; border-radius: 999px;
        border: 1px solid rgba(255,255,255,0.22); background: rgba(255,255,255,0.06); backdrop-filter: blur(6px);
        transition: transform 400ms var(--ease-out-expo), background-color 250ms;
      }
      .art-chip:hover { transform: translateY(-4px) scale(1.06); background: rgba(255,77,23,0.35); }
    `,
  ],
})
export class AuthArtComponent {
  headline = ['Operação', 'sem', 'atrito.'];
  chips = ['Relatórios', 'Rodízio GOSAC', 'Pontta', 'PCP', 'Automações'];
}
