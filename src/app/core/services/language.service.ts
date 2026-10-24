
import { DOCUMENT, isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { BehaviorSubject, catchError, of } from 'rxjs';

export type AppLanguage = 'en' | 'ar';

type TranslationValue = string | { [key: string]: TranslationValue };
type TranslationDictionary = { [key: string]: TranslationValue };

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly storageKey = 'peopleflow_language';

  private readonly document = inject(DOCUMENT);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly http = inject(HttpClient);
  private langFadeTimer?: ReturnType<typeof setTimeout>;

  private readonly languageSubject = new BehaviorSubject<AppLanguage>(
    this.getInitialLanguage()
  );

  private readonly translationsSubject =
    new BehaviorSubject<TranslationDictionary>({});

  readonly language$ = this.languageSubject.asObservable();

  constructor() {
    this.applyLanguage(this.currentLanguage);
    this.loadTranslations(this.currentLanguage);
  }

  get currentLanguage(): AppLanguage {
    return this.languageSubject.value;
  }

  setLanguage(language: AppLanguage): void {
    if (language !== 'en' && language !== 'ar') {
      return;
    }

    if (language === this.currentLanguage) {
      return;
    }

    this.languageSubject.next(language);
    this.applyLanguage(language);
    const root = this.document.documentElement;
    root.classList.add('lang-fade');
    if (this.langFadeTimer) {
      clearTimeout(this.langFadeTimer);
    }
    this.langFadeTimer = setTimeout(() => {
      root.classList.remove('lang-fade');
      this.langFadeTimer = undefined;
    }, 220);

    if (isPlatformBrowser(this.platformId)) {
      try {
        localStorage.setItem(this.storageKey, language);
      } catch {
      }
    }

    this.loadTranslations(language);
  }

  translate(key: string): string {
    const parts = key.split('.');
    let value: TranslationValue | undefined =
      this.translationsSubject.value;

    for (const part of parts) {
      if (
        typeof value !== 'object' ||
        value === null ||
        !(part in value)
      ) {
        return key;
      }

      value = value[part];
    }

    return typeof value === 'string' ? value : key;
  }

  private loadTranslations(language: AppLanguage): void {
    this.http
      .get<TranslationDictionary>(`/i18n/${language}.json`)
      .pipe(
        catchError(error => {
          console.error(
            `Failed to load ${language}.json translations:`,
            error
          );

          return of<TranslationDictionary>({});
        })
      )
      .subscribe(translations => {
        if (language !== this.currentLanguage) {
          return;
        }

        this.translationsSubject.next(translations);
      });
  }

  private getInitialLanguage(): AppLanguage {
    if (!isPlatformBrowser(this.platformId)) {
      return 'en';
    }

    try {
      return localStorage.getItem(this.storageKey) === 'ar'
        ? 'ar'
        : 'en';
    } catch {
      return 'en';
    }
  }

  private applyLanguage(language: AppLanguage): void {
    this.document.documentElement.lang = language;
    this.document.documentElement.dir =
      language === 'ar' ? 'rtl' : 'ltr';
  }
}
