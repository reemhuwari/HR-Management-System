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
  selector: '[appTilt]',
  standalone: true
})
export class TiltDirective implements OnInit, OnDestroy {
  @Input('appTilt') maxAngle = 5;

  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private frameId?: number;
  private removePointerMove?: () => void;
  private removePointerLeave?: () => void;
  private motionPreference?: MediaQueryList;
  private hoverCapability?: MediaQueryList;
  private enabled = false;
  private pendingX = 0;
  private pendingY = 0;

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled) {
      return;
    }

    const bounds = this.element.nativeElement.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;
    this.pendingX = Math.max(-0.5, Math.min(0.5, x));
    this.pendingY = Math.max(-0.5, Math.min(0.5, y));

    this.renderer.addClass(this.element.nativeElement, 'tilt-active');
    this.renderer.setStyle(this.element.nativeElement, 'will-change', 'transform');
    if (this.frameId === undefined) {
      this.frameId = requestAnimationFrame(() => {
        this.frameId = undefined;
        const angle = Math.max(0, Math.min(15, this.maxAngle));
        this.renderer.setStyle(
          this.element.nativeElement,
          '--tilt-x',
          `${-this.pendingY * angle * 2}deg`
        );
        this.renderer.setStyle(
          this.element.nativeElement,
          '--tilt-y',
          `${this.pendingX * angle * 2}deg`
        );
        this.renderer.setStyle(
          this.element.nativeElement,
          '--glare-x',
          `${(this.pendingX + 0.5) * 100}%`
        );
        this.renderer.setStyle(
          this.element.nativeElement,
          '--glare-y',
          `${(this.pendingY + 0.5) * 100}%`
        );
      });
    }
  };

  private readonly onPointerLeave = (): void => {
    this.cancelFrame();
    this.renderer.removeClass(this.element.nativeElement, 'tilt-active');
    this.renderer.removeStyle(this.element.nativeElement, 'will-change');
    this.renderer.setStyle(this.element.nativeElement, '--tilt-x', '0deg');
    this.renderer.setStyle(this.element.nativeElement, '--tilt-y', '0deg');
  };

  private readonly onPreferenceChange = (): void => {
    this.updateEnabledState();
  };

  ngOnInit(): void {
    if (!isPlatformBrowser(this.platformId) || typeof window.matchMedia !== 'function') {
      return;
    }

    this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.hoverCapability = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (this.motionPreference.matches || !this.hoverCapability.matches) {
      return;
    }

    this.motionPreference.addEventListener('change', this.onPreferenceChange);
    this.hoverCapability.addEventListener('change', this.onPreferenceChange);

    this.zone.runOutsideAngular(() => {
      this.removePointerMove = this.renderer.listen(
        this.element.nativeElement,
        'pointermove',
        this.onPointerMove
      );
      this.removePointerLeave = this.renderer.listen(
        this.element.nativeElement,
        'pointerleave',
        this.onPointerLeave
      );
    });
    this.updateEnabledState();
  }

  ngOnDestroy(): void {
    this.cancelFrame();
    this.removePointerMove?.();
    this.removePointerLeave?.();
    this.motionPreference?.removeEventListener('change', this.onPreferenceChange);
    this.hoverCapability?.removeEventListener('change', this.onPreferenceChange);
    this.renderer.removeStyle(this.element.nativeElement, 'will-change');
  }

  private updateEnabledState(): void {
    const enabled = !!this.motionPreference
      && !this.motionPreference.matches
      && !!this.hoverCapability
      && this.hoverCapability.matches;

    if (enabled === this.enabled) {
      return;
    }

    this.enabled = enabled;
    if (enabled) {
      this.renderer.addClass(this.element.nativeElement, 'tilt');
      return;
    }

    this.onPointerLeave();
    this.renderer.removeClass(this.element.nativeElement, 'tilt');
  }

  private cancelFrame(): void {
    if (this.frameId !== undefined) {
      cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }
  }
}
