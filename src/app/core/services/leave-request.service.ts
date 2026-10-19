import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LeaveRequest } from '../models/leave-request.model';


@Injectable({
  providedIn: 'root'
})
export class LeaveRequestService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/leaveRequests`;

  getRequests(): Observable<LeaveRequest[]> {
    return this.http.get<LeaveRequest[]>(this.apiUrl);
  }

  addRequest(request: LeaveRequest): Observable<LeaveRequest> {
    return this.http.post<LeaveRequest>(
      this.apiUrl,
      request
    );
  }

  updateRequest(
    id: string,
    request: LeaveRequest
  ): Observable<LeaveRequest> {
    return this.http.put<LeaveRequest>(
      `${this.apiUrl}/${id}`,
      request
    );
  }

  deleteRequest(id: string): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }
}