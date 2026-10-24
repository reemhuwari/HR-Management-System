import { Injectable, signal } from '@angular/core';

type LoadingState = 'hidden' | 'loading' | 'finishing';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  readonly state = signal<LoadingState>('hidden');
  private requestCount = 0;
  private showTimer?: ReturnType<typeof setTimeout>;
  private finishTimer?: ReturnType<typeof setTimeout>;

  begin(): void {
    this.requestCount++;
    if (this.requestCount !== 1) {
      return;
    }

    this.clearTimers();
    this.state.set('hidden');
    this.showTimer = setTimeout(() => {
      if (this.requestCount > 0) {
        this.state.set('loading');
      }
    }, 150);
  }

  end(): void {
    if (this.requestCount === 0) {
      return;
    }

    this.requestCount--;
    if (this.requestCount !== 0) {
      return;
    }

    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = undefined;
    }

    if (this.state() !== 'loading') {
      this.state.set('hidden');
      return;
    }

    this.state.set('finishing');
    this.finishTimer = setTimeout(() => {
      this.state.set('hidden');
      this.finishTimer = undefined;
    }, 180);
  }

  private clearTimers(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = undefined;
    }
    if (this.finishTimer) {
      clearTimeout(this.finishTimer);
      this.finishTimer = undefined;
    }
  }
}
