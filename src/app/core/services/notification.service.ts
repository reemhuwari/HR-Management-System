import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, map, of } from 'rxjs';

import { environment } from '../../../environments/environment';
import { NotificationInt } from '../models/notification.model';
import { AuthService } from './auth.service';
import { CurrentEmployeeService } from './current-employee.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly currentEmployeeService = inject(CurrentEmployeeService);

  private readonly apiUrl = `${environment.apiUrl}/notifications`;

  getNotifications(): Observable<NotificationInt[]> {
    return this.http.get<NotificationInt[]>(this.apiUrl);
  }

  getMyNotifications(): Observable<NotificationInt[]> {
    const user = this.authService.getCurrentUser();

    if (!user) {
      return of([]);
    }

    if (user.role !== 'employee') {
      return this.getNotifications().pipe(
        map(list => list.filter(item => item.audience !== 'employee'))
      );
    }

    return forkJoin({
      list: this.getNotifications(),
      employee: this.currentEmployeeService.getCurrentEmployee()
    }).pipe(
      map(({ list, employee }) =>
        employee?.id
          ? list.filter(
              item =>
                item.audience === 'employee' &&
                String(item.recipientEmployeeId) === String(employee.id)
            )
          : []
      )
    );
  }

  addNotification(
    notification: NotificationInt
  ): Observable<NotificationInt> {
    return this.http.post<NotificationInt>(this.apiUrl, notification);
  }

  markAsRead(id: string): Observable<NotificationInt> {
    return this.http.patch<NotificationInt>(
      `${this.apiUrl}/${id}`,
      { isRead: true }
    );
  }

  markAllAsRead(
    notifications: NotificationInt[]
  ): Observable<NotificationInt[]> {
    const unread = notifications.filter(
      notification => !notification.isRead && !!notification.id
    );

    if (unread.length === 0) {
      return of([]);
    }

    return forkJoin(
      unread.map(notification => this.markAsRead(notification.id!))
    );
  }

  deleteNotification(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}