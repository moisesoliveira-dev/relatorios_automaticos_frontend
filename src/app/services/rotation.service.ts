import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Rotation {
  id: string;
  name: string;
  turn: boolean;
  identificacao: number;
  queueid: number;
}

export interface CreateRotationPayload {
  id: string;
  name: string;
  identificacao: number;
  queueid: number;
}

export interface UpdateRotationPayload {
  name?: string;
  identificacao?: number;
  queueid?: number;
}

export interface PonttaProfile {
  id: string;
  name: string;
  email?: string;
  position?: string;
  [key: string]: any;
}

export interface GosacUser {
  id: number;
  name: string;
  email?: string;
  username?: string;
  active?: boolean;
  defaultQueueId?: number;
  queues?: Array<{ id: number; name: string; color?: string }>;
  [key: string]: any;
}

export interface GosacQueue {
  id: number;
  name: string;
  color?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class RotationService {
  private readonly apiUrl = `${environment.apiUrl}/rotation`;

  constructor(private readonly http: HttpClient) {}

  findAll(): Observable<Rotation[]> {
    return this.http.get<Rotation[]>(this.apiUrl);
  }

  create(payload: CreateRotationPayload): Observable<Rotation> {
    return this.http.post<Rotation>(this.apiUrl, payload);
  }

  update(id: string, payload: UpdateRotationPayload): Observable<Rotation> {
    return this.http.put<Rotation>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: string): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }

  searchPonttaProfiles(query: string): Observable<PonttaProfile[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<PonttaProfile[]>(`${this.apiUrl}/lookup/pontta-profiles`, { params });
  }

  listGosacUsers(): Observable<GosacUser[]> {
    return this.http.get<GosacUser[]>(`${this.apiUrl}/lookup/gosac-users`);
  }

  listGosacQueues(): Observable<GosacQueue[]> {
    return this.http.get<GosacQueue[]>(`${this.apiUrl}/lookup/gosac-queues`);
  }
}
