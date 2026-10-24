import { isPlatformBrowser } from '@angular/common';
import {
  AfterViewInit,
  Directive,
  ElementRef,
  NgZone,
  OnDestroy,
  PLATFORM_ID,
  Renderer2,
  inject
} from '@angular/core';

interface ParallaxLayer {
  element: HTMLElement;
  amount: number;
  currentX: number;
  currentY: number;
  targetX: number;
  targetY: number;
}

@Directive({
  selector: '[appParallax]',
  standalone: true
})
export class ParallaxDirective implements AfterViewInit, OnDestroy {
  private readonly element = inject(ElementRef<HTMLElement>);
  private readonly renderer = inject(Renderer2);
  private readonly zone = inject(NgZone);
  private readonly platformId = inject(PLATFORM_ID);
  private layers: ParallaxLayer[] = [];
  private frameId?: number;
  private removePointerMove?: () => void;
  private removePointerLeave?: () => void;
  private removeResize?: () => void;
  private motionPreference?: MediaQueryList;
  private hoverCapability?: MediaQueryList;
  private enabled = false;
  private pointerX = 0;
  private pointerY = 0;

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.enabled) {
      return;
    }

    const x = Math.max(-1, Math.min(1, (event.clientX / window.innerWidth - 0.5) * 2));
    const y = Math.max(-1, Math.min(1, (event.clientY / window.innerHeight - 0.5) * 2));
    const magnitude = Math.max(1, Math.hypot(x, y));
    this.pointerX = x / magnitude;
    this.pointerY = y / magnitude;
    this.setTargets();
    this.startAnimation();
  };

  private readonly onPointerLeave = (): void => {
    this.pointerX = 0;
    this.pointerY = 0;
    this.setTargets();
    this.startAnimation();
  };

  private readonly onEnvironmentChange = (): void => {
    this.updateEnabledState();
  };

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId) || typeof window.matchMedia !== 'function') {
      return;
    }

    const parallaxElements = this.element.nativeElement.querySelectorAll(
      '[data-parallax]'
    ) as NodeListOf<HTMLElement>;
    this.layers = Array.from(parallaxElements).map(layer => ({
      element: layer,
      amount: Number(layer.dataset['parallax']) || 0,
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0
    }));

    this.motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    this.hoverCapability = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (this.motionPreference.matches || !this.hoverCapability.matches) {
      return;
    }

    this.motionPreference.addEventListener('change', this.onEnvironmentChange);
    this.hoverCapability.addEventListener('change', this.onEnvironmentChange);

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
      this.removeResize = this.renderer.listen(window, 'resize', this.onEnvironmentChange);
    });
    this.updateEnabledState();
  }

  ngOnDestroy(): void {
    this.cancelFrame();
    this.removePointerMove?.();
    this.removePointerLeave?.();
    this.removeResize?.();
    this.motionPreference?.removeEventListener('change', this.onEnvironmentChange);
    this.hoverCapability?.removeEventListener('change', this.onEnvironmentChange);
    this.renderer.removeClass(this.element.nativeElement, 'parallax-ready');
  }

  private updateEnabledState(): void {
    const enabled = !!this.motionPreference
      && !this.motionPreference.matches
      && !!this.hoverCapability
      && this.hoverCapability.matches
      && window.innerWidth >= 900;

    if (enabled === this.enabled) {
      return;
    }

    this.enabled = enabled;
    if (enabled) {
      this.renderer.addClass(this.element.nativeElement, 'parallax-ready');
      return;
    }

    this.cancelFrame();
    this.renderer.removeClass(this.element.nativeElement, 'parallax-ready');
    for (const layer of this.layers) {
      layer.currentX = 0;
      layer.currentY = 0;
      layer.targetX = 0;
      layer.targetY = 0;
      this.renderer.removeStyle(layer.element, '--parallax-x');
      this.renderer.removeStyle(layer.element, '--parallax-y');
    }
  }

  private setTargets(): void {
    for (const layer of this.layers) {
      layer.targetX = this.pointerX * layer.amount;
      layer.targetY = this.pointerY * layer.amount;
    }
  }

  private startAnimation(): void {
    if (this.frameId === undefined) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  }

  private readonly animate = (): void => {
    this.frameId = undefined;
    let hasDistance = false;

    for (const layer of this.layers) {
      layer.currentX += (layer.targetX - layer.currentX) * 0.08;
      layer.currentY += (layer.targetY - layer.currentY) * 0.08;
      if (
        Math.abs(layer.targetX - layer.currentX) > 0.05
        || Math.abs(layer.targetY - layer.currentY) > 0.05
      ) {
        hasDistance = true;
      } else {
        layer.currentX = layer.targetX;
        layer.currentY = layer.targetY;
      }

      this.renderer.setStyle(layer.element, '--parallax-x', `${layer.currentX.toFixed(2)}px`);
      this.renderer.setStyle(layer.element, '--parallax-y', `${layer.currentY.toFixed(2)}px`);
    }

    if (hasDistance && this.enabled) {
      this.frameId = requestAnimationFrame(this.animate);
    }
  };

  private cancelFrame(): void {
    if (this.frameId !== undefined) {
      cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }
  }
}
