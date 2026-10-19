import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, forkJoin, of, switchMap } from 'rxjs';

import { AttendanceService } from '../../../core/services/attendance.service';
import { CurrentEmployeeService } from '../../../core/services/current-employee.service';
import { LanguageService } from '../../../core/services/language.service';
import { LeaveRequestService } from '../../../core/services/leave-request.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

import { Attendance } from '../../../core/models/attendance.model';
import { Employee } from '../../../core/models/employee.model';
import { LeaveRequest } from '../../../core/models/leave-request.model';

interface AttendanceData {
  employee: Employee | null;
  records: Attendance[];
  requests: LeaveRequest[];
}

type TodayState = 'idle' | 'working' | 'done' | 'leave' | 'unavailable';

@Component({
  selector: 'app-my-attendance',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './my-attendance.html',
  styleUrl: './my-attendance.scss'
})
export class MyAttendance implements OnInit {
  private readonly currentEmployeeService = inject(CurrentEmployeeService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly leaveService = inject(LeaveRequestService);
  private readonly languageService = inject(LanguageService);

  employee: Employee | null = null;
  records: Attendance[] = [];
  requests: LeaveRequest[] = [];

  selectedMonth = this.today.slice(0, 7);

  isLoading = true;
  isProcessing = false;
  hasError = false;

  successMessage = '';
  errorMessage = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.isLoading = true;
    this.hasError = false;

    this.currentEmployeeService
      .getCurrentEmployee()
      .pipe(
        switchMap((employee): Observable<AttendanceData> => {
          if (!employee?.id) {
            return of({ employee: null, records: [], requests: [] });
          }

          return forkJoin({
            employee: of(employee),
            records: this.attendanceService.getAttendanceByEmployee(employee.id),
            requests: this.leaveService.getRequests()
          });
        })
      )
      .subscribe({
        next: data => {
          this.employee = data.employee;
          this.records = data.records;

          this.requests = data.requests.filter(
            item => String(item.employeeId) === String(data.employee?.id)
          );

          this.isLoading = false;
        },
        error: error => {
          console.error('Failed to load attendance:', error);
          this.hasError = true;
          this.isLoading = false;
        }
      });
  }

  private t(key: string, params: Record<string, string | number> = {}): string {
    let text = this.languageService.translate(key);

    for (const [name, value] of Object.entries(params)) {
      text = text.split(`{${name}}`).join(String(value));
    }

    return text;
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

  private getCurrentTime(): string {
    const date = new Date();

    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  get todayRecord(): Attendance | undefined {
    return this.records.find(record => record.date === this.today);
  }

  private get isOnApprovedLeaveToday(): boolean {
    return this.requests.some(
      request =>
        request.status === 'approved' &&
        request.startDate <= this.today &&
        request.endDate >= this.today
    );
  }

  get todayState(): TodayState {
    const record = this.todayRecord;

    if (record?.checkIn && !record.checkOut) {
      return 'working';
    }

    if (record?.checkOut) {
      return 'done';
    }

    if (this.isOnApprovedLeaveToday) {
      return 'leave';
    }

    if (this.employee?.status !== 'active') {
      return 'unavailable';
    }

    return 'idle';
  }

  get todayStatusLabel(): string {
    const record = this.todayRecord;

    if (record) {
      return this.getStatusLabel(record.status);
    }

    return this.todayState === 'leave'
      ? this.t('STATUS.ON_LEAVE')
      : this.t('EMP_ATTENDANCE.NOT_CHECKED_IN');
  }

  checkIn(): void {
    if (!this.employee?.id || this.todayState !== 'idle' || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.errorMessage = '';
    this.successMessage = '';

    const time = this.getCurrentTime();
    const status = time > '09:00' ? 'late' : 'present';

    this.attendanceService
      .checkIn(String(this.employee.id), this.today, time, status)
      .subscribe({
        next: record => {
          this.records = [...this.records, record];
          this.successMessage = this.t('EMP_ATTENDANCE.CHECKED_IN_SUCCESS', { time });
          this.isProcessing = false;
        },
        error: error => {
          console.error('Check-in failed:', error);
          this.errorMessage = this.t('EMP_ATTENDANCE.ERR_CHECK_IN');
          this.isProcessing = false;
        }
      });
  }

  checkOut(): void {
    const record = this.todayRecord;

    if (
      !record?.id ||
      !record.checkIn ||
      record.checkOut ||
      this.isProcessing
    ) {
      return;
    }

    const time = this.getCurrentTime();
    const hours = this.calculateWorkHours(record.checkIn, time);

    this.errorMessage = '';
    this.successMessage = '';

    if (hours === null) {
      this.errorMessage = this.t('EMP_ATTENDANCE.ERR_TIME');
      return;
    }

    this.isProcessing = true;

    this.attendanceService
      .checkOut(record.id, record, time, hours)
      .subscribe({
        next: updated => {
          this.records = this.records.map(item =>
            item.id === updated.id ? updated : item
          );
          this.successMessage = this.t('EMP_ATTENDANCE.CHECKED_OUT_SUCCESS', { time });
          this.isProcessing = false;
        },
        error: error => {
          console.error('Check-out failed:', error);
          this.errorMessage = this.t('EMP_ATTENDANCE.ERR_CHECK_OUT');
          this.isProcessing = false;
        }
      });
  }

  private calculateWorkHours(checkIn: string, checkOut: string): number | null {
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);

    if ([inH, inM, outH, outM].some(value => !Number.isFinite(value))) {
      return null;
    }

    const minutes = outH * 60 + outM - (inH * 60 + inM);

    return minutes <= 0 ? null : Number((minutes / 60).toFixed(2));
  }

  get monthRecords(): Attendance[] {
    return this.records
      .filter(record => record.date.startsWith(this.selectedMonth))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  get presentDays(): number {
    return this.monthRecords.filter(record => record.status === 'present').length;
  }

  get lateDays(): number {
    return this.monthRecords.filter(record => record.status === 'late').length;
  }

  get absentDays(): number {
    return this.monthRecords.filter(record => record.status === 'absent').length;
  }

  get totalHours(): number {
    return this.monthRecords.reduce(
      (sum, record) => sum + Number(record.workHours || 0),
      0
    );
  }

  formatDate(date: string): string {
    const parsed = new Date(`${date}T00:00:00`);

    return Number.isNaN(parsed.getTime())
      ? '—'
      : parsed.toLocaleDateString(this.locale, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
  }

  formatHours(hours: number): string {
    return `${Number(hours || 0).toFixed(2)} ${this.t('LABELS.HRS')}`;
  }

  getStatusLabel(status: Attendance['status']): string {
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
}