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
      <!-- Breadcrumb e Header -->
      <div class="flex items-center gap-3 text-sm text-slate-500">
        <button 
          (click)="goBack()"
          class="flex items-center gap-1 hover:text-slate-700 transition-colors"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
          </svg>
          Relatórios
        </button>
        <span>/</span>
        <span class="text-slate-800 font-medium">Ocorrências Pontta</span>
      </div>

      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 class="text-xl font-semibold text-slate-800">Relatório de Ocorrências Pontta</h1>
          <p class="text-slate-500 mt-1">Gere relatórios em Excel ou CSV e envie por email</p>
        </div>
      </div>

      <!-- Actions Card -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="p-6 border-b border-slate-200">
          <h2 class="text-lg font-semibold text-slate-800">Filtros e Configurações</h2>
        </div>

        <div class="p-6 space-y-6">
          <!-- Filtros Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <!-- Limite de Registros -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Limite de Registros
              </label>
              <select
                [(ngModel)]="filters.limit"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              >
                <option [ngValue]="0">Todos</option>
                <option [ngValue]="100">100 registros</option>
                <option [ngValue]="500">500 registros</option>
                <option [ngValue]="1000">1000 registros</option>
                <option [ngValue]="5000">5000 registros</option>
              </select>
            </div>

            <!-- Data Inicial -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Data Inicial
              </label>
              <input
                type="date"
                [(ngModel)]="filters.startDate"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              />
            </div>

            <!-- Data Final -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Data Final
              </label>
              <input
                type="date"
                [(ngModel)]="filters.endDate"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              />
            </div>

            <!-- Registros por Página -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">
                Registros por Página
              </label>
              <select
                [(ngModel)]="filters.pageSize"
                class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              >
                <option [ngValue]="10">10</option>
                <option [ngValue]="25">25</option>
                <option [ngValue]="50">50</option>
                <option [ngValue]="100">100</option>
              </select>
            </div>
          </div>

          <!-- Email Input -->
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-2">
              Email de Destino (Opcional)
            </label>
            <div class="flex gap-3">
              <input
                type="email"
                [(ngModel)]="email"
                placeholder="destinatario@email.com"
                class="flex-1 px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent"
              />
            </div>
              <p class="text-xs text-slate-500 mt-1">Deixe vazio para enviar apenas aos emails fixos cadastrados</p>
          </div>

          <!-- Action Buttons -->
          <div class="flex flex-wrap gap-3">
            <button
              (click)="previewData()"
              [disabled]="isLoading()"
              class="px-6 py-2.5 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
              </svg>
              Visualizar Dados
            </button>

            <button
              (click)="downloadExcel()"
              [disabled]="isLoading()"
              class="px-6 py-2.5 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Baixar Excel
            </button>

            <button
              (click)="downloadCsv()"
              [disabled]="isLoading()"
              class="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
              Baixar CSV
            </button>

            <button
              (click)="sendEmail()"
              [disabled]="isLoading() || !email"
              class="px-6 py-2.5 bg-slate-800 text-white font-medium rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              @if (isLoading() && currentAction() === 'send') {
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                </svg>
                Enviar para Este Email
              }
            </button>

            <button
              (click)="confirmSendToFixedEmails()"
              [disabled]="isLoading() || getOccurrencesEmails().length === 0"
              class="px-6 py-2.5 bg-orange-600 text-white font-medium rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              @if (isLoading() && currentAction() === 'sendFixed') {
                <svg class="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Enviando...
              } @else {
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-1.14.76a2 2 0 01-2.22 0l-1.14-.76"></path>
                </svg>
                Enviar para Emails Fixos ({{ getOccurrencesEmails().length }})
              }
            </button>
          </div>
        </div>
      </div>

      <!-- Emails Fixos para este Relatório - Layout Compacto -->
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex items-center justify-between">
          <div class="flex items-center gap-2">

            <h2 class="font-semibold text-slate-800">Emails Fixos</h2>
            <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
              {{ getOccurrencesEmails().length }} cadastrados
            </span>
          </div>
          <button 
            (click)="openEmailModal()"
            class="px-3 py-1.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors flex items-center gap-1"
          >
            <span>+</span> Adicionar
          </button>
        </div>

        <div class="p-4">
          @if (getOccurrencesEmails().length === 0) {
            <div class="text-center py-4 text-slate-500 text-sm border border-dashed border-slate-200 rounded-lg">
              <p>Nenhum email cadastrado.</p>
            </div>
          } @else {
            <div class="flex flex-wrap gap-2">
              @for (emailItem of getOccurrencesEmails(); track emailItem.id) {
                <div 
                  class="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all cursor-pointer"
                  [class.bg-green-50]="emailItem.isActive"
                  [class.border-green-200]="emailItem.isActive"
                  [class.bg-slate-50]="!emailItem.isActive"
                  [class.border-slate-200]="!emailItem.isActive"
                  [class.opacity-60]="!emailItem.isActive"
                  (click)="openEmailDetailModal(emailItem)"
                >
                  <span class="text-sm">{{ emailItem.isActive ? 'Ativo' : 'Pausado' }}</span>
                  <div class="text-sm">
                    <span class="font-medium text-slate-800">{{ emailItem.name }}</span>
                    <span class="text-slate-400 mx-1">·</span>
                    <span class="text-slate-500">{{ emailItem.email }}</span>
                  </div>
                </div>
              }
            </div>
            <p class="text-xs text-slate-400 mt-3">Clique em um email para editar ou remover</p>
          }
        </div>
      </div>

      <!-- Modal de Detalhes/Edição do Email -->
      @if (showEmailDetailModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl p-5 w-full max-w-sm mx-4">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">Detalhes do Email</h3>
            
            <div class="space-y-3">
              <div class="p-3 bg-slate-50 rounded-lg">
                <p class="text-xs text-slate-500 mb-1">Nome</p>
                <p class="font-medium text-slate-800">{{ selectedEmail?.name }}</p>
              </div>
              <div class="p-3 bg-slate-50 rounded-lg">
                <p class="text-xs text-slate-500 mb-1">Email</p>
                <p class="font-medium text-slate-800">{{ selectedEmail?.email }}</p>
              </div>
              <div class="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
                <div>
                  <p class="text-xs text-slate-500 mb-1">Status</p>
                  <p class="font-medium" [class.text-green-600]="selectedEmail?.isActive" [class.text-slate-500]="!selectedEmail?.isActive">
                    {{ selectedEmail?.isActive ? 'Ativo' : 'Inativo' }}
                  </p>
                </div>
                <button 
                  (click)="toggleEmail(selectedEmail!)"
                  class="px-3 py-1.5 text-sm rounded-lg transition-colors"
                  [class.bg-slate-200]="selectedEmail?.isActive"
                  [class.text-slate-700]="selectedEmail?.isActive"
                  [class.bg-green-600]="!selectedEmail?.isActive"
                  [class.text-white]="!selectedEmail?.isActive"
                >
                  {{ selectedEmail?.isActive ? 'Desativar' : 'Ativar' }}
                </button>
              </div>
            </div>
            
            <div class="flex gap-2 mt-5">
              <button 
                (click)="deleteEmail(selectedEmail!); closeEmailDetailModal()"
                class="flex-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-sm font-medium"
              >
                Remover
              </button>
              <button 
                (click)="closeEmailDetailModal()"
                class="flex-1 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal de Adicionar Email -->
      @if (showEmailModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 class="text-lg font-semibold text-slate-800 mb-4">Adicionar Email Fixo</h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input 
                  type="text" 
                  [(ngModel)]="newEmail.name"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  placeholder="Ex: João Silva - Gerente"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input 
                  type="email" 
                  [(ngModel)]="newEmail.email"
                  class="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div class="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <p class="text-sm text-slate-600">
                  Este email receberá automaticamente todos os <strong>Relatórios de Ocorrências</strong>
                </p>
              </div>
            </div>
            
            <div class="flex justify-end gap-3 mt-6">
              <button 
                (click)="cancelEmailModal()"
                class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                (click)="saveEmail()"
                [disabled]="savingEmail"
                class="px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {{ savingEmail ? 'Salvando...' : 'Salvar' }}
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Modal de Confirmação de Envio -->
      @if (showConfirmSendModal) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div class="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-slate-800">Confirmar Envio</h3>
            </div>

            <div class="space-y-3 mb-6">
              <p class="text-slate-700">
                Deseja enviar o relatório para <strong>{{ getOccurrencesEmails().length }} email(s) fixo(s)</strong>?
              </p>
              
              <div class="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <ul class="space-y-2">
                  @for (email of getOccurrencesEmails(); track email.id) {
                    @if (email.isActive) {
                      <li class="flex items-center gap-2 text-sm">
                        <svg class="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <span class="font-medium text-slate-800">{{ email.name }}</span>
                        <span class="text-slate-500">({{ email.email }})</span>
                      </li>
                    }
                  }
                </ul>
              </div>
            </div>
            
            <div class="flex justify-end gap-3">
              <button 
                (click)="cancelConfirmSend()"
                class="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                (click)="sendToFixedEmails()"
                class="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Confirmar Envio
              </button>
            </div>
          </div>
        </div>
      }

      <!-- Notifications -->
      @if (successMessage()) {
        <div class="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
          <svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-green-700">{{ successMessage() }}</span>
        </div>
      }

      @if (errorMessage()) {
        <div class="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          <span class="text-red-700">{{ errorMessage() }}</span>
        </div>
      }

      <!-- Modal de Visualização de Dados -->
      @if (showPreviewModal && previewData$ && previewData$.length > 0) {
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div class="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
            <!-- Header do Modal -->
            <div class="p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
              <div>
                <h3 class="font-semibold text-slate-800 flex items-center gap-2">
                  Visualização dos Dados
                </h3>
                @if (pagination) {
                  <p class="text-sm text-slate-500 mt-1">
                    {{ pagination.total }} registros | Página {{ pagination.page + 1 }} de {{ pagination.totalPages }}
                  </p>
                }
              </div>
              <button
                (click)="closePreview()"
                class="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            <!-- Lista de Cards (scroll interno) -->
            <div class="flex-1 overflow-y-auto p-4">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                @for (item of previewData$; track item.number) {
                  <div 
                    class="p-3 border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
                    (click)="openItemDetailModal(item)"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2">
                          <span class="text-xs font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">#{{ item.number }}</span>
                          <span 
                            class="px-2 py-0.5 text-xs font-medium rounded-full"
                            [class.bg-green-100]="item.status === 'Concluída'"
                            [class.text-green-700]="item.status === 'Concluída'"
                            [class.bg-yellow-100]="item.status === 'Em Andamento'"
                            [class.text-yellow-700]="item.status === 'Em Andamento'"
                            [class.bg-blue-100]="item.status === 'Aberta'"
                            [class.text-blue-700]="item.status === 'Aberta'"
                            [class.bg-red-100]="item.status === 'Cancelada'"
                            [class.text-red-700]="item.status === 'Cancelada'"
                            [class.bg-slate-100]="!['Concluída', 'Em Andamento', 'Aberta', 'Cancelada'].includes(item.status)"
                            [class.text-slate-700]="!['Concluída', 'Em Andamento', 'Aberta', 'Cancelada'].includes(item.status)"
                          >
                            {{ item.status }}
                          </span>
                        </div>
                        <p class="font-medium text-slate-800 mt-1 text-sm line-clamp-2">{{ item.title }}</p>
                        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-slate-500">
                          @if (item.responsibleName) {
                            <span>{{ item.responsibleName }}</span>
                          }
                          @if (item.deadline) {
                            <span>{{ item.deadline }}</span>
                          }
                          @if (item.tagName) {
                            <span class="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">{{ item.tagName }}</span>
                          }
                        </div>
                      </div>
                      <span class="text-slate-300">›</span>
                    </div>
                  </div>
                }
              </div>
            </div>

            <!-- Paginação -->
            @if (pagination && pagination.totalPages > 1) {
              <div class="p-4 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
                <div class="text-sm text-slate-600">
                  {{ (pagination.page * pagination.size) + 1 }}-{{ Math.min((pagination.page + 1) * pagination.size, pagination.total) }} de {{ pagination.total }}
                </div>
                <div class="flex gap-2">
                  <button
                    (click)="changePage(pagination.page - 1)"
                    [disabled]="pagination.page === 0 || isLoading()"
                    class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    ← Anterior
                  </button>
                  <span class="px-3 py-1.5 text-sm text-slate-600">
                    {{ pagination.page + 1 }} / {{ pagination.totalPages }}
                  </span>
                  <button
                    (click)="changePage(pagination.page + 1)"
                    [disabled]="pagination.page >= pagination.totalPages - 1 || isLoading()"
                    class="px-3 py-1.5 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
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
        <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div class="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div class="p-4 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white">
              <h3 class="font-semibold text-slate-800">Detalhes da Ocorrência</h3>
              <button
                (click)="closeItemDetailModal()"
                class="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <svg class="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div class="p-4 space-y-3">
              <div class="flex items-center gap-2">
                <span class="font-mono bg-slate-100 px-2 py-1 rounded text-sm">#{{ selectedItem.number }}</span>
                <span 
                  class="px-2 py-1 text-xs font-medium rounded-full"
                  [class.bg-green-100]="selectedItem.status === 'Concluída'"
                  [class.text-green-700]="selectedItem.status === 'Concluída'"
                  [class.bg-yellow-100]="selectedItem.status === 'Em Andamento'"
                  [class.text-yellow-700]="selectedItem.status === 'Em Andamento'"
                  [class.bg-blue-100]="selectedItem.status === 'Aberta'"
                  [class.text-blue-700]="selectedItem.status === 'Aberta'"
                  [class.bg-red-100]="selectedItem.status === 'Cancelada'"
                  [class.text-red-700]="selectedItem.status === 'Cancelada'"
                >
                  {{ selectedItem.status }}
                </span>
              </div>
              
              <h4 class="font-semibold text-slate-800">{{ selectedItem.title }}</h4>
              
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div class="p-2 bg-slate-50 rounded">
                  <p class="text-xs text-slate-500">Responsável</p>
                  <p class="font-medium text-slate-700">{{ selectedItem.responsibleName || '-' }}</p>
                </div>
                <div class="p-2 bg-slate-50 rounded">
                  <p class="text-xs text-slate-500">Prazo</p>
                  <p class="font-medium text-slate-700">{{ selectedItem.deadline || '-' }}</p>
                </div>
                <div class="p-2 bg-slate-50 rounded">
                  <p class="text-xs text-slate-500">Criado em</p>
                  <p class="font-medium text-slate-700">{{ selectedItem.createdDate || '-' }}</p>
                </div>
                <div class="p-2 bg-slate-50 rounded">
                  <p class="text-xs text-slate-500">Tipo</p>
                  <p class="font-medium text-slate-700">{{ selectedItem.occurrenceTypeName || '-' }}</p>
                </div>
                <div class="p-2 bg-slate-50 rounded">
                  <p class="text-xs text-slate-500">Tag</p>
                  <p class="font-medium text-slate-700">
                    @if (selectedItem.tagName) {
                      <span class="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{{ selectedItem.tagName }}</span>
                    } @else {
                      -
                    }
                  </p>
                </div>
                <div class="p-2 bg-slate-50 rounded">
                  <p class="text-xs text-slate-500">Contato</p>
                  <p class="font-medium text-slate-700">{{ selectedItem.contactName || '-' }}</p>
                </div>
                <div class="p-2 bg-slate-50 rounded col-span-2">
                  <p class="text-xs text-slate-500">Pedido</p>
                  <p class="font-medium text-slate-700">{{ selectedItem.salesOrderCode || '-' }}</p>
                </div>
              </div>
            </div>
            <div class="p-4 border-t border-slate-200">
              <button
                (click)="closeItemDetailModal()"
                class="w-full px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
              >
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
