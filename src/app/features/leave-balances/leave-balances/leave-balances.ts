
import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { LeaveBalance } from '../../../core/models/leave-balance.model';
import { LeaveBalanceService } from '../../../core/services/leave-balance.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

@Component({
  selector: 'app-leave-balances',
  standalone: true,
  imports: [CommonModule, FormsModule,TranslatePipe],
  templateUrl: './leave-balances.html',
  styleUrl: './leave-balances.scss'
})
export class LeaveBalancesComponent implements OnInit {
  private readonly balanceService = inject(LeaveBalanceService);

  balances: LeaveBalance[] = [];

  searchTerm = '';
  isLoading = true;
  errorMessage = '';

  ngOnInit(): void {
    this.loadBalances();
  }

  loadBalances(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.balanceService.getBalances().subscribe({
      next: balances => {
        this.balances = balances;
        this.isLoading = false;
      },
      error: error => {
        console.error('Failed to load leave balances:', error);

        this.errorMessage =
          'Unable to load leave balances. Please make sure JSON Server is running.';

        this.isLoading = false;
      }
    });
  }

  get filteredBalances(): LeaveBalance[] {
    const search = this.searchTerm.trim().toLowerCase();

    return this.balances.filter(balance => {
      const name = (balance.employeeName ?? '').toLowerCase();
      const employeeId = (balance.employeeId ?? '').toLowerCase();

      return !search ||
        name.includes(search) ||
        employeeId.includes(search);
    });
  }

  get totalAnnual(): number {
    return this.balances.reduce(
      (sum, balance) => sum + Number(balance.annual || 0),
      0
    );
  }

  get totalSick(): number {
    return this.balances.reduce(
      (sum, balance) => sum + Number(balance.sick || 0),
      0
    );
  }

  get totalPersonal(): number {
    return this.balances.reduce(
      (sum, balance) => sum + Number(balance.personal || 0),
      0
    );
  }

  get totalRemaining(): number {
    return this.balances.reduce(
      (sum, balance) => sum + Number(balance.total || 0),
      0
    );
  }

  get lowBalanceCount(): number {
    return this.balances.filter(balance =>
      this.isLow(balance.annual) ||
      this.isLow(balance.sick) ||
      this.isLow(balance.personal)
    ).length;
  }

  get employeesWithBalances(): number {
    return this.balances.length;
  }

  isLow(days: number): boolean {
    return Number(days) > 0 && Number(days) <= 3;
  }

  isDepleted(days: number): boolean {
    return Number(days) <= 0;
  }

  trackBalance(
    index: number,
    balance: LeaveBalance
  ): string | number {
    return balance.id ?? balance.employeeId ?? index;
  }
}
