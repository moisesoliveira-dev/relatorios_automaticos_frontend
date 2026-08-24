import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../../environments/environment';
import { PcpScheduleResponse } from '../models/pcp.models';

/** Camada de dados: apenas HTTP — sem estado de UI. */
@Injectable()
export class PcpApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/gosac/pcp/schedule`;

  getSchedule(query?: string, light = false): Observable<PcpScheduleResponse> {
    const params: Record<string, string> = {};
    if (query?.trim()) params['q'] = query.trim();
    if (light) params['light'] = '1';
    return this.http.get<PcpScheduleResponse>(this.apiUrl, { params });
  }
}
