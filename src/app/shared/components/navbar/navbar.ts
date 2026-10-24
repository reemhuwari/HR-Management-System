
import { CommonModule } from '@angular/common';
import {
  Component,
  DestroyRef,
  EventEmitter,
  inject,
  OnInit,
  Output
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NavigationEnd, Router } from '@angular/router';
import { filter, forkJoin, map, Observable, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { AuthService } from '../../../core/services/auth.service';
import { LanguageService } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationInt } from '../../../core/models/notification.model';
import { NotificationTextPipe } from'../../../core/pipes/notification-text.pipe'
import { MenuInteractionsDirective } from '../../directives/menu-interactions.directive';
interface SearchPage {
  labelKey: string;
  path: string;
  keywords: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe,
    NotificationTextPipe,
    MenuInteractionsDirective
  ],
  templateUrl: './navbar.html',
  styleUrl: './navbar.scss'
})
export class NavbarComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly notificationService = inject(NotificationService);
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private hasLoadedNotifications = false;

  @Output() menuToggle = new EventEmitter<void>();

  currentUser = this.authService.getCurrentUser();

  notifications: NotificationInt[] = [];

  showNotifications = false;
  showSearch = false;
  showUserMenu = false;

  searchQuery = '';

  isLoadingNotifications = false;
  isUpdatingNotifications = false;
  notificationError = '';

   private readonly adminSearchPages: SearchPage[] = [
    { labelKey: 'NAV.DASHBOARD', path: '/dashboard', keywords: 'home overview statistics الرئيسية نظرة إحصائيات' },
    { labelKey: 'NAV.EMPLOYEES', path: '/employees', keywords: 'staff team people الموظفين فريق العاملين' },
    { labelKey: 'NAV.ATTENDANCE', path: '/attendance', keywords: 'check in check out history الحضور الانصراف السجل' },
    { labelKey: 'NAV.LEAVE_REQUESTS', path: '/leave-requests', keywords: 'vacation approval time off الإجازات الموافقة طلبات' },
    { labelKey: 'NAV.LEAVE_BALANCES', path: '/leave-balances', keywords: 'remaining days balance الرصيد الأيام المتبقية' },
    { labelKey: 'NAV.NOTIFICATIONS', path: '/notifications', keywords: 'alerts messages الإشعارات التنبيهات الرسائل' }
  ];

  private readonly employeeSearchPages: SearchPage[] = [
    { labelKey: 'EMP_NAV.DASHBOARD', path: '/employee/dashboard', keywords: 'home overview الرئيسية لوحتي نظرة' },
    { labelKey: 'EMP_NAV.ATTENDANCE', path: '/employee/attendance', keywords: 'check in check out history الحضور الانصراف السجل' },
    { labelKey: 'EMP_NAV.LEAVE_REQUESTS', path: '/employee/leave-requests', keywords: 'my requests طلباتي الإجازات' },
    { labelKey: 'EMP_NAV.REQUEST_LEAVE', path: '/employee/request-leave', keywords: 'new vacation time off طلب إجازة جديد' },
    { labelKey: 'EMP_NAV.LEAVE_BALANCE', path: '/employee/leave-balance', keywords: 'remaining days balance الرصيد الأيام المتبقية' },
    { labelKey: 'NAV.NOTIFICATIONS', path: '/notifications', keywords: 'alerts messages الإشعارات التنبيهات الرسائل' }
  ];

  get searchPages(): SearchPage[] {
    return this.currentUser?.role === 'employee'
      ? this.employeeSearchPages
      : this.adminSearchPages;
  }

  get currentLanguage(): 'en' | 'ar' {
    return this.languageService.currentLanguage;
  }

  ngOnInit(): void {
    this.loadNotifications();

    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.loadNotifications());
  }

  get notificationCount(): number {
    return this.notifications.filter(
      notification => !notification.isRead
    ).length;
  }

  get sortedNotifications(): NotificationInt[] {
    return [...this.notifications].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
  }

  get filteredSearchPages(): SearchPage[] {
    const query = this.searchQuery.trim().toLocaleLowerCase();

    if (!query) {
      return this.searchPages;
    }

    return this.searchPages.filter(page => {
      const translatedLabel = this.languageService
        .translate(page.labelKey)
        .toLocaleLowerCase();

      const keywords = page.keywords.toLocaleLowerCase();

      return `${translatedLabel} ${keywords}`.includes(query);
    });
  }

  toggleMenu(): void {
    this.menuToggle.emit();
  }

  toggleSearch(): void {
    this.showSearch = !this.showSearch;
    this.showUserMenu = false;
    this.showNotifications = false;

    if (!this.showSearch) {
      this.searchQuery = '';
    }
  }

  toggleUserMenu(): void {
    this.showUserMenu = !this.showUserMenu;
    this.showSearch = false;
    this.showNotifications = false;
  }

  closeNavbarMenus(): void {
    this.showSearch = false;
    this.showUserMenu = false;
    this.showNotifications = false;
    this.searchQuery = '';
  }

  closeNotifications(): void {
    this.showNotifications = false;
  }

  openSearchPage(path: string): void {
    this.closeNavbarMenus();
    this.router.navigate([path]);
  }

  openUserPage(path: string): void {
    this.showUserMenu = false;
    this.router.navigate([path]);
  }

  

  
  openNotification(notification: NotificationInt): void {
    this.showNotifications = false;
    this.markNotificationAsRead(notification);

    const route = this.getNotificationRoute(notification);

    if (route) {
      this.router.navigate([route]);
    }
  }

  private getNotificationRoute(notification: NotificationInt): string | null {
    const isEmployee = this.currentUser?.role === 'employee';

    switch (notification.type) {
      case 'account-request':
        return '/employees';
      case 'leave-request':
        return isEmployee ? null : '/leave-requests';
      case 'leave-approved':
      case 'leave-rejected':
        return isEmployee ? '/employee/leave-requests' : null;
      default:
        return null;
    }
  }
   loadNotifications(): void {
    this.isLoadingNotifications = !this.hasLoadedNotifications;
    this.notificationError = '';

    this.notificationService.getMyNotifications().subscribe({
      next: notifications => {
        this.notifications = notifications;
        this.hasLoadedNotifications = true;
        this.isLoadingNotifications = false;
      },
      error: error => {
        console.error('Failed to load notifications:', error);
        this.notificationError = 'NOTIFICATIONS.LOAD_ERROR';
        this.isLoadingNotifications = false;
      }
    });
  }

  goToNotifications(): void {
    this.showNotifications = !this.showNotifications;
    this.showSearch = false;
    this.showUserMenu = false;

    if (this.showNotifications) {
      this.loadNotifications();
    }
  }

  markNotificationAsRead(notification: NotificationInt): void {
    if (!notification.id || notification.isRead) {
      return;
    }

    const previousNotifications = this.notifications;

    this.notifications = this.notifications.map(item =>
      item.id === notification.id
        ? { ...item, isRead: true }
        : item
    );

    this.notificationService.markAsRead(notification.id).subscribe({
      next: () => {
      },
      error: error => {
        console.error('Failed to mark notification as read:', error);
        this.notifications = previousNotifications;
        this.notificationError = 'NOTIFICATIONS.UPDATE_ERROR';
      }
    });
  }

  markAllNotificationsAsRead(): void {
    const unreadNotifications = this.notifications.filter(
      notification => !notification.isRead && !!notification.id
    );

    if (
      unreadNotifications.length === 0 ||
      this.isUpdatingNotifications
    ) {
      return;
    }

    this.isUpdatingNotifications = true;
    this.notificationError = '';

    let completed = 0;
    let hasError = false;

    for (const notification of unreadNotifications) {
      this.notificationService.markAsRead(notification.id!).subscribe({
        next: () => {
          completed++;

          if (
            completed === unreadNotifications.length &&
            !hasError
          ) {
            this.isUpdatingNotifications = false;
            this.loadNotifications();
          }
        },
        error: error => {
          console.error('Failed to mark notification as read:', error);

          if (!hasError) {
            hasError = true;
            this.notificationError = 'NOTIFICATIONS.BULK_UPDATE_ERROR';
            this.isUpdatingNotifications = false;
            this.loadNotifications();
          }
        }
      });
    }
  }

  formatNotificationDate(date: string): string {
    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) {
      return '';
    }

    return parsedDate.toLocaleString(
      this.currentLanguage === 'ar' ? 'ar-JO' : 'en-US',
      {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    );
  }

  logout(): void {
    this.showUserMenu = false;
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
