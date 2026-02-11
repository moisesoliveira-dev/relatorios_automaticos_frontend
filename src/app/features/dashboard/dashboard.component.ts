import { Component, OnInit, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService, ReportEmail } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="space-y-6">
      <!-- Welcome Card -->
      <div class="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <h2 class="text-2xl font-bold">Bem-vindo, {{ authService.user()?.name }}! 👋</h2>
        <p class="mt-2 text-purple-100">Aqui está um resumo do seu sistema de relatórios.</p>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        @for (stat of statsDisplay(); track stat.label) {
          <div class="bg-white rounded-xl p-6 border border-slate-200 hover:shadow-lg transition-shadow">
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm text-slate-500">{{ stat.label }}</p>
                <p class="text-2xl font-bold text-slate-800 mt-1">{{ stat.value }}</p>
              </div>
              <div 
                class="w-12 h-12 rounded-lg flex items-center justify-center text-2xl"
                [class]="stat.bgColor"
              >
                {{ stat.icon }}
              </div>
            </div>
            <div class="mt-4 flex items-center gap-1 text-sm">
              <span [class]="stat.trend >= 0 ? 'text-green-600' : 'text-red-600'">
                {{ stat.trend >= 0 ? '↑' : '↓' }} {{ stat.trend >= 0 ? stat.trend : -stat.trend }}%
              </span>
              <span class="text-slate-400">vs mês anterior</span>
            </div>
          </div>
        }
      </div>

      <!-- Quick Actions -->
      <div class="bg-white rounded-xl p-6 border border-slate-200">
        <h3 class="text-lg font-semibold text-slate-800 mb-4">Ações Rápidas</h3>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          @for (action of quickActions; track action.label) {
            <a 
              [routerLink]="action.route"
              class="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50 transition-colors cursor-pointer"
            >
              <span class="text-2xl">{{ action.icon }}</span>
              <div>
                <p class="font-medium text-slate-800">{{ action.label }}</p>
                <p class="text-sm text-slate-500">{{ action.description }}</p>
              </div>
            </a>
          }
        </div>
      </div>

      <!-- Recent Activity + System Status -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- Recent Reports -->
        <div class="bg-white rounded-xl p-6 border border-slate-200">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">Relatórios Recentes</h3>
          @if (dashboardService.loading()) {
            <div class="flex items-center justify-center py-8">
              <div class="animate-spin w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full"></div>
            </div>
          } @else if (dashboardService.recentReports().length === 0) {
            <div class="text-center py-8 text-slate-500">
              <p>Nenhum relatório gerado ainda.</p>
              <a routerLink="/reports/ocorrencias" class="text-purple-600 hover:underline mt-2 inline-block">
                Gerar primeiro relatório →
              </a>
            </div>
          } @else {
            <div class="space-y-3">
              @for (report of dashboardService.recentReports(); track report.id) {
                <div class="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      📊
                    </div>
                    <div>
                      <p class="font-medium text-slate-800">{{ report.name }}</p>
                      <p class="text-sm text-slate-500">{{ report.date }} • {{ report.records }} registros</p>
                    </div>
                  </div>
                  <span 
                    class="px-2 py-1 text-xs font-medium rounded-full"
                    [class.bg-green-100]="report.status === 'success'"
                    [class.text-green-700]="report.status === 'success'"
                    [class.bg-red-100]="report.status === 'failed'"
                    [class.text-red-700]="report.status === 'failed'"
                    [class.bg-yellow-100]="report.status === 'pending'"
                    [class.text-yellow-700]="report.status === 'pending'"
                  >
                    {{ report.status === 'success' ? 'Concluído' : report.status === 'failed' ? 'Falhou' : 'Processando' }}
                  </span>
                </div>
              }
            </div>
          }
        </div>

        <!-- System Status -->
        <div class="bg-white rounded-xl p-6 border border-slate-200">
          <h3 class="text-lg font-semibold text-slate-800 mb-4">Status do Sistema</h3>
          <div class="space-y-4">
            @for (service of dashboardService.systemStatus(); track service.name) {
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div 
                    class="w-3 h-3 rounded-full"
                    [class.bg-green-500]="service.status === 'online'"
                    [class.bg-yellow-500]="service.status === 'warning'"
                    [class.bg-red-500]="service.status === 'offline'"
                  ></div>
                  <span class="text-slate-700">{{ service.name }}</span>
                </div>
                <span class="text-sm text-slate-500">{{ service.latency }}</span>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  authService = inject(AuthService);
  dashboardService = inject(DashboardService);

  quickActions = [
    { label: 'Novo Relatório', icon: '📊', route: '/reports/ocorrencias', description: 'Gerar relatório' },
    { label: 'Enviar por Email', icon: '📧', route: '/reports/ocorrencias', description: 'Enviar relatório' },
    { label: 'Ver Usuários', icon: '👥', route: '/users', description: 'Gerenciar usuários' },
    { label: 'Configurações', icon: '⚙️', route: '/settings', description: 'Ajustes do sistema' },
  ];

  // Computed signal para formatar os stats
  statsDisplay = computed(() => {
    const stats = this.dashboardService.stats();
    if (!stats) {
      return [
        { label: 'Relatórios Gerados', value: '0', icon: '📊', bgColor: 'bg-purple-100', trend: 0 },
        { label: 'Emails Enviados', value: '0', icon: '📧', bgColor: 'bg-blue-100', trend: 0 },
        { label: 'Ocorrências', value: '0', icon: '📋', bgColor: 'bg-green-100', trend: 0 },
        { label: 'Usuários Ativos', value: '0', icon: '👥', bgColor: 'bg-orange-100', trend: 0 },
      ];
    }

    return [
      {
        label: 'Relatórios Gerados',
        value: this.formatNumber(stats.reportsGenerated),
        icon: '📊',
        bgColor: 'bg-purple-100',
        trend: stats.reportsGeneratedTrend
      },
      {
        label: 'Emails Enviados',
        value: this.formatNumber(stats.emailsSent),
        icon: '📧',
        bgColor: 'bg-blue-100',
        trend: stats.emailsSentTrend
      },
      {
        label: 'Ocorrências',
        value: this.formatNumber(stats.occurrencesFetched),
        icon: '📋',
        bgColor: 'bg-green-100',
        trend: stats.occurrencesFetchedTrend
      },
      {
        label: 'Usuários Ativos',
        value: this.formatNumber(stats.activeUsers),
        icon: '👥',
        bgColor: 'bg-orange-100',
        trend: stats.activeUsersTrend
      },
    ];
  });

  ngOnInit() {
    this.loadData();
  }

  async loadData() {
    await this.dashboardService.loadAll();
  }

  private formatNumber(num: number): string {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }
}
