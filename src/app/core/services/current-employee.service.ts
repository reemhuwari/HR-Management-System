import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';

import { AuthService } from './auth.service';
import { EmployeeService } from './employee.service';
import { Employee } from '../models/employee.model';

@Injectable({
  providedIn: 'root'
})
export class CurrentEmployeeService {
  private readonly authService = inject(AuthService);
  private readonly employeeService = inject(EmployeeService);

  getCurrentEmployee(): Observable<Employee | null> {
    const user = this.authService.getCurrentUser();

    if (!user) {
      return of(null);
    }

    return this.employeeService.getEmployees().pipe(
      map(employees => {
        if (user.employeeId) {
          const linked = employees.find(
            employee => String(employee.id) === String(user.employeeId)
          );

          if (linked) {
            return linked;
          }
        }

        const email = user.email.trim().toLowerCase();

        return employees.find(
          employee => employee.email.trim().toLowerCase() === email
        ) ?? null;
      })
    );
  }
}