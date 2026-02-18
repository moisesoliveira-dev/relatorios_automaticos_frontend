import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GosacTicket {
    id: number;
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

export interface GosacGroup {
    id: string;
    gosacTicketId: number;
    gosacTicketName: string;
    ponttaOccurrenceId: number | null;
    ponttaOccurrenceName: string | null;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
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
        gosacTicketName: string;
        ponttaOccurrenceId?: number;
        ponttaOccurrenceName?: string;
    }): Observable<GosacGroup> {
        return this.http.post<GosacGroup>(`${this.apiUrl}/groups`, data);
    }

    updateGroup(
        id: string,
        data: {
            ponttaOccurrenceId?: number;
            ponttaOccurrenceName?: string;
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
}
