import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { EmployeeService } from '../../../core/services/employee.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { LeaveBalanceService } from '../../../core/services/leave-balance.service';
import { LeaveRequestService } from '../../../core/services/leave-request.service';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

import { Employee } from '../../../core/models/employee.model';
import { Attendance } from '../../../core/models/attendance.model';
import { LeaveBalance } from '../../../core/models/leave-balance.model';
import { LeaveRequest } from '../../../core/models/leave-request.model';

@Component({
  selector: 'app-employee-details',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './employee-details.html',
  styleUrl: './employee-details.scss'
})
export class EmployeeDetailsComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly leaveBalanceService = inject(LeaveBalanceService);
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly languageService = inject(LanguageService);

  employee: Employee | null = null;
  attendanceRecords: Attendance[] = [];
  leaveBalance: LeaveBalance | null = null;
  leaveRequests: LeaveRequest[] = [];

  isLoading = true;
  hasError = false;

  ngOnInit(): void {
    const employeeId = this.route.snapshot.paramMap.get('id');

    if (!employeeId) {
      this.hasError = true;
      this.isLoading = false;
      return;
    }

    this.loadEmployeeDetails(employeeId);
  }

  loadEmployeeDetails(employeeId: string): void {
    this.isLoading = true;
    this.hasError = false;

    forkJoin({
      employee: this.employeeService.getEmployee(employeeId),
      attendance: this.attendanceService.getAttendanceByEmployee(employeeId),
      balances: this.leaveBalanceService.getBalances(),
      leaveRequests: this.leaveRequestService.getRequests()
    }).subscribe({
      next: result => {
        this.employee = result.employee;
        this.attendanceRecords = result.attendance;

        this.leaveBalance =
          result.balances.find(
            balance => balance.employeeId === employeeId
          ) ?? null;

        this.leaveRequests =
          result.leaveRequests.filter(
            request => request.employeeId === employeeId
          );

        this.isLoading = false;
      },
      error: error => {
        console.error('Failed to load employee details:', error);
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

  get fullName(): string {
    if (!this.employee) {
      return '';
    }

    return `${this.employee.firstName} ${this.employee.lastName}`;
  }

  get initials(): string {
    if (!this.employee) {
      return '';
    }

    return `${this.employee.firstName.charAt(0)}${this.employee.lastName.charAt(0)}`.toUpperCase();
  }

  get presentDays(): number {
    return this.attendanceRecords.filter(
      record => record.status === 'present'
    ).length;
  }

  get lateDays(): number {
    return this.attendanceRecords.filter(
      record => record.status === 'late'
    ).length;
  }

  get absentDays(): number {
    return this.attendanceRecords.filter(
      record => record.status === 'absent'
    ).length;
  }

  get averageWorkHours(): number {
    if (!this.attendanceRecords.length) {
      return 0;
    }

    const total = this.attendanceRecords.reduce(
      (sum, record) => sum + Number(record.workHours || 0),
      0
    );

    return total / this.attendanceRecords.length;
  }

  get approvedLeaves(): number {
    return this.leaveRequests.filter(
      request => request.status === 'approved'
    ).length;
  }

  get pendingLeaves(): number {
    return this.leaveRequests.filter(
      request => request.status === 'pending'
    ).length;
  }

  get recentAttendance(): Attendance[] {
    return [...this.attendanceRecords]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }

  get recentLeaveRequests(): LeaveRequest[] {
    return [...this.leaveRequests]
      .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
      .slice(0, 5);
  }

  formatDate(date: string | null | undefined): string {
    if (!date) {
      return '—';
    }

    const parsedDate = new Date(`${date}T00:00:00`);

    if (Number.isNaN(parsedDate.getTime())) {
      return '—';
    }

    return parsedDate.toLocaleDateString(this.locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatHours(hours: number): string {
    return `${hours.toFixed(2)} ${this.t('LABELS.HRS')}`;
  }

  editEmployee(): void {
    if (!this.employee?.id) {
      return;
    }

    this.router.navigate([
      '/employees',
      this.employee.id,
      'edit'
    ]);
  }

  goBack(): void {
    this.router.navigate(['/employees']);
  }

  getDepartmentLabel(department: string): string {
    if (!department) {
      return '—';
    }

    const key = `DEPARTMENT_NAMES.${department
      .trim()
      .toUpperCase()
      .replace(/\s+/g, '_')}`;

    const translated = this.t(key);

    return translated === key ? department : translated;
  }

  getLeaveTypeLabel(type: string): string {
    if (!type) {
      return '—';
    }

    const normalized = type
      .trim()
      .toUpperCase()
      .replace(/\s*LEAVE\s*$/, '')
      .replace(/\s+/g, '_');

    const key = `LEAVE_TYPE.${normalized}`;
    const translated = this.t(key);

    return translated === key ? type : translated;
  }

  getStatusLabel(status: Employee['status']): string {
    switch (status) {
      case 'active':
        return this.t('STATUS.ACTIVE');
      case 'inactive':
        return this.t('STATUS.INACTIVE');
      case 'on-leave':
        return this.t('STATUS.ON_LEAVE');
      default:
        return status;
    }
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
}