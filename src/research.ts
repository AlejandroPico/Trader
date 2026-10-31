import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  ChangeDetectorRef,
  inject,
} from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { IconComponent } from "./icon";
import { MarketVisual } from "./chart";
import { Asset, requestJson } from "./market";
import { CalendarEvent } from "./state";
import { desktopApi } from "./desktop-client";
interface YieldPoint {
  symbol: string;
  label: string;
  years: number;
  value: number | null;
  previous: number | null;
  asOf: number;
  previousTime: number;
}
interface MacroCountry {
  code: string;
  country: string;
  value: number | null;
  year: number | null;
  values: { year: number; value: number }[];
}
@Component({
  selector: "research-panel",
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, MarketVisual],
  templateUrl: "./research.html",
})
export class ResearchPanel implements OnChanges {
  @Input() view = "news";
  @Input() api = "";
  @Input() theme = "dark";
  @Input() assets: Asset[] = [];
  @Input() events: CalendarEvent[] = [];
  @Output() eventsChange = new EventEmitter<CalendarEvent[]>();
  private cdr = inject(ChangeDetectorRef);
  private request = 0;
  loading = false;
  error = "";
  source = "";
  updated = "";
  newsSymbol = "AAPL";
  articles: {
    id: string;
    title: string;
    publisher: string;
    url: string;
    time: number;
  }[] = [];
  yields: YieldPoint[] = [];
  macro: MacroCountry[] = [];
  indicator = "gdp";
  macroCountry = "España";
  macroLabel = "";
  macroUrl = "";
  eventTitle = "";
  eventDate = "";
  eventCountry = "España";
  eventNotes = "";
  calendarQuery = "";
  showPast = false;
  ngOnChanges(changes: any) {
    if (changes["view"] || changes["api"]) void this.load();
  }
  get countries() {
    return [...new Set(this.assets.map((a) => a.country))].filter(
      (c) => c !== "Global",
    );
  }
  get shownEvents() {
    return this.events
      .filter(
        (e) =>
          (this.showPast || Date.parse(e.date) >= Date.now() - 86400000) &&
          (!this.calendarQuery ||
            (e.title + " " + e.country + " " + e.notes)
              .toLowerCase()
              .includes(this.calendarQuery.toLowerCase())),
      )
      .sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
  }
  get macroSelected() {
    return this.macro.find((c) => c.country === this.macroCountry);
  }
  get yieldBounds() {
    const v = this.yields
      .flatMap((p) => [p.value, p.previous])
      .filter((x): x is number => x !== null);
    return {
      min: Math.floor(((v.length ? Math.min(...v) : 0) - 0.25) * 2) / 2,
      max: Math.ceil(((v.length ? Math.max(...v) : 5) + 0.25) * 2) / 2,
    };
  }
  get yieldTicks() {
    const b = this.yieldBounds;
    return Array.from(
      { length: 5 },
      (_, i) => b.min + ((b.max - b.min) * i) / 4,
    );
  }
  x(years: number) {
    return 60 + (years / 30) * 680;
  }
  y(value: number) {
    const b = this.yieldBounds;
    return 262 - ((value - b.min) / (b.max - b.min || 1)) * 230;
  }
  curve(previous = false) {
    let path = "",
      gap = true;
    for (const p of this.yields) {
      const v = previous ? p.previous : p.value;
      if (v === null) {
        gap = true;
        continue;
      }
      path += (gap ? "M" : "L") + this.x(p.years) + "," + this.y(v) + " ";
      gap = false;
    }
    return path;
  }
  spark(country: MacroCountry) {
    const values = country.values.map((v) => v.value),
      min = Math.min(...values),
      range = Math.max(...values) - min || 1;
    return values
      .map(
        (v, i) =>
          `${(i * 180) / Math.max(1, values.length - 1)},${42 - ((v - min) / range) * 37}`,
      )
      .join(" ");
  }
  n(value: number | null | undefined) {
    return value === null || value === undefined
      ? "—"
      : value.toLocaleString("es-ES", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        });
  }
  date(time: number | string | undefined) {
    return time
      ? new Date(time).toLocaleString("es-ES", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "Sin fecha";
  }
  async load() {
    const id = ++this.request;
    if (this.view === "calendar") return;
    this.loading = true;
    this.error = "";
    this.articles = [];
    this.yields = [];
    this.macro = [];
    try {
      const endpoint =
        this.view === "news"
          ? "/api/news?symbol=" + encodeURIComponent(this.newsSymbol)
          : this.view === "rates"
            ? "/api/yields"
            : "/api/macro?indicator=" + this.indicator;
      const data = await requestJson(this.api.replace(/\/$/, "") + endpoint);
      if (id !== this.request) return;
      this.source = data.source;
      if (this.view === "news") {
        this.articles = data.items;
        this.updated = this.date(data.fetchedAt);
      } else if (this.view === "rates") {
        this.yields = data.points;
        this.updated = this.date(data.fetchedAt);
      } else {
        this.macro = data.countries;
        this.macroLabel = data.label;
        this.macroUrl = data.url;
        this.updated = data.updated;
      }
    } catch (e) {
      if (id === this.request)
        this.error =
          e instanceof Error ? e.message : "No se pudo consultar la fuente.";
    } finally {
      if (id === this.request) this.loading = false;
      this.cdr.markForCheck();
    }
  }
  addEvent() {
    const date = new Date(this.eventDate);
    if (!this.eventTitle.trim() || !Number.isFinite(date.getTime())) {
      this.error = "Introduce un título y una fecha válidos.";
      return;
    }
    this.eventsChange.emit([
      ...this.events,
      {
        id: crypto.randomUUID(),
        title: this.eventTitle.trim(),
        date: date.toISOString(),
        country: this.eventCountry,
        notes: this.eventNotes.trim(),
      },
    ]);
    this.eventTitle = this.eventNotes = this.error = "";
  }
  removeEvent(id: string) {
    this.eventsChange.emit(this.events.filter((e) => e.id !== id));
  }
  exportCalendar() {
    const escape = (s: string) =>
      s
        .replaceAll("\\", "\\\\")
        .replaceAll("\n", "\\n")
        .replaceAll(",", "\\,")
        .replaceAll(";", "\\;")
        .replaceAll("\r", "");
    const utc = (date: string) =>
      new Date(date)
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}Z/, "Z");
    const stamp = utc(new Date().toISOString());
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Trader//Agenda//ES",
      ...this.events.flatMap((e) => [
        "BEGIN:VEVENT",
        "UID:" + e.id + "@trader.local",
        "DTSTAMP:" + stamp,
        "DTSTART:" + utc(e.date),
        "SUMMARY:" + escape(e.title),
        "LOCATION:" + escape(e.country),
        "DESCRIPTION:" + escape(e.notes),
        "END:VEVENT",
      ]),
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/calendar;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "trader-agenda.ics";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  openLink(event: Event, url: string) {
    if (desktopApi()) {
      event.preventDefault();
      void desktopApi()!.open_external(url);
    }
  }
}
