import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Observable, map, of, switchMap } from 'rxjs';

import { CurrentEmployeeService } from '../../../core/services/current-employee.service';
import { LeaveBalanceService } from '../../../core/services/leave-balance.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

import { Employee } from '../../../core/models/employee.model';
import { LeaveBalance } from '../../../core/models/leave-balance.model';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { CountUpDirective } from '../../../shared/directives/count-up.directive';

interface BalanceCard {
  key: 'annual' | 'sick' | 'personal';
  labelKey: string;
  value: number;
  percent: number;
  isLow: boolean;
  isDepleted: boolean;
}

interface BalanceResult {
  employee: Employee | null;
  balance: LeaveBalance | null;
}

@Component({
  selector: 'app-my-leave-balance',
  standalone: true,
  imports: [RouterLink, TranslatePipe, RevealDirective, CountUpDirective],
  templateUrl: './my-leave-balance.html',
  styleUrl: './my-leave-balance.scss'
})
export class MyLeaveBalance implements OnInit {
  private readonly currentEmployeeService = inject(CurrentEmployeeService);
  private readonly balanceService = inject(LeaveBalanceService);

  employee: Employee | null = null;
  balance: LeaveBalance | null = null;

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
        switchMap((employee): Observable<BalanceResult> => {
          if (!employee?.id) {
            return of({ employee: null, balance: null });
          }

          return this.balanceService.getBalances().pipe(
            map(balances => ({
              employee,
              balance:
                balances.find(
                  item => String(item.employeeId) === String(employee.id)
                ) ?? null
            }))
          );
        })
      )
      .subscribe({
        next: result => {
          this.employee = result.employee;
          this.balance = result.balance;
          this.isLoading = false;
        },
        error: error => {
          console.error('Failed to load leave balance:', error);
          this.hasError = true;
          this.isLoading = false;
        }
      });
  }

  get totalRemaining(): number {
    return Number(this.balance?.total ?? 0);
  }

  get cards(): BalanceCard[] {
    if (!this.balance) {
      return [];
    }

    const values = {
      annual: Number(this.balance.annual || 0),
      sick: Number(this.balance.sick || 0),
      personal: Number(this.balance.personal || 0)
    };

    const max = Math.max(values.annual, values.sick, values.personal, 1);

    const build = (
      key: BalanceCard['key'],
      labelKey: string
    ): BalanceCard => ({
      key,
      labelKey,
      value: values[key],
      percent: (values[key] / max) * 100,
      isLow: values[key] > 0 && values[key] <= 3,
      isDepleted: values[key] <= 0
    });

    return [
      build('annual', 'LEAVE_TYPE.ANNUAL'),
      build('sick', 'LEAVE_TYPE.SICK'),
      build('personal', 'LEAVE_TYPE.PERSONAL')
    ];
  }
}