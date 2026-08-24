import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpResponse } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface GosacTicket {
  id: number;
  contactId: number;
  contact?: { id: number; name: string; number: string; profilePicUrl?: string };
  lastMessage?: string;
  status: string;
  isGroup: boolean;
  unreadMessages: number;
  queue?: { id: number; name: string; color: string };
  [key: string]: unknown;
}

export interface SalesOrder {
  id: string;
  ponttaId: string;
  code: string;
  customerName: string;
  ponttaOccurrenceId?: string | null;
  ponttaOccurrenceNumber?: number | null;
  ponttaOccurrenceStatus?: 'pending' | 'created' | 'failed' | null;
}

export interface GosacGroup {
  id: string;
  gosacTicketId: number;
  gosacContactId: number;
  gosacTicketName: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  salesOrders: SalesOrder[];
}

export interface SalesOrderSearchResult {
  ponttaId: string;
  code: string;
  customerName: string;
  value?: number;
  saleDate?: string;
  deliveryDate?: string | null;
  status?: string;
}

export interface PonttaProposal {
  id: string;
  number: number;
  code: string;
  createdAt: string;
  lastUpdateVersion: string;
  saleExpectation: string;
  name: string;
  customerId: string;
  customerName: string;
  customerBusinessName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  businessUnitId: string;
  responsibleId: string;
  responsibleName: string;
  value: number;
  negotiationStatus: string;
  tags: unknown[];
  probability: number;
  deliveryDate: string;
  validate: string;
  responsible: { id: string; name: string };
  converted: boolean;
  actived: boolean;
  declined: boolean;
}

/** Camada de dados HTTP para integração GOSAC/Pontta. */
@Injectable({ providedIn: 'root' })
export class GosacApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/gosac`;

  searchTickets(query: string): Observable<{ tickets: GosacTicket[] }> {
    return this.http.get<{ tickets: GosacTicket[] }>(`${this.apiUrl}/tickets/search`, { params: { q: query } });
  }

  findAllGroups(): Observable<GosacGroup[]> {
    return this.http.get<GosacGroup[]>(`${this.apiUrl}/groups`);
  }

  createGroup(data: { gosacTicketId: number; gosacContactId: number; gosacTicketName: string }): Observable<GosacGroup> {
    return this.http.post<GosacGroup>(`${this.apiUrl}/groups`, data);
  }

  updateGroup(id: string, data: { isActive?: boolean }): Observable<GosacGroup> {
    return this.http.patch<GosacGroup>(`${this.apiUrl}/groups/${id}`, data);
  }

  toggleGroup(id: string): Observable<GosacGroup> {
    return this.http.patch<GosacGroup>(`${this.apiUrl}/groups/${id}/toggle`, {});
  }

  deleteGroup(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/groups/${id}`);
  }

  searchSalesOrders(query?: string): Observable<SalesOrderSearchResult[]> {
    const params: Record<string, string> = {};
    if (query?.trim()) params['q'] = query.trim();
    return this.http.get<SalesOrderSearchResult[]>(`${this.apiUrl}/sales-orders/search`, { params });
  }

  linkSalesOrder(groupId: string, data: { ponttaId: string; code: string; customerName: string; occurrenceTitle?: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/groups/${groupId}/sales-orders`, data);
  }

  unlinkSalesOrder(groupId: string, salesOrderId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/groups/${groupId}/sales-orders/${salesOrderId}`);
  }

  getProposals(query?: string): Observable<PonttaProposal[]> {
    const params: Record<string, string> = {};
    if (query?.trim()) params['q'] = query.trim();
    return this.http.get<PonttaProposal[]>(`${this.apiUrl}/proposals`, { params });
  }

  uploadLogo(formData: FormData): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/logo`, formData);
  }

  getSalesOrderItems(salesOrderId: string): Observable<unknown[]> {
    return this.http.get<unknown[]>(`${this.apiUrl}/sales-orders/${salesOrderId}/items`);
  }

  generateMontadorPdf(data: Record<string, unknown>): Observable<HttpResponse<Blob>> {
    return this.http.post(`${this.apiUrl}/sales-orders/montador-pdf`, data, {
      responseType: 'blob',
      observe: 'response',
    });
  }
}
