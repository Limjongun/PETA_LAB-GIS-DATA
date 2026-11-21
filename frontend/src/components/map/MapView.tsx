import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import {
  ArrowDownUp,
  CheckCircle2,
  Compass,
  Copy,
  Eye,
  EyeOff,
  Flame,
  Grid,
  Hand,
  Info,
  Layers,
  MapPin,
  Maximize2,
  MousePointerSquareDashed,
  Palette,
  PenTool,
  Plus,
  RotateCcw,
  Ruler,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  ZoomIn,
} from 'lucide-react';
import { api } from '../../api/client';
import { COLOR_PALETTES, formatNumber } from '../../lib/format';
import { usePetaStore } from '../../stores/usePetaStore';

const HEATMAP_COLOR_RAMPS: Record<string, { label: string; css: string; expr: any[] }> = {
  thermal: {
    label: 'Thermal (Biru → Hijau → Kuning → Merah)',
    css: 'linear-gradient(to right, #2563eb, #06b6d4, #22c55e, #facc15, #f97316, #dc2626)',
    expr: [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(37,99,235,0)',
      0.15, '#2563eb',
      0.35, '#06b6d4',
      0.55, '#22c55e',
      0.75, '#facc15',
      0.9, '#f97316',
      1, '#dc2626',
    ],
  },
  magma: {
    label: 'Magma (Ungu Gelap → Magenta → Oranye → Krem)',
    css: 'linear-gradient(to right, #1e1b4b, #7e22ce, #db2777, #f97316, #fef08a)',
    expr: [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(30,27,75,0)',
      0.2, '#1e1b4b',
      0.45, '#7e22ce',
      0.7, '#db2777',
      0.88, '#f97316',
      1, '#fef08a',
    ],
  },
  viridis: {
    label: 'Viridis (Aman Buta Warna)',
    css: 'linear-gradient(to right, #440154, #3b528b, #21918c, #5ec962, #fde725)',
    expr: [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(68,1,84,0)',
      0.2, '#440154',
      0.45, '#3b528b',
      0.65, '#21918c',
      0.85, '#5ec962',
      1, '#fde725',
    ],
  },
  reds: {
    label: 'Merah Panas (Persik → Oranye → Merah Tua)',
    css: 'linear-gradient(to right, #fed7aa, #fb923c, #ef4444, #991b1b)',
    expr: [
      'interpolate', ['linear'], ['heatmap-density'],
      0, 'rgba(254,215,170,0)',
      0.2, '#fed7aa',
      0.5, '#fb923c',
      0.78, '#ef4444',
      1, '#991b1b',
    ],
  },
};

const BASEMAP_TILES: Record<string, { name: string; tiles: string[]; attribution: string }> = {
  osm_standard: {
    name: 'OSM Standar',
    tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
    attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
  },
  osm_light: {
    name: 'Terang (Carto Positron)',
    tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap contributors © CARTO',
  },
  osm_dark: {
    name: 'Gelap (Carto Dark)',
    tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
    attribution: '© OpenStreetMap contributors © CARTO',
  },
  satellite: {
    name: 'Satelit (Esri World Imagery)',
    tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
    attribution: '© OpenStreetMap contributors · Tiles © Esri',
  },
  none: {
    name: 'Kosong (Mode Offline)',
    tiles: [],
    attribution: 'Mode Offline Lokal PetaLab',
  },
};

const GLYPHS_URL = 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf';

// Precision Pen Tool SVG Cursor (hotspot at tip 3,3) & Snap-to-Start Cursor
const PEN_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ccircle cx='4' cy='4' r='2.2' fill='%230d9488' stroke='white' stroke-width='1.2'/%3E%3Cpath d='M4 0v8M0 4h8' stroke='%230b1214' stroke-width='1'/%3E%3Cpath d='M7 7l11 4-4 3-3 4-4-11z' fill='%230b1214' stroke='white' stroke-width='1.2' stroke-linejoin='round'/%3E%3C/svg%3E") 4 4, crosshair`;

const SNAP_CLOSE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28' viewBox='0 0 28 28'%3E%3Ccircle cx='14' cy='14' r='8' fill='rgba(16,185,129,0.25)' stroke='%2310b981' stroke-width='2'/%3E%3Ccircle cx='14' cy='14' r='3' fill='%2310b981' stroke='white' stroke-width='1.5'/%3E%3C/svg%3E") 14 14, pointer`;

function haversineDistanceM(a: [number, number], b: [number, number]): number {
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const s =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function geodesicPolygonAreaM2(pts: [number, number][]): number {
  if (pts.length < 3) return 0;
  const R = 6371008.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const meanLat = pts.reduce((acc, p) => acc + p[1], 0) / pts.length;
  const cosLat = Math.cos(toRad(meanLat));
  let area2 = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    const xi = toRad(pts[i][0]) * R * cosLat;
    const yi = toRad(pts[i][1]) * R;
    const xj = toRad(pts[j][0]) * R * cosLat;
    const yj = toRad(pts[j][1]) * R;
    area2 += xi * yj - xj * yi;
  }
  return Math.abs(area2) / 2.0;
}

function screenDistPx(map: maplibregl.Map, a: [number, number], b: [number, number]): number {
  const pa = map.project(a);
  const pb = map.project(b);
  return Math.hypot(pa.x - pb.x, pa.y - pb.y);
}

export const MapView: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    projectId,
    layers,
    activeLayerId,
    visibleLayers,
    layerOpacity,
    basemap,
    selectionsByLayer,
    previewGeoJSON,
    splitMapTable,
    zoomToBboxRequest,
    swipeLayerId,
    mapZoom,
    setActiveLayerId,
    toggleLayerVisibility,
    setLayerOpacity,
    moveLayerOrder,
    setBasemap,
    setCursorCoords,
    setMapZoom,
    requestZoomToBbox,
    setSwipeLayerId,
    setLayerSelection,
    toggleFeatureSelection,
    clearLayerSelection,
    toggleSplitMapTable,
    refreshLayers,
    addToast,
    setActiveTab,
  } = usePetaStore();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const compareContainerRef = useRef<HTMLDivElement | null>(null);
  const compareMapRef = useRef<maplibregl.Map | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [compareLoaded, setCompareLoaded] = useState(false);

  // Map interaction modes: pan | identify | capture_point | segment_lonlat | select_box | select_polygon | select_radius | measure | draw
  const [toolMode, setToolMode] = useState<
    'pan' | 'identify' | 'capture_point' | 'segment_lonlat' | 'select_box' | 'select_polygon' | 'select_radius' | 'measure' | 'draw'
  >('identify');
  const [rightTab, setRightTab] = useState<'layers' | 'style' | 'select'>('layers');

  // Auto-fit tracker so newly opened projects fly immediately to their actual geographic bounds
  const lastAutoFitProjectRef = useRef<string>('');

  // Segmentasi & Akurasi Long/Lat state (2-Column Coordinate Picker + Map Segmentation + Heatmap option)
  const [segLayerId, setSegLayerId] = useState<string>('');
  const [segLonCol, setSegLonCol] = useState<string>('');
  const [segLatCol, setSegLatCol] = useState<string>('');
  const [segMode, setSegMode] = useState<'quadrant' | 'grid' | 'kmeans' | 'attribute' | 'none'>('quadrant');
  const [segGridNx, setSegGridNx] = useState<number>(2);
  const [segGridNy, setSegGridNy] = useState<number>(2);
  const [segK, setSegK] = useState<number>(4);
  const [segValCol, setSegValCol] = useState<string>('');
  const [segCreateZones, setSegCreateZones] = useState<boolean>(true);
  const [segAutoFixSwap, setSegAutoFixSwap] = useState<boolean>(true);
  const [segViewHeatmap, setSegViewHeatmap] = useState<boolean>(false);
  const [segBusy, setSegBusy] = useState<boolean>(false);
  const [segResult, setSegResult] = useState<any | null>(null);

  // Point & Coordinate-Pair Capture + Create New CSV Dataset state
  const [capturedPts, setCapturedPts] = useState<
    { id: number; lat: number; lon: number; label: string; kategori: string }[]
  >([]);
  const [capturePairMode, setCapturePairMode] = useState(true);
  const [captureLayerName, setCaptureLayerName] = useState('dataset_titik_baru');
  const [captureJoinTableId, setCaptureJoinTableId] = useState<string>('');
  const [captureCsvDelimiter, setCaptureCsvDelimiter] = useState<';' | ','>(';');
  const [lastCreatedCsv, setLastCreatedCsv] = useState<{
    filename: string;
    url: string;
    xlsxFilename?: string;
    xlsxUrl?: string | null;
  } | null>(null);

  // Swipe Compare 2 Layers state
  const [swipeActive, setSwipeActive] = useState(false);
  const [swipePct, setSwipePct] = useState(50);

  // Adaptive simplification state
  const [adaptiveSimplify, setAdaptiveSimplify] = useState(true);
  const [viewportBbox, setViewportBbox] = useState<string>('');

  // Search box (Nominatim)
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Identify Popup
  const [identifiedFeature, setIdentifiedFeature] = useState<{
    layerName: string;
    props: Record<string, any>;
    lngLat: [number, number];
  } | null>(null);

  // Measure, Draw, Box Rubber-Band & Polygon Selection state
  const [measurePts, setMeasurePts] = useState<[number, number][]>([]);
  const [measureFinished, setMeasureFinished] = useState(false);

  const [drawPts, setDrawPts] = useState<[number, number][]>([]);
  const [drawFinished, setDrawFinished] = useState(false);
  const [completedDrawFeatures, setCompletedDrawFeatures] = useState<any[]>([]);

  const [polySelectPts, setPolySelectPts] = useState<[number, number][]>([]);
  const [polySelectFinished, setPolySelectFinished] = useState(false);

  const [hoverPt, setHoverPt] = useState<[number, number] | null>(null);
  const [isHoveringStartVertex, setIsHoveringStartVertex] = useState(false);

  const [drawGeomType, setDrawGeomType] = useState<'point' | 'line' | 'polygon'>('polygon');
  const [drawLayerName, setDrawLayerName] = useState('layer_poligon_baru');
  const [drawClassLabel, setDrawClassLabel] = useState('Kelas A');

  // Box / Radius selection state
  const [boxStart, setBoxStart] = useState<[number, number] | null>(null);
  const [selectRadiusM, setSelectRadiusM] = useState(1000);

  // Inline layer rename state
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null);
  const [renameText, setRenameText] = useState('');

  // Select by Location quick modal inside Map
  const [locRefLayerId, setLocRefLayerId] = useState('');
  const [locRelation, setLocRelation] = useState('within');
  const [locDistM, setLocDistM] = useState(500);

  // Cached GeoJSON & Legend Metadata per vector layer
  const [layerGeoJSONs, setLayerGeoJSONs] = useState<Record<string, any>>({});

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0] || null;
  const activeSelection = (activeLayerId && selectionsByLayer[activeLayerId]) || [];

  // 1. Initialize Primary MapLibre instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const bm = BASEMAP_TILES[basemap] || BASEMAP_TILES.osm_standard;
    const styleObj: maplibregl.StyleSpecification = {
      version: 8,
      glyphs: GLYPHS_URL,
      sources:
        bm.tiles.length > 0
          ? {
            basemap_src: {
              type: 'raster',
              tiles: bm.tiles,
              tileSize: 256,
              attribution: bm.attribution,
            },
          }
          : {},
      layers:
        bm.tiles.length > 0
          ? [
            {
              id: 'basemap_layer',
              type: 'raster',
              source: 'basemap_src',
              minzoom: 0,
              maxzoom: 20,
            },
          ]
          : [],
    };

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: styleObj,
      center: [112.742, -7.275],
      zoom: 11.4,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

    map.on('load', () => {
      setMapLoaded(true);
      const b = map.getBounds();
      setViewportBbox(
        `${b.getWest().toFixed(5)},${b.getSouth().toFixed(5)},${b.getEast().toFixed(5)},${b.getNorth().toFixed(5)}`
      );
    });

    map.on('move', () => {
      if (compareMapRef.current) {
        compareMapRef.current.jumpTo({
          center: map.getCenter(),
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        });
      }
    });

    map.on('moveend', () => {
      setMapZoom(Number(map.getZoom().toFixed(2)));
      const b = map.getBounds();
      setViewportBbox(
        `${b.getWest().toFixed(5)},${b.getSouth().toFixed(5)},${b.getEast().toFixed(5)},${b.getNorth().toFixed(5)}`
      );
    });

    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // 1a. Manage Cursor Style (Pen Tool vs Crosshair vs Pointer vs Grab) & disable doubleClickZoom during drawing
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const canvas = map.getCanvas();
    const isPenMode =
      toolMode === 'measure' || toolMode === 'draw' || toolMode === 'select_polygon' || toolMode === 'capture_point';

    if (isPenMode || toolMode === 'select_box' || toolMode === 'select_radius') {
      map.doubleClickZoom.disable();
      // Keep dragPan enabled only when holding middle/right mouse or space, OR allow smooth drag without overriding cursor
    } else {
      map.doubleClickZoom.enable();
    }

    const applyCursor = () => {
      if (isPenMode) {
        canvas.style.cursor = isHoveringStartVertex ? SNAP_CLOSE_CURSOR : PEN_CURSOR;
      } else if (toolMode === 'select_box' || toolMode === 'select_radius') {
        canvas.style.cursor = 'crosshair';
      } else if (toolMode === 'identify') {
        canvas.style.cursor = 'default';
      } else {
        canvas.style.cursor = 'grab';
      }
    };

    applyCursor();
    // Re-assert cursor after drag/pan events so MapLibre doesn't reset it back to grab hand
    map.on('dragend', applyCursor);
    map.on('mouseup', applyCursor);
    return () => {
      map.off('dragend', applyCursor);
      map.off('mouseup', applyCursor);
    };
  }, [toolMode, mapLoaded, isHoveringStartVertex]);

  // 1b. Keyboard Shortcuts for Finishing Polygon (Enter / Escape) & Undoing Last Vertex (Backspace / Ctrl+Z)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Enter' || e.key === 'Escape') {
        if (toolMode === 'measure' && measurePts.length >= 2 && !measureFinished) {
          e.preventDefault();
          setMeasureFinished(true);
        } else if (toolMode === 'draw' && drawPts.length >= 2 && !drawFinished) {
          e.preventDefault();
          finishCurrentDrawSegment(drawPts);
        } else if (toolMode === 'select_polygon' && polySelectPts.length >= 3 && !polySelectFinished) {
          e.preventDefault();
          setPolySelectFinished(true);
          handleApplyPolygonSelection(polySelectPts);
        } else if (toolMode === 'select_box' && boxStart) {
          setBoxStart(null);
        }
      } else if (e.key === 'Backspace' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z')) {
        if (toolMode === 'measure' && !measureFinished && measurePts.length > 0) {
          e.preventDefault();
          setMeasurePts((prev) => prev.slice(0, -1));
        } else if (toolMode === 'draw' && !drawFinished && drawPts.length > 0) {
          e.preventDefault();
          setDrawPts((prev) => prev.slice(0, -1));
        } else if (toolMode === 'select_polygon' && !polySelectFinished && polySelectPts.length > 0) {
          e.preventDefault();
          setPolySelectPts((prev) => prev.slice(0, -1));
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [toolMode, measurePts, measureFinished, drawPts, drawFinished, polySelectPts, polySelectFinished, boxStart]);

  // 1c. Secondary Synchronized MapLibre instance when Swipe Compare is active
  useEffect(() => {
    if (!swipeActive) {
      if (compareMapRef.current) {
        compareMapRef.current.remove();
        compareMapRef.current = null;
        setCompareLoaded(false);
      }
      return;
    }
    if (!compareContainerRef.current || compareMapRef.current) return;

    const mainMap = mapRef.current;
    const bm = BASEMAP_TILES[basemap] || BASEMAP_TILES.osm_standard;
    const cMap = new maplibregl.Map({
      container: compareContainerRef.current,
      style: {
        version: 8,
        glyphs: GLYPHS_URL,
        sources:
          bm.tiles.length > 0
            ? {
              basemap_src: {
                type: 'raster',
                tiles: bm.tiles,
                tileSize: 256,
              },
            }
            : {},
        layers:
          bm.tiles.length > 0
            ? [
              {
                id: 'basemap_layer',
                type: 'raster',
                source: 'basemap_src',
              },
            ]
            : [],
      },
      center: mainMap ? mainMap.getCenter() : [112.742, -7.275],
      zoom: mainMap ? mainMap.getZoom() : 11.4,
      interactive: false,
      attributionControl: false,
    });

    cMap.on('load', () => {
      setCompareLoaded(true);
    });
    compareMapRef.current = cMap;

    return () => {
      cMap.remove();
      compareMapRef.current = null;
      setCompareLoaded(false);
    };
  }, [swipeActive, basemap]);

  useEffect(() => {
    const cMap = compareMapRef.current;
    if (!cMap || !compareLoaded) return;

    (cMap.getStyle().layers || []).forEach((l) => {
      if (l.id.startsWith('compare_')) cMap.removeLayer(l.id);
    });
    Object.keys(cMap.getStyle().sources || {}).forEach((s) => {
      if (s.startsWith('compare_')) cMap.removeSource(s);
    });

    const targetId = swipeLayerId || layers.find((l) => l.id !== activeLayerId)?.id || layers[0]?.id;
    const lyr = layers.find((l) => l.id === targetId);
    if (!lyr) return;

    if (lyr.kind === 'raster') {
      const cmap = lyr.style?.hillshade ? 'hillshade' : lyr.style?.cmap || 'terrain';
      const band = lyr.style?.band || 1;
      const vmin = lyr.style?.vmin ?? '';
      const vmax = lyr.style?.vmax ?? '';
      cMap.addSource('compare_rast_src', {
        type: 'raster',
        tiles: [
          `${window.location.origin}/tiles/raster/${lyr.id}/{z}/{x}/{y}.png?cmap=${cmap}&band=${band}&vmin=${vmin}&vmax=${vmax}`,
        ],
        tileSize: 256,
      });
      cMap.addLayer({
        id: 'compare_rast_lyr',
        type: 'raster',
        source: 'compare_rast_src',
        paint: { 'raster-opacity': 0.9 },
      });
    } else if (lyr.kind === 'vector' && layerGeoJSONs[lyr.id]) {
      cMap.addSource('compare_vec_src', { type: 'geojson', data: layerGeoJSONs[lyr.id] });
      const col = lyr.style?.fillColor || lyr.style?.color || '#059669';
      if (lyr.geom_type === 'polygon') {
        cMap.addLayer({
          id: 'compare_vec_fill',
          type: 'fill',
          source: 'compare_vec_src',
          paint: { 'fill-color': col, 'fill-opacity': 0.78 },
        });
        cMap.addLayer({
          id: 'compare_vec_line',
          type: 'line',
          source: 'compare_vec_src',
          paint: { 'line-color': '#0f172a', 'line-width': 1.5 },
        });
      } else if (lyr.geom_type === 'line') {
        cMap.addLayer({
          id: 'compare_vec_line',
          type: 'line',
          source: 'compare_vec_src',
          paint: { 'line-color': col, 'line-width': 3.5 },
        });
      } else {
        cMap.addLayer({
          id: 'compare_vec_pt',
          type: 'circle',
          source: 'compare_vec_src',
          paint: { 'circle-color': col, 'circle-radius': 7, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 },
        });
      }
    }
  }, [compareLoaded, swipeLayerId, layers, layerGeoJSONs, activeLayerId]);

  // 1c. Auto-fit Map Bounds whenever a project loads its spatial layers (fixes staying stuck on Surabaya for Jakarta/other projects!)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded || layers.length === 0) return;
    if (lastAutoFitProjectRef.current === projectId) return;

    const spatialWithBbox = layers.filter((l) => l.bbox && l.kind !== 'table');
    if (spatialWithBbox.length === 0) return;
    const preferred = spatialWithBbox.filter((l) => l.kind === 'vector');
    const targets = preferred.length > 0 ? preferred : spatialWithBbox;

    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    targets.forEach((l) => {
      if (!l.bbox) return;
      minx = Math.min(minx, l.bbox[0]);
      miny = Math.min(miny, l.bbox[1]);
      maxx = Math.max(maxx, l.bbox[2]);
      maxy = Math.max(maxy, l.bbox[3]);
    });
    if (Number.isFinite(minx) && Number.isFinite(miny) && Number.isFinite(maxx) && Number.isFinite(maxy)) {
      if (Math.abs(maxx - minx) < 0.002) {
        minx -= 0.01;
        maxx += 0.01;
      }
      if (Math.abs(maxy - miny) < 0.002) {
        miny -= 0.01;
        maxy += 0.01;
      }
      map.fitBounds(
        [
          [minx, miny],
          [maxx, maxy],
        ],
        { padding: 54, maxZoom: 14.5, duration: 750 }
      );
      lastAutoFitProjectRef.current = projectId;
    }
  }, [mapLoaded, projectId, layers]);

  // 1d. Auto-detect Longitude & Latitude columns when target layer for Segmentasi Long/Lat changes
  const segTargetLayer =
    layers.find((l) => l.id === segLayerId && l.kind !== 'raster') ||
    layers.find((l) => l.id === activeLayerId && l.kind !== 'raster') ||
    layers.find((l) => l.kind !== 'raster') ||
    null;

  useEffect(() => {
    if (!segTargetLayer) return;
    if (!segLayerId) setSegLayerId(segTargetLayer.id);
    const cols = (segTargetLayer.schema || []).filter((s) => s.name !== '_fid');
    const names = cols.map((c) => c.name);
    const findMatch = (pats: RegExp[]) =>
      names.find((n) => pats.some((rx) => rx.test(n.toLowerCase()))) || '';

    const detectedLon =
      findMatch([/^long(itude)?$/, /^lon$/, /^bujur/, /^long_akurat$/, /^x(_coord)?$/]) ||
      cols.find((c) => c.type === 'number')?.name ||
      names[0] ||
      '';
    const detectedLat =
      findMatch([/^lat(itude)?$/, /^lintang/, /^lat_akurat$/, /^y(_coord)?$/]) ||
      cols.find((c) => c.type === 'number' && c.name !== detectedLon)?.name ||
      names.find((n) => n !== detectedLon) ||
      '';
    const detectedVal =
      cols.find(
        (c) =>
          (c.type === 'number' || c.type === 'integer') &&
          c.name !== detectedLon &&
          c.name !== detectedLat &&
          c.name.toLowerCase() !== 'id'
      )?.name || '';

    setSegLonCol(detectedLon);
    setSegLatCol(detectedLat);
    setSegValCol(detectedVal);
    setSegResult(null);
  }, [segTargetLayer?.id]);

  // 2. Update Basemap when changed
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;
    const bm = BASEMAP_TILES[basemap] || BASEMAP_TILES.osm_standard;
    if (map.getLayer('basemap_layer')) map.removeLayer('basemap_layer');
    if (map.getSource('basemap_src')) map.removeSource('basemap_src');

    if (bm.tiles.length > 0) {
      map.addSource('basemap_src', {
        type: 'raster',
        tiles: bm.tiles,
        tileSize: 256,
        attribution: bm.attribution,
      });
      const firstLayerId = map.getStyle().layers?.[0]?.id;
      map.addLayer(
        {
          id: 'basemap_layer',
          type: 'raster',
          source: 'basemap_src',
        },
        firstLayerId
      );
    }
  }, [basemap, mapLoaded]);

  // 3. Fetch GeoJSON for visible vector layers with Adaptive Simplification & BBox mode
  useEffect(() => {
    layers.forEach((lyr) => {
      if (lyr.kind === 'vector' && (visibleLayers[lyr.id] ?? true)) {
        const isLarge = lyr.feature_count > 20000;
        const tol =
          adaptiveSimplify && (isLarge || mapZoom < 11)
            ? Number(Math.max(0, 0.004 / Math.pow(2, Math.max(0, mapZoom - 8))).toFixed(6))
            : 0;
        api
          .getLayerGeoJSON(lyr.id, tol, projectId, mapZoom, isLarge ? viewportBbox : undefined)
          .then((fc) => {
            setLayerGeoJSONs((prev) => ({ ...prev, [lyr.id]: fc }));
          })
          .catch(() => { });
      }
    });
  }, [layers, visibleLayers, projectId, adaptiveSimplify, Math.floor(mapZoom), viewportBbox]);

  // 4. Sync Vector, Raster, Text Labels (`labelColumn`), Selection, Preview, Rubber-Band Box, and Pen Polygon Overlays
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const existingLayers = map.getStyle().layers || [];
    existingLayers.forEach((l) => {
      if (l.id.startsWith('petalab_')) {
        map.removeLayer(l.id);
      }
    });
    const existingSources = Object.keys(map.getStyle().sources || {});
    existingSources.forEach((sid) => {
      if (sid.startsWith('petalab_')) {
        map.removeSource(sid);
      }
    });

    const orderedLayers = [...layers].reverse();

    orderedLayers.forEach((lyr) => {
      const isVis = visibleLayers[lyr.id] ?? true;
      if (!isVis || lyr.kind === 'table') return;
      const opacity = layerOpacity[lyr.id] ?? lyr.style?.opacity ?? 0.78;

      if (lyr.kind === 'raster') {
        const srcId = `petalab_rast_src_${lyr.id}`;
        const lyrId = `petalab_rast_lyr_${lyr.id}`;
        const cmap = lyr.style?.hillshade ? 'hillshade' : lyr.style?.cmap || 'terrain';
        const band = lyr.style?.band || 1;
        const vmin = lyr.style?.vmin ?? '';
        const vmax = lyr.style?.vmax ?? '';
        const cacheBust = encodeURIComponent(lyr.updated_at || '');
        map.addSource(srcId, {
          type: 'raster',
          tiles: [
            `${window.location.origin}/tiles/raster/${lyr.id}/{z}/{x}/{y}.png?cmap=${cmap}&band=${band}&vmin=${vmin}&vmax=${vmax}&t=${cacheBust}`,
          ],
          tileSize: 256,
        });
        map.addLayer({
          id: lyrId,
          type: 'raster',
          source: srcId,
          paint: { 'raster-opacity': opacity },
        });
        return;
      }

      // Vector layer
      const fc = layerGeoJSONs[lyr.id];
      if (!fc) return;
      const srcId = `petalab_vec_src_${lyr.id}`;
      map.addSource(srcId, { type: 'geojson', data: fc });

      const st = lyr.style || { mode: 'single', color: '#0d9488' };
      const pal = COLOR_PALETTES[st.palette || 'viridis'] || COLOR_PALETTES.viridis;
      const breaks: number[] = fc.petalab_meta?.breaks || [];
      const cats: string[] = fc.petalab_meta?.categories || [];

      let colorExpr: any = st.fillColor || st.color || '#0d9488';
      if (st.mode === 'choropleth' && st.column && breaks.length >= 2) {
        const stepExpr: any[] = ['step', ['to-number', ['get', st.column], 0], pal[0]];
        for (let i = 1; i < breaks.length - 1; i++) {
          const cIdx = Math.min(pal.length - 1, Math.floor((i / Math.max(1, breaks.length - 2)) * (pal.length - 1)));
          stepExpr.push(breaks[i], pal[cIdx]);
        }
        colorExpr = stepExpr;
      } else if (st.mode === 'category' && st.column && cats.length > 0) {
        const matchExpr: any[] = ['match', ['to-string', ['get', st.column]]];
        const catPal = COLOR_PALETTES.categorical;
        cats.forEach((cVal, idx) => {
          matchExpr.push(cVal, catPal[idx % catPal.length]);
        });
        matchExpr.push(st.color || '#64748b');
        colorExpr = matchExpr;
      }

      if (lyr.geom_type === 'polygon') {
        map.addLayer({
          id: `petalab_fill_${lyr.id}`,
          type: 'fill',
          source: srcId,
          paint: {
            'fill-color': colorExpr,
            'fill-opacity': opacity,
          },
        });
        map.addLayer({
          id: `petalab_line_${lyr.id}`,
          type: 'line',
          source: srcId,
          paint: {
            'line-color': st.strokeColor || '#1c2a2e',
            'line-width': st.strokeWidth ?? 1.2,
          },
        });
      } else if (lyr.geom_type === 'line') {
        map.addLayer({
          id: `petalab_line_${lyr.id}`,
          type: 'line',
          source: srcId,
          paint: {
            'line-color': colorExpr,
            'line-width': st.strokeWidth ?? 3,
            'line-opacity': opacity,
          },
        });
      } else {
        if (st.mode === 'heatmap') {
          const heatPalKey = st.heatPalette || 'thermal';
          const heatRamp = HEATMAP_COLOR_RAMPS[heatPalKey] || HEATMAP_COLOR_RAMPS.thermal;
          const heatRadius = Number(st.heatRadius ?? 30);
          const heatIntensity = Number(st.heatIntensity ?? 1.3);
          const weightCol = st.heatWeightCol || st.column;
          const weightExpr: any =
            weightCol && breaks.length >= 2 && breaks[breaks.length - 1] > breaks[0]
              ? [
                  'interpolate',
                  ['linear'],
                  ['to-number', ['get', weightCol], breaks[0]],
                  breaks[0],
                  0.15,
                  breaks[breaks.length - 1],
                  1.0,
                ]
              : 1;

          map.addLayer({
            id: `petalab_heat_${lyr.id}`,
            type: 'heatmap',
            source: srcId,
            paint: {
              'heatmap-weight': weightExpr,
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 4, heatIntensity * 0.65, 11, heatIntensity, 16, heatIntensity * 1.65],
              'heatmap-color': heatRamp.expr,
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 4, Math.max(10, heatRadius * 0.55), 11, heatRadius, 16, heatRadius * 1.55],
              'heatmap-opacity': opacity,
            } as any,
          });

          // Optional crisp point overlay on top of Heatmap so individual coordinates stay clickable & inspectable
          if (st.heatShowPoints !== false) {
            map.addLayer({
              id: `petalab_pt_${lyr.id}`,
              type: 'circle',
              source: srcId,
              paint: {
                'circle-color': '#0f172a',
                'circle-radius': ['interpolate', ['linear'], ['zoom'], 6, 2.2, 12, 3.8, 16, 5.5],
                'circle-opacity': 0.55,
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 1,
              } as any,
            });
          }
        } else {
          let radiusExpr: any = st.pointRadius || 6;
          if (st.mode === 'proportional' && st.column && breaks.length >= 2) {
            radiusExpr = [
              'interpolate',
              ['linear'],
              ['to-number', ['get', st.column], breaks[0]],
              breaks[0],
              4,
              breaks[breaks.length - 1],
              18,
            ];
          }
          map.addLayer({
            id: `petalab_pt_${lyr.id}`,
            type: 'circle',
            source: srcId,
            paint: {
              'circle-color': colorExpr,
              'circle-radius': radiusExpr,
              'circle-opacity': opacity,
              'circle-stroke-color': '#ffffff',
              'circle-stroke-width': 1.5,
            },
          });
        }
      }

      // Label Teks (`labelColumn`) via MapLibre Symbol Layer
      if (st.labelColumn) {
        map.addLayer({
          id: `petalab_label_${lyr.id}`,
          type: 'symbol',
          source: srcId,
          layout: {
            'text-field': ['to-string', ['get', st.labelColumn]],
            'text-font': ['Open Sans Regular'],
            'text-size': 11,
            'text-offset': lyr.geom_type === 'point' ? [0, 1.1] : [0, 0],
            'text-anchor': lyr.geom_type === 'point' ? 'top' : 'center',
            'text-max-width': 10,
          },
          paint: {
            'text-color': '#0f172a',
            'text-halo-color': '#ffffff',
            'text-halo-width': 1.6,
          },
        });
      }

      // Selection Highlight Layer
      const selFids = selectionsByLayer[lyr.id] || [];
      if (selFids.length > 0) {
        const filterExpr: any = ['in', ['get', '_fid'], ['literal', selFids]];
        if (lyr.geom_type === 'polygon') {
          map.addLayer({
            id: `petalab_sel_fill_${lyr.id}`,
            type: 'fill',
            source: srcId,
            filter: filterExpr,
            paint: { 'fill-color': '#f97316', 'fill-opacity': 0.38 },
          });
          map.addLayer({
            id: `petalab_sel_outline_${lyr.id}`,
            type: 'line',
            source: srcId,
            filter: filterExpr,
            paint: { 'line-color': '#ea580c', 'line-width': 3 },
          });
        } else if (lyr.geom_type === 'line') {
          map.addLayer({
            id: `petalab_sel_line_${lyr.id}`,
            type: 'line',
            source: srcId,
            filter: filterExpr,
            paint: { 'line-color': '#f97316', 'line-width': 5 },
          });
        } else {
          map.addLayer({
            id: `petalab_sel_pt_${lyr.id}`,
            type: 'circle',
            source: srcId,
            filter: filterExpr,
            paint: {
              'circle-color': '#f97316',
              'circle-radius': (st.pointRadius || 6) + 3.5,
              'circle-stroke-color': '#0b1214',
              'circle-stroke-width': 2,
            },
          });
        }
      }
    });

    // Render Tool Preview GeoJSON if active
    if (previewGeoJSON && previewGeoJSON.features?.length > 0) {
      map.addSource('petalab_preview_src', { type: 'geojson', data: previewGeoJSON });
      map.addLayer({
        id: 'petalab_preview_fill',
        type: 'fill',
        source: 'petalab_preview_src',
        paint: { 'fill-color': '#14b8a6', 'fill-opacity': 0.32 },
      });
      map.addLayer({
        id: 'petalab_preview_line',
        type: 'line',
        source: 'petalab_preview_src',
        paint: { 'line-color': '#0f766e', 'line-width': 2.5, 'line-dasharray': [2, 2] },
      });
    }

    // Render Visual Rubber-Band Box when `select_box` has `boxStart` and `hoverPt`
    if (toolMode === 'select_box' && boxStart && hoverPt) {
      const minx = Math.min(boxStart[0], hoverPt[0]);
      const maxx = Math.max(boxStart[0], hoverPt[0]);
      const miny = Math.min(boxStart[1], hoverPt[1]);
      const maxy = Math.max(boxStart[1], hoverPt[1]);
      map.addSource('petalab_rubberband_src', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: [
            {
              type: 'Feature',
              properties: {},
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [minx, miny],
                    [maxx, miny],
                    [maxx, maxy],
                    [minx, maxy],
                    [minx, miny],
                  ],
                ],
              },
            },
          ],
        },
      });
      map.addLayer({
        id: 'petalab_rubberband_fill',
        type: 'fill',
        source: 'petalab_rubberband_src',
        paint: { 'fill-color': '#0d9488', 'fill-opacity': 0.16 },
      });
      map.addLayer({
        id: 'petalab_rubberband_line',
        type: 'line',
        source: 'petalab_rubberband_src',
        paint: { 'line-color': '#0f766e', 'line-width': 2, 'line-dasharray': [2, 2] },
      });
    }

    // Render Captured Points & Point-Pairs (`capture_point` mode)
    if (capturedPts.length > 0) {
      const capFeatures: any[] = capturedPts.map((cp, idx) => ({
        type: 'Feature',
        properties: { id: cp.id, label: `#${cp.id}` },
        geometry: { type: 'Point', coordinates: [cp.lon, cp.lat] },
      }));
      if (capturePairMode && capturedPts.length >= 2) {
        for (let i = 0; i + 1 < capturedPts.length; i += 2) {
          const a = capturedPts[i];
          const b = capturedPts[i + 1];
          capFeatures.push({
            type: 'Feature',
            properties: { pair: Math.floor(i / 2) + 1 },
            geometry: {
              type: 'LineString',
              coordinates: [
                [a.lon, a.lat],
                [b.lon, b.lat],
              ],
            },
          });
        }
      }
      map.addSource('petalab_capture_src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: capFeatures },
      });
      map.addLayer({
        id: 'petalab_capture_lines',
        type: 'line',
        source: 'petalab_capture_src',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': '#ea580c', 'line-width': 2.5, 'line-dasharray': [2, 1.5] },
      });
      map.addLayer({
        id: 'petalab_capture_pts',
        type: 'circle',
        source: 'petalab_capture_src',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': '#0f766e',
          'circle-radius': 7,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 2,
        },
      });
      map.addLayer({
        id: 'petalab_capture_labels',
        type: 'symbol',
        source: 'petalab_capture_src',
        filter: ['==', ['geometry-type'], 'Point'],
        layout: {
          'text-field': ['get', 'label'],
          'text-font': ['Open Sans Regular'],
          'text-size': 11,
          'text-offset': [0, -1.3],
        },
        paint: {
          'text-color': '#0b1214',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        },
      });
    }

    // Render Already-Completed Multi-Polygons / Features in `draw` Mode
    if (toolMode === 'draw' && completedDrawFeatures.length > 0) {
      map.addSource('petalab_completed_draw_src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: completedDrawFeatures },
      });
      map.addLayer({
        id: 'petalab_completed_draw_fill',
        type: 'fill',
        source: 'petalab_completed_draw_src',
        filter: ['==', ['geometry-type'], 'Polygon'],
        paint: { 'fill-color': '#10b981', 'fill-opacity': 0.28 },
      });
      map.addLayer({
        id: 'petalab_completed_draw_line',
        type: 'line',
        source: 'petalab_completed_draw_src',
        paint: { 'line-color': '#059669', 'line-width': 2.5 },
      });
      map.addLayer({
        id: 'petalab_completed_draw_pts',
        type: 'circle',
        source: 'petalab_completed_draw_src',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: { 'circle-color': '#059669', 'circle-radius': 6, 'circle-stroke-color': '#fff', 'circle-stroke-width': 1.5 },
      });
    }

    // Render Active Pen Tool Vertices, Closed Polygon Area, and Live Rubber-Band Line (ONLY when NOT finished!)
    const activeScratchPts =
      toolMode === 'measure'
        ? measurePts
        : toolMode === 'draw'
          ? drawPts
          : toolMode === 'select_polygon'
            ? polySelectPts
            : [];

    const isSegmentFinished =
      (toolMode === 'measure' && measureFinished) ||
      (toolMode === 'draw' && drawFinished) ||
      (toolMode === 'select_polygon' && polySelectFinished);

    if (activeScratchPts.length > 0) {
      // Only attach `hoverPt` rubber-band tail while the user is actively drawing (`!isSegmentFinished`)
      const shouldShowRubberBand =
        !isSegmentFinished &&
        hoverPt !== null &&
        !(toolMode === 'draw' && drawGeomType === 'point');

      const ptsWithHover = shouldShowRubberBand
        ? [...activeScratchPts, isHoveringStartVertex ? activeScratchPts[0] : hoverPt!]
        : activeScratchPts;

      const features: any[] = activeScratchPts.map((pt, i) => ({
        type: 'Feature',
        properties: { idx: i + 1, isStart: i === 0 ? 1 : 0 },
        geometry: { type: 'Point', coordinates: pt },
      }));

      const isPolygonShape =
        toolMode === 'measure' ||
        toolMode === 'select_polygon' ||
        (toolMode === 'draw' && drawGeomType === 'polygon');

      // When finished (`isSegmentFinished`) or when >= 3 points exist, automatically connect the end point back to the start point `pts[0]`!
      const ringSourcePts = isSegmentFinished ? activeScratchPts : ptsWithHover;
      if (isPolygonShape && ringSourcePts.length >= 3) {
        features.push({
          type: 'Feature',
          properties: { kind: 'area' },
          geometry: {
            type: 'Polygon',
            coordinates: [[...ringSourcePts, ringSourcePts[0]]],
          },
        });
      }

      if (ringSourcePts.length >= 2) {
        const lineCoords =
          isPolygonShape && ringSourcePts.length >= 3
            ? [...ringSourcePts, ringSourcePts[0]]
            : ringSourcePts;
        features.push({
          type: 'Feature',
          properties: { kind: 'line' },
          geometry: {
            type: 'LineString',
            coordinates: lineCoords,
          },
        });
      }

      const strokeCol = isSegmentFinished
        ? '#10b981'
        : toolMode === 'select_polygon'
          ? '#0d9488'
          : '#ea580c';

      map.addSource('petalab_scratch_src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features },
      });

      if (isPolygonShape && ringSourcePts.length >= 3) {
        map.addLayer({
          id: 'petalab_scratch_fill',
          type: 'fill',
          source: 'petalab_scratch_src',
          filter: ['==', ['geometry-type'], 'Polygon'],
          paint: {
            'fill-color': strokeCol,
            'fill-opacity': isSegmentFinished ? 0.26 : 0.16,
          },
        });
      }

      map.addLayer({
        id: 'petalab_scratch_line',
        type: 'line',
        source: 'petalab_scratch_src',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: {
          'line-color': strokeCol,
          'line-width': isSegmentFinished ? 2.8 : 2.2,
          'line-dasharray': isSegmentFinished ? [1, 0] : [3, 2],
        },
      });

      map.addLayer({
        id: 'petalab_scratch_pts',
        type: 'circle',
        source: 'petalab_scratch_src',
        filter: ['==', ['geometry-type'], 'Point'],
        paint: {
          'circle-color': [
            'case',
            ['==', ['get', 'isStart'], 1],
            '#10b981',
            strokeCol,
          ],
          'circle-radius': [
            'case',
            ['==', ['get', 'isStart'], 1],
            isHoveringStartVertex ? 8 : 6,
            4.5,
          ],
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.8,
        },
      });
    }
  }, [
    layers,
    visibleLayers,
    layerOpacity,
    layerGeoJSONs,
    selectionsByLayer,
    previewGeoJSON,
    measurePts,
    measureFinished,
    drawPts,
    drawFinished,
    completedDrawFeatures,
    capturedPts,
    capturePairMode,
    polySelectPts,
    polySelectFinished,
    boxStart,
    hoverPt,
    isHoveringStartVertex,
    toolMode,
    drawGeomType,
    mapLoaded,
  ]);

  // 5. Handle Zoom-to-Bbox requests from Layer Panel or Table
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !zoomToBboxRequest) return;
    const [minx, miny, maxx, maxy] = zoomToBboxRequest;
    if (Math.abs(maxx - minx) < 0.0001 && Math.abs(maxy - miny) < 0.0001) {
      map.flyTo({ center: [minx, miny], zoom: 15 });
    } else {
      map.fitBounds(
        [
          [minx, miny],
          [maxx, maxy],
        ],
        { padding: 48, duration: 750 }
      );
    }
    requestZoomToBbox(null);
  }, [zoomToBboxRequest]);

  // Helper to commit/close current drawn polygon/line segment in `draw` mode ("putus segmentasi & hubungkan ke titik awal")
  const finishCurrentDrawSegment = (ptsInput?: [number, number][]) => {
    const pts = ptsInput || drawPts;
    if (pts.length === 0) return;

    if (drawGeomType === 'polygon' && pts.length >= 3) {
      const polyFeature = {
        type: 'Feature',
        properties: { nama: `${drawLayerName} #${completedDrawFeatures.length + 1}`, kelas: drawClassLabel },
        geometry: {
          type: 'Polygon',
          coordinates: [[...pts, pts[0]]],
        },
      };
      setCompletedDrawFeatures((prev) => [...prev, polyFeature]);
      setDrawPts([]);
      setDrawFinished(false);
      setIsHoveringStartVertex(false);
      addToast({
        type: 'info',
        title: `Poligon #${completedDrawFeatures.length + 1} Selesai & Terhubung Otomatis`,
        message: 'Anda bisa langsung menggambar poligon berikutnya atau klik Simpan Layer.',
      });
    } else if (drawGeomType === 'line' && pts.length >= 2) {
      const lineFeature = {
        type: 'Feature',
        properties: { nama: `${drawLayerName} #${completedDrawFeatures.length + 1}`, kelas: drawClassLabel },
        geometry: {
          type: 'LineString',
          coordinates: pts,
        },
      };
      setCompletedDrawFeatures((prev) => [...prev, lineFeature]);
      setDrawPts([]);
      setDrawFinished(false);
      addToast({
        type: 'info',
        title: `Garis #${completedDrawFeatures.length + 1} Selesai`,
        message: 'Anda bisa menggambar garis berikutnya atau klik Simpan Layer.',
      });
    } else if (drawGeomType === 'point' && pts.length >= 1) {
      const ptFeature = {
        type: 'Feature',
        properties: { nama: `${drawLayerName} #${completedDrawFeatures.length + 1}`, kelas: drawClassLabel },
        geometry: {
          type: 'Point',
          coordinates: pts[0],
        },
      };
      setCompletedDrawFeatures((prev) => [...prev, ptFeature]);
      setDrawPts([]);
    }
  };

  // Execute Freehand Polygon Selection
  const handleApplyPolygonSelection = async (ptsInput?: [number, number][]) => {
    const pts = ptsInput || polySelectPts;
    if (!activeLayerId || pts.length < 3) {
      addToast({ type: 'warning', title: 'Pilih minimal 3 titik sudut untuk seleksi poligon.' });
      return;
    }
    try {
      setPolySelectFinished(true);
      const res = await api.selectFeatures(
        activeLayerId,
        {
          mode: 'geometry',
          geometry: {
            type: 'Polygon',
            coordinates: [[...pts, pts[0]]],
          },
        },
        projectId
      );
      setLayerSelection(activeLayerId, res.fids, 'map');
      addToast({
        type: 'success',
        title: 'Poligon Ditutup & Seleksi Selesai',
        message: `Terpilih ${res.count} fitur di dalam poligon.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal seleksi poligon', message: err.message });
    }
  };

  // 6. Map MouseMove, Click, Double-Click (`dblclick`), and Right-Click (`contextmenu`) Handlers for Pen Tools
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapLoaded) return;

    const getActivePenPts = (): [number, number][] => {
      if (toolMode === 'measure' && !measureFinished) return measurePts;
      if (toolMode === 'draw' && !drawFinished) return drawPts;
      if (toolMode === 'select_polygon' && !polySelectFinished) return polySelectPts;
      return [];
    };

    const handleMouseMove = (e: maplibregl.MapMouseEvent) => {
      const lat = Number(e.lngLat.lat.toFixed(6));
      const lon = Number(e.lngLat.lng.toFixed(6));
      const pt: [number, number] = [lon, lat];
      setCursorCoords({ lat: Number(lat.toFixed(5)), lon: Number(lon.toFixed(5)) });
      setHoverPt(pt);

      // Check if cursor is hovering within 14px of the FIRST vertex (`pts[0]`) to snap-close polygon
      const pts = getActivePenPts();
      if (pts.length >= 3 && screenDistPx(map, pt, pts[0]) <= 14) {
        setIsHoveringStartVertex(true);
      } else {
        setIsHoveringStartVertex(false);
      }
    };

    const handleClick = async (e: maplibregl.MapMouseEvent) => {
      const pt: [number, number] = [Number(e.lngLat.lng.toFixed(6)), Number(e.lngLat.lat.toFixed(6))];

      // --- 0. CAPTURE POINT & COORDINATE-PAIR TOOL ---
      if (toolMode === 'capture_point') {
        const nextId = capturedPts.length + 1;
        setCapturedPts((prev) => [
          ...prev,
          { id: nextId, lat: pt[1], lon: pt[0], label: `Titik ${nextId}`, kategori: 'Titik Survei' },
        ]);
        return;
      }

      // --- A. MEASURE TOOL (Pen Tool) ---
      if (toolMode === 'measure') {
        if (measureFinished) {
          // Starting a brand-new measurement after previous one was finished
          setMeasureFinished(false);
          setMeasurePts([pt]);
          return;
        }
        // Check if user clicked on the start vertex (`measurePts[0]`) to close & finish polygon
        if (measurePts.length >= 3 && screenDistPx(map, pt, measurePts[0]) <= 14) {
          setMeasureFinished(true);
          setIsHoveringStartVertex(false);
          return;
        }
        // Ignore duplicate click from double-click (< 7px from last point)
        if (measurePts.length > 0 && screenDistPx(map, pt, measurePts[measurePts.length - 1]) < 7) {
          return;
        }
        setMeasurePts((prev) => [...prev, pt]);
        return;
      }

      // --- B. POLYGON SELECTION TOOL (Pen Tool) ---
      if (toolMode === 'select_polygon') {
        if (polySelectFinished) {
          setPolySelectFinished(false);
          setPolySelectPts([pt]);
          return;
        }
        // Snap to first vertex (`polySelectPts[0]`) -> automatically close & run selection
        if (polySelectPts.length >= 3 && screenDistPx(map, pt, polySelectPts[0]) <= 14) {
          setIsHoveringStartVertex(false);
          await handleApplyPolygonSelection(polySelectPts);
          return;
        }
        // Ignore duplicate click from double-click
        if (polySelectPts.length > 0 && screenDistPx(map, pt, polySelectPts[polySelectPts.length - 1]) < 7) {
          return;
        }
        setPolySelectPts((prev) => [...prev, pt]);
        return;
      }

      // --- C. DRAW LAYER TOOL (Pen Tool) ---
      if (toolMode === 'draw') {
        if (drawGeomType === 'point') {
          const ptFeature = {
            type: 'Feature',
            properties: { nama: `${drawLayerName} #${completedDrawFeatures.length + 1}`, kelas: drawClassLabel },
            geometry: { type: 'Point', coordinates: pt },
          };
          setCompletedDrawFeatures((prev) => [...prev, ptFeature]);
          return;
        }
        // Snap to first vertex (`drawPts[0]`) -> automatically close & commit polygon segment
        if (drawGeomType === 'polygon' && drawPts.length >= 3 && screenDistPx(map, pt, drawPts[0]) <= 14) {
          finishCurrentDrawSegment(drawPts);
          return;
        }
        // Ignore duplicate click from double-click
        if (drawPts.length > 0 && screenDistPx(map, pt, drawPts[drawPts.length - 1]) < 7) {
          return;
        }
        setDrawPts((prev) => [...prev, pt]);
        return;
      }

      // --- D. RADIUS SELECTION ---
      if (toolMode === 'select_radius' && activeLayerId) {
        try {
          const res = await api.selectFeatures(
            activeLayerId,
            {
              mode: 'geometry',
              geometry: { type: 'Point', coordinates: pt },
              radius_m: selectRadiusM,
            },
            projectId
          );
          setLayerSelection(activeLayerId, res.fids, 'map');
          addToast({
            type: 'info',
            title: `Seleksi Radius ${selectRadiusM} m`,
            message: `Terpilih ${res.count} fitur dari ${activeLayer?.name}.`,
          });
        } catch (err: any) {
          addToast({ type: 'error', title: 'Gagal memilih radius', message: err.message });
        }
        return;
      }

      // --- E. BOX SELECTION ---
      if (toolMode === 'select_box' && activeLayerId) {
        if (!boxStart) {
          setBoxStart(pt);
        } else {
          const minx = Math.min(boxStart[0], pt[0]);
          const maxx = Math.max(boxStart[0], pt[0]);
          const miny = Math.min(boxStart[1], pt[1]);
          const maxy = Math.max(boxStart[1], pt[1]);
          setBoxStart(null);
          try {
            const res = await api.selectFeatures(
              activeLayerId,
              {
                mode: 'geometry',
                geometry: {
                  type: 'Polygon',
                  coordinates: [
                    [
                      [minx, miny],
                      [maxx, miny],
                      [maxx, maxy],
                      [minx, maxy],
                      [minx, miny],
                    ],
                  ],
                },
              },
              projectId
            );
            setLayerSelection(activeLayerId, res.fids, 'map');
            addToast({
              type: 'success',
              title: 'Seleksi Kotak Selesai',
              message: `Ditemukan ${res.count} fitur di dalam area kotak.`,
            });
          } catch (err: any) {
            addToast({ type: 'error', title: 'Gagal seleksi kotak', message: err.message });
          }
        }
        return;
      }

      // --- F. DEFAULT: IDENTIFY & CLICK SELECTION ---
      const queryableLayers = (map.getStyle().layers || [])
        .map((l) => l.id)
        .filter((id) => id.startsWith('petalab_fill_') || id.startsWith('petalab_line_') || id.startsWith('petalab_pt_'));

      if (queryableLayers.length === 0) return;
      const hits = map.queryRenderedFeatures(e.point, { layers: queryableLayers });
      if (hits.length > 0) {
        const topHit = hits[0];
        const hitLayerId = topHit.layer.id.replace(/^petalab_(fill|line|pt)_/, '');
        const hitLayer = layers.find((l) => l.id === hitLayerId);
        const props = topHit.properties || {};
        const fid = Number(props._fid);

        if (fid) {
          setActiveLayerId(hitLayerId);
          toggleFeatureSelection(hitLayerId, fid, e.originalEvent.shiftKey);
        }
        if (toolMode === 'identify') {
          setIdentifiedFeature({
            layerName: hitLayer?.name || hitLayerId,
            props,
            lngLat: pt,
          });
        }
      } else {
        setIdentifiedFeature(null);
      }
    };

    // Double-Click (`dblclick`) & Right-Click (`contextmenu`) -> Cut segmentation ("putus") & auto-close start-to-end!
    const handleFinishGesture = async (e: maplibregl.MapMouseEvent) => {
      if (toolMode === 'measure' && !measureFinished && measurePts.length >= 2) {
        e.preventDefault();
        setMeasureFinished(true);
        setIsHoveringStartVertex(false);
      } else if (toolMode === 'select_polygon' && !polySelectFinished && polySelectPts.length >= 3) {
        e.preventDefault();
        setIsHoveringStartVertex(false);
        await handleApplyPolygonSelection(polySelectPts);
      } else if (toolMode === 'draw' && drawPts.length >= 2) {
        e.preventDefault();
        finishCurrentDrawSegment(drawPts);
      }
    };

    map.on('mousemove', handleMouseMove);
    map.on('click', handleClick);
    map.on('dblclick', handleFinishGesture);
    map.on('contextmenu', handleFinishGesture);
    return () => {
      map.off('mousemove', handleMouseMove);
      map.off('click', handleClick);
      map.off('dblclick', handleFinishGesture);
      map.off('contextmenu', handleFinishGesture);
    };
  }, [
    toolMode,
    mapLoaded,
    activeLayerId,
    activeLayer,
    drawGeomType,
    drawLayerName,
    drawClassLabel,
    boxStart,
    selectRadiusM,
    measurePts,
    measureFinished,
    drawPts,
    drawFinished,
    completedDrawFeatures,
    capturedPts,
    capturePairMode,
    polySelectPts,
    polySelectFinished,
    layers,
    projectId,
  ]);

  const handleCreateNewCsvDataset = async () => {
    if (capturedPts.length === 0) {
      addToast({ type: 'warning', title: 'Klik minimal 1 titik di peta terlebih dahulu.' });
      return;
    }
    const payloadPoints = capturedPts.map((p, idx) => {
      let partner = null;
      if (capturePairMode) {
        partner = idx % 2 === 1 ? capturedPts[idx - 1] : capturedPts[idx + 1] || null;
      }
      const distM = partner ? Math.round(haversineDistanceM([partner.lon, partner.lat], [p.lon, p.lat]) * 100) / 100 : null;
      return {
        id: p.id,
        nama: p.label,
        kategori: p.kategori || 'Titik Survei',
        pasangan_grup: capturePairMode ? `Pasangan ${Math.floor(idx / 2) + 1}` : 'Tunggal',
        peran: capturePairMode ? (idx % 2 === 0 ? 'Titik Asal (A)' : 'Titik Tujuan (B)') : 'Titik',
        long: p.lon,
        lat: p.lat,
        jarak_m: distM,
      };
    });

    try {
      const res = await api.createCsvDataset({
        project_id: projectId,
        dataset_name: captureLayerName || 'dataset_titik_baru',
        points: payloadPoints,
        join_table_layer_id: captureJoinTableId || null,
        csv_delimiter: captureCsvDelimiter,
        pair_mode: capturePairMode,
      });
      setLastCreatedCsv({
        filename: res.csv_filename,
        url: res.csv_download_url,
        xlsxFilename: res.xlsx_filename,
        xlsxUrl: res.xlsx_download_url,
      });
      await refreshLayers();
      setActiveLayerId(res.layer.id);
      addToast({
        type: 'success',
        title: `Dataset '${res.csv_filename}' berhasil dibuat (${res.row_count} baris)`,
        message: 'Kolom long & lat sudah tersimpan rapi di CSV & Excel (.xlsx), dan aktif di Peta + Tabel.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal membuat dataset CSV', message: err.message });
    }
  };

  const handleSaveCapturedPoints = async (asPairLines: boolean) => {
    if (capturedPts.length === 0) return;
    let features: any[] = [];
    if (asPairLines && capturedPts.length >= 2) {
      for (let i = 0; i + 1 < capturedPts.length; i += 2) {
        const a = capturedPts[i];
        const b = capturedPts[i + 1];
        const distM = Math.round(haversineDistanceM([a.lon, a.lat], [b.lon, b.lat]) * 100) / 100;
        features.push({
          type: 'Feature',
          properties: {
            nama: `Pasangan ${Math.floor(i / 2) + 1} (${a.label} -> ${b.label})`,
            asal_lintang: a.lat,
            asal_bujur: a.lon,
            tujuan_lintang: b.lat,
            tujuan_bujur: b.lon,
            pasangan_koordinat: `(${a.lat.toFixed(6)}, ${a.lon.toFixed(6)}) -> (${b.lat.toFixed(6)}, ${b.lon.toFixed(6)})`,
            jarak_m: distM,
          },
          geometry: {
            type: 'LineString',
            coordinates: [
              [a.lon, a.lat],
              [b.lon, b.lat],
            ],
          },
        });
      }
    } else {
      features = capturedPts.map((p, idx) => ({
        type: 'Feature',
        properties: {
          nama: p.label,
          pasangan_grup: capturePairMode ? `Pasangan ${Math.floor(idx / 2) + 1}` : 'Tunggal',
          peran: capturePairMode ? (idx % 2 === 0 ? 'Titik Asal (A)' : 'Titik Tujuan (B)') : 'Titik',
          lintang: p.lat,
          bujur: p.lon,
          koordinat_lat_lon: `${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}`,
        },
        geometry: { type: 'Point', coordinates: [p.lon, p.lat] },
      }));
    }

    try {
      const saved = await api.createDrawnLayer({
        project_id: projectId,
        name: captureLayerName || (asPairLines ? 'pasangan_titik_garis' : 'titik_koordinat'),
        geojson: { type: 'FeatureCollection', features },
      });
      await refreshLayers();
      setActiveLayerId(saved.id);
      addToast({
        type: 'success',
        title: `Layer '${saved.name}' disimpan (${features.length} fitur)`,
        message: 'Kolom lintang, bujur, pasangan koordinat, & UTM otomatis tercatat di Tabel.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal menyimpan titik koordinat', message: err.message });
    }
  };

  const handleLocationSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    try {
      const res = await api.osmSearch(searchQuery);
      setSearchResults(res);
    } catch {
      setSearchResults([]);
    }
  };

  // Save all completed drawn features (+ any active unclosed polygon if >= 3 pts) as a new layer
  const handleSaveDrawnLayer = async () => {
    const allFeatures = [...completedDrawFeatures];
    if (drawPts.length > 0) {
      if (drawGeomType === 'point') {
        allFeatures.push({
          type: 'Feature',
          properties: { nama: `${drawLayerName} #${allFeatures.length + 1}`, kelas: drawClassLabel },
          geometry: { type: 'Point', coordinates: drawPts[0] },
        });
      } else if (drawGeomType === 'line' && drawPts.length >= 2) {
        allFeatures.push({
          type: 'Feature',
          properties: { nama: `${drawLayerName} #${allFeatures.length + 1}`, kelas: drawClassLabel },
          geometry: { type: 'LineString', coordinates: drawPts },
        });
      } else if (drawGeomType === 'polygon' && drawPts.length >= 3) {
        allFeatures.push({
          type: 'Feature',
          properties: { nama: `${drawLayerName} #${allFeatures.length + 1}`, kelas: drawClassLabel },
          geometry: { type: 'Polygon', coordinates: [[...drawPts, drawPts[0]]] },
        });
      }
    }

    if (allFeatures.length === 0) {
      addToast({ type: 'warning', title: 'Gambar minimal 1 objek terlebih dahulu.' });
      return;
    }

    try {
      const saved = await api.createDrawnLayer({
        project_id: projectId,
        name: drawLayerName || 'layer_poligon_baru',
        geojson: {
          type: 'FeatureCollection',
          features: allFeatures,
        },
      });
      setDrawPts([]);
      setCompletedDrawFeatures([]);
      setDrawFinished(false);
      setToolMode('identify');
      await refreshLayers();
      setActiveLayerId(saved.id);
      addToast({
        type: 'success',
        title: `Layer '${saved.name}' (${allFeatures.length} objek) berhasil disimpan`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal menyimpan gambar', message: err.message });
    }
  };

  const handleRunSegmentLonLat = async () => {
    if (!segTargetLayer) {
      addToast({ type: 'warning', title: 'Belum ada layer/tabel sumber yang dipilih.' });
      return;
    }
    if (!segLonCol || !segLatCol) {
      addToast({ type: 'warning', title: 'Pilih kolom Bujur (Long) dan Lintang (Lat) terlebih dahulu.' });
      return;
    }
    setSegBusy(true);
    try {
      const res = await api.segmentLonLat(segTargetLayer.id, {
        project_id: projectId,
        lon_column: segLonCol,
        lat_column: segLatCol,
        auto_fix_indonesia: segAutoFixSwap,
        segment_mode: segMode,
        grid_nx: segGridNx,
        grid_ny: segGridNy,
        n_segments: segK,
        value_column: segValCol || null,
        create_zone_layer: segCreateZones,
        view_as_heatmap: segViewHeatmap,
        heat_weight_col: segValCol || null,
      });
      setSegResult(res);
      await refreshLayers();
      setActiveLayerId(res.point_layer.id);
      if (res.bbox) {
        requestZoomToBbox(res.bbox);
      }
      addToast({
        type: 'success',
        title: `Akurasi & Segmentasi Selesai (${res.accuracy.valid_points} titik)`,
        message: `${res.accuracy.region_hint} · ${res.accuracy.utm_crs}${res.accuracy.swapped_applied ? ' · Koordinat terbalik diperbaiki otomatis' : ''}`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: err.message || 'Gagal melakukan segmentasi Long/Lat', message: err.hint });
    } finally {
      setSegBusy(false);
    }
  };

  const handleToggleQuickHeatmap = async () => {
    const ptLayer =
      activeLayer?.kind === 'vector' && activeLayer?.geom_type === 'point'
        ? activeLayer
        : layers.find((l) => l.kind === 'vector' && l.geom_type === 'point');
    if (!ptLayer) {
      addToast({
        type: 'warning',
        title: 'Heatmap memerlukan layer bertipe Titik (Point)',
        message: 'Gunakan tombol "Segmentasi Long/Lat" untuk mengubah tabel koordinat menjadi titik terlebih dahulu.',
      });
      return;
    }
    const isHeat = ptLayer.style?.mode === 'heatmap';
    const numCol = ptLayer.schema.find(
      (s) =>
        (s.type === 'number' || s.type === 'integer') &&
        !['_fid', 'id', 'long', 'lat', 'longitude', 'latitude', 'long_akurat', 'lat_akurat', 'utm_x_m', 'utm_y_m'].includes(
          s.name.toLowerCase()
        )
    )?.name;
    const hasSegCol = ptLayer.schema.some((s) => s.name === 'segmen_zona');
    const nextPatch = isHeat
      ? { mode: hasSegCol ? 'category' : 'single', column: hasSegCol ? 'segmen_zona' : ptLayer.style?.column }
      : {
          mode: 'heatmap',
          column: ptLayer.style?.heatWeightCol || numCol || null,
          heatWeightCol: ptLayer.style?.heatWeightCol || numCol || null,
          heatPalette: ptLayer.style?.heatPalette || 'thermal',
          heatRadius: ptLayer.style?.heatRadius ?? 30,
          heatIntensity: ptLayer.style?.heatIntensity ?? 1.35,
          heatShowPoints: ptLayer.style?.heatShowPoints ?? true,
        };
    try {
      setActiveLayerId(ptLayer.id);
      await api.updateLayer(ptLayer.id, { style: { ...(ptLayer.style || {}), ...nextPatch } }, projectId);
      await refreshLayers();
      const fc = await api.getLayerGeoJSON(ptLayer.id, 0, projectId, mapZoom);
      setLayerGeoJSONs((prev) => ({ ...prev, [ptLayer.id]: fc }));
      if (ptLayer.bbox) requestZoomToBbox(ptLayer.bbox);
      addToast({
        type: 'info',
        title: isHeat ? `Mode Titik aktif untuk '${ptLayer.name}'` : `View Heatmap aktif untuk '${ptLayer.name}'`,
        message: !isHeat && numCol ? `Bobot panas menggunakan kolom '${numCol}'. Sesuaikan radius/palet di tab Gaya.` : undefined,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal mengubah tampilan Heatmap', message: err.message });
    }
  };

  const handleStyleUpdate = async (patch: Record<string, any>) => {
    if (!activeLayer) return;
    const nextStyle = { ...(activeLayer.style || {}), ...patch };
    try {
      await api.updateLayer(activeLayer.id, { style: nextStyle }, projectId);
      await refreshLayers();
      if (activeLayer.kind === 'vector') {
        const fc = await api.getLayerGeoJSON(activeLayer.id, 0, projectId, mapZoom);
        setLayerGeoJSONs((prev) => ({ ...prev, [activeLayer.id]: fc }));
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal memperbarui gaya peta', message: err.message });
    }
  };

  const handleSelectByLocation = async () => {
    if (!activeLayer || !locRefLayerId) return;
    try {
      const res = await api.selectFeatures(
        activeLayer.id,
        {
          mode: 'location',
          reference_layer_id: locRefLayerId,
          relation: locRelation,
          distance_m: locDistM,
        },
        projectId
      );
      setLayerSelection(activeLayer.id, res.fids, 'query');
      addToast({
        type: 'success',
        title: 'Seleksi Berdasarkan Lokasi',
        message: `Ditemukan ${res.count} fitur dari '${activeLayer.name}'.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal memilih berdasarkan lokasi', message: err.message });
    }
  };

  // Compute total geodesic distance, closed perimeter, & polygon area (m², ha, km²) for Measure tool
  const openChainM = measurePts.reduce((acc, pt, idx) => {
    if (idx === 0) return 0;
    return acc + haversineDistanceM(measurePts[idx - 1], pt);
  }, 0);
  const closingEdgeM =
    measurePts.length >= 3 ? haversineDistanceM(measurePts[measurePts.length - 1], measurePts[0]) : 0;
  const totalMeasureM = measureFinished && measurePts.length >= 3 ? openChainM + closingEdgeM : openChainM;
  const totalAreaM2 = geodesicPolygonAreaM2(measurePts);
  const totalAreaHa = totalAreaM2 / 10000.0;
  const totalAreaKm2 = totalAreaM2 / 1e6;

  const activeLayerMeta = activeLayer ? layerGeoJSONs[activeLayer.id]?.petalab_meta : null;

  return (
    <div className="relative flex h-full w-full overflow-hidden bg-slate-100 dark:bg-slate-900">
      {/* Main Map Area */}
      <div className="relative flex-1 h-full overflow-hidden">
        {/* Top Floating Toolbar */}
        <div className="absolute top-3 left-3 right-3 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none">
          <div className="flex flex-wrap items-center gap-1 bg-white/95 dark:bg-slate-800/95 shadow-sm rounded p-1.5 border border-slate-200/80 dark:border-slate-700 pointer-events-auto">
            <form onSubmit={handleLocationSearch} className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!e.target.value) setSearchResults([]);
                }}
                placeholder="Cari lokasi..."
                className="pl-7 pr-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700/70 border border-transparent focus:border-teal-600 focus:outline-none w-40"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-8 left-0 w-64 bg-white dark:bg-slate-800 shadow-sm rounded border border-slate-200 dark:border-slate-700 py-1 z-30">
                  {searchResults.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        mapRef.current?.flyTo({ center: [item.lon, item.lat], zoom: 13.5 });
                        setSearchResults([]);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 dark:hover:bg-slate-700 truncate"
                    >
                      {item.display_name}
                    </button>
                  ))}
                </div>
              )}
            </form>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            <button
              onClick={() => setToolMode('pan')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition ${toolMode === 'pan' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
            >
              <Hand className="w-3.5 h-3.5" />
              <span>Geser</span>
            </button>

            <button
              onClick={() => setToolMode('identify')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition ${toolMode === 'identify' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Info</span>
            </button>

            <button
              onClick={() => setToolMode('capture_point')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition ${toolMode === 'capture_point'
 ? 'bg-slate-900 dark:bg-teal-700 text-white'
 : 'hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
              title="Letakkan titik di peta untuk menangkap Lintang, Bujur, & Pasangan Titik (A <-> B)"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Tangkap Titik</span>
            </button>

            <button
              onClick={() => {
                setBoxStart(null);
                setToolMode('select_box');
              }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition ${toolMode === 'select_box' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
              title="Tarik kotak persegi untuk memilih fitur"
            >
              <MousePointerSquareDashed className="w-3.5 h-3.5" />
              <span>Kotak</span>
            </button>

            <button
              onClick={() => {
                setPolySelectPts([]);
                setPolySelectFinished(false);
                setToolMode('select_polygon');
              }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition ${toolMode === 'select_polygon'
 ? 'bg-slate-900 dark:bg-teal-700 text-white'
 : 'hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
              title="Pen Tool Seleksi Poligon (Klik 2x atau klik titik awal untuk putus & tutup poligon)"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Poligon</span>
            </button>

            <button
              onClick={() => setToolMode('select_radius')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition ${toolMode === 'select_radius'
 ? 'bg-slate-900 dark:bg-teal-700 text-white'
 : 'hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span>Radius</span>
            </button>

            <button
              onClick={() => {
                setMeasurePts([]);
                setMeasureFinished(false);
                setToolMode('measure');
              }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition ${toolMode === 'measure' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
              title="Pen Tool Ukur Jarak & Luas (Klik 2x atau klik titik awal untuk putus & tutup poligon)"
            >
              <Ruler className="w-3.5 h-3.5" />
              <span>Ukur Jarak & Luas</span>
            </button>

            <button
              onClick={() => {
                setDrawPts([]);
                setDrawFinished(false);
                setToolMode('draw');
              }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition ${toolMode === 'draw' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
              title="Pen Tool Gambar Layer Baru (Klik 2x atau klik titik awal untuk putus & tutup poligon)"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Gambar Layer</span>
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            <button
              onClick={() => {
                if (!swipeActive && !swipeLayerId) {
                  const second = layers.find((l) => l.id !== activeLayerId && l.kind !== 'table') || layers[0];
                  if (second) setSwipeLayerId(second.id);
                }
                setSwipeActive(!swipeActive);
              }}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition ${swipeActive ? 'bg-teal-700 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Swipe</span>
            </button>

            <button
              onClick={() => {
                if (activeLayer?.bbox) {
                  requestZoomToBbox(activeLayer.bbox);
                } else {
                  mapRef.current?.flyTo({ center: [112.742, -7.275], zoom: 11.5 });
                }
              }}
              className="flex items-center gap-1 px-2 py-1.5 rounded text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>Fokus</span>
            </button>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

            <button
              onClick={() => setToolMode(toolMode === 'segment_lonlat' ? 'identify' : 'segment_lonlat')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition ${
 toolMode === 'segment_lonlat'
 ? 'bg-teal-700 text-white shadow-sm'
 : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-teal-700 dark:text-teal-400'
 }`}
              title="Pilih 2 kolom (Long & Lat) dari data, akuratkan ke peta, & buat segmentasi zona"
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Segmentasi Long/Lat</span>
            </button>

            <button
              onClick={handleToggleQuickHeatmap}
              className={`flex items-center gap-1 px-2 py-1.5 rounded text-xs transition ${
 activeLayer?.style?.mode === 'heatmap'
 ? 'bg-orange-600 text-white shadow-sm'
 : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-orange-600 dark:text-orange-400'
 }`}
              title="Tampilkan / matikan View Peta Panas (Heatmap) pada layer titik aktif"
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Heatmap</span>
            </button>
          </div>

          {/* Basemap Selector */}
          <div className="flex items-center gap-2 bg-white/95 dark:bg-slate-800/95 shadow-sm rounded px-3 py-1.5 border border-slate-200/80 dark:border-slate-700 pointer-events-auto">
            <span className="text-xs text-slate-500 dark:text-slate-400">Basemap:</span>
            <select
              value={basemap}
              onChange={(e) => setBasemap(e.target.value as any)}
              className="text-xs bg-transparent focus:outline-none cursor-pointer"
            >
              {Object.entries(BASEMAP_TILES).map(([k, v]) => (
                <option key={k} value={k} className="dark:bg-slate-800">
                  {v.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Context Floating Panel for 2-Column Long/Lat Accuracy & Map Segmentation (`segment_lonlat`) */}
        {toolMode === 'segment_lonlat' && (
          <div className="absolute top-16 left-3 z-20 w-[420px] max-w-[94vw] max-h-[80vh] overflow-y-auto bg-white/95 dark:bg-slate-800/95 shadow-sm rounded-md p-4 border border-slate-200 dark:border-slate-700 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-teal-700">Segmentasi &amp; Akurasi Koordinat</div>
                <div className="text-slate-800 dark:text-slate-100">
                  Pilih kolom Longitude &amp; Latitude, akuratkan ke peta, &amp; bagi segmen
                </div>
              </div>
              <button
                onClick={() => setToolMode('identify')}
                aria-label="Tutup Panel Segmentasi"
                className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. Pilih Data / Layer */}
            <div>
              <label className="block text-[10px] uppercase tracking-wider text-slate-400 mb-1">
                1. Sumber Data / Layer
              </label>
              <select
                value={segTargetLayer?.id || ''}
                onChange={(e) => setSegLayerId(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
              >
                {layers
                  .filter((l) => l.kind !== 'raster')
                  .map((l) => (
                    <option key={l.id} value={l.id} className="dark:bg-slate-800">
                      {l.name} ({formatNumber(l.feature_count)} baris)
                    </option>
                  ))}
              </select>
            </div>

            {/* 2. DUA KOLOM PEMILIH FITUR LONG & LAT */}
            {segTargetLayer && (
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-slate-500">
                    2. Pilih 2 Kolom Koordinat (WGS 84)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const prevLon = segLonCol;
                      setSegLonCol(segLatCol);
                      setSegLatCol(prevLon);
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-slate-100 text-[10px]"
                    title="Tukar kolom Bujur dan Lintang"
                  >
                    <ArrowDownUp className="w-3 h-3" /> Tukar Long ↔ Lat
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  {/* Kolom 1: Bujur / Longitude (X) */}
                  <div className="p-2 rounded bg-white dark:bg-slate-800 border border-teal-200/80 dark:border-teal-900 space-y-1">
                    <label className="block text-[10px] text-teal-700 dark:text-teal-400">
                      Kolom Bujur / Long (X)
                    </label>
                    <select
                      value={segLonCol}
                      onChange={(e) => setSegLonCol(e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
                    >
                      {segTargetLayer.schema
                        .filter((s) => s.name !== '_fid')
                        .map((s) => (
                          <option key={s.name} value={s.name} className="dark:bg-slate-800">
                            {s.name} ({s.type})
                          </option>
                        ))}
                    </select>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      Sampel:{' '}
                      {String(segTargetLayer.schema.find((s) => s.name === segLonCol)?.sample ?? '—')}
                    </div>
                  </div>

                  {/* Kolom 2: Lintang / Latitude (Y) */}
                  <div className="p-2 rounded bg-white dark:bg-slate-800 border border-orange-300/80 dark:border-orange-900 space-y-1">
                    <label className="block text-[10px] text-orange-600 dark:text-orange-400">
                      Kolom Lintang / Lat (Y)
                    </label>
                    <select
                      value={segLatCol}
                      onChange={(e) => setSegLatCol(e.target.value)}
                      className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
                    >
                      {segTargetLayer.schema
                        .filter((s) => s.name !== '_fid')
                        .map((s) => (
                          <option key={s.name} value={s.name} className="dark:bg-slate-800">
                            {s.name} ({s.type})
                          </option>
                        ))}
                    </select>
                    <div className="text-[10px] text-slate-400 font-mono truncate">
                      Sampel:{' '}
                      {String(segTargetLayer.schema.find((s) => s.name === segLatCol)?.sample ?? '—')}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 3. Mode Segmentasi & Heatmap */}
            <div className="space-y-2">
              <label className="block text-[10px] uppercase tracking-wider text-slate-400">
                3. Metode Segmentasi di Peta
              </label>
              <select
                value={segMode}
                onChange={(e) => setSegMode(e.target.value as any)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs"
              >
                <option value="quadrant">Kuadran Geografis Long × Lat (4 Zona: NW, NE, SW, SE)</option>
                <option value="grid">Grid Koordinat (Bagi Kolom Long × Baris Lat)</option>
                <option value="kmeans">Klaster Spasial Akurat UTM (K-Means K Zona)</option>
                <option value="attribute">Segmentasi Rentang Nilai Atribut (mis. Bobot)</option>
                <option value="none">Akuratkan Posisi Koordinat Saja (Tanpa Segmen)</option>
              </select>

              {segMode === 'grid' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Pembagian Long (2–6)</label>
                    <input
                      type="number"
                      min={2}
                      max={6}
                      value={segGridNx}
                      onChange={(e) => setSegGridNx(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Pembagian Lat (2–6)</label>
                    <input
                      type="number"
                      min={2}
                      max={6}
                      value={segGridNy}
                      onChange={(e) => setSegGridNy(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent tabular-nums"
                    />
                  </div>
                </div>
              )}

              {(segMode === 'kmeans' || segMode === 'attribute') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-0.5">Jumlah Segmen</label>
                    <input
                      type="number"
                      min={2}
                      max={segMode === 'attribute' ? 6 : 8}
                      value={segK}
                      onChange={(e) => setSegK(Number(e.target.value))}
                      className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent tabular-nums"
                    />
                  </div>
                  {segTargetLayer && (
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Kolom Nilai / Bobot</label>
                      <select
                        value={segValCol}
                        onChange={(e) => setSegValCol(e.target.value)}
                        className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                      >
                        <option value="">(Otomatis)</option>
                        {segTargetLayer.schema
                          .filter((s) => (s.type === 'number' || s.type === 'integer') && s.name !== '_fid')
                          .map((s) => (
                            <option key={s.name} value={s.name} className="dark:bg-slate-800">
                              {s.name}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-1.5 pt-1 text-[11px]">
                {segMode !== 'none' && segMode !== 'attribute' && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={segCreateZones}
                      onChange={(e) => setSegCreateZones(e.target.checked)}
                      className="rounded accent-teal-700"
                    />
                    <span>Gambar poligon batas segmen/zona di peta</span>
                  </label>
                )}
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={segAutoFixSwap}
                    onChange={(e) => setSegAutoFixSwap(e.target.checked)}
                    className="rounded accent-teal-700"
                  />
                  <span>Auto-deteksi &amp; perbaiki jika Long/Lat tertukar</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-orange-700 dark:text-orange-400">
                  <input
                    type="checkbox"
                    checked={segViewHeatmap}
                    onChange={(e) => setSegViewHeatmap(e.target.checked)}
                    className="rounded accent-orange-600"
                  />
                  <span>Tampilkan langsung sebagai View Heatmap (Peta Panas)</span>
                </label>
              </div>
            </div>

            <button
              onClick={handleRunSegmentLonLat}
              disabled={segBusy || !segTargetLayer}
              className="w-full py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs transition disabled:opacity-50"
            >
              {segBusy ? 'Mengakuratkan & Mensegmentasi...' : 'Akuratkan dengan Peta & Buat Segmentasi'}
            </button>

            {/* Accuracy Report & Segment Breakdown */}
            {segResult && (
              <div className="p-3 rounded bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-2 text-[11px]">
                <div className="flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Terakurasi di Peta ({segResult.accuracy.valid_points}/{segResult.accuracy.total_rows} titik)
                  </span>
                  <button
                    onClick={() => requestZoomToBbox(segResult.bbox)}
                    className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px]"
                  >
                    Fokus Peta
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-slate-600 dark:text-slate-300 tabular-nums">
                  <div>Wilayah: <b>{segResult.accuracy.region_hint}</b></div>
                  <div>Metrik UTM: <b>{segResult.accuracy.utm_crs}</b></div>
                  <div>Long: {segResult.accuracy.lon_range[0]} .. {segResult.accuracy.lon_range[1]}</div>
                  <div>Lat: {segResult.accuracy.lat_range[0]} .. {segResult.accuracy.lat_range[1]}</div>
                  <div className="col-span-2">
                    Bentang: {segResult.accuracy.span_km[0]} km × {segResult.accuracy.span_km[1]} km
                    {segResult.accuracy.swapped_applied ? ' · Tukar Long↔Lat otomatis aktif' : ''}
                  </div>
                </div>
                {segResult.segment_summary?.length > 0 && (
                  <div className="pt-1.5 border-t border-emerald-200/70 dark:border-emerald-800 space-y-1 max-h-28 overflow-y-auto">
                    {segResult.segment_summary.map((s: any) => (
                      <div key={s.segment} className="flex items-center justify-between text-[10px] tabular-nums">
                        <span className="truncate">{s.segment}</span>
                        <span className="font-mono text-emerald-800 dark:text-emerald-300">
                          {s.count} titik ({s.pct}%)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Context Floating Panel for Point & Coordinate-Pair Capture (`capture_point`) */}
        {toolMode === 'capture_point' && (
          <div className="absolute top-16 left-3 z-20 w-96 max-w-[92vw] bg-white/95 dark:bg-slate-800/95 shadow-sm rounded-md p-3.5 border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-teal-700">Penangkap Koordinat</div>
                <div className="text-slate-800 dark:text-slate-100">
                  Klik di peta untuk menangkap Lintang, Bujur & Pasangan
                </div>
              </div>
              <button
                onClick={() => setCapturedPts([])}
                className="text-[11px] px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200"
              >
                Bersihkan
              </button>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Nama Dataset CSV Baru</label>
                  <input
                    type="text"
                    value={captureLayerName}
                    onChange={(e) => setCaptureLayerName(e.target.value)}
                    placeholder="dataset_titik_baru"
                    className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-0.5">Join ke Tabel CSV (Opsional)</label>
                  <select
                    value={captureJoinTableId}
                    onChange={(e) => setCaptureJoinTableId(e.target.value)}
                    className="w-full px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
                  >
                    <option value="" className="dark:bg-slate-800">
                      Buat CSV baru dari nol
                    </option>
                    {layers
                      .filter((l) => l.kind !== 'raster')
                      .map((l) => (
                        <option key={l.id} value={l.id} className="dark:bg-slate-800">
                          Join ke: {l.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={capturePairMode}
                    onChange={(e) => setCapturePairMode(e.target.checked)}
                    className="rounded accent-teal-700"
                  />
                  <span>Mode Pasangan (A ↔ B)</span>
                </label>
                <select
                  value={captureCsvDelimiter}
                  onChange={(e) => setCaptureCsvDelimiter(e.target.value as ';' | ',')}
                  className="px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[10px]"
                  title="Pemisah kolom CSV"
                >
                  <option value=";" className="dark:bg-slate-800">CSV: ; (Excel Indonesia)</option>
                  <option value="," className="dark:bg-slate-800">CSV: , (Standar GIS/Python)</option>
                </select>
              </div>
            </div>

            {capturedPts.length === 0 ? (
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 text-slate-400 text-[11px] text-center">
                Belum ada titik. Klik lokasi mana saja di peta untuk menangkap pasangan (Lintang, Bujur).
              </div>
            ) : (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {capturedPts.map((cp, idx) => {
                  const isSecondOfPair = capturePairMode && idx % 2 === 1;
                  const pairOrigin = isSecondOfPair ? capturedPts[idx - 1] : null;
                  const pairDistM = pairOrigin
                    ? haversineDistanceM([pairOrigin.lon, pairOrigin.lat], [cp.lon, cp.lat])
                    : null;

                  return (
                    <div
                      key={cp.id}
                      className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700 space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-teal-700 dark:text-teal-400">
                          #{cp.id}{' '}
                          {capturePairMode ? (idx % 2 === 0 ? '(Asal A)' : `(Tujuan B · Pasangan ${Math.floor(idx / 2) + 1})`) : ''}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              navigator.clipboard?.writeText(`${cp.lat.toFixed(6)}, ${cp.lon.toFixed(6)}`);
                              addToast({ type: 'success', title: `Disalin: ${cp.lat.toFixed(6)}, ${cp.lon.toFixed(6)}` });
                            }}
                            className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 text-[10px] flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" /> Salin
                          </button>
                          <button
                            onClick={() => setCapturedPts((prev) => prev.filter((x) => x.id !== cp.id))}
                            title="Hapus titik"
                            aria-label="Hapus titik"
                            className="p-0.5 rounded text-slate-400 hover:text-rose-500"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                        <input
                          type="text"
                          value={cp.label}
                          onChange={(e) =>
                            setCapturedPts((prev) =>
                              prev.map((item) => (item.id === cp.id ? { ...item, label: e.target.value } : item))
                            )
                          }
                          placeholder="Nama titik..."
                          className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px]"
                        />
                        <input
                          type="text"
                          value={cp.kategori}
                          onChange={(e) =>
                            setCapturedPts((prev) =>
                              prev.map((item) => (item.id === cp.id ? { ...item, kategori: e.target.value } : item))
                            )
                          }
                          placeholder="Kategori..."
                          className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px]"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] tabular-nums">
                        <div>
                          <span className="text-slate-400">long:</span>{' '}
                          <span className="font-mono">{cp.lon.toFixed(6)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">lat:</span>{' '}
                          <span className="font-mono">{cp.lat.toFixed(6)}</span>
                        </div>
                      </div>
                      {pairDistM !== null && (
                        <div className="text-[10px] text-orange-700 dark:text-orange-400 pt-0.5 border-t border-slate-200/60 dark:border-slate-800 tabular-nums">
                          Jarak Pasangan #{pairOrigin?.id} → #{cp.id}:{' '}
                          {pairDistM >= 1000 ? `${formatNumber(pairDistM / 1000, 3)} km` : `${formatNumber(pairDistM, 1)} m`}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {capturedPts.length > 0 && (
              <div className="space-y-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700">
                <button
                  onClick={handleCreateNewCsvDataset}
                  className="w-full py-2 rounded bg-teal-700 hover:bg-teal-800 text-white text-xs transition"
                >
                  Create New Dataset (.csv dengan kolom long &amp; lat)
                </button>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => {
                      const csv = [
                        'id,nama,kategori,long,lat',
                        ...capturedPts.map(
                          (p) => `${p.id},"${p.label}","${p.kategori}",${p.lon.toFixed(6)},${p.lat.toFixed(6)}`
                        ),
                      ].join('\n');
                      navigator.clipboard?.writeText(csv);
                      addToast({ type: 'success', title: `${capturedPts.length} koordinat disalin sebagai CSV (long, lat)` });
                    }}
                    className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 text-[11px]"
                  >
                    Salin CSV
                  </button>
                  {capturePairMode && capturedPts.length >= 2 && (
                    <button
                      onClick={() => handleSaveCapturedPoints(true)}
                      className="flex-1 py-1.5 rounded bg-orange-600 hover:bg-orange-700 text-white text-[11px]"
                    >
                      Simpan Pasangan (Garis)
                    </button>
                  )}
                </div>
                {lastCreatedCsv && (
                  <div className="p-2 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 space-y-1.5 text-[11px]">
                    <div className="text-emerald-800 dark:text-emerald-300 truncate">{lastCreatedCsv.filename}</div>
                    <div className="flex items-center gap-1.5">
                      {lastCreatedCsv.xlsxUrl && (
                        <a
                          href={lastCreatedCsv.xlsxUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 text-center px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Unduh Excel (.xlsx)
                        </a>
                      )}
                      <a
                        href={lastCreatedCsv.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 text-center px-2 py-1 rounded border border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
                      >
                        Unduh CSV ({captureCsvDelimiter})
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Context Banner for Measure Pen Tool */}
        {toolMode === 'measure' && (
          <div className="absolute top-16 left-3 z-20 bg-white/95 dark:bg-slate-800/95 rounded px-3.5 py-2 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-3 text-xs">
            <span className="text-slate-500">
              {measureFinished
                ? `Poligon Selesai (${measurePts.length} titik):`
                : `Pen Ukur (${measurePts.length} titik — Klik 2x / klik titik hijau awal / Enter untuk putus):`}
            </span>
            <span className="tabular-nums">
              {measureFinished && measurePts.length >= 3 ? 'Keliling:' : 'Jarak:'}{' '}
              <b className="text-slate-900 dark:text-white">
                {totalMeasureM >= 1000
                  ? `${formatNumber(totalMeasureM / 1000, 2)} km`
                  : `${formatNumber(totalMeasureM, 0)} m`}
              </b>
            </span>
            {measurePts.length >= 3 && (
              <span className="tabular-nums border-l border-slate-200 dark:border-slate-700 pl-3">
                Luas Area:{' '}
                <b className="text-teal-700 dark:text-teal-400">
                  {totalAreaKm2 >= 0.05
                    ? `${formatNumber(totalAreaKm2, 3)} km² (${formatNumber(totalAreaHa, 1)} ha)`
                    : `${formatNumber(totalAreaHa, 2)} ha (${formatNumber(totalAreaM2, 0)} m²)`}
                </b>
              </span>
            )}
            {!measureFinished && measurePts.length >= 2 && (
              <button
                onClick={() => setMeasureFinished(true)}
                className="px-2.5 py-0.5 rounded bg-orange-600 hover:bg-orange-700 text-white"
              >
                Selesai / Putus Garis
              </button>
            )}
            {!measureFinished && measurePts.length > 0 && (
              <button
                onClick={() => setMeasurePts((prev) => prev.slice(0, -1))}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200"
                title="Hapus titik terakhir (Backspace)"
              >
                Undo Titik
              </button>
            )}
            <button
              onClick={() => {
                setMeasurePts([]);
                setMeasureFinished(false);
              }}
              className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200"
            >
              Reset
            </button>
          </div>
        )}

        {/* Context Banner for Rubber-Band Box Selection */}
        {toolMode === 'select_box' && (
          <div className="absolute top-16 left-3 z-20 bg-white/95 dark:bg-slate-800/95 rounded px-3.5 py-2 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs">
            <span>
              {boxStart
                ? 'Geser kursor untuk melihat kotak seleksi, lalu klik sudut kedua.'
                : 'Klik titik sudut pertama di peta untuk memulai kotak seleksi.'}
            </span>
            {boxStart && (
              <button
                onClick={() => setBoxStart(null)}
                className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700"
              >
                Batal
              </button>
            )}
          </div>
        )}

        {/* Context Banner for Pen Polygon Selection */}
        {toolMode === 'select_polygon' && (
          <div className="absolute top-16 left-3 z-20 bg-white/95 dark:bg-slate-800/95 rounded px-3.5 py-2 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2.5 text-xs">
            <span>
              Pen Seleksi Poligon ({polySelectPts.length} titik — Klik 2x / klik titik hijau awal / Enter untuk tutup & pilih)
            </span>
            <button
              onClick={() => handleApplyPolygonSelection()}
              disabled={polySelectPts.length < 3}
              className="px-2.5 py-1 rounded bg-teal-700 text-white disabled:opacity-40"
            >
              Tutup & Pilih Sekarang
            </button>
            {polySelectPts.length > 0 && !polySelectFinished && (
              <button
                onClick={() => setPolySelectPts((prev) => prev.slice(0, -1))}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700"
              >
                Undo Titik
              </button>
            )}
            <button
              onClick={() => {
                setPolySelectPts([]);
                setPolySelectFinished(false);
              }}
              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700"
            >
              Reset
            </button>
          </div>
        )}

        {toolMode === 'select_radius' && (
          <div className="absolute top-16 left-3 z-20 bg-white/95 dark:bg-slate-800/95 rounded px-3.5 py-2 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs">
            <span>Klik lokasi di peta untuk memilih radius:</span>
            <input
              type="number"
              value={selectRadiusM}
              onChange={(e) => setSelectRadiusM(Number(e.target.value))}
              className="w-20 px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent tabular-nums"
            />
            <span>meter</span>
          </div>
        )}

        {/* Context Banner for Pen Draw Layer Tool */}
        {toolMode === 'draw' && (
          <div className="absolute top-16 left-3 z-20 bg-white/95 dark:bg-slate-800/95 rounded p-2.5 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500">Pen Gambar:</span>
            <select
              value={drawGeomType}
              onChange={(e) => {
                setDrawGeomType(e.target.value as any);
                setDrawPts([]);
                setDrawFinished(false);
              }}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            >
              <option value="polygon">Poligon (Klik 2x = Putus & Tutup)</option>
              <option value="line">Garis (Klik 2x = Putus Garis)</option>
              <option value="point">Titik (Klik = Tambah Titik)</option>
            </select>
            <input
              type="text"
              value={drawLayerName}
              onChange={(e) => setDrawLayerName(e.target.value)}
              placeholder="Nama layer"
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent w-36"
            />
            <input
              type="text"
              value={drawClassLabel}
              onChange={(e) => setDrawClassLabel(e.target.value)}
              placeholder="Label/Kelas"
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent w-24"
            />
            <span className="text-slate-500">
              ({completedDrawFeatures.length} selesai{drawPts.length > 0 ? ` · ${drawPts.length} titik aktif` : ''})
            </span>
            {drawPts.length >= (drawGeomType === 'polygon' ? 3 : 2) && (
              <button
                onClick={() => finishCurrentDrawSegment(drawPts)}
                className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white"
                title="Putus garis & hubungkan otomatis ke titik awal (atau klik 2x di peta)"
              >
                Tutup Poligon
              </button>
            )}
            {drawPts.length > 0 && (
              <button
                onClick={() => setDrawPts((prev) => prev.slice(0, -1))}
                className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700"
              >
                Undo Titik
              </button>
            )}
            <button
              onClick={handleSaveDrawnLayer}
              className="px-2.5 py-1 rounded bg-slate-900 dark:bg-teal-700 text-white"
            >
              Simpan Layer
            </button>
            <button
              onClick={() => {
                setDrawPts([]);
                setCompletedDrawFeatures([]);
                setDrawFinished(false);
              }}
              className="px-2 py-1 rounded bg-slate-100 dark:bg-slate-700"
            >
              Reset
            </button>
          </div>
        )}

        {/* Swipe Compare Control Bar & Synchronized Split Overlay */}
        {swipeActive && (
          <div className="absolute top-16 right-3 z-20 bg-white/95 dark:bg-slate-800/95 rounded px-3.5 py-2 border border-slate-200 dark:border-slate-700 flex items-center gap-3 text-xs">
            <span className="text-slate-500">Layer Kanan (Swipe):</span>
            <select
              value={swipeLayerId || ''}
              onChange={(e) => setSwipeLayerId(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            >
              {layers
                .filter((l) => l.kind !== 'table')
                .map((l) => (
                  <option key={l.id} value={l.id} className="dark:bg-slate-800">
                    {l.name}
                  </option>
                ))}
            </select>
            <input
              type="range"
              min={5}
              max={95}
              value={swipePct}
              onChange={(e) => setSwipePct(Number(e.target.value))}
              className="w-28 accent-teal-700"
              title="Geser pembatas kiri-kanan"
            />
            <button
              onClick={() => setSwipeActive(false)}
              title="Tutup Swipe"
              aria-label="Tutup Swipe"
              className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Primary Map Canvas */}
        <div ref={mapContainerRef} className="w-full h-full" />

        {/* Secondary Synchronized Compare Map Canvas */}
        {swipeActive && (
          <>
            <div
              ref={compareContainerRef}
              className="absolute inset-0 pointer-events-none z-10"
              style={{ clipPath: `inset(0 0 0 ${swipePct}%)` }}
            />
            <div
              className="absolute top-0 bottom-0 z-10 w-0.5 bg-slate-900 dark:bg-white shadow-sm pointer-events-none"
              style={{ left: `${swipePct}%` }}
            >
              <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-sm bg-slate-900 border border-slate-700 text-white text-[10px] tracking-wider uppercase">
                ◄►
              </div>
            </div>
          </>
        )}

        {/* Identify Floating Card */}
        {identifiedFeature && (
          <div className="absolute bottom-12 left-3 z-20 w-72 bg-white/95 dark:bg-slate-800/95 shadow-sm rounded border border-slate-200 dark:border-slate-700 p-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2 mb-2">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-teal-700">Info Fitur</span>
                <h4 className="text-slate-800 dark:text-slate-100">{identifiedFeature.layerName}</h4>
              </div>
              <button
                onClick={() => setIdentifiedFeature(null)}
                title="Tutup Info Fitur"
                aria-label="Tutup Info Fitur"
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="max-h-44 overflow-y-auto space-y-1">
              {Object.entries(identifiedFeature.props).map(([k, v]) => (
                <div key={k} className="flex justify-between gap-2 py-0.5 border-b border-slate-50 dark:border-slate-700/50">
                  <span className="text-slate-500 dark:text-slate-400">{k}</span>
                  <span className="text-slate-800 dark:text-slate-200 tabular-nums text-right truncate">
                    {typeof v === 'number' ? formatNumber(v) : String(v ?? '—')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Automatic Synchronized Map Legend */}
        {activeLayer && (
          <div className="absolute bottom-10 right-12 z-20 bg-white/95 dark:bg-slate-800/95 rounded border border-slate-200/80 dark:border-slate-700 p-3 text-xs max-w-xs">
            <div className="text-slate-800 dark:text-slate-100 mb-1 flex items-center justify-between gap-3">
              <span>Legenda: {activeLayer.name}</span>
              {activeLayer.style?.column && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                  {activeLayer.style.column}
                </span>
              )}
            </div>

            {activeLayer.kind === 'raster' ? (
              <div className="space-y-1">
                <div className="h-2.5 w-44 rounded-sm bg-gradient-to-r from-teal-900 via-teal-500 to-orange-500" />
                <div className="flex justify-between text-[10px] text-slate-500 tabular-nums">
                  <span>{formatNumber(activeLayer.style?.vmin ?? 0)}</span>
                  <span>{activeLayer.style?.cmap || 'terrain'}</span>
                  <span>{formatNumber(activeLayer.style?.vmax ?? 100)}</span>
                </div>
              </div>
            ) : activeLayer.style?.mode === 'choropleth' && activeLayerMeta?.breaks?.length >= 2 ? (
              <div className="space-y-1 mt-1.5">
                {activeLayerMeta.breaks.slice(0, -1).map((b: number, idx: number) => {
                  const pal = COLOR_PALETTES[activeLayer.style?.palette || 'viridis'] || COLOR_PALETTES.viridis;
                  const cIdx = Math.min(
                    pal.length - 1,
                    Math.floor((idx / Math.max(1, activeLayerMeta.breaks.length - 2)) * (pal.length - 1))
                  );
                  const nextB = activeLayerMeta.breaks[idx + 1];
                  return (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 rounded-sm inline-block shrink-0" style={{ backgroundColor: pal[cIdx] }} />
                      <span className="tabular-nums text-[11px]">
                        {formatNumber(b, 1)} – {formatNumber(nextB, 1)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : activeLayer.style?.mode === 'heatmap' ? (
              <div className="space-y-1 mt-1.5">
                <div
                  className="h-2.5 w-full rounded-sm border border-slate-200 dark:border-slate-700"
                  style={{
                    background:
                      (HEATMAP_COLOR_RAMPS[activeLayer.style?.heatPalette || 'thermal'] || HEATMAP_COLOR_RAMPS.thermal)
                        .css,
                  }}
                />
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>Kepadatan Rendah</span>
                  <span>Tinggi</span>
                </div>
                {(activeLayer.style?.heatWeightCol || activeLayer.style?.column) && (
                  <div className="text-[10px] text-slate-400">
                    Bobot: {activeLayer.style?.heatWeightCol || activeLayer.style?.column}
                  </div>
                )}
              </div>
            ) : activeLayer.style?.mode === 'category' && activeLayerMeta?.categories?.length > 0 ? (
              <div className="space-y-1 mt-1.5 max-h-32 overflow-y-auto">
                {activeLayerMeta.categories.slice(0, 8).map((cat: string, idx: number) => (
                  <div key={cat} className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full inline-block shrink-0"
                      style={{ backgroundColor: COLOR_PALETTES.categorical[idx % COLOR_PALETTES.categorical.length] }}
                    />
                    <span className="text-[11px] truncate">{cat}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="w-3.5 h-3.5 rounded-sm inline-block"
                  style={{ backgroundColor: activeLayer.style?.fillColor || activeLayer.style?.color || '#0d9488' }}
                />
                <span className="text-[11px] text-slate-600 dark:text-slate-300">Semua fitur ({activeLayer.feature_count})</span>
              </div>
            )}
          </div>
        )}

        {/* Mandatory OpenStreetMap Attribution Badge */}
        <div className="absolute bottom-1.5 right-12 z-20 bg-white/85 dark:bg-slate-900/85 px-2 py-0.5 rounded text-[10px] text-slate-600 dark:text-slate-400">
          ©{' '}
          <a
            href="https://www.openstreetmap.org/copyright"
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-teal-700"
          >
            OpenStreetMap contributors
          </a>
        </div>
      </div>

      {/* Right Context Panel (Layers / Styling / Selection) */}
      {!compact && (
        <div className="w-80 shrink-0 h-full bg-white dark:bg-slate-800 border-l border-slate-200/80 dark:border-slate-700 flex flex-col">
          <div className="grid grid-cols-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-1 gap-1">
            <button
              onClick={() => setRightTab('layers')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs transition ${rightTab === 'layers'
 ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
 : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
 }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Layer ({layers.length})</span>
            </button>
            <button
              onClick={() => setRightTab('style')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs transition ${rightTab === 'style'
 ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
 : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
 }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Gaya</span>
            </button>
            <button
              onClick={() => setRightTab('select')}
              className={`flex items-center justify-center gap-1.5 py-1.5 rounded text-xs transition ${rightTab === 'select'
 ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
 : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
 }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Seleksi</span>
            </button>
          </div>

          {/* Tab 1: Layer Manager */}
          {rightTab === 'layers' && (
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] uppercase tracking-widest text-slate-400">Urutan & Visibilitas</span>
                <button
                  onClick={() => setActiveTab('data')}
                  className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Data
                </button>
              </div>

              {layers.map((lyr, idx) => {
                const isActive = lyr.id === activeLayerId;
                const isVis = visibleLayers[lyr.id] ?? true;
                const selCount = (selectionsByLayer[lyr.id] || []).length;
                const iconBadge =
                  lyr.geom_type === 'point'
                    ? '●'
                    : lyr.geom_type === 'line'
                      ? '╱'
                      : lyr.geom_type === 'polygon'
                        ? '■'
                        : lyr.kind === 'raster'
                          ? '▓'
                          : '▦';

                return (
                  <div
                    key={lyr.id}
                    onClick={() => setActiveLayerId(lyr.id)}
                    className={`p-2.5 rounded border transition cursor-pointer ${isActive
 ? 'border-slate-900 dark:border-teal-600 bg-slate-50 dark:bg-teal-950/30'
 : 'border-slate-200/80 dark:border-slate-700 hover:border-slate-300'
 }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleLayerVisibility(lyr.id);
                          }}
                          className="text-slate-500 hover:text-slate-900"
                        >
                          {isVis ? <Eye className="w-3.5 h-3.5 text-slate-800 dark:text-slate-200" /> : <EyeOff className="w-3.5 h-3.5 text-slate-400" />}
                        </button>
                        <span
                          className="text-xs"
                          style={{ color: lyr.style?.fillColor || lyr.style?.color || '#0d9488' }}
                        >
                          {iconBadge}
                        </span>

                        {renamingLayerId === lyr.id ? (
                          <input
                            type="text"
                            value={renameText}
                            autoFocus
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setRenameText(e.target.value)}
                            onKeyDown={async (e) => {
                              if (e.key === 'Enter' && renameText.trim()) {
                                await api.updateLayer(lyr.id, { name: renameText.trim() }, projectId);
                                setRenamingLayerId(null);
                                await refreshLayers();
                              } else if (e.key === 'Escape') {
                                setRenamingLayerId(null);
                              }
                            }}
                            onBlur={() => setRenamingLayerId(null)}
                            className="text-xs px-1.5 py-0.5 rounded border border-teal-600 bg-white dark:bg-slate-900 w-32"
                          />
                        ) : (
                          <span
                            onDoubleClick={(e) => {
                              e.stopPropagation();
                              setRenamingLayerId(lyr.id);
                              setRenameText(lyr.name);
                            }}
                            className="text-xs truncate"
                            title="Klik ganda untuk ganti nama layer"
                          >
                            {lyr.name}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-0.5 shrink-0">
                        {selCount > 0 && (
                          <span className="px-1.5 py-0.5 text-[10px] rounded-sm bg-orange-100 dark:bg-orange-950/60 text-orange-800 dark:text-orange-300">
                            {selCount}
                          </span>
                        )}
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayerOrder(lyr.id, 'up');
                          }}
                          className="px-1 py-0.5 text-[10px] rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-25"
                          title="Geser layer ke atas"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          disabled={idx === layers.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            moveLayerOrder(lyr.id, 'down');
                          }}
                          className="px-1 py-0.5 text-[10px] rounded hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-25"
                          title="Geser layer ke bawah"
                        >
                          ▼
                        </button>
                        {lyr.bbox && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              requestZoomToBbox(lyr.bbox);
                            }}
                            className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500"
                            title="Zoom ke layer"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
                      <span>
                        {lyr.kind === 'raster'
                          ? `Raster (${lyr.feature_count} band)`
                          : `${formatNumber(lyr.feature_count)} fitur · ${lyr.crs || 'Tabel'}`}
                      </span>
                      <input
                        type="range"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={layerOpacity[lyr.id] ?? 0.78}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setLayerOpacity(lyr.id, Number(e.target.value))}
                        className="w-16 accent-slate-800 dark:accent-teal-600"
                        title="Transparansi layer"
                      />
                    </div>
                  </div>
                );
              })}

              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 text-[11px] text-slate-500 space-y-1">
                <label className="flex items-center justify-between cursor-pointer">
                  <span>Simplifikasi Adaptif & Tile (&gt;20rb fitur)</span>
                  <input
                    type="checkbox"
                    checked={adaptiveSimplify}
                    onChange={(e) => setAdaptiveSimplify(e.target.checked)}
                    className="rounded accent-slate-900"
                  />
                </label>
                {activeLayerMeta && (
                  <div className="text-[10px] text-slate-400">
                    Dirender: {formatNumber(activeLayerMeta.returned_features ?? activeLayer?.feature_count)} fitur
                    {activeLayerMeta.simplified_tolerance > 0
                      ? ` · Toleransi zoom: ${activeLayerMeta.simplified_tolerance}`
                      : ''}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab 2: Styling Editor */}
          {rightTab === 'style' && activeLayer && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-3 text-xs">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-slate-400">Gaya Visual & Label</span>
                <h3 className="text-sm">{activeLayer.name}</h3>
              </div>

              {activeLayer.kind === 'raster' ? (
                <div className="space-y-3">
                  <div>
                    <label className="block mb-1 text-slate-500">Band yang ditampilkan</label>
                    <select
                      value={activeLayer.style?.band || 1}
                      onChange={(e) => handleStyleUpdate({ band: Number(e.target.value) })}
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                    >
                      {activeLayer.schema.map((s, idx) => (
                        <option key={s.name} value={idx + 1} className="dark:bg-slate-800">
                          Band {idx + 1}: {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-500">Palet Warna Raster</label>
                    <select
                      value={activeLayer.style?.cmap || 'terrain'}
                      onChange={(e) => handleStyleUpdate({ cmap: e.target.value, hillshade: e.target.value === 'hillshade' })}
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                    >
                      <option value="terrain">Terrain (Ketinggian DEM)</option>
                      <option value="viridis">Viridis (Aman Buta Warna)</option>
                      <option value="rdylgn">RdYlGn (Hijau Vegetasi NDVI)</option>
                      <option value="magma">Magma (Suhu / Kepadatan)</option>
                      <option value="blues">Blues (Kedalaman / Air)</option>
                      <option value="coolwarm">Coolwarm (Anomali)</option>
                      <option value="hillshade">Hillshade 3D (Efek Timbul)</option>
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block mb-1 text-slate-500">Cara Mewarnai Peta</label>
                    <select
                      value={activeLayer.style?.mode || 'single'}
                      onChange={(e) => {
                        const mode = e.target.value;
                        const numCol = activeLayer.schema.find((s) => s.type === 'number' || s.type === 'integer')?.name;
                        const strCol = activeLayer.schema.find((s) => s.type === 'string')?.name;
                        handleStyleUpdate({
                          mode,
                          column:
                            mode === 'choropleth' || mode === 'proportional'
                              ? activeLayer.style?.column || numCol
                              : mode === 'category'
                                ? activeLayer.style?.column || strCol
                                : activeLayer.style?.column,
                        });
                      }}
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                    >
                      <option value="single">Satu Warna Seragam</option>
                      <option value="category">Warna Berdasarkan Kategori</option>
                      <option value="choropleth">Warna Berdasarkan Angka (Choropleth)</option>
                      {activeLayer.geom_type === 'point' && (
                        <>
                          <option value="proportional">Ukuran Titik Berdasarkan Angka</option>
                          <option value="heatmap">Peta Panas (Heatmap)</option>
                        </>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block mb-1 text-slate-500">Label Teks di Atas Peta</label>
                    <select
                      value={activeLayer.style?.labelColumn || ''}
                      onChange={(e) => handleStyleUpdate({ labelColumn: e.target.value || null })}
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                    >
                      <option value="">(Tanpa Label Teks)</option>
                      {activeLayer.schema
                        .filter((s) => s.name !== '_fid')
                        .map((s) => (
                          <option key={s.name} value={s.name} className="dark:bg-slate-800">
                            Tampilkan: {s.name}
                          </option>
                        ))}
                    </select>
                  </div>

                  {activeLayer.style?.mode === 'single' && (
                    <div>
                      <label className="block mb-1 text-slate-500">Pilih Warna</label>
                      <div className="flex items-center gap-2">
                        {COLOR_PALETTES.categorical.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleStyleUpdate({ color: c, fillColor: c })}
                            className="w-6 h-6 rounded-sm border border-white/80 dark:border-slate-900"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {(activeLayer.style?.mode === 'category' ||
                    activeLayer.style?.mode === 'choropleth' ||
                    activeLayer.style?.mode === 'proportional') && (
                      <div>
                        <label className="block mb-1 text-slate-500">Kolom Atribut Pewarnaan</label>
                        <select
                          value={activeLayer.style?.column || ''}
                          onChange={(e) => handleStyleUpdate({ column: e.target.value })}
                          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                        >
                          {activeLayer.schema
                            .filter((s) => s.name !== '_fid')
                            .map((s) => (
                              <option key={s.name} value={s.name} className="dark:bg-slate-800">
                                {s.name} ({s.type})
                              </option>
                            ))}
                        </select>
                      </div>
                    )}

                  {activeLayer.style?.mode === 'heatmap' && (
                    <div className="p-3 rounded bg-orange-50/60 dark:bg-orange-950/20 border border-orange-200/80 dark:border-orange-900 space-y-2.5">
                      <div className="text-[10px] uppercase tracking-wider text-orange-700 dark:text-orange-400 flex items-center gap-1">
                        <Flame className="w-3.5 h-3.5" /> Pengaturan View Heatmap
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-500">Kolom Bobot Panas (Opsional)</label>
                        <select
                          value={activeLayer.style?.heatWeightCol || activeLayer.style?.column || ''}
                          onChange={(e) =>
                            handleStyleUpdate({
                              heatWeightCol: e.target.value || null,
                              column: e.target.value || null,
                            })
                          }
                          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                        >
                          <option value="">(Kepadatan Titik Merata)</option>
                          {activeLayer.schema
                            .filter((s) => (s.type === 'number' || s.type === 'integer') && s.name !== '_fid')
                            .map((s) => (
                              <option key={s.name} value={s.name} className="dark:bg-slate-800">
                                {s.name} ({s.type})
                              </option>
                            ))}
                        </select>
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-500">Palet Warna Heatmap</label>
                        <div className="space-y-1.5">
                          {Object.entries(HEATMAP_COLOR_RAMPS).map(([key, ramp]) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => handleStyleUpdate({ heatPalette: key })}
                              className={`w-full p-1.5 rounded border text-left space-y-1 ${
 (activeLayer.style?.heatPalette || 'thermal') === key
 ? 'border-orange-600 bg-white dark:bg-slate-800'
 : 'border-slate-200 dark:border-slate-700'
 }`}
                            >
                              <div className="text-[10px]">{ramp.label}</div>
                              <div className="h-2 w-full rounded-sm" style={{ background: ramp.css }} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-slate-500">Radius Panas</span>
                          <span className="tabular-nums">{activeLayer.style?.heatRadius ?? 30} px</span>
                        </div>
                        <input
                          type="range"
                          min={10}
                          max={64}
                          step={2}
                          value={activeLayer.style?.heatRadius ?? 30}
                          onChange={(e) => handleStyleUpdate({ heatRadius: Number(e.target.value) })}
                          className="w-full accent-orange-600"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] mb-0.5">
                          <span className="text-slate-500">Intensitas Heatmap</span>
                          <span className="tabular-nums">{activeLayer.style?.heatIntensity ?? 1.3}×</span>
                        </div>
                        <input
                          type="range"
                          min={0.4}
                          max={3.0}
                          step={0.1}
                          value={activeLayer.style?.heatIntensity ?? 1.3}
                          onChange={(e) => handleStyleUpdate({ heatIntensity: Number(e.target.value) })}
                          className="w-full accent-orange-600"
                        />
                      </div>

                      <label className="flex items-center gap-2 cursor-pointer text-[11px]">
                        <input
                          type="checkbox"
                          checked={activeLayer.style?.heatShowPoints !== false}
                          onChange={(e) => handleStyleUpdate({ heatShowPoints: e.target.checked })}
                          className="rounded accent-orange-600"
                        />
                        <span>Tampilkan titik asli di atas heatmap (dapat diklik)</span>
                      </label>
                    </div>
                  )}

                  {activeLayer.style?.mode === 'choropleth' && (
                    <>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block mb-1 text-slate-500">Metode Kelas</label>
                          <select
                            value={activeLayer.style?.method || 'quantile'}
                            onChange={(e) => handleStyleUpdate({ method: e.target.value })}
                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                          >
                            <option value="quantile">Kuantil (Sama Banyak)</option>
                            <option value="natural_breaks">Natural Breaks (Jenks)</option>
                            <option value="equal_interval">Interval Sama</option>
                          </select>
                        </div>
                        <div>
                          <label className="block mb-1 text-slate-500">Jumlah Kelas</label>
                          <select
                            value={activeLayer.style?.classes || 5}
                            onChange={(e) => handleStyleUpdate({ classes: Number(e.target.value) })}
                            className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                          >
                            {[3, 4, 5, 6, 7].map((n) => (
                              <option key={n} value={n} className="dark:bg-slate-800">
                                {n} Kelas
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block mb-1 text-slate-500">Palet Warna</label>
                        <div className="space-y-1.5">
                          {(['viridis', 'ylorrd', 'blues', 'greens', 'rdylgn', 'coolwarm', 'magma'] as const).map((pName) => (
                            <button
                              key={pName}
                              type="button"
                              onClick={() => handleStyleUpdate({ palette: pName })}
                              className={`w-full flex items-center justify-between p-1.5 rounded border ${activeLayer.style?.palette === pName
 ? 'border-slate-900 dark:border-teal-600 bg-slate-50 dark:bg-teal-900/30'
 : 'border-slate-200 dark:border-slate-700'
 }`}
                            >
                              <span className="capitalize">{pName}</span>
                              <div className="flex">
                                {COLOR_PALETTES[pName].map((c, i) => (
                                  <span key={i} className="w-5 h-3.5 first:rounded-l last:rounded-r" style={{ backgroundColor: c }} />
                                ))}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Selection Manager */}
          {rightTab === 'select' && activeLayer && (
            <div className="flex-1 overflow-y-auto p-3.5 space-y-4 text-xs">
              <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 dark:text-slate-300">Fitur Terpilih</span>
                  <span className="text-sm text-orange-600 dark:text-orange-400 tabular-nums">
                    {activeSelection.length} / {activeLayer.feature_count}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={async () => {
                      const res = await api.selectFeatures(activeLayer.id, { mode: 'all' }, projectId);
                      setLayerSelection(activeLayer.id, res.fids, 'query');
                    }}
                    className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600"
                  >
                    Pilih Semua
                  </button>
                  <button
                    onClick={async () => {
                      const res = await api.selectFeatures(
                        activeLayer.id,
                        { mode: 'invert', current_fids: activeSelection },
                        projectId
                      );
                      setLayerSelection(activeLayer.id, res.fids, 'query');
                    }}
                    className="px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600"
                  >
                    Balik Seleksi
                  </button>
                  {activeSelection.length > 0 && (
                    <button
                      onClick={() => clearLayerSelection(activeLayer.id)}
                      className="px-2 py-1 rounded bg-rose-600 text-white flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Hapus
                    </button>
                  )}
                </div>

                {activeSelection.length > 0 && (
                  <button
                    onClick={async () => {
                      const name = `${activeLayer.name}_seleksi_${activeSelection.length}`;
                      const saved = await api.saveSelectionAsLayer(activeLayer.id, activeSelection, name, projectId);
                      await refreshLayers();
                      setActiveLayerId(saved.id);
                      addToast({ type: 'success', title: `Disimpan sebagai layer '${saved.name}'` });
                    }}
                    className="mt-2.5 w-full py-1.5 rounded bg-slate-900 dark:bg-teal-700 text-white"
                  >
                    + Simpan Seleksi sebagai Layer Baru
                  </button>
                )}
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                <h4 className="text-slate-800 dark:text-slate-100">Pilih Berdasarkan Lokasi</h4>
                <p className="text-[11px] text-slate-500">
                  Pilih fitur dari <b>{activeLayer.name}</b> yang memiliki hubungan lokasi dengan layer lain:
                </p>

                <div>
                  <label className="block mb-1 text-slate-500">Hubungan Spasial</label>
                  <select
                    value={locRelation}
                    onChange={(e) => setLocRelation(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                  >
                    <option value="within">Berada di dalam (Within)</option>
                    <option value="intersects">Bersinggungan / Bertumpuk (Intersects)</option>
                    <option value="within_distance">Dalam jarak X meter dari</option>
                    <option value="disjoint">Tidak bersinggungan (Di luar)</option>
                  </select>
                </div>

                {locRelation === 'within_distance' && (
                  <div>
                    <label className="block mb-1 text-slate-500">Jarak (meter)</label>
                    <input
                      type="number"
                      value={locDistM}
                      onChange={(e) => setLocDistM(Number(e.target.value))}
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                    />
                  </div>
                )}

                <div>
                  <label className="block mb-1 text-slate-500">Layer Acuan Lokasi</label>
                  <select
                    value={locRefLayerId}
                    onChange={(e) => setLocRefLayerId(e.target.value)}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                  >
                    <option value="">-- Pilih layer acuan --</option>
                    {layers
                      .filter((l) => l.kind === 'vector')
                      .map((l) => (
                        <option key={l.id} value={l.id} className="dark:bg-slate-800">
                          {l.name}
                        </option>
                      ))}
                  </select>
                </div>

                <button
                  onClick={handleSelectByLocation}
                  disabled={!locRefLayerId}
                  className="w-full py-2 rounded bg-slate-900 dark:bg-teal-700 text-white disabled:opacity-40"
                >
                  Terapkan Seleksi Lokasi
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
