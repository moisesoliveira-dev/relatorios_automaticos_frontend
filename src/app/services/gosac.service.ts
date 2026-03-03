import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GosacTicket {
    id: number;
    contactId: number;
    contact?: {
        id: number;
        name: string;
        number: string;
        profilePicUrl?: string;
    };
    lastMessage?: string;
    status: string;
    isGroup: boolean;
    unreadMessages: number;
    queue?: {
        id: number;
        name: string;
        color: string;
    };
    [key: string]: any;
}

export interface SalesOrder {
    id: string;
    ponttaId: string;
    code: string;
    customerName: string;
    ponttaOccurrenceId?: string | null;
    ponttaOccurrenceNumber?: number | null;
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
}

@Injectable({
    providedIn: 'root',
})
export class GosacService {
    private readonly apiUrl = `${environment.apiUrl}/gosac`;

    constructor(private http: HttpClient) { }

    searchTickets(query: string): Observable<{ tickets: GosacTicket[] }> {
        return this.http.get<{ tickets: GosacTicket[] }>(`${this.apiUrl}/tickets/search`, {
            params: { q: query },
        });
    }

    findAllGroups(): Observable<GosacGroup[]> {
        return this.http.get<GosacGroup[]>(`${this.apiUrl}/groups`);
    }

    createGroup(data: {
        gosacTicketId: number;
        gosacContactId: number;
        gosacTicketName: string;
    }): Observable<GosacGroup> {
        return this.http.post<GosacGroup>(`${this.apiUrl}/groups`, data);
    }

    updateGroup(
        id: string,
        data: {
            isActive?: boolean;
        },
    ): Observable<GosacGroup> {
        return this.http.patch<GosacGroup>(`${this.apiUrl}/groups/${id}`, data);
    }

    toggleGroup(id: string): Observable<GosacGroup> {
        return this.http.patch<GosacGroup>(`${this.apiUrl}/groups/${id}/toggle`, {});
    }

    deleteGroup(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/groups/${id}`);
    }

    // Sales Orders
    searchSalesOrders(query: string): Observable<SalesOrderSearchResult[]> {
        return this.http.get<SalesOrderSearchResult[]>(`${this.apiUrl}/sales-orders/search`, {
            params: { q: query },
        });
    }

    linkSalesOrder(groupId: string, data: { ponttaId: string; code: string; customerName: string }): Observable<any> {
        return this.http.post(`${this.apiUrl}/groups/${groupId}/sales-orders`, data);
    }

    unlinkSalesOrder(groupId: string, salesOrderId: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/groups/${groupId}/sales-orders/${salesOrderId}`);
    }
}
