import {
  AfterViewInit,
  Directive,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
} from "@angular/core";
@Directive({ selector: "[tDialog]", standalone: true })
export class DialogFocus implements AfterViewInit, OnDestroy {
  private el = inject<ElementRef<HTMLElement>>(ElementRef);
  private previous = document.activeElement as HTMLElement | null;
  private controls() {
    return Array.from(
      this.el.nativeElement.querySelectorAll<HTMLElement>(
        'button:not([disabled]),input:not([disabled]),select:not([disabled]),a[href],[tabindex="0"]',
      ),
    ).filter((e) => e.getClientRects().length > 0);
  }
  ngAfterViewInit() {
    queueMicrotask(() => {
      (
        this.el.nativeElement.querySelector<HTMLElement>("input[autofocus]") ??
        this.controls()[0]
      )?.focus();
    });
  }
  @HostListener("keydown", ["$event"]) key(event: KeyboardEvent) {
    if (event.key !== "Tab") return;
    const controls = this.controls(),
      first = controls[0],
      last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }
  ngOnDestroy() {
    queueMicrotask(() =>
      (this.previous?.isConnected
        ? this.previous
        : document.querySelector<HTMLElement>(".app-menu")
      )?.focus(),
    );
  }
}
