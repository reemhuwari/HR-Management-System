import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin, of, switchMap } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { CurrentEmployeeService } from '../../../core/services/current-employee.service';
import { LanguageService } from '../../../core/services/language.service';
import { LeaveBalanceService } from '../../../core/services/leave-balance.service';
import { LeaveRequestService } from '../../../core/services/leave-request.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

import { Attendance } from '../../../core/models/attendance.model';
import { Employee } from '../../../core/models/employee.model';
import { LeaveBalance } from '../../../core/models/leave-balance.model';
import { LeaveRequest } from '../../../core/models/leave-request.model';

interface DashboardData {
  employee: Employee | null;
  attendance: Attendance[];
  balances: LeaveBalance[];
  requests: LeaveRequest[];
}

interface BalanceItem {
  key: 'annual' | 'sick' | 'personal';
  labelKey: string;
  value: number;
  percent: number;
}

@Component({
  selector: 'app-employee-dashboard',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  templateUrl: './employee-dashboard.html',
  styleUrl: './employee-dashboard.scss'
})
export class EmployeeDashboard implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly currentEmployeeService = inject(CurrentEmployeeService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly balanceService = inject(LeaveBalanceService);
  private readonly leaveService = inject(LeaveRequestService);
  private readonly languageService = inject(LanguageService);

  currentUser = this.authService.getCurrentUser();

  employee: Employee | null = null;
  attendance: Attendance[] = [];
  balance: LeaveBalance | null = null;
  requests: LeaveRequest[] = [];

  isLoading = true;
  hasError = false;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;

    this.currentEmployeeService
      .getCurrentEmployee()
      .pipe(
        switchMap((employee): Observable<DashboardData> => {
          if (!employee?.id) {
            return of({
              employee: null,
              attendance: [],
              balances: [],
              requests: []
            });
          }

          return forkJoin({
            employee: of(employee),
            attendance: this.attendanceService.getAttendanceByEmployee(employee.id),
            balances: this.balanceService.getBalances(),
            requests: this.leaveService.getRequests()
          });
        })
      )
      .subscribe({
        next: data => {
          const employeeId = String(data.employee?.id ?? '');

          this.employee = data.employee;
          this.attendance = data.attendance;

          this.balance =
            data.balances.find(
              item => String(item.employeeId) === employeeId
            ) ?? null;

          this.requests = data.requests.filter(
            item => String(item.employeeId) === employeeId
          );

          this.isLoading = false;
        },
        error: error => {
          console.error('Employee dashboard error:', error);
          this.hasError = true;
          this.isLoading = false;
        }
      });
  }

  private t(key: string): string {
    return this.languageService.translate(key);
  }

  private get locale(): string {
    return this.languageService.currentLanguage === 'ar'
      ? 'ar-JO-u-nu-latn'
      : 'en-US';
  }

  get today(): string {
    const date = new Date();

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  get todayRecord(): Attendance | undefined {
    return this.attendance.find(record => record.date === this.today);
  }

  private get isOnApprovedLeaveToday(): boolean {
    return this.requests.some(
      request =>
        request.status === 'approved' &&
        request.startDate <= this.today &&
        request.endDate >= this.today
    );
  }

  get todayStatus(): Attendance['status'] | null {
    if (this.todayRecord) {
      return this.todayRecord.status;
    }

    return this.isOnApprovedLeaveToday ? 'on-leave' : null;
  }

  get todayStatusLabel(): string {
    const status = this.todayStatus;

    return status
      ? this.getAttendanceStatusLabel(status)
      : this.t('EMP_DASHBOARD.NOT_CHECKED_IN');
  }

  get todayStatusDetail(): string {
    const checkIn = this.todayRecord?.checkIn;

    return checkIn
      ? `${this.t('EMP_DASHBOARD.CHECKED_IN_AT')} ${checkIn}`
      : '';
  }

  get todayIconClass(): string {
    switch (this.todayStatus) {
      case 'present':
        return 'present';
      case 'late':
        return 'late';
      case 'on-leave':
        return 'leave';
      case 'absent':
        return 'absent';
      default:
        return '';
    }
  }

  get totalRemaining(): number {
    return Number(this.balance?.total ?? 0);
  }

  get pendingCount(): number {
    return this.requests.filter(request => request.status === 'pending').length;
  }

  get attendedThisMonth(): number {
    const month = this.today.slice(0, 7);

    return this.attendance.filter(
      record =>
        record.date.startsWith(month) &&
        (record.status === 'present' || record.status === 'late')
    ).length;
  }

  get balanceItems(): BalanceItem[] {
    if (!this.balance) {
      return [];
    }

    const values = {
      annual: Number(this.balance.annual || 0),
      sick: Number(this.balance.sick || 0),
      personal: Number(this.balance.personal || 0)
    };

    const max = Math.max(values.annual, values.sick, values.personal, 1);

    return [
      { key: 'annual', labelKey: 'LEAVE_TYPE.ANNUAL', value: values.annual, percent: (values.annual / max) * 100 },
      { key: 'sick', labelKey: 'LEAVE_TYPE.SICK', value: values.sick, percent: (values.sick / max) * 100 },
      { key: 'personal', labelKey: 'LEAVE_TYPE.PERSONAL', value: values.personal, percent: (values.personal / max) * 100 }
    ];
  }

  get recentAttendance(): Attendance[] {
    return [...this.attendance]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }

  get recentRequests(): LeaveRequest[] {
    return [...this.requests]
      .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''))
      .slice(0, 5);
  }

  formatDate(date: string | null | undefined): string {
    if (!date) {
      return '—';
    }

    const parsed = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleDateString(this.locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatHours(hours: number): string {
    return `${Number(hours || 0).toFixed(2)} ${this.t('LABELS.HRS')}`;
  }

  getGreeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
      return this.t('GREETING.MORNING');
    }

    return hour < 18
      ? this.t('GREETING.AFTERNOON')
      : this.t('GREETING.EVENING');
  }

  getAttendanceStatusLabel(status: Attendance['status']): string {
    switch (status) {
      case 'present':
        return this.t('STATUS.PRESENT');
      case 'late':
        return this.t('STATUS.LATE');
      case 'absent':
        return this.t('STATUS.ABSENT');
      case 'on-leave':
        return this.t('STATUS.ON_LEAVE');
      default:
        return status;
    }
  }

  getLeaveStatusLabel(status: LeaveRequest['status']): string {
    switch (status) {
      case 'pending':
        return this.t('STATUS.PENDING');
      case 'approved':
        return this.t('STATUS.APPROVED');
      case 'rejected':
        return this.t('STATUS.REJECTED');
      default:
        return status;
    }
  }

  getLeaveTypeLabel(type: string): string {
    if (!type) {
      return '—';
    }

    const key = `LEAVE_TYPE.${type
      .trim()
      .toUpperCase()
      .replace(/\s*LEAVE\s*$/, '')
      .replace(/\s+/g, '_')}`;

    const translated = this.t(key);

    return translated === key ? type : translated;
  }
}