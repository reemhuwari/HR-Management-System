import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, map, of, switchMap } from 'rxjs';

import { CurrentEmployeeService } from '../../../core/services/current-employee.service';
import { LanguageService } from '../../../core/services/language.service';
import { LeaveRequestService } from '../../../core/services/leave-request.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

import { Employee } from '../../../core/models/employee.model';
import { LeaveRequest } from '../../../core/models/leave-request.model';

interface RequestsResult {
  employee: Employee | null;
  requests: LeaveRequest[];
}

@Component({
  selector: 'app-my-leave-requests',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './my-leave-requests.html',
  styleUrl: './my-leave-requests.scss'
})
export class MyLeaveRequests implements OnInit {
  private readonly currentEmployeeService = inject(CurrentEmployeeService);
  private readonly leaveService = inject(LeaveRequestService);
  private readonly languageService = inject(LanguageService);

  employee: Employee | null = null;
  requests: LeaveRequest[] = [];

  selectedStatus = 'all';

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
        switchMap((employee): Observable<RequestsResult> => {
          if (!employee?.id) {
            return of({ employee: null, requests: [] });
          }

          return this.leaveService.getRequests().pipe(
            map(requests => ({
              employee,
              requests: requests.filter(
                item => String(item.employeeId) === String(employee.id)
              )
            }))
          );
        })
      )
      .subscribe({
        next: result => {
          this.employee = result.employee;
          this.requests = result.requests;
          this.isLoading = false;
        },
        error: error => {
          console.error('Failed to load leave requests:', error);
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

  get pendingCount(): number {
    return this.requests.filter(item => item.status === 'pending').length;
  }

  get approvedCount(): number {
    return this.requests.filter(item => item.status === 'approved').length;
  }

  get rejectedCount(): number {
    return this.requests.filter(item => item.status === 'rejected').length;
  }

  get filteredRequests(): LeaveRequest[] {
    return [...this.requests]
      .filter(
        item =>
          this.selectedStatus === 'all' || item.status === this.selectedStatus
      )
      .sort((a, b) => (b.submittedAt ?? '').localeCompare(a.submittedAt ?? ''));
  }

  formatDate(date: string | null | undefined): string {
    if (!date) {
      return '—';
    }

    const parsed = new Date(`${date}T00:00:00`);

    return Number.isNaN(parsed.getTime())
      ? '—'
      : parsed.toLocaleDateString(this.locale, {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
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