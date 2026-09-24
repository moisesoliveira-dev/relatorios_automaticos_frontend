import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export type PonttaPcpArea = 'molhada' | 'intima' | 'social';

export interface PonttaRotation {
  id: number;
  projetistaid: string;
  turn: boolean;
  name: string;
  turn_v: boolean;
  pcpArea?: PonttaPcpArea | null;
}

export interface CreatePonttaRotationPayload {
  projetistaid: string;
  name: string;
  turn?: boolean;
  turn_v?: boolean;
  pcpArea?: PonttaPcpArea | null;
}

export interface UpdatePonttaRotationPayload {
  projetistaid?: string;
  name?: string;
  turn?: boolean;
  turn_v?: boolean;
  pcpArea?: PonttaPcpArea | null;
}

export interface PonttaProfile {
  id: string;
  cooperatorId?: string;
  userId?: string;
  name: string;
  email?: string;
  position?: string;
  activated?: boolean;
  blocked?: boolean;
  [key: string]: any;
}

export interface AssignByPcpAreaSetting {
  enabled: boolean;
}

export const PCP_AREA_OPTIONS: Array<{ key: PonttaPcpArea; label: string; color: string }> = [
  { key: 'molhada', label: 'Áreas Molhadas', color: '#22c55e' },
  { key: 'intima', label: 'Áreas Íntimas', color: '#eab308' },
  { key: 'social', label: 'Áreas Sociais', color: '#3b82f6' },
];

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

  getAssignByPcpArea(): Observable<AssignByPcpAreaSetting> {
    return this.http.get<AssignByPcpAreaSetting>(`${this.apiUrl}/settings/assign-by-pcp-area`);
  }

  setAssignByPcpArea(enabled: boolean): Observable<AssignByPcpAreaSetting> {
    return this.http.put<AssignByPcpAreaSetting>(`${this.apiUrl}/settings/assign-by-pcp-area`, { enabled });
  }
}
