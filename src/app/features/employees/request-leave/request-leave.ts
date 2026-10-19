import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Observable, forkJoin, of, switchMap } from 'rxjs';

import { CurrentEmployeeService } from '../../../core/services/current-employee.service';
import { LanguageService } from '../../../core/services/language.service';
import { LeaveBalanceService } from '../../../core/services/leave-balance.service';
import { LeaveRequestService } from '../../../core/services/leave-request.service';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

import { Employee } from '../../../core/models/employee.model';
import { LeaveBalance } from '../../../core/models/leave-balance.model';
import { LeaveRequest } from '../../../core/models/leave-request.model';
import { NotificationInt } from '../../../core/models/notification.model';

interface FormData {
  employee: Employee | null;
  balances: LeaveBalance[];
  requests: LeaveRequest[];
}

@Component({
  selector: 'app-request-leave',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './request-leave.html',
  styleUrl: './request-leave.scss'
})
export class RequestLeave implements OnInit {
  private readonly currentEmployeeService = inject(CurrentEmployeeService);
  private readonly balanceService = inject(LeaveBalanceService);
  private readonly leaveService = inject(LeaveRequestService);
  private readonly notificationService = inject(NotificationService);
  private readonly languageService = inject(LanguageService);
  private readonly router = inject(Router);

  employee: Employee | null = null;
  balance: LeaveBalance | null = null;
  myRequests: LeaveRequest[] = [];

  form = {
    type: 'Annual Leave' as LeaveRequest['type'],
    startDate: '',
    endDate: '',
    reason: ''
  };

  isLoading = true;
  isSaving = false;
  hasError = false;

  errorMessage = '';
  successMessage = '';

  readonly minDate = this.getLocalDate();

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;

    this.currentEmployeeService
      .getCurrentEmployee()
      .pipe(
        switchMap((employee): Observable<FormData> => {
          if (!employee?.id) {
            return of({ employee: null, balances: [], requests: [] });
          }

          return forkJoin({
            employee: of(employee),
            balances: this.balanceService.getBalances(),
            requests: this.leaveService.getRequests()
          });
        })
      )
      .subscribe({
        next: data => {
          const id = String(data.employee?.id ?? '');

          this.employee = data.employee;
          this.balance =
            data.balances.find(item => String(item.employeeId) === id) ?? null;
          this.myRequests = data.requests.filter(
            item => String(item.employeeId) === id
          );

          this.isLoading = false;
        },
        error: error => {
          console.error('Failed to load leave form:', error);
          this.hasError = true;
          this.isLoading = false;
        }
      });
  }

  private t(key: string): string {
    return this.languageService.translate(key);
  }

  private parseDate(date: string): number {
    const [year, month, day] = date.split('-').map(Number);

    return Date.UTC(year, month - 1, day);
  }

  private getLocalDate(): string {
    const now = new Date();

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  getLeaveTypeLabel(type: string): string {
    const key = `LEAVE_TYPE.${type
      .trim()
      .toUpperCase()
      .replace(/\s*LEAVE\s*$/, '')
      .replace(/\s+/g, '_')}`;

    const translated = this.t(key);

    return translated === key ? type : translated;
  }

  get availableDays(): number | null {
    if (!this.balance) {
      return null;
    }

    switch (this.form.type) {
      case 'Annual Leave':
        return this.balance.annual;
      case 'Sick Leave':
        return this.balance.sick;
      case 'Personal Leave':
        return this.balance.personal;
      default:
        return null;
    }
  }

  get hasValidDates(): boolean {
    return (
      !!this.form.startDate &&
      !!this.form.endDate &&
      this.parseDate(this.form.endDate) >= this.parseDate(this.form.startDate)
    );
  }

  get requestedDays(): number {
    if (!this.hasValidDates) {
      return 0;
    }

    return (
      Math.floor(
        (this.parseDate(this.form.endDate) -
          this.parseDate(this.form.startDate)) /
          86400000
      ) + 1
    );
  }

  get hasSufficientBalance(): boolean {
    return (
      this.availableDays !== null &&
      this.requestedDays > 0 &&
      this.requestedDays <= this.availableDays
    );
  }

  get hasOverlap(): boolean {
    if (!this.hasValidDates) {
      return false;
    }

    return this.myRequests.some(
      request =>
        (request.status === 'pending' || request.status === 'approved') &&
        request.startDate <= this.form.endDate &&
        request.endDate >= this.form.startDate
    );
  }

  get canSubmit(): boolean {
    const reason = this.form.reason.trim();

    return (
      !this.isLoading &&
      !this.isSaving &&
      !!this.employee &&
      !!this.balance &&
      this.hasValidDates &&
      this.hasSufficientBalance &&
      reason.length >= 5 &&
      reason.length <= 500
    );
  }

  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  submit(): void {
    this.clearMessages();

    if (!this.employee?.id) {
      return;
    }

    if (!this.balance) {
      this.errorMessage = this.t('EMP_REQUEST_FORM.ERR_NO_BALANCE');
      return;
    }

    if (!this.hasValidDates) {
      this.errorMessage = this.t('EMP_REQUEST_FORM.ERR_DATES');
      return;
    }

    if (!this.hasSufficientBalance) {
      this.errorMessage = this.t('EMP_REQUEST_FORM.ERR_BALANCE');
      return;
    }

    if (this.hasOverlap) {
      this.errorMessage = this.t('EMP_REQUEST_FORM.ERR_OVERLAP');
      return;
    }

    const reason = this.form.reason.trim();

    if (reason.length < 5 || reason.length > 500) {
      this.errorMessage = this.t('EMP_REQUEST_FORM.ERR_REASON');
      return;
    }

    const request: LeaveRequest = {
      employeeId: String(this.employee.id),
      employeeName: `${this.employee.firstName} ${this.employee.lastName}`,
      type: this.form.type,
      startDate: this.form.startDate,
      endDate: this.form.endDate,
      days: this.requestedDays,
      reason,
      status: 'pending',
      submittedAt: this.getLocalDate()
    };

    this.isSaving = true;

    this.leaveService.addRequest(request).subscribe({
      next: created => {
        this.successMessage = this.t('EMP_REQUEST_FORM.SUCCESS');

                const notification: NotificationInt = {
          title: 'New Leave Request',
          message:
            `${created.employeeName} submitted a ` +
            `${created.type.toLowerCase()} request for ${created.days} day(s).`,
          type: 'leave-request',
          relatedId: created.id,
          audience: 'admin',
          params: {
            employeeName: created.employeeName,
            leaveType: created.type,
            days: created.days
          },
          isRead: false,
          createdAt: new Date().toISOString()
        };

        this.notificationService.addNotification(notification).subscribe({
          next: () => this.finish(),
          error: error => {
            console.error('Failed to create notification:', error);
            this.finish();
          }
        });
      },
      error: error => {
        console.error('Failed to submit leave request:', error);
        this.errorMessage = this.t('EMP_REQUEST_FORM.ERR_SUBMIT');
        this.isSaving = false;
      }
    });
  }

  private finish(): void {
    this.isSaving = false;

    setTimeout(() => {
      this.router.navigate(['/employee/leave-requests']);
    }, 800);
  }
}