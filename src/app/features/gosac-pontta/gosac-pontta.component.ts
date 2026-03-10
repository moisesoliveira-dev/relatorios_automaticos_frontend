import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-gosac-pontta',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="space-y-0">

      <!-- Page header -->
      <div class="mb-6">
        <h1 class="text-xl font-semibold text-slate-800">GOSAC / Pontta</h1>
        <p class="text-sm text-slate-500 mt-1">Integrações e ferramentas GOSAC / Pontta.</p>
      </div>

      <!-- Tab bar + content -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">

        <!-- Tabs -->
        <div class="flex border-b border-slate-200">
          @for (tab of tabs; track tab.route) {
            <a
              [routerLink]="tab.route"
              routerLinkActive="border-slate-700 text-slate-800"
              [routerLinkActiveOptions]="{ exact: true }"
              class="px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 -mb-px border-transparent text-slate-500 hover:text-slate-700"
            >
              {{ tab.label }}
            </a>
          }
        </div>

        <div class="p-6">
          <router-outlet></router-outlet>
        </div>
      </div>
    </div>
  `,
})
export class GosacPonttaComponent {
  tabs = [
    { label: 'Grupos', route: 'grupos' },
    { label: 'Pagamento Montador', route: 'pagamento-montador' },
    { label: 'Webhooks', route: 'webhooks' },
  ];
}
