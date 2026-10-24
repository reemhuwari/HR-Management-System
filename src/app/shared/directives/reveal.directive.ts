import { isPlatformBrowser } from '@angular/common';
import {
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  Renderer2,
  inject
} from '@angular/core';

@Directive({
  selector: '[appReveal]',
  standalone: true
})
export class RevealDirective implements OnInit, OnDestroy {
  @Input('appReveal') staggerIndex = 0;

  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private observer?: IntersectionObserver;
  private reducedMotion?: MediaQueryList;
  private readonly onMotionPreferenceChange = (event: MediaQueryListEvent): void => {
    if (event.matches) {
      this.reveal();
    }
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    if (typeof window.matchMedia !== 'function') {
      this.reveal();
      return;
    }

    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (this.reducedMotion.matches || typeof IntersectionObserver === 'undefined') {
      this.reveal();
      return;
    }

    this.reducedMotion.addEventListener('change', this.onMotionPreferenceChange);
    this.renderer.setStyle(
      this.element.nativeElement,
      '--i',
      String(Math.max(0, this.staggerIndex))
    );
    this.renderer.setStyle(
      this.element.nativeElement,
      '--reveal-delay',
      `${Math.min(Math.max(0, this.staggerIndex) * 60, 400)}ms`
    );
    this.renderer.addClass(this.element.nativeElement, 'reveal');

    const bounds = this.element.nativeElement.getBoundingClientRect();
    if (bounds.top < window.innerHeight && bounds.bottom > 0) {
      this.reveal();
      return;
    }

    this.zone.runOutsideAngular(() => {
      this.observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) {
          this.zone.run(() => this.reveal());
        }
      }, { threshold: 0.15 });
      this.observer.observe(this.element.nativeElement);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    this.reducedMotion?.removeEventListener('change', this.onMotionPreferenceChange);
  }

  private reveal(): void {
    this.observer?.unobserve(this.element.nativeElement);
    this.renderer.addClass(this.element.nativeElement, 'is-visible');
  }
}
