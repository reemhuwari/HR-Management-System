import { Pipe, PipeTransform, inject } from '@angular/core';

import { LanguageService } from '../services/language.service';
import { NotificationInt } from '../models/notification.model';

@Pipe({
  name: 'notificationText',
  standalone: true,
  pure: false
})
export class NotificationTextPipe implements PipeTransform {
  private readonly languageService = inject(LanguageService);

  transform(
    notification: NotificationInt,
    part: 'title' | 'message'
  ): string {
    const fallback = part === 'title' ? notification.title : notification.message;
    const params = notification.params;

    if (!params) {
      return fallback;
    }

    const key =
      `NOTIF_TEXT.${notification.type.toUpperCase().replace(/-/g, '_')}` +
      `.${part.toUpperCase()}`;

    const text = this.languageService.translate(key);

    if (text === key) {
      return fallback;
    }

    return text
      .split('{name}').join(params.employeeName ?? '')
      .split('{type}').join(this.leaveTypeLabel(params.leaveType))
      .split('{days}').join(String(params.days ?? ''));
  }

  private leaveTypeLabel(type?: string): string {
    if (!type) {
      return '';
    }

    const key = `LEAVE_TYPE.${type
      .trim()
      .toUpperCase()
      .replace(/\s*LEAVE\s*$/, '')
      .replace(/\s+/g, '_')}`;

    const translated = this.languageService.translate(key);
    const label = translated === key ? type : translated;

    return this.languageService.currentLanguage === 'en'
      ? label.toLowerCase()
      : label;
  }
}