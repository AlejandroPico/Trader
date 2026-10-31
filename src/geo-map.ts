import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
} from "@angular/core";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { geography } from "./geography";
import type { Asset, Quote } from "./market";
const collection = { type: "FeatureCollection", features: geography } as const;
const path = geoPath(
  geoNaturalEarth1().fitExtent(
    [
      [22, 22],
      [978, 526],
    ],
    collection as any,
  ),
);
const shapes: { id: string; country: string; path: string }[] = geography.map(
  (country: any) => ({
    id: String(country.id ?? country.properties.name),
    country: country.country,
    path: path(country) || "",
  }),
);

@Component({
  selector: "geo-map",
  standalone: true,
  template: `<div class="geo-map">
    <svg
      viewBox="0 0 1000 548"
      preserveAspectRatio="xMidYMid meet"
      aria-label="Mapa mundial de países"
      role="img"
      (wheel)="wheel($event)"
      (pointerdown)="down($event)"
      (pointermove)="move($event)"
      (pointerup)="up($event)"
      (pointercancel)="release()"
      (pointerleave)="hover = ''"
    >
      <g
        [attr.transform]="'translate(' + x + ' ' + y + ') scale(' + zoom + ')'"
      >
        @for (shape of shapes; track shape.id) {
          <path
            [attr.d]="shape.path"
            [attr.data-country]="shape.country"
            [class.selected]="selected === shape.country"
            [attr.fill]="fills[shape.country] || 'var(--map-empty)'"
            vector-effect="non-scaling-stroke"
            (pointerenter)="hover = shape.country"
            (pointerleave)="hover = ''"
          >
            <title>{{ tooltip(shape.country) }}</title>
          </path>
        }
      </g>
    </svg>
    <div class="geo-tools">
      <button (click)="scale(1.5)" aria-label="Ampliar mapa">+</button
      ><button (click)="scale(1 / 1.5)" aria-label="Reducir mapa">−</button
      ><button (click)="reset()" aria-label="Restablecer mapa">↺</button>
    </div>
    @if (hover) {
      <div class="geo-caption">{{ tooltip(hover) }}</div>
    }
  </div>`,
})
export class GeoMap implements OnChanges {
  @Input() assets: Asset[] = [];
  @Input() quotes: Record<string, Quote> = {};
  @Input() macro = false;
  @Input() selected = "";
  @Input() macroValues: {
    country: string;
    value: number | null;
    year: number | null;
  }[] = [];
  @Output() pick = new EventEmitter<string>();
  shapes = shapes;
  fills: Record<string, string> = {};
  labels: Record<string, string> = {};
  x = 0;
  y = 0;
  zoom = 1;
  hover = "";
  private drag?: {
    id: number;
    x: number;
    y: number;
    originalX: number;
    originalY: number;
    country: string;
    moved: boolean;
  };
  ngOnChanges() {
    const fills: Record<string, string> = {},
      labels: Record<string, string> = {};
    const values = this.macroValues
      .map((v) => v.value)
      .filter((v): v is number => v !== null && Number.isFinite(v));
    const min = Math.min(0, ...values),
      span = Math.max(1, ...values) - min;
    for (const shape of shapes) {
      const quote = this.assets
        .filter((a) => a.country === shape.country && a.type === "Índices")
        .map((a) => this.quotes[a.symbol])
        .find(Boolean);
      const macro = this.macroValues.find((m) => m.country === shape.country);
      const value = this.macro ? macro?.value : quote?.change;
      if (value == null || !Number.isFinite(value)) continue;
      fills[shape.country] = this.macro
        ? `hsl(${220 - (180 * (value - min)) / span} 36% 50%)`
        : value >= 0
          ? `hsl(160 40% ${28 + Math.min(value, 3) * 5}%)`
          : `hsl(348 37% ${32 + Math.min(-value, 3) * 5}%)`;
      labels[shape.country] =
        `${shape.country} · ${value >= 0 ? "+" : ""}${value.toLocaleString("es-ES", { maximumFractionDigits: 2 })} % · ${this.macro ? macro?.year : new Date(quote!.asOf).toLocaleString("es-ES")}`;
    }
    this.fills = fills;
    this.labels = labels;
  }
  tooltip(country: string) {
    return this.labels[country] || country + " · Sin datos";
  }
  reset() {
    this.x = this.y = 0;
    this.zoom = 1;
  }
  scale(factor: number, px = 500, py = 274) {
    const next = Math.max(1, Math.min(12, this.zoom * factor)),
      ratio = next / this.zoom;
    this.x = px - (px - this.x) * ratio;
    this.y = py - (py - this.y) * ratio;
    this.zoom = next;
    if (next === 1) this.reset();
  }
  private point(event: MouseEvent) {
    const svg = event.currentTarget as SVGSVGElement,
      matrix = svg.getScreenCTM();
    return matrix
      ? new DOMPoint(event.clientX, event.clientY).matrixTransform(
          matrix.inverse(),
        )
      : new DOMPoint(500, 274);
  }
  wheel(event: WheelEvent) {
    event.preventDefault();
    const p = this.point(event);
    this.scale(Math.exp(-event.deltaY * 0.0015), p.x, p.y);
  }
  down(event: PointerEvent) {
    if (event.button !== 0) return;
    const p = this.point(event);
    this.drag = {
      id: event.pointerId,
      x: p.x,
      y: p.y,
      originalX: this.x,
      originalY: this.y,
      country: this.hover,
      moved: false,
    };
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
  }
  move(event: PointerEvent) {
    if (!this.drag) return;
    const p = this.point(event),
      dx = p.x - this.drag.x,
      dy = p.y - this.drag.y;
    if (Math.hypot(dx, dy) > 4) this.drag.moved = true;
    if (this.zoom > 1) {
      this.x = this.drag.originalX + dx;
      this.y = this.drag.originalY + dy;
    }
  }
  up(event: PointerEvent) {
    const drag = this.drag;
    this.release();
    if ((event.currentTarget as Element).hasPointerCapture(event.pointerId))
      (event.currentTarget as Element).releasePointerCapture(event.pointerId);
    if (drag && !drag.moved && drag.country) this.pick.emit(drag.country);
  }
  release() {
    this.drag = undefined;
  }
}
