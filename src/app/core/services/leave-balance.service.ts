import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { LeaveBalance } from '../models/leave-balance.model';

@Injectable({
  providedIn: 'root'
})
export class LeaveBalanceService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl =
    `${environment.apiUrl}/leaveBalances`;

  getBalances(): Observable<LeaveBalance[]> {
    return this.http.get<LeaveBalance[]>(this.apiUrl);
  }
  addBalance(balance: LeaveBalance): Observable<LeaveBalance> {
    return this.http.post<LeaveBalance>(this.apiUrl, balance);
  }
  updateBalance(
    id: string,
    balance: LeaveBalance
  ): Observable<LeaveBalance> {
    return this.http.put<LeaveBalance>(
      `${this.apiUrl}/${id}`,
      balance
    );
  }
}