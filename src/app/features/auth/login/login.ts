import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild
} from '@angular/core';
import {
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/services/auth.service';
import { LanguageService, type AppLanguage } from '../../../core/services/language.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

type LoginRole = 'employee' | 'admin';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('authVideo') private authVideo?: ElementRef<HTMLVideoElement>;

  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly languageService = inject(LanguageService);
  private motionPreference?: MediaQueryList;
  private readonly handleMotionPreferenceChange = (
    event: MediaQueryListEvent
  ): void => {
    const video = this.authVideo?.nativeElement;

    if (!video) {
      return;
    }

    if (event.matches) {
      video.pause();
      return;
    }

    void video.play().catch(error => {
      console.error('Unable to resume the login background video:', error);
    });
  };

  readonly currentYear = new Date().getFullYear();

  selectedRole: LoginRole = 'employee';

  showPassword = false;
  isLoading = false;
  errorMessage = '';
  roleError = '';

  loginForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false]
  });

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') {
      return;
    }

    this.motionPreference = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    );

    if (this.motionPreference.matches) {
      this.authVideo?.nativeElement.pause();
    }

    this.motionPreference.addEventListener(
      'change',
      this.handleMotionPreferenceChange
    );
  }

  ngOnDestroy(): void {
    this.motionPreference?.removeEventListener(
      'change',
      this.handleMotionPreferenceChange
    );
  }

  get email() {
    return this.loginForm.controls.email;
  }

  get password() {
    return this.loginForm.controls.password;
  }

  get currentLanguage(): AppLanguage {
    return this.languageService.currentLanguage;
  }

  setLanguage(lang: AppLanguage): void {
    this.languageService.setLanguage(lang);
  }

  setRole(role: LoginRole): void {
    this.selectedRole = role;
    this.roleError = '';
    this.errorMessage = '';
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.roleError = '';

    const { email, password } = this.loginForm.getRawValue();

    this.authService
      .login(email.trim().toLowerCase(), password)
      .subscribe({
        next: user => {
          this.isLoading = false;

          if (!user) {
            this.password.setErrors({
              ...this.password.errors,
              invalidCredentials: true
            });
            this.password.markAsTouched();
            return;
          }
          if (user.status === 'pending') {
            this.roleError = 'LOGIN.ACCOUNT_PENDING';
            return;
          }

          if (user.status === 'rejected') {
            this.roleError = 'LOGIN.ACCOUNT_REJECTED';
            return;
          }
          const roleMatches =
            this.selectedRole === 'employee'
              ? user.role === 'employee'
              : user.role === 'admin' || user.role === 'hr';

          if (!roleMatches) {
            this.authService.logout();

            this.roleError =
              this.selectedRole === 'employee'
                ? 'LOGIN.ROLE_MISMATCH_EMPLOYEE'
                : 'LOGIN.ROLE_MISMATCH_ADMIN';
            return;
          }

          this.router.navigate([this.authService.homeRouteFor(user.role)]);
        },

        error: error => {
          console.error('Login failed:', error);

          this.isLoading = false;
          this.errorMessage =
            error?.error?.message ||
            error?.message ||
            'Unable to sign in. Please try again.';
        }
      });
  }
}