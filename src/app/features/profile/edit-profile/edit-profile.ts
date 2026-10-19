import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';
@Component({
  selector: 'app-edit-profile',
  imports: [CommonModule, ReactiveFormsModule, RouterLink,
  TranslatePipe],
  templateUrl: './edit-profile.html',
  styleUrl: './edit-profile.scss',
})
export class EditProfile {
private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  saving = false;
  successMessage = '';
  errorMessage = '';

  private readonly user = this.authService.getCurrentUser();

  readonly form = this.fb.nonNullable.group({
    firstName: [
      this.user?.firstName ?? '',
      [Validators.required, Validators.maxLength(50)]
    ],
    lastName: [
      this.user?.lastName ?? '',
      [Validators.required, Validators.maxLength(50)]
    ],
    email: [
      this.user?.email ?? '',
      [Validators.required, Validators.email]
    ],
    department: [this.user?.department ?? '', Validators.maxLength(100)],
    position: [this.user?.position ?? '', Validators.maxLength(100)]
  });

  constructor() {
    if (!this.user) {
      void this.router.navigate(['/login']);
    }
  }

  saveChanges(): void {
    this.successMessage = '';
    this.errorMessage = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (!this.user?.id) {
      this.errorMessage = 'Your account could not be identified.';
      return;
    }

    this.saving = true;

    this.authService.updateCurrentUser(this.form.getRawValue()).subscribe({
      next: () => {
        this.saving = false;
        this.successMessage = 'Your profile has been updated successfully.';

        setTimeout(() => {
          void this.router.navigate(['/profile']);
        }, 700);
      },
      error: () => {
        this.saving = false;
        this.errorMessage =
          'Unable to save your changes. Please try again.';
      }
    });
  }
}
