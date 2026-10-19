import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';

import { EmployeeService } from '../../../core/services/employee.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { Employee } from '../../../core/models/employee.model';

@Component({
  selector: 'app-employee-edit',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslatePipe
  ],
  templateUrl: './employee-edit.html',
  styleUrl: './employee-edit.scss'
})
export class EmployeeEditComponent implements OnInit {

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly employeeService = inject(EmployeeService);

  employeeId = '';

  employee: Employee = {
    employeeId: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    department: '',
    position: '',
    status: 'active',
    hireDate: ''
  };

  isLoading = true;
  isSaving = false;
  hasError = false;
  saveSuccess = false;

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.hasError = true;
      this.isLoading = false;
      return;
    }

    this.employeeId = id;

    this.loadEmployee(id);
  }

  loadEmployee(id: string): void {
    this.isLoading = true;
    this.hasError = false;

    this.employeeService
      .getEmployee(id)
      .subscribe({
        next: employee => {
          this.employee = { ...employee };
          this.isLoading = false;
        },

        error: error => {
          console.error('Failed to load employee:', error);

          this.hasError = true;
          this.isLoading = false;
        }
      });
  }

  saveChanges(): void {
    if (!this.employeeId) {
      return;
    }

    if (
      !this.employee.firstName.trim() ||
      !this.employee.lastName.trim() ||
      !this.employee.email.trim() ||
      !this.employee.phone.trim() ||
      !this.employee.department.trim() ||
      !this.employee.position.trim() ||
      !this.employee.hireDate
    ) {
      return;
    }

    this.isSaving = true;
    this.saveSuccess = false;

    this.employeeService
      .updateEmployee(this.employeeId, this.employee)
      .subscribe({
        next: updatedEmployee => {
          this.employee = { ...updatedEmployee };

          this.isSaving = false;
          this.saveSuccess = true;

          setTimeout(() => {
            this.router.navigate(['/employees', this.employeeId]);
          }, 700);
        },

        error: error => {
          console.error('Failed to update employee:', error);

          this.isSaving = false;
        }
      });
  }

  cancel(): void {
    this.router.navigate(['/employees', this.employeeId]);
  }

  goBack(): void {
    this.router.navigate(['/employees', this.employeeId]);
  }
}