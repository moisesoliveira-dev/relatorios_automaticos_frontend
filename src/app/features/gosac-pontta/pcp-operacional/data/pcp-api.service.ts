import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PcpAreaConfig, PcpScheduleResponse } from '../models/pcp.models';

/** Camada de dados: apenas HTTP — sem estado de UI. */
@Injectable()
export class PcpApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/gosac/pcp`;

  getSchedule(query?: string, light = false): Observable<PcpScheduleResponse> {
    const params: Record<string, string> = {};
    if (query?.trim()) params['q'] = query.trim();
    if (light) params['light'] = '1';
    return this.http.get<PcpScheduleResponse>(`${this.baseUrl}/schedule`, { params });
  }

  getConfig(): Observable<PcpAreaConfig> {
    return this.http.get<PcpAreaConfig>(`${this.baseUrl}/config`);
  }

  updateConfig(config: PcpAreaConfig): Observable<PcpAreaConfig> {
    return this.http.put<PcpAreaConfig>(`${this.baseUrl}/config`, config);
  }
}
