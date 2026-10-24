import { Directive, ElementRef, EventEmitter, HostListener, Input, Output, inject } from '@angular/core';

@Directive({
  selector: '[appMenuInteractions]',
  standalone: true
})
export class MenuInteractionsDirective {
  private readonly element = inject(ElementRef<HTMLElement>);

  @Input() menuOpen = false;
  @Output() menuDismiss = new EventEmitter<void>();
  @Output() menuEscape = new EventEmitter<void>();

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (this.menuOpen && !this.element.nativeElement.contains(event.target as Node)) {
      this.menuDismiss.emit();
    }
  }

  @HostListener('keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (!this.menuOpen) {
      return;
    }

    const host = this.element.nativeElement as HTMLElement;
    const trigger = host.querySelector<HTMLElement>('[aria-expanded]');
    const items = Array.from(host.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'));
    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    if (event.key === 'Escape') {
      event.preventDefault();
      this.menuEscape.emit();
      trigger?.focus();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      if (items.length === 0) {
        return;
      }

      const nextIndex = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? items.length - 1
          : currentIndex < 0
            ? 0
            : (currentIndex + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[nextIndex].focus();
    }
  }
}
