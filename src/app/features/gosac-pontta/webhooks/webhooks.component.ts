import { Component } from '@angular/core';

@Component({
  selector: 'app-webhooks',
  standalone: true,
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Webhooks</h1>
          <p class="page-subtitle">Configuração e monitoramento de webhooks GOSAC / Pontta.</p>
        </div>
      </div>

      <div class="panel">
        <div class="empty-state">
          <svg
            class="w-10 h-10 mx-auto mb-3"
            style="color: var(--cmm-border);"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.5"
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <p class="font-medium" style="color: var(--cmm-ink);">Em desenvolvimento</p>
          <p class="mt-1 text-xs" style="color: var(--cmm-muted);">
            Em breve você poderá configurar endpoints, inspecionar entregas e reenviar eventos.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class WebhooksComponent {}
