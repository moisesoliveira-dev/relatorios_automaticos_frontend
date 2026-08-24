import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { User } from '../../../core/models/user.model';
import { CreateUserPayload, InviteResponse, UserInvite } from '../models/users.models';

/** Camada de dados: HTTP puro para usuários. */
@Injectable()
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/users`;

  list(): Observable<User[]> {
    return this.http.get<User[]>(this.baseUrl);
  }

  create(payload: CreateUserPayload): Observable<User> {
    return this.http.post<User>(this.baseUrl, payload);
  }

  update(id: string, payload: Record<string, unknown>): Observable<User> {
    return this.http.patch<User>(`${this.baseUrl}/${id}`, payload);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  listPendingInvites(): Observable<UserInvite[]> {
    return this.http.get<UserInvite[]>(`${this.baseUrl}/invites/pending`);
  }

  sendInvite(email: string, tabs: string[]): Observable<InviteResponse> {
    return this.http.post<InviteResponse>(`${this.baseUrl}/invite`, { email, tabs });
  }

  cancelInvite(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/invites/${id}`);
  }

  listPendingRegistrations(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/registrations/pending`);
  }

  approveRegistration(id: string, tabs: string[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/registrations/${id}/approve`, { tabs });
  }

  rejectRegistration(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/registrations/${id}`);
  }
}
