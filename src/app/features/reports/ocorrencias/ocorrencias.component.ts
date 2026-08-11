import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from '../../../../environments/environment';
import { DashboardService, ReportEmail } from '../../../services/dashboard.service';

interface Occurrence {
  number: string;
  title: string;
  status: string;
  responsibleName: string;
  deadline: string;
  createdDate: string;
  occurrenceTypeName: string;
  tagName: string;
  contactName: string;
  salesOrderCode: string;
}

interface PreviewResponse {
  data: Occurrence[];
  pagination: {
    page: number;
    size: number;
    total: number;
    totalPages: number;
  };
}

@Component({
  selector: 'app-ocorrencias',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="space-y-6">
      <div class="flex items-center gap-3 text-sm" style="color: var(--cmm-muted);">
        <button
          type="button"
          (click)="goBack()"
          class="btn btn-ghost btn-sm"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Relatórios
        </button>
        <span>/</span>
        <span class="font-medium" style="color: var(--cmm-ink);">Ocorrências Pontta</span>
      </div>

      <div class="page-header">
        <div>
          <h1 class="page-title">Relatório de Ocorrências Pontta</h1>
          <p class="page-subtitle">Gere relatórios em Excel ou CSV e envie por email</p>
        </div>
      </div>

      <!-- Filtros -->
      <div class="panel">
        <div class="panel-pad" style="border-bottom: 1px solid var(--cmm-border);">
          <h2 class="text-base font-semibold" style="color: var(--cmm-ink);">Filtros e Configurações</h2>
        </div>

        <div class="panel-pad space-y-6">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="form-label">Limite de Registros</label>
              <select [(ngModel)]="filters.limit" class="form-input">
                <option [ngValue]="0">Todos</option>
                <option [ngValue]="100">100 registros</option>
                <option [ngValue]="500">500 registros</option>
                <option [ngValue]="1000">1000 registros</option>
                <option [ngValue]="5000">5000 registros</option>
              </select>
            </div>

            <div>
              <label class="form-label">Data Inicial</label>
              <input type="date" [(ngModel)]="filters.startDate" class="form-input" />
            </div>

            <div>
              <label class="form-label">Data Final</label>
              <input type="date" [(ngModel)]="filters.endDate" class="form-input" />
            </div>

            <div>
              <label class="form-label">Registros por Página</label>
              <select [(ngModel)]="filters.pageSize" class="form-input">
                <option [ngValue]="10">10</option>
                <option [ngValue]="25">25</option>
                <option [ngValue]="50">50</option>
                <option [ngValue]="100">100</option>
              </select>
            </div>
          </div>

          <div>
            <label class="form-label">Email de Destino (Opcional)</label>
            <input
              type="email"
              [(ngModel)]="email"
              placeholder="destinatario@email.com"
              class="form-input"
            />
            <p class="text-xs mt-1" style="color: var(--cmm-muted);">
              Deixe vazio para enviar apenas aos emails fixos cadastrados
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button type="button" (click)="previewData()" [disabled]="isLoading()" class="btn btn-secondary">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              Visualizar Dados
            </button>

            <button type="button" (click)="downloadExcel()" [disabled]="isLoading()" class="btn btn-primary">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Baixar Excel
            </button>

            <button type="button" (click)="downloadCsv()" [disabled]="isLoading()" class="btn btn-secondary">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Baixar CSV
            </button>

            <button type="button" (click)="sendEmail()" [disabled]="isLoading() || !email" class="btn btn-accent">
              @if (isLoading() && currentAction() === 'send') {
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                Enviar para Este Email
              }
            </button>

            <button
              type="button"
              (click)="confirmSendToFixedEmails()"
              [disabled]="isLoading() || getOccurrencesEmails().length === 0"
              class="btn btn-accent"
            >
              @if (isLoading() && currentAction() === 'sendFixed') {
                <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              } @else {
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"></path>
                </svg>
                Enviar para Emails Fixos ({{ getOccurrencesEmails().length }})
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Emails Fixos -->
      <div class="panel">
        <div class="panel-pad flex items-center justify-between gap-3" style="border-bottom: 1px solid var(--cmm-border);">
          <div class="flex items-center gap-2 flex-wrap">
            <h2 class="font-semibold" style="color: var(--cmm-ink);">Emails Fixos</h2>
            <span class="badge badge-neutral">{{ getOccurrencesEmails().length }} cadastrados</span>
          </div>
          <button type="button" (click)="openEmailModal()" class="btn btn-primary btn-sm">
            Adicionar
          </button>
        </div>

        <div class="panel-pad">
          @if (getOccurrencesEmails().length === 0) {
            <div class="empty-state" style="padding: 1.5rem; border: 1px dashed var(--cmm-border); border-radius: 0.5rem;">
              <p>Nenhum email cadastrado.</p>
            </div>
          } @else {
            <div class="flex flex-wrap gap-2">
              @for (emailItem of getOccurrencesEmails(); track emailItem.id) {
                <button
                  type="button"
                  class="flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors"
                  style="border-color: var(--cmm-border); background: var(--cmm-panel); color: var(--cmm-ink);"
                  [class.opacity-60]="!emailItem.isActive"
                  (click)="openEmailDetailModal(emailItem)"
                >
                  <span
                    class="badge"
                    [class.badge-success]="emailItem.isActive"
                    [class.badge-neutral]="!emailItem.isActive"
                  >
                    {{ emailItem.isActive ? 'Ativo' : 'Pausado' }}
                  </span>
                  <span class="text-sm">
                    <span class="font-medium">{{ emailItem.name }}</span>
                    <span style="color: var(--cmm-muted);"> · {{ emailItem.email }}</span>
                  </span>
                </button>
              }
            </div>
            <p class="text-xs mt-3" style="color: var(--cmm-muted);">Clique em um email para editar ou remover</p>
          }
        </div>
      </div>

      <!-- Modal de Detalhes/Edição do Email -->
      @if (showEmailDetailModal) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
          <div class="panel w-full max-w-sm panel-pad">
            <h3 class="text-lg font-semibold mb-4" style="color: var(--cmm-ink);">Detalhes do Email</h3>

            <div class="space-y-3">
              <div class="p-3 rounded-lg" style="background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));">
                <p class="text-xs mb-1" style="color: var(--cmm-muted);">Nome</p>
                <p class="font-medium" style="color: var(--cmm-ink);">{{ selectedEmail?.name }}</p>
              </div>
              <div class="p-3 rounded-lg" style="background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));">
                <p class="text-xs mb-1" style="color: var(--cmm-muted);">Email</p>
                <p class="font-medium" style="color: var(--cmm-ink);">{{ selectedEmail?.email }}</p>
              </div>
              <div class="p-3 rounded-lg flex items-center justify-between gap-3" style="background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));">
                <div>
                  <p class="text-xs mb-1" style="color: var(--cmm-muted);">Status</p>
                  <span
                    class="badge"
                    [class.badge-success]="selectedEmail?.isActive"
                    [class.badge-neutral]="!selectedEmail?.isActive"
                  >
                    {{ selectedEmail?.isActive ? 'Ativo' : 'Inativo' }}
                  </span>
                </div>
                <button
                  type="button"
                  (click)="toggleEmail(selectedEmail!)"
                  class="btn btn-sm"
                  [class.btn-secondary]="selectedEmail?.isActive"
                  [class.btn-accent]="!selectedEmail?.isActive"
                >
                  {{ selectedEmail?.isActive ? 'Desativar' : 'Ativar' }}
                </button>
              </div>
            </div>

            <div class="flex gap-2 mt-5">
              <button
                type="button"
                (click)="deleteEmail(selectedEmail!); closeEmailDetailModal()"
                class="btn btn-danger flex-1"
              >
                Remover
              </button>
              <button type="button" (click)="closeEmailDetailModal()" class="btn btn-secondary flex-1">
                Fechar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal de Adicionar Email -->
      @if (showEmailModal) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
          <div class="panel w-full max-w-md panel-pad">
            <h3 class="text-lg font-semibold mb-4" style="color: var(--cmm-ink);">Adicionar Email Fixo</h3>

            <div class="space-y-4">
              <div>
                <label class="form-label">Nome</label>
                <input
                  type="text"
                  [(ngModel)]="newEmail.name"
                  class="form-input"
                  placeholder="Ex: João Silva - Gerente"
                />
              </div>

              <div>
                <label class="form-label">Email</label>
                <input
                  type="email"
                  [(ngModel)]="newEmail.email"
                  class="form-input"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div class="p-3 rounded-lg" style="background: var(--cmm-accent-soft); border: 1px solid color-mix(in srgb, var(--cmm-accent) 25%, transparent);">
                <p class="text-sm" style="color: var(--cmm-ink);">
                  Este email receberá automaticamente todos os <strong>Relatórios de Ocorrências</strong>
                </p>
              </div>
            </div>

            <div class="flex justify-end gap-3 mt-6">
              <button type="button" (click)="cancelEmailModal()" class="btn btn-ghost">
                Cancelar
              </button>
              <button type="button" (click)="saveEmail()" [disabled]="savingEmail" class="btn btn-primary">
                {{ savingEmail ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal de Confirmação de Envio -->
      @if (showConfirmSendModal) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
          <div class="panel w-full max-w-md panel-pad">
            <div class="flex items-center gap-3 mb-4">
              <div
                class="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                style="background: color-mix(in srgb, var(--cmm-warning) 16%, var(--cmm-panel));"
              >
                <svg class="w-6 h-6" style="color: var(--cmm-warning);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold" style="color: var(--cmm-ink);">Confirmar Envio</h3>
            </div>

            <div class="space-y-3 mb-6">
              <p style="color: var(--cmm-ink);">
                Deseja enviar o relatório para <strong>{{ getOccurrencesEmails().length }} email(s) fixo(s)</strong>?
              </p>

              <div class="rounded-lg p-3 max-h-40 overflow-y-auto" style="background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));">
                <ul class="space-y-2">
                  @for (email of getOccurrencesEmails(); track email.id) {
                    @if (email.isActive) {
                      <li class="flex items-center gap-2 text-sm">
                        <span class="badge badge-success">Ativo</span>
                        <span class="font-medium" style="color: var(--cmm-ink);">{{ email.name }}</span>
                        <span style="color: var(--cmm-muted);">({{ email.email }})</span>
                      </li>
                    }
                  }
                </ul>
              </div>
            </div>

            <div class="flex justify-end gap-3">
              <button type="button" (click)="cancelConfirmSend()" class="btn btn-ghost">
                Cancelar
              </button>
              <button type="button" (click)="sendToFixedEmails()" class="btn btn-accent">
                Confirmar Envio
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Notifications -->
      @if (successMessage()) {
        <div
          class="panel panel-pad flex items-center gap-3"
          style="border-color: color-mix(in srgb, var(--cmm-success) 35%, var(--cmm-border));"
        >
          <svg class="w-5 h-5 flex-shrink-0" style="color: var(--cmm-success);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span style="color: var(--cmm-success);">{{ successMessage() }}</span>
        </div>
      }

      @if (errorMessage()) {
        <div
          class="panel panel-pad flex items-center gap-3"
          style="border-color: color-mix(in srgb, var(--cmm-danger) 35%, var(--cmm-border));"
        >
          <svg class="w-5 h-5 flex-shrink-0" style="color: var(--cmm-danger);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span style="color: var(--cmm-danger);">{{ errorMessage() }}</span>
        </div>
      }

      <!-- Modal de Visualização de Dados -->
      @if (showPreviewModal && previewData$ && previewData$.length > 0) {
        <div class="fixed inset-0 z-50 flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
          <div class="panel w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div class="panel-pad flex items-center justify-between flex-shrink-0" style="border-bottom: 1px solid var(--cmm-border);">
              <div>
                <h3 class="font-semibold" style="color: var(--cmm-ink);">Visualização dos Dados</h3>
                @if (pagination) {
                  <p class="text-sm mt-1" style="color: var(--cmm-muted);">
                    {{ pagination.total }} registros | Página {{ pagination.page + 1 }} de {{ pagination.totalPages }}
                  </p>
                }
              </div>
              <button type="button" (click)="closePreview()" class="btn btn-ghost btn-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <div class="flex-1 overflow-y-auto p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                @for (item of previewData$; track item.number) {
                  <button
                    type="button"
                    class="p-3 rounded-lg border text-left transition-colors hover:bg-[color-mix(in_srgb,var(--cmm-accent)_5%,var(--cmm-panel))]"
                    style="border-color: var(--cmm-border); background: var(--cmm-panel);"
                    (click)="openItemDetailModal(item)"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 flex-wrap">
                          <span class="badge badge-neutral font-mono">#{{ item.number }}</span>
                          <span
                            class="badge"
                            [class.badge-success]="item.status === 'Concluída'"
                            [class.badge-warning]="item.status === 'Em Andamento'"
                            [class.badge-accent]="item.status === 'Aberta'"
                            [class.badge-danger]="item.status === 'Cancelada'"
                            [class.badge-neutral]="!['Concluída', 'Em Andamento', 'Aberta', 'Cancelada'].includes(item.status)"
                          >
                            {{ item.status }}
                          </span>
                        </div>
                        <p class="font-medium mt-1 text-sm line-clamp-2" style="color: var(--cmm-ink);">{{ item.title }}</p>
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs" style="color: var(--cmm-muted);">
                          @if (item.responsibleName) {
                            <span>{{ item.responsibleName }}</span>
                          }
                          @if (item.deadline) {
                            <span>{{ item.deadline }}</span>
                          }
                          @if (item.tagName) {
                            <span class="badge badge-neutral">{{ item.tagName }}</span>
                          }
                        </div>
                      </div>
                      <span style="color: var(--cmm-muted);">›</span>
                    </div>
                  </button>
                }
              </div>
            </div>

            @if (pagination && pagination.totalPages > 1) {
              <div class="panel-pad flex items-center justify-between flex-shrink-0" style="border-top: 1px solid var(--cmm-border);">
                <div class="text-sm" style="color: var(--cmm-muted);">
                  {{ (pagination.page * pagination.size) + 1 }}-{{ Math.min((pagination.page + 1) * pagination.size, pagination.total) }} de {{ pagination.total }}
                </div>
                <div class="flex gap-2">
                  <button
                    type="button"
                    (click)="changePage(pagination.page - 1)"
                    [disabled]="pagination.page === 0 || isLoading()"
                    class="btn btn-secondary btn-sm"
                  >
                    ← Anterior
                  </button>
                  <span class="px-3 py-1.5 text-sm" style="color: var(--cmm-muted);">
                    {{ pagination.page + 1 }} / {{ pagination.totalPages }}
                  </span>
                  <button
                    type="button"
                    (click)="changePage(pagination.page + 1)"
                    [disabled]="pagination.page >= pagination.totalPages - 1 || isLoading()"
                    class="btn btn-secondary btn-sm"
                  >
                    Próxima →
                  </button>
                </div>
              </div>
            }
          </div>
        </div>
      }

      <!-- Modal de Detalhe do Item -->
      @if (showItemDetailModal && selectedItem) {
        <div class="fixed inset-0 z-[60] flex items-center justify-center p-4" style="background: rgba(10, 16, 24, 0.55);">
          <div class="panel w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div
              class="panel-pad flex items-center justify-between sticky top-0"
              style="border-bottom: 1px solid var(--cmm-border); background: var(--cmm-panel);"
            >
              <h3 class="font-semibold" style="color: var(--cmm-ink);">Detalhes da Ocorrência</h3>
              <button type="button" (click)="closeItemDetailModal()" class="btn btn-ghost btn-sm">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="panel-pad space-y-3">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="badge badge-neutral font-mono">#{{ selectedItem.number }}</span>
                <span
                  class="badge"
                  [class.badge-success]="selectedItem.status === 'Concluída'"
                  [class.badge-warning]="selectedItem.status === 'Em Andamento'"
                  [class.badge-accent]="selectedItem.status === 'Aberta'"
                  [class.badge-danger]="selectedItem.status === 'Cancelada'"
                  [class.badge-neutral]="!['Concluída', 'Em Andamento', 'Aberta', 'Cancelada'].includes(selectedItem.status)"
                >
                  {{ selectedItem.status }}
                </span>
              </div>

              <h4 class="font-semibold" style="color: var(--cmm-ink);">{{ selectedItem.title }}</h4>

              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="p-2 rounded" style="background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));">
                  <p class="text-xs" style="color: var(--cmm-muted);">Responsável</p>
                  <p class="font-medium" style="color: var(--cmm-ink);">{{ selectedItem.responsibleName || '-' }}</p>
                </div>
                <div class="p-2 rounded" style="background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));">
                  <p class="text-xs" style="color: var(--cmm-muted);">Prazo</p>
                  <p class="font-medium" style="color: var(--cmm-ink);">{{ selectedItem.deadline || '-' }}</p>
                </div>
                <div class="p-2 rounded" style="background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));">
                  <p class="text-xs" style="color: var(--cmm-muted);">Criado em</p>
                  <p class="font-medium" style="color: var(--cmm-ink);">{{ selectedItem.createdDate || '-' }}</p>
                </div>
                <div class="p-2 rounded" style="background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));">
                  <p class="text-xs" style="color: var(--cmm-muted);">Tipo</p>
                  <p class="font-medium" style="color: var(--cmm-ink);">{{ selectedItem.occurrenceTypeName || '-' }}</p>
                </div>
                <div class="p-2 rounded" style="background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));">
                  <p class="text-xs" style="color: var(--cmm-muted);">Tag</p>
                  <p class="font-medium" style="color: var(--cmm-ink);">
                    @if (selectedItem.tagName) {
                      <span class="badge badge-neutral">{{ selectedItem.tagName }}</span>
                    } @else {
                      -
                    }
                  </p>
                </div>
                <div class="p-2 rounded" style="background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));">
                  <p class="text-xs" style="color: var(--cmm-muted);">Contato</p>
                  <p class="font-medium" style="color: var(--cmm-ink);">{{ selectedItem.contactName || '-' }}</p>
                </div>
                <div class="p-2 rounded col-span-2" style="background: color-mix(in srgb, var(--cmm-surface) 80%, var(--cmm-panel));">
                  <p class="text-xs" style="color: var(--cmm-muted);">Pedido</p>
                  <p class="font-medium" style="color: var(--cmm-ink);">{{ selectedItem.salesOrderCode || '-' }}</p>
                </div>
              </div>
            </div>
            <div class="panel-pad" style="border-top: 1px solid var(--cmm-border);">
              <button type="button" (click)="closeItemDetailModal()" class="btn btn-secondary w-full">
                Fechar
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class OcorrenciasComponent implements OnInit {
  email = '';
  filters = {
    limit: 0,
    startDate: '',
    endDate: '',
    pageSize: 10
  };
  currentPage = 0;
  isLoading = signal(false);
  currentAction = signal<string>('');
  successMessage = signal('');
  errorMessage = signal('');
  previewData$: Occurrence[] = [];
  pagination: any = null;
  Math = Math;

  // Propriedades para emails fixos
  showEmailModal = false;
  showEmailDetailModal = false;
  selectedEmail: ReportEmail | null = null;
  savingEmail = false;
  newEmail = {
    name: '',
    email: '',
    reportType: 'occurrences'
  };

  // Propriedades para visualização de dados
  showPreviewModal = false;
  showItemDetailModal = false;
  selectedItem: Occurrence | null = null;

  // Modal de confirmação de envio
  showConfirmSendModal = false;

  private apiUrl = environment.apiUrl;
  dashboardService = inject(DashboardService);

  constructor(
    private http: HttpClient,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadFixedEmails();
  }

  async loadFixedEmails() {
    await this.dashboardService.loadReportEmails();
  }

  getOccurrencesEmails(): ReportEmail[] {
    return this.dashboardService.reportEmails().filter(e => e.reportType === 'occurrences');
  }

  openEmailModal() {
    this.newEmail = { name: '', email: '', reportType: 'occurrences' };
    this.showEmailModal = true;
  }

  openEmailDetailModal(email: ReportEmail) {
    this.selectedEmail = email;
    this.showEmailDetailModal = true;
  }

  closeEmailDetailModal() {
    this.showEmailDetailModal = false;
    this.selectedEmail = null;
  }

  cancelEmailModal() {
    this.showEmailModal = false;
    this.newEmail = { name: '', email: '', reportType: 'occurrences' };
  }

  async saveEmail() {
    if (!this.newEmail.name || !this.newEmail.email) {
      this.errorMessage.set('Preencha todos os campos obrigatórios');
      return;
    }

    this.savingEmail = true;
    try {
      await this.dashboardService.createReportEmail(this.newEmail);
      this.successMessage.set('Email fixo adicionado com sucesso!');
      this.cancelEmailModal();
    } catch (err) {
      console.error('Erro ao salvar email:', err);
      this.errorMessage.set('Erro ao salvar email');
    } finally {
      this.savingEmail = false;
    }
  }

  async toggleEmail(email: ReportEmail) {
    try {
      await this.dashboardService.toggleReportEmail(email.id);
      this.successMessage.set(email.isActive ? 'Email desativado' : 'Email ativado');
    } catch (err) {
      console.error('Erro ao alternar email:', err);
      this.errorMessage.set('Erro ao alternar email');
    }
  }

  async deleteEmail(email: ReportEmail) {
    if (confirm(`Deseja remover o email "${email.email}"?`)) {
      try {
        await this.dashboardService.deleteReportEmail(email.id);
        this.successMessage.set('Email removido com sucesso');
      } catch (err) {
        console.error('Erro ao remover email:', err);
        this.errorMessage.set('Erro ao remover email');
      }
    }
  }

  goBack() {
    this.router.navigate(['/reports']);
  }

  clearMessages() {
    this.successMessage.set('');
    this.errorMessage.set('');
  }

  previewData() {
    this.clearMessages();
    this.isLoading.set(true);
    this.currentAction.set('preview');
    this.currentPage = 0;

    const params: any = {
      page: this.currentPage,
      size: this.filters.pageSize
    };

    if (this.filters.startDate) params.startDate = this.filters.startDate;
    if (this.filters.endDate) params.endDate = this.filters.endDate;

    this.http.get<PreviewResponse>(`${this.apiUrl}/report/preview`, { params }).subscribe({
      next: (response) => {
        this.previewData$ = response.data;
        this.pagination = response.pagination;
        this.showPreviewModal = true;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Erro ao carregar dados');
        this.isLoading.set(false);
      }
    });
  }

  changePage(page: number) {
    if (page < 0 || (this.pagination && page >= this.pagination.totalPages)) {
      return;
    }

    this.currentPage = page;
    this.isLoading.set(true);

    const params: any = {
      page: this.currentPage,
      size: this.filters.pageSize
    };

    if (this.filters.startDate) params.startDate = this.filters.startDate;
    if (this.filters.endDate) params.endDate = this.filters.endDate;

    this.http.get<PreviewResponse>(`${this.apiUrl}/report/preview`, { params }).subscribe({
      next: (response) => {
        this.previewData$ = response.data;
        this.pagination = response.pagination;
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Erro ao carregar dados');
        this.isLoading.set(false);
      }
    });
  }

  getPageNumbers(): number[] {
    if (!this.pagination) return [];

    const total = this.pagination.totalPages;
    const current = this.pagination.page;
    const pages: number[] = [];

    // Mostra no máximo 5 páginas
    let start = Math.max(0, current - 2);
    let end = Math.min(total, start + 5);

    if (end - start < 5) {
      start = Math.max(0, end - 5);
    }

    for (let i = start; i < end; i++) {
      pages.push(i);
    }

    return pages;
  }

  closePreview() {
    this.showPreviewModal = false;
    this.previewData$ = [];
    this.pagination = null;
  }

  openItemDetailModal(item: Occurrence) {
    this.selectedItem = item;
    this.showItemDetailModal = true;
  }

  closeItemDetailModal() {
    this.showItemDetailModal = false;
    this.selectedItem = null;
  }

  downloadExcel() {
    this.clearMessages();
    this.isLoading.set(true);
    this.currentAction.set('excel');

    const params: any = {};
    if (this.filters.limit > 0) params.limit = this.filters.limit;
    if (this.filters.startDate) params.startDate = this.filters.startDate;
    if (this.filters.endDate) params.endDate = this.filters.endDate;

    this.http.get(`${this.apiUrl}/report/download-excel`, {
      params,
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        this.downloadFile(blob, 'relatorio_ocorrencias.xlsx');
        this.successMessage.set('Excel baixado com sucesso!');
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Erro ao baixar Excel');
        this.isLoading.set(false);
      }
    });
  }

  downloadCsv() {
    this.clearMessages();
    this.isLoading.set(true);
    this.currentAction.set('csv');

    const params: any = {};
    if (this.filters.limit > 0) params.limit = this.filters.limit;
    if (this.filters.startDate) params.startDate = this.filters.startDate;
    if (this.filters.endDate) params.endDate = this.filters.endDate;

    this.http.get(`${this.apiUrl}/report/download`, {
      params,
      responseType: 'blob'
    }).subscribe({
      next: (blob) => {
        this.downloadFile(blob, 'relatorio_ocorrencias.csv');
        this.successMessage.set('CSV baixado com sucesso!');
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set('Erro ao baixar CSV');
        this.isLoading.set(false);
      }
    });
  }

  sendEmail() {
    if (!this.email) {
      this.errorMessage.set('Por favor, informe um email');
      return;
    }

    this.clearMessages();
    this.isLoading.set(true);
    this.currentAction.set('send');

    const payload: any = { email: this.email };
    if (this.filters.limit > 0) payload.limit = this.filters.limit;
    if (this.filters.startDate) payload.startDate = this.filters.startDate;
    if (this.filters.endDate) payload.endDate = this.filters.endDate;

    this.http.post(`${this.apiUrl}/report/generate-and-send`, payload).subscribe({
      next: () => {
        this.successMessage.set(`Relatório enviado com sucesso para ${this.email}!`);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Erro ao enviar email');
        this.isLoading.set(false);
      }
    });
  }

  confirmSendToFixedEmails() {
    const activeEmails = this.getOccurrencesEmails().filter(e => e.isActive);
    if (activeEmails.length === 0) {
      this.errorMessage.set('Nenhum email fixo ativo cadastrado');
      return;
    }
    this.showConfirmSendModal = true;
  }

  cancelConfirmSend() {
    this.showConfirmSendModal = false;
  }

  sendToFixedEmails() {
    this.showConfirmSendModal = false;
    this.clearMessages();
    this.isLoading.set(true);
    this.currentAction.set('sendFixed');

    const payload: any = { sendToFixed: true };
    if (this.filters.limit > 0) payload.limit = this.filters.limit;
    if (this.filters.startDate) payload.startDate = this.filters.startDate;
    if (this.filters.endDate) payload.endDate = this.filters.endDate;

    const activeEmails = this.getOccurrencesEmails().filter(e => e.isActive);

    this.http.post(`${this.apiUrl}/report/generate-and-send`, payload).subscribe({
      next: () => {
        this.successMessage.set(`Relatório enviado com sucesso para ${activeEmails.length} email(s) fixo(s)!`);
        this.isLoading.set(false);
      },
      error: (error) => {
        this.errorMessage.set(error.error?.message || 'Erro ao enviar email');
        this.isLoading.set(false);
      }
    });
  }

  private downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }
}
