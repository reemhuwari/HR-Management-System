
import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';

import { EmployeeService } from '../../../core/services/employee.service';
import { LeaveRequestService } from '../../../core/services/leave-request.service';
import { LeaveBalanceService } from '../../../core/services/leave-balance.service';


import { Employee } from '../../../core/models/employee.model';
import { LeaveRequest } from '../../../core/models/leave-request.model';
import { LeaveBalance } from '../../../core/models/leave-balance.model';
import { NotificationInt } from '../../../core/models/notification.model';
import { NotificationService } from '../../../core/services/notification.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-leave-request-form',
  standalone: true,
  imports: [CommonModule, FormsModule,TranslatePipe],
  templateUrl: './leave-request-form.html',
  styleUrl: './leave-request-form.scss'
})
export class LeaveRequestFormComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly leaveRequestService = inject(LeaveRequestService);
  private readonly leaveBalanceService = inject(LeaveBalanceService);
  private readonly notificationService = inject(NotificationService);
  private readonly router = inject(Router);

  employees: Employee[] = [];
  balances: LeaveBalance[] = [];

  form = {
    employeeId: '',
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

  minDate = this.getLocalDateString();

  ngOnInit(): void {
    this.loadFormData();
  }

  loadFormData(): void {
    this.isLoading = true;
    this.hasError = false;

    forkJoin({
      employees: this.employeeService.getEmployees(),
      balances: this.leaveBalanceService.getBalances()
    }).subscribe({
      next: result => {
        this.employees = result.employees.filter(
          employee => employee.status === 'active'
        );

        this.balances = result.balances;
        this.isLoading = false;
      },
      error: error => {
        console.error('Failed to load leave form data:', error);

        this.hasError = true;
        this.isLoading = false;

        this.errorMessage =
          'Unable to load employees or leave balances. Please check that JSON Server is running.';
      }
    });
  }

  get selectedEmployee(): Employee | undefined {
    return this.employees.find(
      employee => employee.id === this.form.employeeId
    );
  }

  get selectedBalance(): LeaveBalance | undefined {
    return this.balances.find(
      balance => balance.employeeId === this.form.employeeId
    );
  }

  get availableDays(): number | null {
    const balance = this.selectedBalance;

    if (!balance) {
      return null;
    }

    switch (this.form.type) {
      case 'Annual Leave':
        return balance.annual;

      case 'Sick Leave':
        return balance.sick;

      case 'Personal Leave':
        return balance.personal;

      default:
        return null;
    }
  }

  get requestedDays(): number {
    if (!this.form.startDate || !this.form.endDate) {
      return 0;
    }

    const start = this.parseDate(this.form.startDate);
    const end = this.parseDate(this.form.endDate);

    if (end < start) {
      return 0;
    }

    return Math.floor((end - start) / 86400000) + 1;
  }

  get hasValidDates(): boolean {
    if (!this.form.startDate || !this.form.endDate) {
      return false;
    }

    return this.parseDate(this.form.endDate) >=
      this.parseDate(this.form.startDate);
  }

  get hasSufficientBalance(): boolean {
    return this.availableDays !== null &&
      this.requestedDays > 0 &&
      this.requestedDays <= this.availableDays;
  }

  get canSubmit(): boolean {
    return !this.isLoading &&
      !this.isSaving &&
      !!this.form.employeeId &&
      !!this.form.type &&
      !!this.form.startDate &&
      !!this.form.endDate &&
      this.hasValidDates &&
      this.hasSufficientBalance &&
      this.form.reason.trim().length >= 5 &&
      this.form.reason.trim().length <= 500 &&
      !!this.selectedEmployee;
  }

  get balanceProgress(): number {
    const available = this.availableDays;

    if (available === null || available <= 0) {
      return 0;
    }

    return 100;
  }

  onEmployeeChange(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  onTypeChange(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  onDateChange(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  submitRequest(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.selectedEmployee) {
      this.errorMessage = 'Please select an employee.';
      return;
    }

    if (!this.hasValidDates) {
      this.errorMessage =
        'The end date must be the same as or later than the start date.';
      return;
    }

    if (!this.hasSufficientBalance) {
      this.errorMessage =
        'The selected employee does not have enough available leave days.';
      return;
    }

    const reason = this.form.reason.trim();

    if (reason.length < 5 || reason.length > 500) {
      this.errorMessage =
        'The reason must contain between 5 and 500 characters.';
      return;
    }

    if (!this.canSubmit) {
      this.errorMessage = 'Please complete all required fields.';
      return;
    }

    const employee = this.selectedEmployee;

    const request: LeaveRequest = {
      employeeId: employee.id!,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      type: this.form.type,
      startDate: this.form.startDate,
      endDate: this.form.endDate,
      days: this.requestedDays,
      reason,
      status: 'pending',
      submittedAt: this.getLocalDateString()
    };

    this.isSaving = true;

    this.leaveRequestService.addRequest(request).subscribe({
      next: createdRequest => {
        this.isSaving = false;
        this.successMessage =
          'Leave request submitted successfully.';

                const notification: NotificationInt = {
          title: 'New Leave Request',
          message:
            `${createdRequest.employeeName} submitted a ` +
            `${createdRequest.type.toLowerCase()} request for ` +
            `${createdRequest.days} day(s).`,
          type: 'leave-request',
          relatedId: createdRequest.id,
          audience: 'admin',
          params: {
            employeeName: createdRequest.employeeName,
            leaveType: createdRequest.type,
            days: createdRequest.days
          },
          isRead: false,
          createdAt: new Date().toISOString()
        };

        this.notificationService
          .addNotification(notification)
          .subscribe({
            next: () => this.navigateAfterSubmit(),
            error: error => {
              console.error('Failed to create notification:', error);
              this.navigateAfterSubmit();
            }
          });
      },
      error: error => {
        console.error('Failed to submit leave request:', error);

        this.isSaving = false;
        this.errorMessage =
          'Unable to submit the request. Please try again.';
      }
    });
  }

  private navigateAfterSubmit(): void {
    setTimeout(() => {
      this.router.navigate(['/leave-requests']);
    }, 800);
  }

  cancel(): void {
    this.router.navigate(['/leave-requests']);
  }

  private parseDate(date: string): number {
    const [year, month, day] = date.split('-').map(Number);

    return Date.UTC(year, month - 1, day);
  }

  private getLocalDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }
}
