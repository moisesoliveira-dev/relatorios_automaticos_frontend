import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  available: boolean;
}

@Component({
  selector: 'app-reports-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Relatórios</h1>
          <p class="page-subtitle">Selecione o tipo de relatório que deseja gerar</p>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        @for (report of reports; track report.id) {
          <div
            (click)="report.available ? openReport(report.id) : null"
            [class]="getCardClasses(report)"
            [attr.aria-disabled]="!report.available ? true : null"
          >
            <div class="flex items-start justify-between gap-3 mb-3">
              <div
                class="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                [style.background]="report.available ? 'var(--cmm-accent-soft)' : 'color-mix(in srgb, var(--cmm-border) 55%, var(--cmm-panel))'"
                [style.color]="report.available ? 'var(--cmm-accent)' : 'var(--cmm-muted)'"
              >
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" [attr.d]="report.icon"/>
                </svg>
              </div>
              @if (!report.available) {
                <span class="badge badge-neutral">Indisponível</span>
              } @else {
                <span class="badge badge-accent">Disponível</span>
              }
            </div>

            <h3 class="text-base font-semibold mb-1.5" style="color: var(--cmm-ink);">
              {{ report.title }}
            </h3>
            <p class="text-sm leading-relaxed" style="color: var(--cmm-muted);">
              {{ report.description }}
            </p>

            <div class="mt-4 pt-3" style="border-top: 1px solid var(--cmm-border);">
              @if (!report.available) {
                <p class="text-sm" style="color: var(--cmm-muted);">
                  Em breve — este relatório ainda não está disponível.
                </p>
              } @else {
                <span class="inline-flex items-center gap-1 text-sm font-medium" style="color: var(--cmm-accent);">
                  Abrir relatório
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </span>
              }
            </div>
          </div>
        }
      </div>

      <div class="panel panel-pad">
        <div class="flex items-start gap-3">
          <div
            class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style="background: var(--cmm-accent-soft); color: var(--cmm-accent);"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold mb-1" style="color: var(--cmm-ink);">Dica</h3>
            <p class="text-sm leading-relaxed" style="color: var(--cmm-muted);">
              Agende o envio automático de relatórios por email em
              <span class="font-medium" style="color: var(--cmm-ink);">Configurações</span>.
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class ReportsListComponent {
  reports: ReportType[] = [
    {
      id: 'ocorrencias',
      title: 'Ocorrências Pontta',
      description: 'Relatório completo de todas as ocorrências com status, responsáveis, prazos e detalhes. Exporte em Excel ou CSV.',
      icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      color: '#475569',
      available: true
    },
    {
      id: 'financeiro',
      title: 'Relatório Financeiro',
      description: 'Análise financeira detalhada com receitas, despesas, fluxo de caixa e projeções. Dados consolidados por período.',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      color: '#059669',
      available: false
    },
    {
      id: 'vendas',
      title: 'Relatório de Vendas',
      description: 'Acompanhamento de vendas, metas, performance da equipe e análise de produtos mais vendidos.',
      icon: 'M13 7h8m0 0v8m0-8l-8 8-4-4-6 6',
      color: '#0284c7',
      available: false
    },
    {
      id: 'clientes',
      title: 'Relatório de Clientes',
      description: 'Dados dos clientes, histórico de compras, ticket médio, segmentação e análise de retenção.',
      icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      color: '#dc2626',
      available: false
    },
    {
      id: 'estoque',
      title: 'Relatório de Estoque',
      description: 'Controle de estoque, produtos em falta, giro de estoque e previsão de reposição.',
      icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      color: '#ea580c',
      available: false
    },
    {
      id: 'performance',
      title: 'Performance da Equipe',
      description: 'Métricas de performance individual e por equipe, produtividade e cumprimento de metas.',
      icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
      color: '#64748b',
      available: false
    }
  ];

  constructor(private router: Router) { }

  openReport(reportId: string) {
    this.router.navigate(['/reports', reportId]);
  }

  getCardClasses(report: ReportType): string {
    const base = 'panel panel-pad flex flex-col transition-colors duration-150';

    if (!report.available) {
      return `${base} opacity-70 cursor-not-allowed`;
    }

    return `${base} cursor-pointer hover:border-[color-mix(in_srgb,var(--cmm-accent)_40%,var(--cmm-border))]`;
  }
}
