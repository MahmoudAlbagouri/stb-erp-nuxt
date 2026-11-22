<!-- components/farms/FarmMap.vue — خريطة المزرعة: حدودها ووحداتها ملوّنة بحالتها،
     ورسم حدود وحدة بالنقر (نقاط قابلة للسحب). Leaflet يُحمَّل في المتصفح فقط. -->
<template>
  <div class="farm-map">
    <div ref="el" class="farm-map__canvas" />
    <div class="farm-map__layers">
      <button
        type="button"
        :class="{ 'is-active': layer === 'satellite' }"
        @click="setLayer('satellite')"
      >
        قمر صناعي
      </button>
      <button
        type="button"
        :class="{ 'is-active': layer === 'streets' }"
        @click="setLayer('streets')"
      >
        خريطة
      </button>
    </div>
    <div v-if="drawing" class="farm-map__draw">
      <span>
        انقر على الخريطة لإضافة نقاط الحدود ({{ points.length }}) — اسحب النقطة
        لتعديلها
      </span>
      <div class="farm-map__draw-actions">
        <button
          type="button"
          class="btn btn--sm btn--ghost"
          :disabled="!points.length"
          @click="undo"
        >
          تراجع
        </button>
        <button
          type="button"
          class="btn btn--sm btn--ghost"
          :disabled="!points.length"
          @click="clearPoints"
        >
          مسح
        </button>
        <button
          type="button"
          class="btn btn--sm btn--ghost"
          title="موقعي الحالي"
          @click="locate"
        >
          موقعي
        </button>
      </div>
    </div>
    <div v-if="!drawing && legend" class="farm-map__legend">
      <span v-for="item in LEGEND" :key="item.key">
        <i :style="{ background: item.color }" />{{ item.label }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import "leaflet/dist/leaflet.css";
import type * as Leaflet from "leaflet";
import type { GeoRing } from "@/types/farms";

export interface MapShape {
  id: string;
  name: string;
  code?: string | null;
  depth: number;
  boundary: GeoRing | null;
  /** لون الحالة (من statusColor) */
  color?: string;
  /** سطر إضافي في التلميح */
  info?: string;
}

const props = withDefaults(
  defineProps<{
    /** حدود المزرعة (إطار أبيض) */
    farmBoundary?: GeoRing | null;
    center?: [number, number] | null;
    shapes?: MapShape[];
    selectedId?: string | null;
    /** وضع الرسم: النقاط تُرسل بـ update:ring */
    drawing?: boolean;
    ring?: GeoRing | null;
    legend?: boolean;
  }>(),
  {
    farmBoundary: null,
    center: null,
    shapes: () => [],
    selectedId: null,
    drawing: false,
    ring: null,
    legend: true,
  },
);
const emit = defineEmits<{
  select: [id: string];
  "update:ring": [ring: GeoRing];
}>();

const LEGEND = [
  { key: "infested", label: "إصابة مفتوحة", color: "#ef4444" },
  { key: "irrigation", label: "محتاج ري", color: "#f59e0b" },
  { key: "phi", label: "فترة أمان مبيد", color: "#a855f7" },
  { key: "harvest", label: "قارب الحصاد", color: "#eab308" },
  { key: "ok", label: "سليم", color: "#22c55e" },
  { key: "empty", label: "بلا زراعة", color: "#94a3b8" },
];

const el = ref<HTMLDivElement | null>(null);
const layer = ref<"satellite" | "streets">("satellite");
const points = ref<GeoRing>([]);
let L: typeof Leaflet | null = null;
const map = shallowRef<Leaflet.Map | null>(null);
let baseLayer: Leaflet.TileLayer | null = null;
let shapesLayer: Leaflet.LayerGroup | null = null;
let drawLayer: Leaflet.LayerGroup | null = null;

const TILES = {
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles © Esri",
    maxZoom: 20,
  },
  streets: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "© OpenStreetMap",
    maxZoom: 19,
  },
};

/** [طول، عرض] ← [عرض، طول] كما يتوقع Leaflet */
const toLatLngs = (ring: GeoRing) =>
  ring.map(([lng, lat]) => [lat, lng] as [number, number]);

const setLayer = (name: "satellite" | "streets") => {
  layer.value = name;
  if (!L || !map.value) return;
  baseLayer?.remove();
  const t = TILES[name];
  baseLayer = L.tileLayer(t.url, {
    attribution: t.attribution,
    maxZoom: t.maxZoom,
    maxNativeZoom: 19,
  }).addTo(map.value);
};

const drawShapes = () => {
  if (!L || !map.value || !shapesLayer) return;
  shapesLayer.clearLayers();
  if (props.farmBoundary?.length) {
    L.polygon(toLatLngs(props.farmBoundary), {
      color: "#ffffff",
      weight: 2,
      dashArray: "6 6",
      fill: false,
      interactive: false,
    }).addTo(shapesLayer);
  }
  for (const shape of props.shapes) {
    if (!shape.boundary?.length) continue;
    const selected = shape.id === props.selectedId;
    const polygon = L.polygon(toLatLngs(shape.boundary), {
      color: selected ? "#38bdf8" : (shape.color ?? "#22c55e"),
      weight: selected ? 4 : 2,
      fillColor: shape.color ?? "#22c55e",
      fillOpacity: selected ? 0.45 : Math.max(0.15, 0.35 - shape.depth * 0.05),
    });
    polygon.bindTooltip(
      `<b>${escapeHtml(shape.name)}</b>${shape.code ? ` (${escapeHtml(shape.code)})` : ""}${
        shape.info ? `<br>${escapeHtml(shape.info)}` : ""
      }`,
      { sticky: true, direction: "top" },
    );
    polygon.on("click", () => emit("select", shape.id));
    polygon.addTo(shapesLayer);
  }
};

const drawPoints = () => {
  if (!L || !map.value || !drawLayer) return;
  drawLayer.clearLayers();
  if (!props.drawing) return;
  const latLngs = toLatLngs(points.value);
  if (latLngs.length >= 2) {
    L.polygon(latLngs, {
      color: "#38bdf8",
      weight: 3,
      fillOpacity: 0.2,
      interactive: false,
    }).addTo(drawLayer);
  }
  latLngs.forEach((latLng, index) => {
    const marker = L!.marker(latLng, {
      draggable: true,
      icon: L!.divIcon({ className: "farm-map__vertex", iconSize: [14, 14] }),
    });
    marker.on("drag", (event) => {
      const at = (event as Leaflet.LeafletMouseEvent).latlng ?? marker.getLatLng();
      points.value = points.value.map((p, i) =>
        i === index ? [round6(at.lng), round6(at.lat)] : p,
      );
    });
    marker.on("dragend", () => {
      drawPoints();
      emitRing();
    });
    marker.addTo(drawLayer!);
  });
};

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;
const emitRing = () => emit("update:ring", [...points.value]);
const undo = () => {
  points.value = points.value.slice(0, -1);
  drawPoints();
  emitRing();
};
const clearPoints = () => {
  points.value = [];
  drawPoints();
  emitRing();
};
const locate = () => {
  if (!navigator.geolocation || !map.value) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => map.value?.setView([pos.coords.latitude, pos.coords.longitude], 18),
    () => {},
    { enableHighAccuracy: true, timeout: 10000 },
  );
};

/** يجعل كل الحدود في المشهد (المزرعة والوحدات والرسم) */
const fit = () => {
  if (!L || !map.value) return;
  const all: [number, number][] = [
    ...(props.farmBoundary ? toLatLngs(props.farmBoundary) : []),
    ...props.shapes.flatMap((s) => (s.boundary ? toLatLngs(s.boundary) : [])),
    ...toLatLngs(points.value),
  ];
  if (all.length) {
    map.value.fitBounds(L.latLngBounds(all), { padding: [24, 24], maxZoom: 19 });
  } else if (props.center) {
    map.value.setView(props.center, 16);
  }
};

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

onMounted(async () => {
  L = await import("leaflet");
  if (!el.value) return;
  map.value = L.map(el.value, {
    center: props.center ?? [24.7136, 46.6753],
    zoom: props.center ? 16 : 6,
    zoomControl: true,
    attributionControl: true,
  });
  setLayer(layer.value);
  shapesLayer = L.layerGroup().addTo(map.value);
  drawLayer = L.layerGroup().addTo(map.value);
  map.value.on("click", (event: Leaflet.LeafletMouseEvent) => {
    if (!props.drawing) return;
    points.value = [
      ...points.value,
      [round6(event.latlng.lng), round6(event.latlng.lat)],
    ];
    drawPoints();
    emitRing();
  });
  points.value = props.ring ? [...props.ring] : [];
  drawShapes();
  drawPoints();
  fit();
  // الحاوية قد تتغير مقاساتها بعد الرسم (نافذة، تبويب)
  setTimeout(() => map.value?.invalidateSize(), 200);
});

onBeforeUnmount(() => {
  map.value?.remove();
  map.value = null;
});

watch(
  () => [props.shapes, props.farmBoundary, props.selectedId],
  () => drawShapes(),
  { deep: true },
);
watch(
  () => props.drawing,
  (drawing) => {
    points.value = drawing && props.ring ? [...props.ring] : drawing ? [] : points.value;
    drawPoints();
    if (drawing) fit();
  },
);
watch(
  () => props.ring,
  (ring) => {
    if (!props.drawing) return;
    const same = JSON.stringify(ring ?? []) === JSON.stringify(points.value);
    if (!same) {
      points.value = ring ? [...ring] : [];
      drawPoints();
    }
  },
);

defineExpose({ fit, invalidate: () => map.value?.invalidateSize() });
</script>

<style lang="scss">
.farm-map {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 360px;
  border-radius: $radius-lg;
  overflow: hidden;
  border: 1px solid $stb-border;

  &__canvas {
    position: absolute;
    inset: 0;
    direction: ltr;
  }

  &__layers {
    position: absolute;
    top: $space-3;
    left: 56px;
    z-index: 500;
    display: flex;
    gap: 2px;
    background: rgba(15, 23, 42, 0.75);
    border-radius: $radius-md;
    padding: 2px;

    button {
      border: 0;
      background: transparent;
      color: #e2e8f0;
      font-size: $font-size-xs;
      padding: 4px 10px;
      border-radius: $radius-sm;
      cursor: pointer;

      &.is-active {
        background: $stb-primary;
        color: #fff;
      }
    }
  }

  &__draw {
    position: absolute;
    bottom: $space-3;
    inset-inline: $space-3;
    z-index: 500;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: $space-2;
    padding: $space-2 $space-3;
    background: rgba(15, 23, 42, 0.85);
    color: #f1f5f9;
    font-size: $font-size-sm;
    border-radius: $radius-md;

    .btn {
      color: #f1f5f9;
    }
  }

  &__draw-actions {
    display: flex;
    gap: $space-1;
  }

  &__legend {
    position: absolute;
    bottom: $space-3;
    right: $space-3;
    z-index: 500;
    display: flex;
    flex-wrap: wrap;
    gap: $space-2 $space-3;
    max-width: 80%;
    padding: $space-2 $space-3;
    background: rgba(15, 23, 42, 0.8);
    color: #f1f5f9;
    font-size: $font-size-xs;
    border-radius: $radius-md;

    span {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    i {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      display: inline-block;
    }
  }

  &__vertex {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: #38bdf8;
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.4);
    cursor: grab;
  }

  .leaflet-tooltip {
    direction: rtl;
    text-align: right;
    font-family: inherit;
  }
}
</style>
