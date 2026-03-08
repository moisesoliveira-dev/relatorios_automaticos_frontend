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
      <!-- Page header -->
      <div>
        <h2 class="text-xl font-semibold text-slate-800">Olá, {{ authService.user()?.name }}</h2>
        <p class="text-sm text-slate-500 mt-0.5">Resumo do sistema de relatórios</p>
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
              <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="stat.svgPath"/>
                </svg>
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
              class="flex items-center gap-3 p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <svg class="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="action.icon"/>
              </svg>
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
              <div class="animate-spin w-6 h-6 border-2 border-slate-200 border-t-slate-600 rounded-full"></div>
            </div>
          } @else if (dashboardService.recentReports().length === 0) {
            <div class="text-center py-8 text-slate-500">
              <p>Nenhum relatório gerado ainda.</p>
              <a routerLink="/reports/ocorrencias" class="text-slate-600 hover:underline mt-2 inline-block">
                Gerar primeiro relatório →
              </a>
            </div>
          } @else {
            <div class="space-y-3">
              @for (report of dashboardService.recentReports(); track report.id) {
                <div class="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors">
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                      <svg class="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
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
    { label: 'Novo Relatório', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', route: '/reports/ocorrencias', description: 'Gerar relatório' },
    { label: 'Enviar por Email', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z', route: '/reports/ocorrencias', description: 'Enviar relatório' },
    { label: 'Ver Usuários', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', route: '/usuarios', description: 'Gerenciar usuários' },
    { label: 'Configurações', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', route: '/configuracoes', description: 'Ajustes do sistema' },
  ];

  // Computed signal para formatar os stats
  statsDisplay = computed(() => {
    const stats = this.dashboardService.stats();
    const svgPaths = [
      'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
    ];
    if (!stats) {
      return [
        { label: 'Relatórios Gerados', value: '0', svgPath: svgPaths[0], trend: 0 },
        { label: 'Emails Enviados', value: '0', svgPath: svgPaths[1], trend: 0 },
        { label: 'Ocorrências', value: '0', svgPath: svgPaths[2], trend: 0 },
        { label: 'Usuários Ativos', value: '0', svgPath: svgPaths[3], trend: 0 },
      ];
    }

    return [
      { label: 'Relatórios Gerados', value: this.formatNumber(stats.reportsGenerated), svgPath: svgPaths[0], trend: stats.reportsGeneratedTrend },
      { label: 'Emails Enviados', value: this.formatNumber(stats.emailsSent), svgPath: svgPaths[1], trend: stats.emailsSentTrend },
      { label: 'Ocorrências', value: this.formatNumber(stats.occurrencesFetched), svgPath: svgPaths[2], trend: stats.occurrencesFetchedTrend },
      { label: 'Usuários Ativos', value: this.formatNumber(stats.activeUsers), svgPath: svgPaths[3], trend: stats.activeUsersTrend },
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
