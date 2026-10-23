import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  ViewChild
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators
} from '@angular/forms';
import { RouterLink } from '@angular/router';

import { LanguageService, type AppLanguage } from '../../../core/services/language.service';
import { RegistrationService } from '../../../core/services/registration.service';
import { TranslatePipe } from '../../../core/pipes/translate.pipe';

function passwordsMatch(
  control: AbstractControl
): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword
    ? null
    : { passwordsMismatch: true };
}

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    TranslatePipe
  ],
  templateUrl: './signup.html',
  styleUrl: './signup.scss'
})
export class SignupComponent implements AfterViewInit, OnDestroy {
  @ViewChild('authVideo') private authVideo?: ElementRef<HTMLVideoElement>;

  private readonly fb = inject(FormBuilder);
  private readonly languageService = inject(LanguageService);
  private readonly registrationService = inject(RegistrationService);
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
      console.error('Unable to resume the registration background video:', error);
    });
  };

  readonly currentYear = new Date().getFullYear();

  readonly departmentOptions = [
    { value: 'Engineering', key: 'DEPARTMENT_NAMES.ENGINEERING' },
    { value: 'Human Resources', key: 'DEPARTMENT_NAMES.HUMAN_RESOURCES' },
    { value: 'Finance', key: 'DEPARTMENT_NAMES.FINANCE' },
    { value: 'Marketing', key: 'DEPARTMENT_NAMES.MARKETING' },
    { value: 'Sales', key: 'DEPARTMENT_NAMES.SALES' }
  ];

  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  submitted = false;
  errorMessage = '';

  signupForm = this.fb.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      department: ['', [Validators.required]],
      position: ['', [Validators.maxLength(100)]],
      phone: ['', [Validators.pattern(/^\+?[0-9\s-]{7,20}$/)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
      terms: [false, Validators.requiredTrue]
    },
    {
      validators: passwordsMatch
    }
  );

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

  get firstName() {
    return this.signupForm.controls.firstName;
  }

  get lastName() {
    return this.signupForm.controls.lastName;
  }

  get email() {
    return this.signupForm.controls.email;
  }

  get department() {
    return this.signupForm.controls.department;
  }

  get position() {
    return this.signupForm.controls.position;
  }

  get phone() {
    return this.signupForm.controls.phone;
  }

  get password() {
    return this.signupForm.controls.password;
  }

  get confirmPassword() {
    return this.signupForm.controls.confirmPassword;
  }

  get terms() {
    return this.signupForm.controls.terms;
  }

  get currentLanguage(): AppLanguage {
    return this.languageService.currentLanguage;
  }

  setLanguage(lang: AppLanguage): void {
    this.languageService.setLanguage(lang);
  }

  private t(key: string): string {
    return this.languageService.translate(key);
  }

  get passwordStrength(): string {
    const password = this.password.value;

    if (!password) {
      return '';
    }

    if (password.length < 8) {
      return 'weak';
    }

    const score = [
      /\d/.test(password),
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ].filter(Boolean).length;

    if (score >= 3) {
      return 'strong';
    }

    return score >= 2 ? 'medium' : 'weak';
  }

  get passwordStrengthLabel(): string {
    switch (this.passwordStrength) {
      case 'weak':
        return this.t('SIGNUP.STRENGTH_WEAK');
      case 'medium':
        return this.t('SIGNUP.STRENGTH_MEDIUM');
      case 'strong':
        return this.t('SIGNUP.STRENGTH_STRONG');
      default:
        return '';
    }
  }

  onSubmit(): void {
    if (this.isLoading) {
      return;
    }

    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const value = this.signupForm.getRawValue();

    this.registrationService
      .submitSignup({
        firstName: value.firstName,
        lastName: value.lastName,
        email: value.email,
        password: value.password,
        department: value.department,
        position: value.position,
        phone: value.phone
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          this.submitted = true; 
        },

        error: error => {
          console.error('Registration failed:', error);

          this.isLoading = false;
          this.errorMessage =
            error?.message === 'EMAIL_EXISTS'
              ? this.t('SIGNUP.EMAIL_EXISTS')
              : this.t('SIGNUP.ERR_GENERIC');
        }
      });
  }
}