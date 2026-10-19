import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { NotificationService } from '../../core/services/notification.service';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { NotificationInt } from '../../core/models/notification.model';
import { TranslatePipe } from '../../core/pipes/translate.pipe';
import { NotificationTextPipe } from '../../core/pipes/notification-text.pipe';

@Component({
  selector: 'app-notifications',
  imports: [CommonModule, RouterLink, TranslatePipe, NotificationTextPipe],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss',
})
export class Notifications implements OnInit {
  private readonly notificationService = inject(NotificationService);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);

  readonly homeRoute = this.authService.getHomeRoute();

  notifications: NotificationInt[] = [];
  activeFilter: 'all' | 'unread' = 'all';

  isLoading = false;
  isUpdating = false;
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.loadNotifications();
  }

  get unreadCount(): number {
    return this.notifications.filter(item => !item.isRead).length;
  }

  get readCount(): number {
    return this.notifications.filter(item => item.isRead).length;
  }

  get filteredNotifications(): NotificationInt[] {
    const list =
      this.activeFilter === 'unread'
        ? this.notifications.filter(item => !item.isRead)
        : this.notifications;

    return [...list].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  loadNotifications(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.notificationService.getMyNotifications().subscribe({
      next: data => {
        this.notifications = data;
        this.isLoading = false;
      },
      error: () => {
        this.errorMessage = 'NOTIFICATIONS.ERROR_LOAD';
        this.isLoading = false;
      }
    });
  }

  setFilter(filter: 'all' | 'unread'): void {
    this.activeFilter = filter;
  }

  markAsRead(notification: NotificationInt): void {
    if (!notification.id || notification.isRead) return;

    this.notificationService.markAsRead(notification.id).subscribe({
      next: updated => {
        this.notifications = this.notifications.map(item =>
          item.id === notification.id
            ? { ...item, ...updated, isRead: true }
            : item
        );

        this.successMessage = 'NOTIFICATIONS.SUCCESS_MARK_READ';
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'NOTIFICATIONS.ERROR_UPDATE';
        this.successMessage = '';
      }
    });
  }

  markAllAsRead(): void {
    if (this.unreadCount === 0 || this.isUpdating) return;

    this.isUpdating = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.notificationService.markAllAsRead(this.notifications).subscribe({
      next: () => {
        this.notifications = this.notifications.map(item => ({
          ...item,
          isRead: true
        }));

        this.successMessage = 'NOTIFICATIONS.SUCCESS_MARK_ALL_READ';
        this.isUpdating = false;
      },
      error: () => {
        this.errorMessage = 'NOTIFICATIONS.ERROR_UPDATE_ALL';
        this.isUpdating = false;
        this.loadNotifications();
      }
    });
  }

  deleteNotification(notification: NotificationInt): void {
    if (!notification.id) return;

    this.notificationService.deleteNotification(notification.id).subscribe({
      next: () => {
        this.notifications = this.notifications.filter(
          item => item.id !== notification.id
        );

        this.successMessage = 'NOTIFICATIONS.SUCCESS_DELETE';
        this.errorMessage = '';
      },
      error: () => {
        this.errorMessage = 'NOTIFICATIONS.ERROR_DELETE';
        this.successMessage = '';
      }
    });
  }

  formatDate(date: string): string {
    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    return parsed.toLocaleString(
      this.languageService.currentLanguage === 'ar'
        ? 'ar-JO-u-nu-latn'
        : 'en-US',
      {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }

  getTypeIcon(type: NotificationInt['type']): string {
    switch (type) {
      case 'leave-request':
        return '📋';
      case 'leave-approved':
        return '✓';
      case 'leave-rejected':
        return '✕';
      default:
        return '🔔';
    }
  }

  getTypeLabel(type: NotificationInt['type']): string {
    switch (type) {
      case 'leave-request':
        return 'NOTIF_TYPE.LEAVE_REQUEST';
      case 'leave-approved':
        return 'NOTIF_TYPE.LEAVE_APPROVED';
      case 'leave-rejected':
        return 'NOTIF_TYPE.LEAVE_REJECTED';
      default:
        return 'NOTIF_TYPE.GENERAL';
    }
  }

  trackById(index: number, notification: NotificationInt): string | number {
    return notification.id ?? index;
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }
  

  
}