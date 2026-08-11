import { Component, OnInit, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { DashboardService } from '../../services/dashboard.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="page-header">
        <div>
          <h1 class="page-title">Olá, {{ authService.user()?.name }}</h1>
          <p class="page-subtitle">Resumo do sistema de relatórios</p>
        </div>
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        @for (stat of statsDisplay(); track stat.label) {
          <div class="panel panel-pad">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm" style="color: var(--cmm-muted);">{{ stat.label }}</p>
                <p class="text-2xl font-semibold mt-1" style="color: var(--cmm-ink);">{{ stat.value }}</p>
              </div>
              <div
                class="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style="background: var(--cmm-accent-soft); color: var(--cmm-accent);"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="stat.svgPath"/>
                </svg>
              </div>
            </div>
            <div class="mt-3 flex items-center gap-1.5 text-sm">
              <span
                class="badge"
                [class.badge-success]="stat.trend >= 0"
                [class.badge-danger]="stat.trend < 0"
              >
                {{ stat.trend >= 0 ? '↑' : '↓' }} {{ stat.trend >= 0 ? stat.trend : -stat.trend }}%
              </span>
              <span style="color: var(--cmm-muted);">vs mês anterior</span>
            </div>
          </div>
        }
      </div>

      <!-- Quick Actions -->
      <div class="panel">
        <div class="panel-pad" style="border-bottom: 1px solid var(--cmm-border);">
          <h2 class="text-base font-semibold" style="color: var(--cmm-ink);">Ações Rápidas</h2>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x" style="border-color: var(--cmm-border);">
          @for (action of quickActions; track action.label) {
            <a
              [routerLink]="action.route"
              class="flex items-center gap-3 p-4 transition-colors hover:bg-[color-mix(in_srgb,var(--cmm-accent)_5%,var(--cmm-panel))]"
              style="color: var(--cmm-ink);"
            >
              <svg class="w-5 h-5 flex-shrink-0" style="color: var(--cmm-accent);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" [attr.d]="action.icon"/>
              </svg>
              <div>
                <p class="font-medium text-sm">{{ action.label }}</p>
                <p class="text-sm" style="color: var(--cmm-muted);">{{ action.description }}</p>
              </div>
            </a>
          }
        </div>
      </div>

      <!-- Recent Activity + System Status -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div class="panel">
          <div class="panel-pad" style="border-bottom: 1px solid var(--cmm-border);">
            <h2 class="text-base font-semibold" style="color: var(--cmm-ink);">Relatórios Recentes</h2>
          </div>
          <div class="panel-pad">
            @if (dashboardService.loading()) {
              <div class="flex items-center justify-center py-8">
                <div
                  class="animate-spin w-6 h-6 rounded-full"
                  style="border: 2px solid var(--cmm-border); border-top-color: var(--cmm-accent);"
                ></div>
              </div>
            } @else if (dashboardService.recentReports().length === 0) {
              <div class="empty-state">
                <p>Nenhum relatório gerado ainda.</p>
                <a
                  routerLink="/reports/ocorrencias"
                  class="inline-block mt-2 text-sm font-medium"
                  style="color: var(--cmm-accent);"
                >
                  Gerar primeiro relatório →
                </a>
              </div>
            } @else {
              <div class="divide-y" style="border-color: var(--cmm-border);">
                @for (report of dashboardService.recentReports(); track report.id) {
                  <div class="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div class="min-w-0">
                      <p class="font-medium text-sm truncate" style="color: var(--cmm-ink);">{{ report.name }}</p>
                      <p class="text-sm mt-0.5" style="color: var(--cmm-muted);">
                        {{ report.date }} · {{ report.records }} registros
                      </p>
                    </div>
                    <span
                      class="badge flex-shrink-0"
                      [class.badge-success]="report.status === 'success'"
                      [class.badge-danger]="report.status === 'failed'"
                      [class.badge-warning]="report.status === 'pending'"
                    >
                      {{ report.status === 'success' ? 'Concluído' : report.status === 'failed' ? 'Falhou' : 'Processando' }}
                    </span>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <div class="panel">
          <div class="panel-pad" style="border-bottom: 1px solid var(--cmm-border);">
            <h2 class="text-base font-semibold" style="color: var(--cmm-ink);">Status do Sistema</h2>
          </div>
          <div class="panel-pad space-y-4">
            @for (service of dashboardService.systemStatus(); track service.name) {
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-3 min-w-0">
                  <span
                    class="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    [style.background]="
                      service.status === 'online' ? 'var(--cmm-success)' :
                      service.status === 'warning' ? 'var(--cmm-warning)' :
                      'var(--cmm-danger)'
                    "
                  ></span>
                  <span class="text-sm" style="color: var(--cmm-ink);">{{ service.name }}</span>
                </div>
                <span class="text-sm flex-shrink-0" style="color: var(--cmm-muted);">{{ service.latency }}</span>
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
