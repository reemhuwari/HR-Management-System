import { isPlatformBrowser } from '@angular/common';
import {
  Directive,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  PLATFORM_ID,
  SimpleChanges,
  inject
} from '@angular/core';

@Directive({
  selector: '[appCountUp]',
  standalone: true
})
export class CountUpDirective implements OnChanges, OnDestroy {
  @Input() appCountUp = 0;

  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly platformId = inject(PLATFORM_ID);
  private frameId?: number;
  private reducedMotion?: MediaQueryList;
  private initialized = false;
  private lastTarget = 0;
  private readonly onMotionPreferenceChange = (event: MediaQueryListEvent): void => {
    if (event.matches) {
      this.cancelFrame();
      this.render(this.lastTarget);
    }
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['appCountUp']) {
      return;
    }

    this.lastTarget = this.integerValue(this.appCountUp);
    if (!isPlatformBrowser(this.platformId)) {
      this.render(this.lastTarget);
      return;
    }

    if (typeof window.matchMedia !== 'function') {
      this.render(this.lastTarget);
      return;
    }

    this.reducedMotion ??= window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!this.initialized) {
      this.initialized = true;
      this.reducedMotion.addEventListener('change', this.onMotionPreferenceChange);
      this.animate(0, this.lastTarget, 600);
      return;
    }

    const previousValue = this.integerValue(changes['appCountUp'].previousValue ?? 0);
    this.animate(previousValue, this.lastTarget, 250);
  }

  ngOnDestroy(): void {
    this.cancelFrame();
    this.reducedMotion?.removeEventListener('change', this.onMotionPreferenceChange);
  }

  private animate(start: number, end: number, duration: number): void {
    this.cancelFrame();
    if (this.reducedMotion?.matches || start === end) {
      this.render(end);
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number): void => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      this.render(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        this.frameId = requestAnimationFrame(tick);
      } else {
        this.frameId = undefined;
        this.render(end);
      }
    };

    this.frameId = requestAnimationFrame(tick);
  }

  private cancelFrame(): void {
    if (this.frameId !== undefined) {
      cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }
  }

  private render(value: number): void {
    this.element.nativeElement.textContent = String(value);
  }

  private integerValue(value: number): number {
    return Number.isFinite(value) ? Math.round(value) : 0;
  }
}
