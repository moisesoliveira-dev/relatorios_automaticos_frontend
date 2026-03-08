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
      <!-- Header -->
      <div class="flex flex-col gap-2">
        <h1 class="text-xl font-semibold text-slate-800">Relatórios</h1>
        <p class="text-slate-500">Selecione o tipo de relatório que deseja gerar</p>
      </div>

      <!-- Reports Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        @for (report of reports; track report.id) {
          <div
            (click)="report.available ? openReport(report.id) : null"
            [class]="getCardClasses(report)"
          >
            <!-- Icon -->
            <div [class]="getIconClasses(report)">
              <svg class="w-7 h-7 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" [attr.d]="report.icon"/></svg>
            </div>

            <!-- Content -->
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-slate-800 mb-2">
                {{ report.title }}
              </h3>
              <p class="text-sm text-slate-600 leading-relaxed">
                {{ report.description }}
              </p>
            </div>

            <!-- Status Badge -->
            @if (!report.available) {
              <div class="mt-4">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                  Em breve
                </span>
              </div>
            } @else {
              <div class="mt-4 flex items-center text-sm font-medium text-slate-600">
                Abrir relatório
                <svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </div>
            }
          </div>
        }
      </div>

      <!-- Stats Section -->
      <div class="bg-white rounded-xl p-5 border border-slate-200">
        <div class="flex items-start gap-4">
          <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
          </div>
          <div>
            <h3 class="text-sm font-semibold text-slate-700 mb-1">Dica</h3>
            <p class="text-sm text-slate-500 leading-relaxed">
              Agende o envio automático de relatórios por email em <span class="font-medium text-slate-700">Configurações</span>.
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
    const baseClasses = 'bg-white rounded-xl border-2 p-6 transition-all duration-200 flex flex-col';

    if (!report.available) {
      return `${baseClasses} border-slate-200 opacity-60 cursor-not-allowed`;
    }

    return `${baseClasses} border-slate-200 hover:border-slate-300 hover:shadow-md cursor-pointer group`;
  }

  getIconClasses(report: ReportType): string {
    const baseClasses = 'w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200';

    if (!report.available) {
      return `${baseClasses} bg-slate-100`;
    }

    return `${baseClasses} bg-slate-50 group-hover:scale-105`;
  }
}
