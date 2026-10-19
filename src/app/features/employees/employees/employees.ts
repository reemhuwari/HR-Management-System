import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '../../../core/services/notification.service';
import { EmployeeService } from '../../../core/services/employee.service';
import { LanguageService } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Employee } from '../../../core/models/employee.model';
import { User } from '../../../core/models/user.model';
import { RegistrationService } from '../../../core/services/registration.service';
@Component({
  selector: 'app-employees',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslatePipe],
  templateUrl: './employees.html',
  styleUrl: './employees.scss'
})
export class EmployeesComponent implements OnInit {
  private readonly employeeService = inject(EmployeeService);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);
  private readonly registrationService = inject(RegistrationService);
  private readonly notificationService = inject(NotificationService);
  employees: Employee[] = [];
  filteredEmployees: Employee[] = [];

  searchTerm = '';
  selectedDepartment = 'all';
  selectedStatus = 'all';

  isLoading = true;
  isSaving = false;
  isDeleting = false;

  errorMessage = '';
  actionError = '';
  successMessage = '';
  formError = '';

  showModal = false;
  isEditMode = false;
  currentEmployeeId?: string;

  currentPage = 1;
  pageSize = 5;

  formEmployee: Employee = this.emptyEmployee();
  pendingAccounts: User[] = [];
  private processingAccountIds = new Set<string>();
  ngOnInit(): void {
    this.loadEmployees();
    this.loadPendingAccounts();
  }

  private t(key: string): string {
    return this.languageService.translate(key);
  }

  private get locale(): string {
    return this.languageService.currentLanguage === 'ar'
      ? 'ar-JO-u-nu-latn'
      : 'en-US';
  }
  private closeAccountNotifications(userId: string): void {
    this.notificationService.getNotifications().subscribe({
      next: list => {
        list
          .filter(
            item =>
              item.type === 'account-request' &&
              String(item.relatedId) === String(userId) &&
              !item.isRead &&
              !!item.id
          )
          .forEach(item =>
            this.notificationService.markAsRead(item.id!).subscribe({
              error: error => console.error(error)
            })
          );
      },
      error: error => console.error(error)
    });
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
  loadPendingAccounts(): void {
    this.registrationService.getPendingAccounts().subscribe({
      next: users => {
        this.pendingAccounts = users;
      },
      error: error => {
        console.error('Unable to load pending accounts:', error);
      }
    });
  }

  isProcessingAccount(user: User): boolean {
    return !!user.id && this.processingAccountIds.has(user.id);
  }

  approveAccount(user: User): void {
    if (!user.id || this.isProcessingAccount(user)) {
      return;
    }

    this.actionError = '';
    this.successMessage = '';
    this.processingAccountIds = new Set([...this.processingAccountIds, user.id]);

    this.registrationService.approveAccount(user).subscribe({
      next: () => {
        this.pendingAccounts = this.pendingAccounts.filter(
          item => item.id !== user.id
        );
        this.finishAccount(user.id!);
        this.closeAccountNotifications(user.id!);
        this.successMessage = this.t('EMPLOYEES.ACCOUNT_APPROVED');
        this.loadEmployees();
      },
      error: error => {
        console.error('Unable to approve account:', error);
        this.actionError = this.t('EMPLOYEES.ERR_APPROVE');
        this.finishAccount(user.id!);
      }
    });
  }

  rejectAccount(user: User): void {
    if (!user.id || this.isProcessingAccount(user)) {
      return;
    }

    const confirmed = window.confirm(
      `${user.firstName} ${user.lastName}\n${this.t('EMPLOYEES.CONFIRM_REJECT_ACCOUNT')}`
    );

    if (!confirmed) {
      return;
    }

    this.actionError = '';
    this.successMessage = '';
    this.processingAccountIds = new Set([...this.processingAccountIds, user.id]);

    this.registrationService.rejectAccount(user).subscribe({
      next: () => {
        this.pendingAccounts = this.pendingAccounts.filter(
          item => item.id !== user.id
        );
        this.finishAccount(user.id!);
                this.closeAccountNotifications(user.id!);
        this.successMessage = this.t('EMPLOYEES.ACCOUNT_REJECTED');
      },
      error: error => {
        console.error('Unable to reject account:', error);
        this.actionError = this.t('EMPLOYEES.ERR_REJECT_ACCOUNT');
        this.finishAccount(user.id!);
      }
    });
  }

  private finishAccount(userId: string): void {
    const ids = new Set(this.processingAccountIds);
    ids.delete(userId);
    this.processingAccountIds = ids;
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

  loadEmployees(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.employeeService.getEmployees().subscribe({
      next: employees => {
        this.employees = employees ?? [];
        this.applyFilters();
        this.isLoading = false;
      },
      error: error => {
        console.error('Unable to load employees:', error);
        this.errorMessage = this.t('EMPLOYEES.ERR_LOAD');
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    const search = this.searchTerm.trim().toLowerCase();

    this.filteredEmployees = this.employees.filter(employee => {
      const fullName =
        `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.toLowerCase();

      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        (employee.email ?? '').toLowerCase().includes(search) ||
        (employee.employeeId ?? '').toLowerCase().includes(search) ||
        (employee.department ?? '').toLowerCase().includes(search) ||
        (employee.position ?? '').toLowerCase().includes(search) ||
        this.getDepartmentLabel(employee.department).toLowerCase().includes(search);

      const matchesDepartment =
        this.selectedDepartment === 'all' ||
        employee.department === this.selectedDepartment;

      const matchesStatus =
        this.selectedStatus === 'all' ||
        employee.status === this.selectedStatus;

      return matchesSearch && matchesDepartment && matchesStatus;
    });

    this.currentPage = 1;
  }

  get departments(): string[] {
    return [...new Set(
      this.employees
        .map(employee => employee.department)
        .filter(Boolean)
    )].sort((a, b) => a.localeCompare(b));
  }

  get paginatedEmployees(): Employee[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredEmployees.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredEmployees.length / this.pageSize));
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, index) => index + 1);
  }

  changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  openAddModal(): void {
    this.isEditMode = false;
    this.currentEmployeeId = undefined;
    this.formEmployee = this.emptyEmployee();
    this.formError = '';
    this.actionError = '';
    this.showModal = true;
  }

  openEditModal(employee: Employee): void {
    this.isEditMode = true;
    this.currentEmployeeId = employee.id;
    this.formEmployee = { ...employee };
    this.formError = '';
    this.actionError = '';
    this.showModal = true;
  }

  closeModal(): void {
    if (this.isSaving) {
      return;
    }

    this.showModal = false;
    this.formError = '';
  }

  saveEmployee(): void {
    if (this.isSaving) {
      return;
    }

    this.formError = '';
    this.actionError = '';
    this.successMessage = '';

    const firstName = this.formEmployee.firstName.trim();
    const lastName = this.formEmployee.lastName.trim();
    const email = this.formEmployee.email.trim().toLowerCase();
    const department = this.formEmployee.department.trim();
    const position = this.formEmployee.position.trim();
    const phone = this.formEmployee.phone.trim();
    const hireDate = this.formEmployee.hireDate;

    if (!firstName || !lastName || !email || !department || !position || !hireDate) {
      this.formError = this.t('EMPLOYEES.ERR_REQUIRED');
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      this.formError = this.t('EMPLOYEES.ERR_EMAIL');
      return;
    }

    const duplicateEmail = this.employees.some(employee =>
      employee.email.trim().toLowerCase() === email &&
      String(employee.id) !== String(this.currentEmployeeId ?? '')
    );

    if (duplicateEmail) {
      this.formError = this.t('EMPLOYEES.ERR_DUPLICATE_EMAIL');
      return;
    }

    const normalizedEmployee: Employee = {
      ...this.formEmployee,
      firstName,
      lastName,
      email,
      phone,
      department,
      position,
      hireDate
    };

    this.isSaving = true;

    if (this.isEditMode && this.currentEmployeeId) {
      this.employeeService
        .updateEmployee(this.currentEmployeeId, normalizedEmployee)
        .subscribe({
          next: updated => {
            const index = this.employees.findIndex(
              employee => String(employee.id) === String(updated.id)
            );

            if (index !== -1) {
              this.employees[index] = updated;
            }

            this.applyFilters();
            this.showModal = false;
            this.isSaving = false;
            this.successMessage = this.t('EMPLOYEES.SUCCESS_UPDATED');
          },
          error: error => {
            console.error('Unable to update employee:', error);
            this.formError = this.t('EMPLOYEES.ERR_UPDATE');
            this.isSaving = false;
          }
        });

      return;
    }

    const employee: Employee = {
      ...normalizedEmployee,
      employeeId: this.generateEmployeeId()
    };

    this.employeeService.addEmployee(employee).subscribe({
      next: created => {
        this.employees = [...this.employees, created];
        this.applyFilters();

        if (this.filteredEmployees.some(item => item.id === created.id)) {
          this.currentPage = this.totalPages;
        }

        this.showModal = false;
        this.isSaving = false;
        this.successMessage = this.t('EMPLOYEES.SUCCESS_ADDED');
      },
      error: error => {
        console.error('Unable to add employee:', error);
        this.formError = this.t('EMPLOYEES.ERR_ADD');
        this.isSaving = false;
      }
    });
  }

  private generateEmployeeId(): string {
    const usedIds = new Set(
      this.employees.map(employee => employee.employeeId)
    );

    let number = 1;
    let candidate = '';

    do {
      candidate = `EMP-${String(number).padStart(3, '0')}`;
      number++;
    } while (usedIds.has(candidate));

    return candidate;
  }

  viewEmployee(id?: string): void {
    if (!id) {
      this.actionError = this.t('EMPLOYEES.ERR_MISSING_ID');
      return;
    }

    this.router.navigate(['/employees', id]);
  }

  get departmentOptions(): string[] {
    return [...new Set([
      'Engineering',
      'Human Resources',
      'Finance',
      'Marketing',
      'Sales',
      ...this.departments
    ])].sort((a, b) => a.localeCompare(b));
  }

  get today(): string {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  deleteEmployee(employee: Employee): void {
    if (!employee.id || this.isDeleting) {
      return;
    }

    const confirmed = window.confirm(
      `${employee.firstName} ${employee.lastName}\n${this.t('EMPLOYEES.CONFIRM_DELETE')}`
    );

    if (!confirmed) {
      return;
    }

    this.actionError = '';
    this.successMessage = '';
    this.isDeleting = true;

    this.employeeService.deleteEmployee(employee.id).subscribe({
      next: () => {
        this.employees = this.employees.filter(
          item => String(item.id) !== String(employee.id)
        );

        this.applyFilters();
        this.currentPage = Math.min(this.currentPage, this.totalPages);
        this.isDeleting = false;
        this.successMessage = this.t('EMPLOYEES.SUCCESS_DELETED');
      },
      error: error => {
        console.error('Unable to delete employee:', error);
        this.actionError = this.t('EMPLOYEES.ERR_DELETE');
        this.isDeleting = false;
      }
    });
  }

  private emptyEmployee(): Employee {
    return {
      employeeId: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      department: 'Engineering',
      position: '',
      status: 'active',
      hireDate: ''
    };
  }
}