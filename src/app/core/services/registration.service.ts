import { Injectable, inject } from '@angular/core';
import { Observable, map, of, switchMap, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { EmployeeService } from './employee.service';
import { LeaveBalanceService } from './leave-balance.service';

import { Employee } from '../models/employee.model';
import { User } from '../models/user.model';
import { catchError } from 'rxjs';
import { NotificationService } from './notification.service';
import { NotificationInt } from '../models/notification.model';
export interface SignupData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  department: string;
  position: string;
  phone: string;
}

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {
  private readonly authService = inject(AuthService);
  private readonly employeeService = inject(EmployeeService);
  private readonly balanceService = inject(LeaveBalanceService);
  private readonly notificationService = inject(NotificationService);
    submitSignup(data: SignupData): Observable<User> {
    const email = data.email.trim().toLowerCase();

    return this.authService.emailExists(email).pipe(
      switchMap(exists =>
        exists
          ? throwError(() => new Error('EMAIL_EXISTS'))
          : this.authService.register({
              firstName: data.firstName.trim(),
              lastName: data.lastName.trim(),
              email,
              password: data.password,
              department: data.department,
              position: data.position.trim(),
              phone: data.phone.trim()
            })
      ),
      switchMap(user =>
        this.notifyAdmins(user).pipe(map(() => user))
      )
    );
  }
  private notifyAdmins(user: User): Observable<unknown> {
    const fullName = `${user.firstName} ${user.lastName}`;

    const notification: NotificationInt = {
      title: 'New Account Request',
      message: `${fullName} signed up and is waiting for your approval.`,
      type: 'account-request',
      relatedId: user.id,
      audience: 'admin',
      params: { employeeName: fullName },
      isRead: false,
      createdAt: new Date().toISOString()
    };

    return this.notificationService.addNotification(notification).pipe(
      catchError(error => {
        console.error('Failed to create account notification:', error);
        return of(null);
      })
    );
  }
  getPendingAccounts(): Observable<User[]> {
    return this.authService.getPendingUsers();
  }

  approveAccount(user: User): Observable<User> {
    if (!user.id) {
      return throwError(() => new Error('MISSING_USER_ID'));
    }

    const userId = user.id;

    return this.findOrCreateEmployee(user).pipe(
      switchMap(employee =>
        this.ensureBalance(employee).pipe(map(() => employee))
      ),
      switchMap(employee =>
        this.authService.updateUserById(userId, {
          status: 'active',
          employeeId: String(employee.id),
          department: employee.department,
          position: employee.position
        })
      )
    );
  }

  rejectAccount(user: User): Observable<User> {
    if (!user.id) {
      return throwError(() => new Error('MISSING_USER_ID'));
    }

    return this.authService.updateUserById(user.id, {
      status: 'rejected'
    });
  }

  private findOrCreateEmployee(user: User): Observable<Employee> {
    const email = user.email.trim().toLowerCase();

    return this.employeeService.getEmployees().pipe(
      switchMap(employees => {
        const existing = employees.find(
          employee => employee.email.trim().toLowerCase() === email
        );

        if (existing) {
          return of(existing);
        }

        const newEmployee: Employee = {
          employeeId: this.nextEmployeeCode(employees),
          firstName: user.firstName,
          lastName: user.lastName,
          email,
          phone: user.phone ?? '',
          department: user.department || 'Engineering',
          position: user.position?.trim() || 'Employee',
          status: 'active',
          hireDate: this.today()
        };

        return this.employeeService.addEmployee(newEmployee);
      })
    );
  }

  private ensureBalance(employee: Employee): Observable<unknown> {
    return this.balanceService.getBalances().pipe(
      switchMap(balances => {
        const exists = balances.some(
          item => String(item.employeeId) === String(employee.id)
        );

        if (exists) {
          return of(null);
        }

        return this.balanceService.addBalance({
          employeeId: String(employee.id),
          employeeName: `${employee.firstName} ${employee.lastName}`,
          annual: 14,
          sick: 8,
          personal: 3,
          total: 25
        });
      })
    );
  }

  private nextEmployeeCode(employees: Employee[]): string {
    const used = new Set(employees.map(employee => employee.employeeId));

    let number = 1;
    let candidate = '';

    do {
      candidate = `EMP-${String(number).padStart(3, '0')}`;
      number++;
    } while (used.has(candidate));

    return candidate;
  }

  private today(): string {
    const date = new Date();

    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}