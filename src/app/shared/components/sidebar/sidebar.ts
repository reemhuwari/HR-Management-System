
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  inject,
  Input,
  Output
} from '@angular/core';
import {
  Router,
  RouterLink,
  RouterLinkActive
} from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import {
  LanguageService,
  AppLanguage
} from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
import { MenuInteractionsDirective } from '../../directives/menu-interactions.directive';

interface SidebarItem {
  labelKey: string;
  route: string;
  icon: string;
  roles?: Array<'employee' | 'hr' | 'admin'>;
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    RouterLinkActive,
    TranslatePipe,
    MenuInteractionsDirective
  ],
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.scss'
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly languageService = inject(LanguageService);

  @Input() isOpen = true;
  @Output() closeSidebar = new EventEmitter<void>();

  currentUser = this.authService.getCurrentUser();
  showLanguageMenu = false;

  get currentLanguage(): AppLanguage {
    return this.languageService.currentLanguage;
  }

    menuItems: SidebarItem[] = [
    { labelKey: 'NAV.DASHBOARD', route: '/dashboard', icon: 'dashboard', roles: ['hr', 'admin'] },
    { labelKey: 'NAV.EMPLOYEES', route: '/employees', icon: 'employees', roles: ['hr', 'admin'] },
    { labelKey: 'NAV.ATTENDANCE', route: '/attendance', icon: 'attendance', roles: ['hr', 'admin'] },
    { labelKey: 'NAV.LEAVE_REQUESTS', route: '/leave-requests', icon: 'leave', roles: ['hr', 'admin'] },
    { labelKey: 'NAV.LEAVE_BALANCES', route: '/leave-balances', icon: 'balance', roles: ['hr', 'admin'] },

    { labelKey: 'EMP_NAV.DASHBOARD', route: '/employee/dashboard', icon: 'dashboard', roles: ['employee'] },
    { labelKey: 'EMP_NAV.ATTENDANCE', route: '/employee/attendance', icon: 'attendance', roles: ['employee'] },
    { labelKey: 'EMP_NAV.LEAVE_REQUESTS', route: '/employee/leave-requests', icon: 'leave', roles: ['employee'] },
    { labelKey: 'EMP_NAV.REQUEST_LEAVE', route: '/employee/request-leave', icon: 'request', roles: ['employee'] },
    { labelKey: 'EMP_NAV.LEAVE_BALANCE', route: '/employee/leave-balance', icon: 'balance', roles: ['employee'] }
  ];

  get visibleMenuItems(): SidebarItem[] {
    const role = this.currentUser?.role;

    return this.menuItems.filter(item => {
      if (!item.roles) {
        return true;
      }

      return role ? item.roles.includes(role) : false;
    });
  }

  toggleLanguageMenu(): void {
    this.showLanguageMenu = !this.showLanguageMenu;
  }

  closeLanguageMenu(): void {
    this.showLanguageMenu = false;
  }

  changeLanguage(value: AppLanguage): void {
    this.languageService.setLanguage(value);
    this.showLanguageMenu = false;
  }

  close(): void {
    this.closeSidebar.emit();
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
