import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login')
        .then(m => m.LoginComponent)
  },

  {
    path: 'signup',
    loadComponent: () =>
      import('./features/auth/signup/signup')
        .then(m => m.SignupComponent)
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/components/main-layout/main-layout')
        .then(m => m.MainLayoutComponent),

    children: [

      {
        path: '',
        canActivate: [roleGuard],
        data: { roles: ['admin', 'hr'] },
        children: [
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/dashboard/dashboard/dashboard')
                .then(m => m.DashboardComponent)
          },
          {
            path: 'employees',
            loadComponent: () =>
              import('./features/employees/employees/employees')
                .then(m => m.EmployeesComponent)
          },
          {
            path: 'employees/:id',
            loadComponent: () =>
              import('./features/employees/employee-details/employee-details')
                .then(m => m.EmployeeDetailsComponent)
          },
          {
            path: 'employees/:id/edit',
            loadComponent: () =>
              import('./features/employees/employee-edit/employee-edit')
                .then(m => m.EmployeeEditComponent)
          },
          {
            path: 'attendance',
            loadComponent: () =>
              import('./features/attendance/attendace')
                .then(m => m.Attendace)
          },
          {
            path: 'leave-requests/new',
            loadComponent: () =>
              import('./features/leave-requests/leave-request-form/leave-request-form')
                .then(m => m.LeaveRequestFormComponent)
          },
          {
            path: 'leave-requests',
            loadComponent: () =>
              import('./features/leave-requests/leave-requests/leave-requests')
                .then(m => m.LeaveRequestsComponent)
          },
          {
            path: 'leave-balances',
            loadComponent: () =>
              import('./features/leave-balances/leave-balances/leave-balances')
                .then(m => m.LeaveBalancesComponent)
          }
        ]
      },

           
      {
        path: 'employee',
        canActivate: [roleGuard],
        data: { roles: ['employee'] },
        children: [
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/employees/employee-dashboard/employee-dashboard')
                .then(m => m.EmployeeDashboard)
          },
          {
            path: 'attendance',
            loadComponent: () =>
              import('./features/employees/my-attendance/my-attendance')
                .then(m => m.MyAttendance)
          },
          {
            path: 'leave-requests',
            loadComponent: () =>
              import('./features/employees/my-leave-requests/my-leave-requests')
                .then(m => m.MyLeaveRequests)
          },
          {
            path: 'request-leave',
            loadComponent: () =>
              import('./features/employees/request-leave/request-leave')
                .then(m => m.RequestLeave)
          },
          {
            path: 'leave-balance',
            loadComponent: () =>
              import('./features/employees/my-leave-balance/my-leave-balance')
                .then(m => m.MyLeaveBalance)
          }
        ]
      },

      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/my-profile/my-profile')
            .then(m => m.MyProfile)
      },      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications')
            .then(m => m.Notifications)
      },
      {
        path: 'profile/edit',
        loadComponent: () =>
          import('./features/profile/edit-profile/edit-profile')
            .then(m => m.EditProfile)
      }
    ]
  },

  { path: '**', redirectTo: 'dashboard' }
];