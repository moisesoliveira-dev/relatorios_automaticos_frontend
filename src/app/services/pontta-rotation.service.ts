import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface PonttaRotation {
  id: number;
  projetistaid: string;
  turn: boolean;
  name: string;
  turn_v: boolean;
}

export interface CreatePonttaRotationPayload {
  projetistaid: string;
  name: string;
  turn?: boolean;
  turn_v?: boolean;
}

export interface UpdatePonttaRotationPayload {
  projetistaid?: string;
  name?: string;
  turn?: boolean;
  turn_v?: boolean;
}

export interface PonttaProfile {
  id: string;
  name: string;
  email?: string;
  position?: string;
  [key: string]: any;
}

@Injectable({ providedIn: 'root' })
export class PonttaRotationApiService {
  private readonly apiUrl = `${environment.apiUrl}/pontta-rotation`;

  constructor(private readonly http: HttpClient) {}

  findAll(): Observable<PonttaRotation[]> {
    return this.http.get<PonttaRotation[]>(this.apiUrl);
  }

  create(payload: CreatePonttaRotationPayload): Observable<PonttaRotation> {
    return this.http.post<PonttaRotation>(this.apiUrl, payload);
  }

  update(id: number, payload: UpdatePonttaRotationPayload): Observable<PonttaRotation> {
    return this.http.put<PonttaRotation>(`${this.apiUrl}/${id}`, payload);
  }

  remove(id: number): Observable<{ success: boolean }> {
    return this.http.delete<{ success: boolean }>(`${this.apiUrl}/${id}`);
  }

  searchPonttaProfiles(query: string): Observable<PonttaProfile[]> {
    const params = new HttpParams().set('query', query);
    return this.http.get<PonttaProfile[]>(`${this.apiUrl}/lookup/pontta-profiles`, { params });
  }
}
