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
        <h1 class="text-3xl font-bold text-slate-800">📊 Relatórios</h1>
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
              <div class="text-4xl">{{ report.icon }}</div>
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
              <div class="mt-4 flex items-center text-sm font-medium" [style.color]="report.color">
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
      <div class="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-6 border border-purple-100">
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white text-2xl flex-shrink-0">
            💡
          </div>
          <div>
            <h3 class="font-semibold text-slate-800 mb-1">Dica</h3>
            <p class="text-sm text-slate-600 leading-relaxed">
              Você pode agendar o envio automático de relatórios por email. Configure na seção de 
              <span class="font-medium text-purple-600">Configurações</span> para receber relatórios diariamente, semanalmente ou mensalmente.
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
      icon: '📋',
      color: '#9333ea',
      available: true
    },
    {
      id: 'financeiro',
      title: 'Relatório Financeiro',
      description: 'Análise financeira detalhada com receitas, despesas, fluxo de caixa e projeções. Dados consolidados por período.',
      icon: '💰',
      color: '#059669',
      available: false
    },
    {
      id: 'vendas',
      title: 'Relatório de Vendas',
      description: 'Acompanhamento de vendas, metas, performance da equipe e análise de produtos mais vendidos.',
      icon: '📈',
      color: '#0284c7',
      available: false
    },
    {
      id: 'clientes',
      title: 'Relatório de Clientes',
      description: 'Dados dos clientes, histórico de compras, ticket médio, segmentação e análise de retenção.',
      icon: '👥',
      color: '#dc2626',
      available: false
    },
    {
      id: 'estoque',
      title: 'Relatório de Estoque',
      description: 'Controle de estoque, produtos em falta, giro de estoque e previsão de reposição.',
      icon: '📦',
      color: '#ea580c',
      available: false
    },
    {
      id: 'performance',
      title: 'Performance da Equipe',
      description: 'Métricas de performance individual e por equipe, produtividade e cumprimento de metas.',
      icon: '⚡',
      color: '#7c3aed',
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

    return `${baseClasses} border-slate-200 hover:border-purple-300 hover:shadow-lg cursor-pointer group`;
  }

  getIconClasses(report: ReportType): string {
    const baseClasses = 'w-16 h-16 rounded-xl flex items-center justify-center mb-4 transition-transform duration-200';

    if (!report.available) {
      return `${baseClasses} bg-slate-100`;
    }

    return `${baseClasses} bg-gradient-to-br from-purple-50 to-blue-50 group-hover:scale-110`;
  }
}
