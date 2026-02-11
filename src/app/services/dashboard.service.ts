import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { firstValueFrom } from 'rxjs';

export interface DashboardStats {
    reportsGenerated: number;
    emailsSent: number;
    occurrencesFetched: number;
    activeUsers: number;
    reportsGeneratedTrend: number;
    emailsSentTrend: number;
    occurrencesFetchedTrend: number;
    activeUsersTrend: number;
}

export interface RecentReport {
    id: string;
    name: string;
    date: string;
    status: 'success' | 'failed' | 'pending';
    records: number;
}

export interface SystemService {
    name: string;
    status: 'online' | 'warning' | 'offline';
    latency: string;
}

export interface ReportEmail {
    id: string;
    email: string;
    name: string;
    reportType: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

@Injectable({
    providedIn: 'root'
})
export class DashboardService {
    private http = inject(HttpClient);
    private apiUrl = environment.apiUrl;

    // Signals para estado reativo
    loading = signal(false);
    error = signal<string | null>(null);
    stats = signal<DashboardStats | null>(null);
    recentReports = signal<RecentReport[]>([]);
    systemStatus = signal<SystemService[]>([]);
    reportEmails = signal<ReportEmail[]>([]);

    // ===== ESTATÍSTICAS =====

    async loadDashboardStats(): Promise<void> {
        this.loading.set(true);
        this.error.set(null);
        try {
            const stats = await firstValueFrom(
                this.http.get<DashboardStats>(`${this.apiUrl}/dashboard/stats`)
            );
            this.stats.set(stats);
        } catch (err: any) {
            console.error('Erro ao carregar estatísticas:', err);
            this.error.set(err.error?.message || 'Erro ao carregar estatísticas');
            // Usa dados mock em caso de erro
            this.stats.set({
                reportsGenerated: 0,
                emailsSent: 0,
                occurrencesFetched: 0,
                activeUsers: 0,
                reportsGeneratedTrend: 0,
                emailsSentTrend: 0,
                occurrencesFetchedTrend: 0,
                activeUsersTrend: 0,
            });
        } finally {
            this.loading.set(false);
        }
    }

    async loadSystemStatus(): Promise<void> {
        try {
            const status = await firstValueFrom(
                this.http.get<SystemService[]>(`${this.apiUrl}/dashboard/status`)
            );
            this.systemStatus.set(status);
        } catch (err) {
            console.error('Erro ao carregar status do sistema:', err);
            // Dados mock em caso de erro
            this.systemStatus.set([
                { name: 'API Backend', status: 'online', latency: '--' },
                { name: 'Banco de Dados', status: 'offline', latency: '--' },
                { name: 'API Pontta', status: 'offline', latency: '--' },
                { name: 'Servidor de Email', status: 'offline', latency: '--' },
            ]);
        }
    }

    async loadRecentReports(): Promise<void> {
        try {
            const reports = await firstValueFrom(
                this.http.get<RecentReport[]>(`${this.apiUrl}/dashboard/recent-reports`)
            );
            this.recentReports.set(reports);
        } catch (err) {
            console.error('Erro ao carregar relatórios recentes:', err);
            this.recentReports.set([]);
        }
    }

    // ===== EMAILS FIXOS =====

    async loadReportEmails(): Promise<void> {
        try {
            const emails = await firstValueFrom(
                this.http.get<ReportEmail[]>(`${this.apiUrl}/dashboard/emails`)
            );
            this.reportEmails.set(emails);
        } catch (err) {
            console.error('Erro ao carregar emails:', err);
            this.reportEmails.set([]);
        }
    }

    async createReportEmail(data: { email: string; name: string; reportType: string }): Promise<ReportEmail> {
        const newEmail = await firstValueFrom(
            this.http.post<ReportEmail>(`${this.apiUrl}/dashboard/emails`, data)
        );
        await this.loadReportEmails();
        return newEmail;
    }

    async updateReportEmail(id: string, data: Partial<ReportEmail>): Promise<ReportEmail> {
        const updatedEmail = await firstValueFrom(
            this.http.put<ReportEmail>(`${this.apiUrl}/dashboard/emails/${id}`, data)
        );
        await this.loadReportEmails();
        return updatedEmail;
    }

    async deleteReportEmail(id: string): Promise<void> {
        await firstValueFrom(
            this.http.delete(`${this.apiUrl}/dashboard/emails/${id}`)
        );
        await this.loadReportEmails();
    }

    async toggleReportEmail(id: string): Promise<ReportEmail> {
        const updatedEmail = await firstValueFrom(
            this.http.put<ReportEmail>(`${this.apiUrl}/dashboard/emails/${id}/toggle`, {})
        );
        await this.loadReportEmails();
        return updatedEmail;
    }

    // ===== MÉTODOS DE CONVENIÊNCIA =====

    async loadAll(): Promise<void> {
        await Promise.all([
            this.loadDashboardStats(),
            this.loadRecentReports(),
            this.loadSystemStatus(),
        ]);
    }
}
