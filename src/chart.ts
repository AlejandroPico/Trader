import {
  Component,
  ElementRef,
  ViewChild,
  Input,
  Output,
  EventEmitter,
  AfterViewInit,
  OnChanges,
  OnDestroy,
  ChangeDetectorRef,
  inject,
} from "@angular/core";
import * as echarts from "echarts/core";
import {
  CandlestickChart,
  LineChart,
  BarChart,
  TreemapChart,
} from "echarts/charts";
import {
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
} from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";
import { Candle, sma, ema, rsi, bollinger, compareReturns } from "./analysis";
import { Drawing, Tab } from "./state";
import { Asset, Quote } from "./market";
import { GeoMap } from "./geo-map";
import { heatmapTree, HeatNode } from "./heatmap";
echarts.use([
  CandlestickChart,
  LineChart,
  BarChart,
  TreemapChart,
  GridComponent,
  TooltipComponent,
  DataZoomComponent,
  MarkLineComponent,
  CanvasRenderer,
]);
export { echarts };
@Component({
  selector: "price-chart",
  standalone: true,
  template:
    '<div #canvas class="price-canvas" role="img" aria-label="Gráfico de precios interactivo. Usa la rueda para ampliar y arrastra para navegar."></div>',
})
export class PriceChart implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("canvas") el!: ElementRef<HTMLDivElement>;
  @Input() candles: Candle[] = [];
  @Input() comparison: Candle[] = [];
  @Input() tab!: Tab;
  @Input() theme = "dark";
  @Input() tool = "cursor";
  @Input() compact = false;
  @Output() drawing = new EventEmitter<Drawing>();
  @Output() measurement = new EventEmitter<string>();
  @Output() zoomChange = new EventEmitter<[number, number]>();
  private chart?: echarts.ECharts;
  private observer?: ResizeObserver;
  private first?: { i: number; y: number };
  private zoom = [30, 100];
  private comparisonBase?: number;
  ngAfterViewInit() {
    this.chart = echarts.init(this.el.nativeElement, undefined, {
      renderer: "canvas",
    });
    this.observer = new ResizeObserver(() => this.chart?.resize());
    this.observer.observe(this.el.nativeElement);
    this.chart.on("datazoom", (e: any) => {
      const z = e.batch?.[0] ?? e;
      if (z.start !== undefined) {
        this.zoom = [z.start, z.end];
        this.zoomChange.emit([z.start, z.end]);
      }
    });
    this.chart.getZr().on("click", (e: any) => this.click(e));
    this.render();
  }
  ngOnChanges(changes: any) {
    if (changes["tool"]) this.first = undefined;
    if (changes["candles"] || changes["tab"])
      this.zoom = this.tab?.zoom ?? [30, 100];
    this.render();
  }
  ngOnDestroy() {
    this.observer?.disconnect();
    this.chart?.dispose();
  }
  reset() {
    this.zoom = [0, 100];
    this.zoomChange.emit([0, 100]);
    this.render();
  }
  image() {
    return this.chart?.getDataURL({
      type: "png",
      pixelRatio: 2,
      backgroundColor: this.theme === "dark" ? "#101318" : "#f6f7fb",
    });
  }
  private click(event: any) {
    if (
      this.tool === "cursor" ||
      !this.chart ||
      !this.chart.containPixel({ gridIndex: 0 }, [event.offsetX, event.offsetY])
    )
      return;
    const pos = this.chart.convertFromPixel({ gridIndex: 0 }, [
      event.offsetX,
      event.offsetY,
    ]) as number[];
    const point = {
      i: Math.max(0, Math.min(this.candles.length - 1, Math.round(pos[0]))),
      y: this.comparisonBase
        ? (pos[1] / 100 + 1) * this.comparisonBase
        : pos[1],
    };
    if (!this.first) {
      this.first = point;
      this.measurement.emit("Selecciona el segundo punto");
      return;
    }
    const start = this.first;
    this.first = undefined;
    if (this.tool === "trend") {
      this.drawing.emit({
        start: this.candles[start.i].time,
        end: this.candles[point.i].time,
        y1: start.y,
        y2: point.y,
      });
      this.measurement.emit("Línea guardada");
    } else
      this.measurement.emit(
        `${Math.abs(point.i - start.i)} velas · ${((point.y / start.y - 1) * 100).toFixed(2)} % · Δ ${(point.y - start.y).toFixed(4)}`,
      );
  }
  private render() {
    if (!this.chart || !this.tab || !this.candles.length) return;
    const light = this.theme === "light";
    const fg = light ? "#6c7483" : "#737e91",
      grid = light ? "#e5e8ef" : "#202631",
      up = "#36ba92",
      down = "#ed6b7c";
    const c = this.candles,
      v = c.map((x) => x.close),
      dates = c.map((x) => new Date(x.time).toISOString());
    const hasRsi = this.tab.indicators.includes("RSI 14") && !this.compact;
    const compared = compareReturns(c, this.comparison, this.tab.interval);
    this.comparisonBase = compared?.base;
    const normalized = (value: number) =>
      compared ? (value / compared.base - 1) * 100 : value;
    const series: any[] = [
      {
        name: compared ? "Rentabilidad · " + this.tab.symbol : "Precio",
        type: compared
          ? "line"
          : this.tab.kind === "candlestick"
            ? "candlestick"
            : this.tab.kind === "bar"
              ? "bar"
              : "line",
        data: compared
          ? compared.primary
          : this.tab.kind === "candlestick"
            ? c.map((x) => [x.open, x.close, x.low, x.high])
            : v,
        symbol: "none",
        lineStyle: { width: 1.8, color: "#8aafff" },
        itemStyle: {
          color: up,
          color0: down,
          borderColor: up,
          borderColor0: down,
        },
        areaStyle:
          this.tab.kind === "line"
            ? { color: "rgba(106,152,255,.07)" }
            : undefined,
        markLine: {
          symbol: ["none", "none"],
          silent: true,
          label: { show: false },
          lineStyle: { color: "#c0a8ff", width: 1.5 },
          data: this.tab.drawings
            .map((d) => [
              {
                coord: [
                  dates[c.findIndex((x) => x.time === d.start)],
                  normalized(d.y1),
                ],
              },
              {
                coord: [
                  dates[c.findIndex((x) => x.time === d.end)],
                  normalized(d.y2),
                ],
              },
            ])
            .filter((d) => d[0].coord[0] && d[1].coord[0]),
        },
      },
      {
        name: "Volumen",
        type: "bar",
        xAxisIndex: 1,
        yAxisIndex: 1,
        data: c.map((x) => ({
          value: x.volume,
          itemStyle: { color: x.close >= x.open ? "#36ba9240" : "#ed6b7c40" },
        })),
      },
    ];
    const addLine = (name: string, data: (number | null)[], color: string) =>
      series.push({
        name,
        type: "line",
        data: data.map((value) => (value === null ? null : normalized(value))),
        symbol: "none",
        lineStyle: { width: 1, color },
        connectNulls: false,
      });
    if (this.tab.indicators.includes("SMA 20"))
      addLine("SMA 20", sma(v, 20), "#e5b965");
    if (this.tab.indicators.includes("EMA 50"))
      addLine("EMA 50", ema(v, 50), "#8f9ef4");
    if (this.tab.indicators.includes("Bollinger")) {
      const b = bollinger(v);
      addLine("BB superior", b.upper, "#679ac0");
      addLine("BB media", b.middle, "#7e8797");
      addLine("BB inferior", b.lower, "#679ac0");
    }
    if (hasRsi)
      series.push({
        name: "RSI 14",
        type: "line",
        data: rsi(v),
        xAxisIndex: 2,
        yAxisIndex: 2,
        symbol: "none",
        lineStyle: { width: 1.2, color: "#bf9bf2" },
        markLine: {
          silent: true,
          symbol: "none",
          label: { show: false },
          data: [{ yAxis: 30 }, { yAxis: 70 }],
          lineStyle: { color: fg, type: "dashed", width: 0.5 },
        },
      });
    if (compared) {
      series.push({
        name: this.tab.compare + " · rentabilidad %",
        type: "line",
        symbol: "none",
        yAxisIndex: 0,
        data: compared.secondary,
        lineStyle: { width: 1.5, color: "#e6a2db" },
      });
    }
    const grids: any[] = [
      { left: 10, right: 72, top: 24, bottom: hasRsi ? "38%" : "24%" },
      {
        left: 10,
        right: 72,
        top: hasRsi ? "65%" : "79%",
        height: hasRsi ? "10%" : "10%",
      },
    ];
    if (hasRsi) grids.push({ left: 10, right: 72, top: "79%", height: "10%" });
    const axes = grids.map((_, i) => ({
      type: "category",
      gridIndex: i,
      data: dates,
      boundaryGap: true,
      axisLine: { lineStyle: { color: grid } },
      axisTick: { show: false },
      axisLabel: {
        show: i === grids.length - 1,
        color: fg,
        fontSize: 10,
        formatter: (v: string) =>
          this.tab.interval === "1d" && this.tab.symbol !== "CSV"
            ? v.slice(5, 10)
            : v.slice(5, 16).replace("T", " "),
      },
      splitLine: { show: i === 0, lineStyle: { color: grid } },
      axisPointer: { label: { show: true } },
    }));
    const y: any[] = grids.map((_, i) => ({
      type: "value",
      gridIndex: i,
      scale: i !== 2,
      min: i === 2 ? 0 : undefined,
      max: i === 2 ? 100 : undefined,
      position: "right",
      splitNumber: i === 0 ? 5 : 2,
      axisLabel: {
        color: fg,
        fontSize: 10,
        formatter: (v: number) =>
          i === 1
            ? (v / 1e6).toFixed(1) + "M"
            : compared && i === 0
              ? v.toFixed(1) + " %"
              : v.toLocaleString("en-US", {
                  maximumFractionDigits: Math.abs(v) < 10 ? 4 : 2,
                }),
      },
      splitLine: { show: i !== 1, lineStyle: { color: grid } },
      axisLine: { show: false },
    }));
    this.chart.setOption(
      {
        animation: false,
        backgroundColor: "transparent",
        textStyle: { fontFamily: "DM Sans, Segoe UI, sans-serif" },
        grid: grids,
        xAxis: axes,
        yAxis: y,
        axisPointer: { link: [{ xAxisIndex: "all" }] },
        tooltip: {
          trigger: "axis",
          backgroundColor: light ? "#ffffff" : "#1b212b",
          borderColor: grid,
          textStyle: { color: light ? "#182236" : "#dbe3ef", fontSize: 11 },
          valueFormatter: (v: any) =>
            typeof v === "number"
              ? v.toLocaleString("en-US", { maximumFractionDigits: 4 })
              : String(v),
        },
        dataZoom: [
          {
            type: "inside",
            xAxisIndex: grids.map((_, i) => i),
            start: this.zoom[0],
            end: this.zoom[1],
          },
          {
            type: "slider",
            xAxisIndex: grids.map((_, i) => i),
            bottom: 0,
            height: 15,
            start: this.zoom[0],
            end: this.zoom[1],
            borderColor: grid,
            backgroundColor: "transparent",
            fillerColor: "#8b9dcb15",
            handleStyle: { color: fg },
            textStyle: { color: fg, fontSize: 9 },
            dataBackground: {
              lineStyle: { color: fg },
              areaStyle: { color: grid },
            },
            selectedDataBackground: {
              lineStyle: { color: "#8aafff" },
              areaStyle: { color: "#8aafff30" },
            },
          },
        ],
        series,
      },
      true,
    );
  }
}
@Component({
  selector: "market-visual",
  standalone: true,
  imports: [GeoMap],
  template: `@if (kind === "map" || kind === "macro") {
      <geo-map
        [assets]="assets"
        [quotes]="quotes"
        [macro]="kind === 'macro'"
        [macroValues]="macroValues"
        [selected]="selectedCountry"
        (pick)="pick.emit($event)"
      />
    } @else {
      <div class="heatmap-viewport">
        <div
          #canvas
          class="visual-canvas"
          role="img"
          aria-label="Mapa de calor de activos por sector e industria"
        ></div>
        <nav class="heatmap-breadcrumb" aria-label="Nivel del mapa de calor">
          @for (crumb of breadcrumbs; track crumb.id) {
            <button
              (click)="drill(crumb.id)"
              [attr.aria-current]="crumb.id === rootId ? 'location' : null"
            >
              {{ crumb.name }}
            </button>
          }
        </nav>
      </div>
    }`,
})
export class MarketVisual implements AfterViewInit, OnChanges, OnDestroy {
  @ViewChild("canvas") el!: ElementRef;
  @Input() kind = "heat";
  @Input() selectedCountry = "";
  @Input() sizeMetric: "uniform" | "volume" = "uniform";
  private signature = "";
  rootId = "";
  breadcrumbs = [{ id: "", name: "Mercado" }];
  private heatTree: HeatNode[] = [];
  private roamRect?: { x: number; y: number; width: number; height: number };
  private restoring = false;
  private universeKey = "";
  private cdr = inject(ChangeDetectorRef);
  @Input() assets: Asset[] = [];
  @Input() quotes: Record<string, Quote> = {};
  @Input() theme = "dark";
  @Output() pick = new EventEmitter<string>();
  @Input() macroValues: {
    country: string;
    value: number | null;
    year: number | null;
  }[] = [];
  private chart?: echarts.ECharts;
  private observer?: ResizeObserver;
  ngAfterViewInit() {
    if (!this.el) return;
    this.chart = echarts.init(this.el.nativeElement);
    this.observer = new ResizeObserver(() => this.chart?.resize());
    this.observer.observe(this.el.nativeElement);
    this.chart.on("click", (e: any) => {
      if (e.data?.symbol) this.pick.emit(e.data.symbol);
      else if (e.data?.id) {
        this.drill(e.data.id);
      }
      this.cdr.markForCheck();
    });
    for (const event of ["treemaprender", "treemapmove"])
      this.chart.on(event, (payload: any) => {
        if (
          !this.restoring &&
          payload.rootRect &&
          Object.values(payload.rootRect).every(Number.isFinite)
        )
          this.roamRect = { ...payload.rootRect };
      });
    this.render();
  }
  ngOnChanges() {
    this.render();
  }
  ngOnDestroy() {
    this.observer?.disconnect();
    this.chart?.dispose();
  }
  drill(id: string) {
    this.roamRect = undefined;
    this.rootId = id;
    this.updateBreadcrumbs();
    if (!id) {
      this.signature = "";
      this.chart?.clear();
      this.render();
    } else
      this.chart?.dispatchAction({
        type: "treemapRootToNode",
        seriesId: "market-heat",
        targetNodeId: id,
      });
    this.chart?.dispatchAction({ type: "hideTip" });
    this.cdr.markForCheck();
  }
  private updateBreadcrumbs() {
    const root = [{ id: "", name: "Mercado" }];
    for (const sector of this.heatTree) {
      if (sector.id === this.rootId) {
        this.breadcrumbs = [...root, { id: sector.id, name: sector.name }];
        return;
      }
      for (const industry of sector.children || [])
        if (industry.id === this.rootId) {
          this.breadcrumbs = [
            ...root,
            { id: sector.id, name: sector.name },
            { id: industry.id, name: industry.name },
          ];
          return;
        }
    }
    this.rootId = "";
    this.breadcrumbs = root;
  }
  render() {
    if (!this.chart) return;
    const signature = JSON.stringify([
      this.kind,
      this.theme,
      this.sizeMetric,
      this.assets.map((a) => [
        a.symbol,
        a.sector,
        a.industry,
        this.quotes[a.symbol],
      ]),
      this.macroValues,
    ]);
    if (signature === this.signature) return;
    this.signature = signature;
    const fg = this.theme === "dark" ? "#a5afbf" : "#475267";
    const universeKey = this.assets.map((a) => a.symbol).join("|");
    if (universeKey !== this.universeKey) {
      this.rootId = "";
      this.roamRect = undefined;
      this.universeKey = universeKey;
    }
    const tree = heatmapTree(this.assets, this.quotes, this.sizeMetric);
    this.heatTree = tree;
    const rootBefore = this.rootId;
    this.updateBreadcrumbs();
    if (rootBefore !== this.rootId) this.roamRect = undefined;
    this.chart.setOption(
      {
        animation: false,
        tooltip: {
          confine: true,
          renderMode: "richText",
          backgroundColor: "#202631",
          borderWidth: 0,
          textStyle: { color: "#e5e9f0", fontSize: 12 },
          formatter: (p: any) =>
            p.data?.symbol
              ? `${p.data.fullName} · ${p.data.name}\n${p.data.price.toLocaleString("es-ES", { maximumFractionDigits: 4 })} ${p.data.currency}   ${p.data.change >= 0 ? "+" : ""}${p.data.change.toFixed(2)} %\n${p.data.source}\n${new Date(p.data.asOf).toLocaleString("es-ES")}`
              : `${p.name}\n${p.data?.count ?? 0} activos · Clic para ampliar`,
        },
        series: [
          {
            id: "market-heat",
            type: "treemap",
            name: "Mercado",
            roam: true,
            nodeClick: false,
            animationDuration: 0,
            animationDurationUpdate: 0,
            left: 3,
            right: 3,
            top: 3,
            bottom: 3,
            leafDepth: 3,
            visibleMin: 200,
            childrenVisibleMin: 1000,
            breadcrumb: {
              show: false,
              height: 22,
              bottom: 3,
              itemStyle: {
                color: this.theme === "dark" ? "#252d39" : "#e8edf4",
                borderColor: this.theme === "dark" ? "#101318" : "#fff",
                textStyle: { color: fg, fontSize: 10 },
              },
            },
            label: {
              show: true,
              color: "#fff",
              fontFamily: "DM Sans",
              fontSize: 14,
              formatter: (p: any) =>
                p.data?.symbol
                  ? `{symbol|${p.data.name}}\n{change|${p.data.change >= 0 ? "+" : ""}${p.data.change.toFixed(2)} %}\n{price|${p.data.price.toLocaleString("es-ES", { maximumFractionDigits: 2 })}}`
                  : p.name,
              rich: {
                symbol: { fontSize: 16, fontWeight: 600, lineHeight: 23 },
                change: { fontSize: 12, lineHeight: 21 },
                price: { fontSize: 10, color: "#ffffffb0", lineHeight: 18 },
              },
            },
            upperLabel: {
              show: true,
              height: 25,
              color: fg,
              fontSize: 11,
              padding: [0, 8],
            },
            itemStyle: {
              borderColor: this.theme === "dark" ? "#12171e" : "#edf1f6",
              borderWidth: 2,
              gapWidth: 2,
            },
            levels: [
              { itemStyle: { borderWidth: 0, gapWidth: 3 } },
              {
                itemStyle: {
                  borderColor: this.theme === "dark" ? "#252d39" : "#dce3ed",
                  borderWidth: 0,
                  gapWidth: 2,
                },
                upperLabel: { show: true },
              },
              {
                itemStyle: { borderWidth: 0, gapWidth: 1 },
                upperLabel: { show: true, height: 19, fontSize: 9 },
                label: { show: true },
              },
              {
                itemStyle: { borderWidth: 0, gapWidth: 1 },
                upperLabel: { show: false },
              },
            ],
            data: tree,
          },
        ],
      },
      false,
    );
    if (this.rootId)
      this.chart.dispatchAction({
        type: "treemapRootToNode",
        seriesId: "market-heat",
        targetNodeId: this.rootId,
      });
    if (this.roamRect) {
      this.restoring = true;
      try {
        this.chart.dispatchAction({
          type: "treemapRender",
          seriesId: "market-heat",
          rootRect: { ...this.roamRect },
        });
      } finally {
        this.restoring = false;
      }
    }
  }
}
