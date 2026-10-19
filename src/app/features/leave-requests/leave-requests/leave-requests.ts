
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { LeaveRequest } from '../../../core/models/leave-request.model';
import { LeaveBalance } from '../../../core/models/leave-balance.model';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

import { LeaveRequestService } from '../../../core/services/leave-request.service';
import { LeaveBalanceService } from '../../../core/services/leave-balance.service';
import { NotificationService } from '../../../core/services/notification.service';
import { NotificationInt } from '../../../core/models/notification.model';

@Component({
  selector: 'app-leave-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink,TranslatePipe],
  templateUrl: './leave-requests.html',
  styleUrl: './leave-requests.scss'
})
export class LeaveRequestsComponent implements OnInit {
  private readonly leaveService = inject(LeaveRequestService);
  private readonly balanceService = inject(LeaveBalanceService);
  private readonly notificationService = inject(NotificationService);

  requests: LeaveRequest[] = [];

  searchTerm = '';
  selectedStatus = 'all';
  selectedType = 'all';

  isLoading = true;
  loadError = '';

  successMessage = '';
  errorMessage = '';

  updatingRequestIds = new Set<string>();

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.isLoading = true;
    this.loadError = '';

    this.leaveService.getRequests().subscribe({
      next: requests => {
        this.requests = requests;
        this.isLoading = false;
      },
      error: error => {
        console.error('Failed to load leave requests:', error);

        this.loadError =
          'Unable to load leave requests. Please check that JSON Server is running.';

        this.isLoading = false;
      }
    });
  }

  get filteredRequests(): LeaveRequest[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.requests.filter(request => {
      const matchesSearch =
        !search ||
        request.employeeName.toLowerCase().includes(search);

      const matchesStatus =
        this.selectedStatus === 'all' ||
        request.status === this.selectedStatus;

      const matchesType =
        this.selectedType === 'all' ||
        request.type === this.selectedType;

      return matchesSearch && matchesStatus && matchesType;
    });
  }

  get pendingCount(): number {
    return this.requests.filter(
      request => request.status === 'pending'
    ).length;
  }

  get approvedCount(): number {
    return this.requests.filter(
      request => request.status === 'approved'
    ).length;
  }

  get rejectedCount(): number {
    return this.requests.filter(
      request => request.status === 'rejected'
    ).length;
  }

  isUpdating(request: LeaveRequest): boolean {
    return !!request.id &&
      this.updatingRequestIds.has(request.id);
  }

  updateStatus(
    request: LeaveRequest,
    status: 'approved' | 'rejected'
  ): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (!request.id) {
      this.errorMessage =
        'Unable to update this request because it has no ID.';
      return;
    }

    const currentRequest = this.requests.find(
      item => item.id === request.id
    );

    if (!currentRequest || currentRequest.status !== 'pending') {
      this.errorMessage =
        'This request has already been processed. Please refresh the list.';
      return;
    }

    if (this.isUpdating(request)) {
      return;
    }

    this.startUpdating(request.id);

    if (status === 'rejected') {
      this.saveRequestStatus(currentRequest, 'rejected');
      return;
    }

    this.approveRequest(currentRequest);
  }

  private approveRequest(request: LeaveRequest): void {
    this.balanceService.getBalances().subscribe({
      next: balances => {
        const balance = balances.find(
          item => item.employeeId === request.employeeId
        );

        if (!balance || !balance.id) {
          this.errorMessage =
            `No leave balance was found for ${request.employeeName}.`;

          this.finishUpdating(request.id!);
          return;
        }

        const availableDays = this.getAvailableDays(
          balance,
          request.type
        );

        if (availableDays === null) {
          this.errorMessage =
            'The selected leave type is not supported.';

          this.finishUpdating(request.id!);
          return;
        }

        if (request.days <= 0 || request.days > availableDays) {
          this.errorMessage =
            `Insufficient leave balance for ${request.employeeName}. ` +
            `Available: ${availableDays} days; requested: ${request.days} days.`;

          this.finishUpdating(request.id!);
          return;
        }

        const updatedBalance = this.deductLeaveDays(
          balance,
          request.type,
          request.days
        );

        this.balanceService
          .updateBalance(balance.id, updatedBalance)
          .subscribe({
            next: () => {
              this.saveApprovedRequest(request, balance);
            },
            error: error => {
              console.error('Failed to update leave balance:', error);

              this.errorMessage =
                'Could not update the leave balance. The request was not approved.';

              this.finishUpdating(request.id!);
            }
          });
      },
      error: error => {
        console.error('Failed to load leave balances:', error);

        this.errorMessage =
          'Unable to verify the leave balance. Please try again.';

        this.finishUpdating(request.id!);
      }
    });
  }

  private saveApprovedRequest(
    request: LeaveRequest,
    originalBalance: LeaveBalance
  ): void {
    const updatedRequest: LeaveRequest = {
      ...request,
      status: 'approved'
    };

    this.leaveService
      .updateRequest(request.id!, updatedRequest)
      .subscribe({
        next: updated => {
          this.requests = this.requests.map(item =>
            item.id === updated.id ? updated : item
          );

          this.successMessage =
            `Request approved. ${request.days} leave day(s) deducted from ` +
            `${request.employeeName}'s balance.`;

                    this.createStatusNotification(updated, 'approved');

          this.finishUpdating(request.id!);
        },
        error: error => {
          console.error('Failed to approve leave request:', error);

          this.balanceService
            .updateBalance(originalBalance.id!, originalBalance)
            .subscribe({
              next: () => {
                this.errorMessage =
                  'The request could not be approved. The original leave balance was restored.';

                this.finishUpdating(request.id!);
              },
              error: rollbackError => {
                console.error(
                  'Failed to restore leave balance:',
                  rollbackError
                );

                this.errorMessage =
                  'Critical: request approval failed and the balance could not be restored. Please check db.json.';

                this.finishUpdating(request.id!);
              }
            });
        }
      });
  }

  private saveRequestStatus(
    request: LeaveRequest,
    status: 'approved' | 'rejected'
  ): void {
    const updatedRequest: LeaveRequest = {
      ...request,
      status
    };

    this.leaveService
      .updateRequest(request.id!, updatedRequest)
      .subscribe({
        next: updated => {
          this.requests = this.requests.map(item =>
            item.id === updated.id ? updated : item
          );

          this.successMessage =
            'Leave request rejected successfully.';

                    this.createStatusNotification(updated, 'rejected');

          this.finishUpdating(request.id!);
        },
        error: error => {
          console.error('Failed to reject leave request:', error);

          this.errorMessage =
            'Unable to reject the request. Please try again.';

          this.finishUpdating(request.id!);
        }
      });
  }

    private createStatusNotification(
    request: LeaveRequest,
    status: 'approved' | 'rejected'
  ): void {
    const notification: NotificationInt = {
      title:
        status === 'approved'
          ? 'Leave Request Approved'
          : 'Leave Request Rejected',
      message:
        `Your ${request.type.toLowerCase()} request for ` +
        `${request.days} day(s) was ${status}.`,
      type: status === 'approved' ? 'leave-approved' : 'leave-rejected',
      relatedId: request.id,
      audience: 'employee',
      recipientEmployeeId: String(request.employeeId),
      params: {
        employeeName: request.employeeName,
        leaveType: request.type,
        days: request.days
      },
      isRead: false,
      createdAt: new Date().toISOString()
    };

    this.notificationService.addNotification(notification).subscribe({
      error: error => {
        console.error('Failed to create notification:', error);
      }
    });
  }

  private getAvailableDays(
    balance: LeaveBalance,
    type: LeaveRequest['type']
  ): number | null {
    switch (type) {
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

  private deductLeaveDays(
    balance: LeaveBalance,
    type: LeaveRequest['type'],
    days: number
  ): LeaveBalance {
    const updated: LeaveBalance = {
      ...balance,
      total: balance.total - days
    };

    switch (type) {
      case 'Annual Leave':
        updated.annual = balance.annual - days;
        break;

      case 'Sick Leave':
        updated.sick = balance.sick - days;
        break;

      case 'Personal Leave':
        updated.personal = balance.personal - days;
        break;
    }

    return updated;
  }

  private startUpdating(requestId: string): void {
    this.updatingRequestIds = new Set([
      ...this.updatingRequestIds,
      requestId
    ]);
  }

  private finishUpdating(requestId: string): void {
    const updatedIds = new Set(this.updatingRequestIds);
    updatedIds.delete(requestId);
    this.updatingRequestIds = updatedIds;
  }
}
