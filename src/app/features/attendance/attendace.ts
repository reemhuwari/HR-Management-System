
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AttendanceService } from '../../core/services/attendance.service';
import { EmployeeService } from '../../core/services/employee.service';
import { LeaveRequestService } from '../../core/services/leave-request.service';
import { LanguageService } from '../../core/services/language.service';


import { Employee } from '../../core/models/employee.model';
import { Attendance } from '../../core/models/attendance.model';
import { LeaveRequest } from '../../core/models/leave-request.model';
import { TranslatePipe } from '../../core/pipes/translate.pipe';

@Component({
  selector: 'app-attendace',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './attendace.html',
  styleUrl: './attendace.scss'
})
export class Attendace implements OnInit {
  private readonly attendanceService = inject(AttendanceService);
  private readonly employeeService = inject(EmployeeService);
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly languageService = inject(LanguageService);

  employees: Employee[] = [];
  attendanceRecords: Attendance[] = [];
  leaveRequests: LeaveRequest[] = [];

  selectedDate = this.getToday();
  searchTerm = '';
  selectedStatus = 'all';

  isLoading = true;
  isProcessing = false;
  hasError = false;

  errorMessage = '';
  successMessage = '';
  selectedEmployee: Employee | null = null;

  ngOnInit(): void {
    this.loadData();
  }

  private t(key: string): string {
    return this.languageService.translate(key);
  }

  private translateWithName(key: string, employee: Employee): string {
    const name = `${employee.firstName} ${employee.lastName}`;

    return this.t(key).replace('{name}', name);
  }

  loadData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    this.employeeService.getEmployees().subscribe({
      next: employees => {
        this.employees = employees;
        this.loadAttendance();
      },
      error: error => {
        console.error('Failed to load employees:', error);
        this.setLoadError();
      }
    });
  }

  loadAttendance(): void {
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    this.attendanceService.getAttendanceByDate(this.selectedDate).subscribe({
      next: records => {
        this.attendanceRecords = records;
        this.loadLeaveRequests();
      },
      error: error => {
        console.error('Failed to load attendance:', error);
        this.setLoadError();
      }
    });
  }

  private loadLeaveRequests(): void {
    this.leaveRequestService.getRequests().subscribe({
      next: requests => {
        this.leaveRequests = requests;
        this.isLoading = false;
      },
      error: error => {
        console.error('Failed to load leave requests:', error);
        this.setLoadError(this.t('ATTENDANCE.LEAVE_LOAD_ERROR'));
      }
    });
  }

  private setLoadError(
    message = this.t('ATTENDANCE.LOAD_ERROR')
  ): void {
    this.isLoading = false;
    this.hasError = true;
    this.errorMessage = message;
  }

  onDateChange(): void {
    if (!this.selectedDate) {
      this.selectedDate = this.getToday();
    }

    this.successMessage = '';
    this.errorMessage = '';
    this.loadAttendance();
  }

  private isEmployeeOnApprovedLeave(
    employeeId: string,
    date: string
  ): boolean {
    return this.leaveRequests.some(request =>
      request.employeeId === employeeId &&
      request.status === 'approved' &&
      request.startDate <= date &&
      request.endDate >= date
    );
  }

  get effectiveRecords(): Attendance[] {
    const records = [...this.attendanceRecords];

    for (const employee of this.employees) {
      const employeeId = employee.id ?? '';

      if (!employeeId) {
        continue;
      }

      const hasRecord = records.some(
        record => record.employeeId === employeeId
      );

      if (
        !hasRecord &&
        this.isEmployeeOnApprovedLeave(employeeId, this.selectedDate)
      ) {
        records.push({
          employeeId,
          date: this.selectedDate,
          checkIn: null,
          checkOut: null,
          status: 'on-leave',
          workHours: 0
        });
      }
    }

    return records;
  }

  get filteredRecords(): Attendance[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.effectiveRecords.filter(record => {
      const employee = this.getEmployee(record.employeeId);

      const employeeName = employee
        ? `${employee.firstName} ${employee.lastName}`.toLowerCase()
        : '';

      const matchesSearch =
        !search ||
        employeeName.includes(search) ||
        (employee?.employeeId ?? '').toLowerCase().includes(search);

      const matchesStatus =
        this.selectedStatus === 'all' ||
        record.status === this.selectedStatus;

      return matchesSearch && matchesStatus;
    });
  }

  get totalRecords(): number {
    return this.effectiveRecords.length;
  }

  get presentCount(): number {
    return this.effectiveRecords.filter(
      record => record.status === 'present'
    ).length;
  }

  get lateCount(): number {
    return this.effectiveRecords.filter(
      record => record.status === 'late'
    ).length;
  }

  get absentCount(): number {
    return this.effectiveRecords.filter(
      record => record.status === 'absent'
    ).length;
  }

  get onLeaveCount(): number {
    return this.effectiveRecords.filter(
      record => record.status === 'on-leave'
    ).length;
  }

  getEmployee(employeeId: string): Employee | undefined {
    return this.employees.find(
      employee => employee.id === employeeId
    );
  }

  getEmployeeName(employeeId: string): string {
    const employee = this.getEmployee(employeeId);

    return employee
      ? `${employee.firstName} ${employee.lastName}`
      : this.t('ATTENDANCE.UNKNOWN_EMPLOYEE');
  }

  getEmployeeInitials(employeeId: string): string {
    const employee = this.getEmployee(employeeId);

    if (!employee) {
      return '?';
    }

    return `${employee.firstName.charAt(0)}${employee.lastName.charAt(0)}`
      .toUpperCase();
  }

  getToday(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  getCurrentTime(): string {
    const date = new Date();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${hours}:${minutes}`;
  }

  isLate(checkIn: string): boolean {
    return checkIn > '09:00';
  }

  getRecordForEmployee(
    employeeId: string
  ): Attendance | undefined {
    const existingRecord = this.attendanceRecords.find(
      record =>
        record.employeeId === employeeId &&
        record.date === this.selectedDate
    );

    if (existingRecord) {
      return existingRecord;
    }

    if (this.isEmployeeOnApprovedLeave(employeeId, this.selectedDate)) {
      return {
        employeeId,
        date: this.selectedDate,
        checkIn: null,
        checkOut: null,
        status: 'on-leave',
        workHours: 0
      };
    }

    return undefined;
  }

  canCheckIn(employee: Employee): boolean {
    const employeeId = employee.id ?? '';

    if (
      !employeeId ||
      employee.status === 'inactive' ||
      employee.status === 'on-leave' ||
      this.isEmployeeOnApprovedLeave(employeeId, this.selectedDate)
    ) {
      return false;
    }

    return !this.attendanceRecords.some(
      record =>
        record.employeeId === employeeId &&
        record.date === this.selectedDate
    );
  }

  canCheckOut(employee: Employee): boolean {
    const record = this.getRecordForEmployee(employee.id ?? '');

    return !!record &&
      !!record.id &&
      !!record.checkIn &&
      !record.checkOut &&
      record.status !== 'on-leave';
  }

  checkIn(employee: Employee): void {
    if (!employee.id || !this.canCheckIn(employee) || this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.selectedEmployee = employee;
    this.errorMessage = '';
    this.successMessage = '';

    const currentTime = this.getCurrentTime();
    const status = this.isLate(currentTime) ? 'late' : 'present';

    this.attendanceService
      .checkIn(employee.id, this.selectedDate, currentTime, status)
      .subscribe({
        next: record => {
          this.attendanceRecords = [
            ...this.attendanceRecords,
            record
          ];

          this.successMessage = this.translateWithName(
            'ATTENDANCE.CHECK_IN_SUCCESS',
            employee
          );

          this.finishProcessing();
        },
        error: error => {
          console.error('Check-in failed:', error);
          this.errorMessage = this.t('ATTENDANCE.CHECK_IN_ERROR');
          this.finishProcessing();
        }
      });
  }

  checkOut(employee: Employee): void {
    if (!employee.id || this.isProcessing) {
      return;
    }

    const record = this.getRecordForEmployee(employee.id);

    if (
      !record ||
      !record.id ||
      !record.checkIn ||
      record.checkOut ||
      record.status === 'on-leave'
    ) {
      return;
    }

    this.isProcessing = true;
    this.selectedEmployee = employee;
    this.errorMessage = '';
    this.successMessage = '';

    const currentTime = this.getCurrentTime();
    const workHours = this.calculateWorkHours(
      record.checkIn,
      currentTime
    );

    if (workHours === null) {
      this.errorMessage = this.t('ATTENDANCE.CHECK_OUT_TIME_ERROR');
      this.finishProcessing();
      return;
    }

    this.attendanceService
      .checkOut(record.id, record, currentTime, workHours)
      .subscribe({
        next: updatedRecord => {
          this.attendanceRecords = this.attendanceRecords.map(item =>
            item.id === updatedRecord.id ? updatedRecord : item
          );

          this.successMessage = this.translateWithName(
            'ATTENDANCE.CHECK_OUT_SUCCESS',
            employee
          );

          this.finishProcessing();
        },
        error: error => {
          console.error('Check-out failed:', error);
          this.errorMessage = this.t('ATTENDANCE.CHECK_OUT_ERROR');
          this.finishProcessing();
        }
      });
  }

  private finishProcessing(): void {
    this.isProcessing = false;
    this.selectedEmployee = null;
  }

  calculateWorkHours(
    checkIn: string,
    checkOut: string
  ): number | null {
    const [inHours, inMinutes] = checkIn.split(':').map(Number);
    const [outHours, outMinutes] = checkOut.split(':').map(Number);

    if (
      [inHours, inMinutes, outHours, outMinutes].some(
        value => !Number.isFinite(value)
      )
    ) {
      return null;
    }

    const startMinutes = inHours * 60 + inMinutes;
    const endMinutes = outHours * 60 + outMinutes;
    const totalMinutes = endMinutes - startMinutes;

    if (totalMinutes <= 0) {
      return null;
    }

    return Number((totalMinutes / 60).toFixed(2));
  }

  formatHours(hours: number): string {
    const value = Number(hours || 0).toFixed(2);
    return `${value} ${this.t('ATTENDANCE.HOURS_SUFFIX')}`;
  }

  formatDate(date: string): string {
    const locale = this.languageService.currentLanguage === 'ar'
      ? 'ar-JO'
      : 'en-US';

    return new Date(`${date}T00:00:00`).toLocaleDateString(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getStatusLabel(status: Attendance['status']): string {
    switch (status) {
      case 'present':
        return this.t('ATTENDANCE.PRESENT_STATUS');
      case 'late':
        return this.t('ATTENDANCE.LATE_STATUS');
      case 'absent':
        return this.t('ATTENDANCE.ABSENT_STATUS');
      case 'on-leave':
        return this.t('ATTENDANCE.ON_LEAVE_STATUS');
      default:
        return status;
    }
  }
}
