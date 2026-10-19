import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AuthService } from '../../../core/services/auth.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { AttendanceService } from '../../../core/services/attendance.service';
import { LeaveRequestService } from '../../../core/services/leave-request.service';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

import { Employee } from '../../../core/models/employee.model';
import { Attendance } from '../../../core/models/attendance.model';
import { LeaveRequest } from '../../../core/models/leave-request.model';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class DashboardComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly employeeService = inject(EmployeeService);
  private readonly attendanceService = inject(AttendanceService);
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly languageService = inject(LanguageService);

  currentUser = this.authService.getCurrentUser();

  employees: Employee[] = [];
  attendance: Attendance[] = [];
  leaveRequests: LeaveRequest[] = [];

  isLoading = true;
  hasError = false;

  today = this.getToday();

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.isLoading = true;
    this.hasError = false;

    forkJoin({
      employees: this.employeeService.getEmployees(),
      attendance: this.attendanceService.getAttendance(),
      leaveRequests: this.leaveRequestService.getRequests()
    }).subscribe({
      next: result => {
        this.employees = result.employees ?? [];
        this.attendance = result.attendance ?? [];
        this.leaveRequests = result.leaveRequests ?? [];

        this.currentUser = this.authService.getCurrentUser();
        this.today = this.getToday();
        this.isLoading = false;
      },
      error: error => {
        console.error('Dashboard loading error:', error);
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  private getToday(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private t(key: string): string {
    return this.languageService.translate(key);
  }

  private labelOrRaw(prefix: string, value: string): string {
    const key = `${prefix}.${value}`;
    const translated = this.t(key);

    return translated === key ? value : translated;
  }

  private get locale(): string {
    return this.languageService.currentLanguage === 'ar'
      ? 'ar-JO-u-nu-latn'
      : 'en-US';
  }

  get totalEmployees(): number {
    return this.employees.length;
  }

  get activeEmployees(): number {
    return this.employees.filter(
      employee => employee.status === 'active'
    ).length;
  }

  private isOnApprovedLeave(employeeId: string, date: string): boolean {
    return this.leaveRequests.some(request =>
      String(request.employeeId) === String(employeeId) &&
      request.status === 'approved' &&
      request.startDate <= date &&
      request.endDate >= date
    );
  }

  get actualTodayAttendance(): Attendance[] {
    return this.attendance.filter(record => record.date === this.today);
  }

  
  get todayAttendance(): Attendance[] {
    const actualRecords = this.actualTodayAttendance;
    const records: Attendance[] = [...actualRecords];

    const employeesWithoutRecord = this.employees.filter(employee =>
      employee.status === 'active' &&
      !actualRecords.some(
        record => String(record.employeeId) === String(employee.id)
      )
    );

    for (const employee of employeesWithoutRecord) {
      const onApprovedLeave = this.isOnApprovedLeave(
        String(employee.id ?? ''),
        this.today
      );

      records.push({
        employeeId: String(employee.id ?? ''),
        date: this.today,
        checkIn: null,
        checkOut: null,
        status: onApprovedLeave ? 'on-leave' : 'absent',
        workHours: 0
      });
    }

    return records;
  }

  get presentToday(): number {
    return this.todayAttendance.filter(
      record => record.status === 'present'
    ).length;
  }

  get lateToday(): number {
    return this.todayAttendance.filter(
      record => record.status === 'late'
    ).length;
  }

  get onLeaveToday(): number {
    return this.todayAttendance.filter(
      record => record.status === 'on-leave'
    ).length;
  }

  get absentToday(): number {
    return this.todayAttendance.filter(
      record => record.status === 'absent'
    ).length;
  }

  get attendanceCoverage(): number {
    const activeEmployees = this.employees.filter(
      employee => employee.status === 'active'
    );

    if (activeEmployees.length === 0) {
      return 0;
    }

    const coveredEmployees = activeEmployees.filter(employee => {
      const employeeId = String(employee.id ?? '');

      const hasActualRecord = this.actualTodayAttendance.some(
        record => String(record.employeeId) === employeeId
      );

      return hasActualRecord ||
        this.isOnApprovedLeave(employeeId, this.today);
    });

    return Math.round(
      (coveredEmployees.length / activeEmployees.length) * 100
    );
  }

  get pendingLeaves(): number {
    return this.leaveRequests.filter(
      request => request.status === 'pending'
    ).length;
  }

  get approvedLeaves(): number {
    return this.leaveRequests.filter(
      request => request.status === 'approved'
    ).length;
  }

  get rejectedLeaves(): number {
    return this.leaveRequests.filter(
      request => request.status === 'rejected'
    ).length;
  }

  get recentAttendance(): Attendance[] {
    return [...this.attendance]
      .sort((a, b) => {
        const dateA = `${a.date ?? ''} ${a.checkIn ?? ''}`;
        const dateB = `${b.date ?? ''} ${b.checkIn ?? ''}`;

        return dateB.localeCompare(dateA);
      })
      .slice(0, 6);
  }

  get recentLeaveRequests(): LeaveRequest[] {
    return [...this.leaveRequests]
      .sort((a, b) =>
        (b.submittedAt ?? '').localeCompare(a.submittedAt ?? '')
      )
      .slice(0, 5);
  }

  getEmployeeName(employeeId: string): string {
    const employee = this.employees.find(
      item => String(item.id) === String(employeeId)
    );

    if (!employee) {
      return this.t('DASHBOARD.UNKNOWN_EMPLOYEE');
    }

    return `${employee.firstName} ${employee.lastName}`;
  }

  getEmployeeInitials(employeeId: string): string {
    const employee = this.employees.find(
      item => String(item.id) === String(employeeId)
    );

    if (!employee) {
      return '—';
    }

    return `${employee.firstName?.charAt(0) ?? ''}${employee.lastName?.charAt(0) ?? ''}`
      .toUpperCase();
  }

  formatDate(date: string): string {
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

    const normalized = type
      .trim()
      .toUpperCase()
      .replace(/\s*LEAVE\s*$/, '')
      .replace(/\s+/g, '_');

    return this.labelOrRaw('LEAVE_TYPE', normalized) === normalized
      ? type
      : this.labelOrRaw('LEAVE_TYPE', normalized);
  }

  getGreeting(): string {
    const hour = new Date().getHours();

    if (hour < 12) {
      return this.t('GREETING.MORNING');
    }

    if (hour < 18) {
      return this.t('GREETING.AFTERNOON');
    }

    return this.t('GREETING.EVENING');
  }
}