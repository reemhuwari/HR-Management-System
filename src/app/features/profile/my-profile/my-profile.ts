import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
@Component({
  selector: 'app-my-profile',
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './my-profile.html',
  styleUrl: './my-profile.scss',
})
export class MyProfile {
 private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  user = this.authService.getCurrentUser();

  constructor() {
    if (!this.user) {
      void this.router.navigate(['/login']);
    }
  }

  get fullName(): string {
    if (!this.user) {
      return '';
    }

    return `${this.user.firstName} ${this.user.lastName}`.trim();
  }

  get initials(): string {
    if (!this.user) {
      return '';
    }

    return `${this.user.firstName?.charAt(0) ?? ''}${
      this.user.lastName?.charAt(0) ?? ''
    }`.toUpperCase();
  }

  editProfile(): void {
    void this.router.navigate(['/profile/edit']);
  }
}
