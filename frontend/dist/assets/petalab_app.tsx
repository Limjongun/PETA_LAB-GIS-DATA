// PetaLab Unified React 18 + TypeScript + MapLibre GL + ECharts Bundle
const { useState, useEffect, useRef, useMemo, useCallback } = React;

// Built-in Zustand-compatible store factory using the single global React 18 instance
function create(createState) {
  let state;
  const listeners = new Set();
  const setState = (partial, replace) => {
    const nextState = typeof partial === 'function' ? partial(state) : partial;
    if (!Object.is(nextState, state)) {
      const previousState = state;
      state = replace ? nextState : Object.assign({}, state, nextState);
      listeners.forEach((listener) => listener(state, previousState));
    }
  };
  const getState = () => state;
  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const apiObj = { setState, getState, subscribe };
  state = createState(setState, getState, apiObj);

  const useBoundStore = (selector) => {
    const [, forceRender] = React.useReducer((c) => c + 1, 0);
    React.useEffect(() => {
      return subscribe(() => forceRender());
    }, []);
    return typeof selector === 'function' ? selector(state) : state;
  };
  Object.assign(useBoundStore, apiObj);
  return useBoundStore;
}

// Thin & Elegant (1.5px stroke) Inline SVG Lucide Icon Factory
function makeIcon(paths) {
  return function LucideIcon(props) {
    const { className = 'w-4 h-4', size, style, title } = props || {};
    return React.createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: size || 16,
        height: size || 16,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 1.5,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        className,
        style,
      },
      title ? React.createElement('title', null, title) : null,
      ...paths.map((d, idx) =>
        typeof d === 'string'
          ? React.createElement('path', { key: idx, d })
          : React.createElement(d.tag, { key: idx, ...d.attrs })
      )
    );
  };
}

const Activity = makeIcon(['M22 12h-4l-3 9L9 3l-3 9H2']);
const AlertTriangle = makeIcon(['m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z', 'M12 9v4', 'M12 17h.01']);
const Archive = makeIcon([{ tag: 'rect', attrs: { width: 20, height: 5, x: 2, y: 3, rx: 1 } }, 'M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8', 'M10 12h4']);
const ArrowDownUp = makeIcon(['m3 16 4 4 4-4', 'M7 20V4', 'm21 8-4-4-4 4', 'M17 4v16']);
const ArrowRight = makeIcon(['M5 12h14', 'm12 5 7 7-7 7']);
const Award = makeIcon([{ tag: 'circle', attrs: { cx: 12, cy: 8, r: 6 } }, 'M15.477 12.89 17 22l-5-3-5 3 1.523-9.11']);
const BarChart3 = makeIcon(['M3 3v18h18', 'M18 17V9', 'M13 17V5', 'M8 17v-3']);
const BookOpen = makeIcon(['M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z', 'M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z']);
const Brain = makeIcon(['M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-2.54Z', 'M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-2.54Z']);
const Calculator = makeIcon([{ tag: 'rect', attrs: { width: 16, height: 20, x: 4, y: 2, rx: 2 } }, 'M8 6h8', 'M16 14v4', 'M16 10h.01', 'M12 10h.01', 'M8 10h.01', 'M12 14h.01', 'M8 14h.01', 'M12 18h.01', 'M8 18h.01']);
const CheckCircle2 = makeIcon([{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } }, 'm9 12 2 2 4-4']);
const Clock = makeIcon([{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } }, 'M12 6v6l4 2']);
const Code = makeIcon(['m16 18 6-6-6-6', 'm8 6-6 6 6 6']);
const Code2 = makeIcon(['m18 16 4-4-4-4', 'm6 8-4 4 4 4', 'm14.5 4-5 16']);
const Compass = makeIcon([{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } }, 'm16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z']);
const Copy = makeIcon([{ tag: 'rect', attrs: { width: 14, height: 14, x: 8, y: 8, rx: 2, ry: 2 } }, 'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2']);
const Cpu = makeIcon([{ tag: 'rect', attrs: { width: 16, height: 16, x: 4, y: 4, rx: 2 } }, 'M9 9h6v6H9z', 'M15 2v2', 'M15 20v2', 'M2 15h2', 'M2 9h2', 'M20 15h2', 'M20 9h2', 'M9 2v2', 'M9 20v2']);
const Database = makeIcon([{ tag: 'ellipse', attrs: { cx: 12, cy: 5, rx: 9, ry: 3 } }, 'M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5', 'M3 12c0 1.66 4 3 9 3s9-1.34 9-3']);
const Download = makeIcon(['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5', 'M12 15V3']);
const DownloadCloud = makeIcon(['M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242', 'M12 12v9', 'm8 17 4 4 4-4']);
const Eye = makeIcon(['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z', { tag: 'circle', attrs: { cx: 12, cy: 12, r: 3 } }]);
const EyeOff = makeIcon(['M9.88 9.88a3 3 0 1 0 4.24 4.24', 'M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68', 'M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61', 'm2 2 20 20']);
const FileSpreadsheet = makeIcon(['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M8 13h2', 'M14 13h2', 'M8 17h2', 'M14 17h2']);
const FileUp = makeIcon(['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z', 'M14 2v4a2 2 0 0 0 2 2h4', 'M12 12v6', 'm15 15-3-3-3 3']);
const Filter = makeIcon(['M22 3H2l8 9.46V19l4 2v-8.54L22 3z']);
const Flame = makeIcon(['M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z']);
const FolderOpen = makeIcon(['m6 14 1.5-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.54 6a2 2 0 0 1-1.95 1.5H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h3.9a2 2 0 0 1 1.69.9l.81 1.2a2 2 0 0 0 1.67.9H18a2 2 0 0 1 2 2v2']);
const FolderPlus = makeIcon(['M12 10v6', 'M9 13h6', 'M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z']);
const GitBranch = makeIcon(['M6 3v12', { tag: 'circle', attrs: { cx: 18, cy: 6, r: 3 } }, { tag: 'circle', attrs: { cx: 6, cy: 18, r: 3 } }, 'M18 9a9 9 0 0 1-9 9']);
const GitMerge = makeIcon([{ tag: 'circle', attrs: { cx: 18, cy: 18, r: 3 } }, { tag: 'circle', attrs: { cx: 6, cy: 6, r: 3 } }, 'M6 21V9a9 9 0 0 0 9 9']);
const Globe = makeIcon([{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } }, 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20', 'M2 12h20']);
const Grid = makeIcon([{ tag: 'rect', attrs: { width: 18, height: 18, x: 3, y: 3, rx: 2 } }, 'M3 9h18', 'M3 15h18', 'M9 3v18', 'M15 3v18']);
const Hand = makeIcon(['M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2', 'M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2', 'M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8', 'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15']);
const HardDrive = makeIcon(['M22 12H2', 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z', 'M6 16h.01', 'M10 16h.01']);
const HelpCircle = makeIcon([{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } }, 'M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3', 'M12 17h.01']);
const Home = makeIcon(['m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M9 22V12h6v10']);
const Info = makeIcon([{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } }, 'M12 16v-4', 'M12 8h.01']);
const Layers = makeIcon(['m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65', 'm22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65']);
const Loader2 = makeIcon(['M21 12a9 9 0 1 1-6.219-8.56']);
const MapIcon = makeIcon(['m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z', 'M9 3v15', 'M15 6v15']);
const MapPin = makeIcon(['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z', { tag: 'circle', attrs: { cx: 12, cy: 10, r: 3 } }]);
const Maximize2 = makeIcon(['M15 3h6v6', 'M9 21H3v-6', 'M21 3l-7 7', 'M3 21l7-7']);
const Moon = makeIcon(['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z']);
const MousePointerSquareDashed = makeIcon(['M5 3a2 2 0 0 0-2 2', 'M19 3a2 2 0 0 1 2 2', 'm12 12 4 10 1.7-4.3L22 16Z', 'M5 21a2 2 0 0 1-2-2', 'M9 3h1', 'M9 21h2', 'M14 3h1', 'M3 9v1', 'M21 9v2', 'M3 14v1']);
const Palette = makeIcon([{ tag: 'circle', attrs: { cx: 13.5, cy: 6.5, r: 0.5 } }, { tag: 'circle', attrs: { cx: 17.5, cy: 10.5, r: 0.5 } }, { tag: 'circle', attrs: { cx: 8.5, cy: 7.5, r: 0.5 } }, { tag: 'circle', attrs: { cx: 6.5, cy: 12.5, r: 0.5 } }, 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z']);
const PenTool = makeIcon(['m12 19 7-7 3 3-7 7-3-3z', 'm18 13-1.5-7.5L2 2l3.5 14.5L13 18l5-5z', 'm2 2 7.586 7.586', { tag: 'circle', attrs: { cx: 11, cy: 11, r: 2 } }]);
const Play = makeIcon(['m5 3 14 9-14 9V3z']);
const Plus = makeIcon(['M5 12h14', 'M12 5v14']);
const Printer = makeIcon(['M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2', 'M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6', { tag: 'rect', attrs: { x: 6, y: 14, width: 12, height: 8, rx: 1 } }]);
const RotateCcw = makeIcon(['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5']);
const Ruler = makeIcon(['M21.3 15.3a2.4 2.4 0 0 1 0 3.4l-2.6 2.6a2.4 2.4 0 0 1-3.4 0L2.7 8.7a2.41 2.41 0 0 1 0-3.4l2.6-2.6a2.41 2.41 0 0 1 3.4 0Z', 'm14.5 12.5 2-2', 'm11.5 9.5 2-2', 'm8.5 6.5 2-2', 'm17.5 15.5 2-2']);
const Search = makeIcon([{ tag: 'circle', attrs: { cx: 11, cy: 11, r: 8 } }, 'm21 21-4.3-4.3']);
const Settings = makeIcon([{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 3 } }, 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z']);
const ShieldCheck = makeIcon(['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z', 'm9 12 2 2 4-4']);
const SlidersHorizontal = makeIcon(['M21 4h-7', 'M10 4H3', 'M21 12h-9', 'M8 12H3', 'M21 20h-5', 'M12 20H3', 'M14 2v4', 'M8 10v4', 'M16 18v4']);
const Sparkles = makeIcon(['m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z']);
const SplitSquareVertical = makeIcon(['M5 8V5c0-1 1-2 2-2h10c1 0 2 1 2 2v3', 'M19 16v3c0 1-1 2-2 2H7c-1 0-2-1-2-2v-3', 'M4 12h16']);
const Sun = makeIcon([{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 4 } }, 'M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41']);
const Table = makeIcon([{ tag: 'rect', attrs: { width: 18, height: 18, x: 3, y: 3, rx: 2 } }, 'M3 9h18', 'M3 15h18', 'M9 3v18']);
const Terminal = makeIcon(['m4 17 6-6-6-6', 'M12 19h8']);
const Trash2 = makeIcon(['M3 6h18', 'M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6', 'M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2', 'M10 11v6', 'M14 11v6']);
const UploadCloud = makeIcon(['M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242', 'M12 12v9', 'm16 16-4-4-4 4']);
const Wand2 = makeIcon(['m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z', 'm14 7 3 3']);
const Wrench = makeIcon(['M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z']);
const X = makeIcon(['M18 6 6 18', 'm6 6 12 12']);
const XCircle = makeIcon([{ tag: 'circle', attrs: { cx: 12, cy: 12, r: 10 } }, 'm15 9-6 6', 'm9 9 6 6']);
const ZoomIn = makeIcon([{ tag: 'circle', attrs: { cx: 11, cy: 11, r: 8 } }, 'm21 21-4.3-4.3', 'M11 8v6', 'M8 11h6']);
const idDict = {
  "app_name": "PetaLab",
  "tagline": "Seperti QGIS versi ramah pemula, di browser, dengan Python & Machine Learning di belakangnya.",
  "nav": {
    "home": "Beranda",
    "dashboard": "Dashboard",
    "map": "Peta",
    "data": "Data",
    "table": "Tabel",
    "process": "Proses",
    "earth": "Katalog Bumi",
    "model": "Model",
    "history": "Riwayat",
    "export": "Ekspor",
    "settings": "Pengaturan"
  },
  "modes": {
    "pemula": "Mode Pemula",
    "lanjut": "Mode Lanjut"
  },
  "home": {
    "new_project": "+ Proyek Baru",
    "try_sample": "Coba Data Contoh Surabaya",
    "what_to_do": "Apa yang ingin kamu lakukan hari ini?",
    "system_status": "Status Sistem & Mesin Spasial",
    "recipes": {
      "thematic": "Membuat peta tematik dari data wilayah",
      "join_excel": "Menggabungkan data Excel/CSV ke peta",
      "count_points": "Menghitung jumlah titik per wilayah",
      "nearest": "Mencari lokasi terdekat & jaraknya",
      "landcover": "Mengklasifikasi tutupan lahan dari citra",
      "predict_ml": "Memprediksi nilai di peta (Machine Learning)"
    }
  },
  "empty": {
    "no_layer": "Belum ada data di proyek ini. Unggah file atau muat Data Contoh Surabaya untuk mulai eksplorasi."
  }
};

const enDict = {
  "app_name": "PetaLab",
  "tagline": "Beginner-friendly local Web GIS with Python & Spatial Machine Learning built-in.",
  "nav": {
    "home": "Home",
    "dashboard": "Dashboard",
    "map": "Map",
    "data": "Data",
    "table": "Table",
    "process": "Process",
    "earth": "Earth Catalog",
    "model": "Model",
    "history": "History",
    "export": "Export",
    "settings": "Settings"
  },
  "modes": {
    "pemula": "Beginner Mode",
    "lanjut": "Advanced Mode"
  },
  "home": {
    "new_project": "+ New Project",
    "try_sample": "Try Surabaya Sample Data",
    "what_to_do": "What would you like to do today?",
    "system_status": "System & Spatial Engine Status",
    "recipes": {
      "thematic": "Create a thematic choropleth map",
      "join_excel": "Join Excel/CSV table to map polygons",
      "count_points": "Count points inside each region",
      "nearest": "Find nearest facilities & distance",
      "landcover": "Classify land cover from satellite raster",
      "predict_ml": "Predict spatial values (Machine Learning)"
    }
  },
  "empty": {
    "no_layer": "No layers in this project yet. Upload a file or load the Surabaya Sample Data to get started."
  }
};

// --- Module: lib/glossary.ts ---
interface GlossaryItem {
  term: string;
  category: 'Dasar' | 'Geoprocessing' | 'Raster' | 'Machine Learning';
  short: string;
  example: string;
}

const GLOSSARY_ITEMS: GlossaryItem[] = [
  {
    term: 'Layer',
    category: 'Dasar',
    short: 'Satu "lapisan" data di peta, seperti satu lembar plastik transparan berisi gambar.',
    example: 'Layer batas kecamatan di bawah, layer titik sekolah di atasnya.',
  },
  {
    term: 'Vektor',
    category: 'Dasar',
    short: 'Data berupa titik (Point), garis (Line), atau bidang wilayah (Polygon).',
    example: 'Lokasi sekolah (titik), jalan raya (garis), batas kecamatan (poligon).',
  },
  {
    term: 'Raster',
    category: 'Raster',
    short: 'Data berupa kotak-kotak piksel seperti foto digital di mana tiap piksel menyimpan nilai angka.',
    example: 'Citra satelit Sentinel-2, peta ketinggian tanah (DEM), peta suhu permukaan.',
  },
  {
    term: 'Atribut',
    category: 'Dasar',
    short: 'Informasi tambahan tiap objek peta yang tampil sebagai kolom di tabel.',
    example: 'Nama kecamatan, jumlah penduduk, tingkat kerawanan banjir.',
  },
  {
    term: 'CRS / Sistem Koordinat',
    category: 'Dasar',
    short: '"Bahasa" matematika untuk menyatakan posisi di bumi. WGS 84 (derajat) untuk GPS; UTM (meter) untuk ukur jarak/luas.',
    example: 'PetaLab otomatis memakai UTM Zona 49S saat menghitung jarak atau luas di Surabaya.',
  },
  {
    term: 'EPSG',
    category: 'Dasar',
    short: 'Nomor kode resmi sistem koordinat.',
    example: 'EPSG:4326 = WGS 84 (derajat lintang/bujur); EPSG:32749 = UTM Zona 49S (meter).',
  },
  {
    term: 'Buffer',
    category: 'Geoprocessing',
    short: 'Membuat zona atau area selebar jarak tertentu di sekitar objek.',
    example: 'Zona jangkauan 500 meter di sekitar setiap sekolah.',
  },
  {
    term: 'Clip',
    category: 'Geoprocessing',
    short: 'Memotong layer menggunakan batas area lain, seperti memotong kue dengan cetakan.',
    example: 'Memotong jaringan jalan hanya di dalam wilayah rawan banjir.',
  },
  {
    term: 'Dissolve',
    category: 'Geoprocessing',
    short: 'Menggabungkan bidang-bidang yang bersebelahan atau berkategori sama menjadi satu.',
    example: 'Menggabungkan 31 kecamatan menjadi 5 wilayah (Pusat, Timur, Selatan, Barat, Utara).',
  },
  {
    term: 'Spatial Join',
    category: 'Geoprocessing',
    short: 'Mengambil informasi dari layer lain berdasarkan posisi bertumpuk/terdekat, bukan berdasarkan nama.',
    example: 'Menambahkan informasi "status zona banjir" ke setiap titik sekolah.',
  },
  {
    term: 'Choropleth',
    category: 'Dasar',
    short: 'Peta tematik yang mewarnai wilayah poligon berdasarkan tingkatan nilai angka.',
    example: 'Peta kepadatan penduduk kecamatan dari warna terang (jarang) ke gelap (padat).',
  },
  {
    term: 'Zonal Statistics',
    category: 'Raster',
    short: 'Menghitung rata-rata, minimum, atau maksimum nilai piksel raster di dalam setiap wilayah poligon.',
    example: 'Menghitung rata-rata ketinggian tanah (DEM) per kecamatan.',
  },
  {
    term: 'NDVI',
    category: 'Raster',
    short: 'Indeks kehijauan tanaman dari citra satelit (-1 sampai +1; makin tinggi makin rimbun hijau).',
    example: 'Rumus (NIR - Red) / (NIR + Red) untuk memetakan ruang terbuka hijau.',
  },
  {
    term: 'Hotspot (Getis-Ord Gi*)',
    category: 'Geoprocessing',
    short: 'Area tempat nilai tinggi mengelompok secara signifikan secara statistik.',
    example: 'Mendeteksi klaster pusat kepadatan atau kerawanan banjir.',
  },
  {
    term: 'Interpolasi (IDW / Kriging)',
    category: 'Raster',
    short: 'Menebak nilai di lokasi yang tidak diukur berdasarkan titik-titik pengukuran di sekitarnya.',
    example: 'Membuat peta suhu permukaan kontinu dari titik-titik stasiun cuaca.',
  },
  {
    term: 'Spatial Block CV',
    category: 'Machine Learning',
    short: 'Cara menguji model ML dengan membagi data per blok wilayah agar model tidak menyontek tetangga dekatnya.',
    example: 'Memberi nilai akurasi prediksi spasial yang jauh lebih jujur dibanding pembagian acak.',
  },
  {
    term: 'RMSE / MAE',
    category: 'Machine Learning',
    short: 'Rata-rata besar kesalahan prediksi angka dalam satuan asli target (makin kecil makin akurat).',
    example: 'RMSE ±0,45 °C berarti tebakan suhu model rata-rata meleset kurang dari setengah derajat.',
  },
  {
    term: 'R² (Koefisien Determinasi)',
    category: 'Machine Learning',
    short: 'Seberapa banyak variasi data yang berhasil dijelaskan oleh model (0 sampai 1, atau 0% sampai 100%).',
    example: 'R² = 0,84 berarti 84% variasi suhu permukaan dijelaskan oleh fitur-fitur model.',
  },
  {
    term: 'Feature Importance',
    category: 'Machine Learning',
    short: 'Peringkat faktor atau kolom mana yang paling berpengaruh dalam keputusan prediksi model.',
    example: 'Mengetahui bahwa NDVI dan elevasi lebih berpengaruh terhadap suhu dibanding jumlah penduduk.',
  },
  {
    term: 'GeoParquet / COG',
    category: 'Dasar',
    short: 'Format penyimpanan internal modern yang sangat cepat untuk data vektor (GeoParquet) dan raster (Cloud-Optimized GeoTIFF).',
    example: 'PetaLab otomatis menyimpan layer kerja dalam format ini tanpa mengubah file asli Anda.',
  },
  {
    term: 'Earth Engine',
    category: 'Raster',
    short: 'Layanan Google yang menyimpan arsip citra satelit dunia dan memprosesnya di server mereka sehingga Anda tidak perlu mengunduh file raksasa.',
    example: 'Mengambil komposit NDVI Sentinel-2 bebas awan langsung untuk batas satu kecamatan.',
  },
  {
    term: 'Komposit (Composite)',
    category: 'Raster',
    short: 'Gabungan banyak citra pada rentang waktu tertentu menjadi satu gambar bersih dengan mengambil nilai tengah (median) tiap piksel.',
    example: 'Komposit median 3 bulan menghasilkan peta satelit yang bersih dari awan.',
  },
  {
    term: 'Masking Awan',
    category: 'Raster',
    short: 'Membuang piksel yang tertutup awan sebelum citra digabungkan. Sangat penting di Indonesia karena wilayah tropis sering berawan.',
    example: 'PetaLab menyalakan masking awan secara default pada Katalog Bumi.',
  },
  {
    term: 'Scale (dalam GEE)',
    category: 'Raster',
    short: 'Ukuran satu piksel dalam meter. Sentinel-2 aslinya 10 meter, Landsat 30 meter, CHIRPS 5.000 meter.',
    example: 'Menggunakan scale sesuai resolusi asli menjaga akurasi tanpa membengkakkan ukuran file.',
  },
  {
    term: 'Resolusi Asli',
    category: 'Raster',
    short: 'Ukuran piksel sebenarnya dari sensor satelit. Meminta resolusi lebih halus dari aslinya tidak menambah detail baru.',
    example: 'DEM Copernicus memiliki resolusi asli 30 meter per piksel.',
  },
  {
    term: 'EECU',
    category: 'Raster',
    short: 'Earth Engine Compute Units — satuan hitung pemakaian komputasi di server Earth Engine, mirip "jam mesin".',
    example: 'Pratinjau hampir tidak memakai EECU; unduhan area luas dengan resolusi sangat rapat memakainya.',
  },
  {
    term: 'Evaluasi Malas (Lazy Evaluation)',
    category: 'Raster',
    short: 'GEE tidak menghitung apa pun sampai hasil benar-benar diminta (Pratinjau atau Unduh).',
    example: 'Menyusun filter tanggal dan band itu instan; proses unduh berjalan sebagai job di latar belakang.',
  },
  {
    term: 'Sentinel-2',
    category: 'Raster',
    short: 'Satelit observasi bumi milik Eropa (ESA) beresolusi 10 meter yang melintas setiap ~5 hari.',
    example: 'Pilihan utama untuk peta warna asli RGB, NDVI, dan analisis skala kota.',
  },
  {
    term: 'Landsat 8 / 9',
    category: 'Raster',
    short: 'Satelit observasi bumi Amerika (USGS/NASA) beresolusi 30 meter yang memiliki sensor termal pengukur suhu permukaan.',
    example: 'Dipakai untuk memetakan Urban Heat Island (LST).',
  },
  {
    term: 'LST (Land Surface Temperature)',
    category: 'Raster',
    short: 'Suhu permukaan tanah/atap yang diukur oleh sensor termal satelit (berbeda dari suhu udara termometer).',
    example: 'Kawasan beton padat biasanya memiliki LST lebih tinggi dibandingkan ruang terbuka hijau.',
  },
  {
    term: 'DEM (Digital Elevation Model)',
    category: 'Raster',
    short: 'Peta raster ketinggian permukaan tanah dalam meter di atas permukaan laut.',
    example: 'Bahan dasar menghitung kemiringan lereng (Slope), Hillshade, dan cekungan banjir.',
  },
  {
    term: 'Tiling / Berpetak',
    category: 'Raster',
    short: 'Memecah permintaan unduhan area besar (>32 MB) menjadi beberapa petak kecil lalu menyatukannya kembali secara lokal.',
    example: 'PetaLab memecah area besar secara otomatis dan menggabungkannya kembali menjadi satu GeoTIFF utuh.',
  },
];


// --- Module: lib/format.ts ---
function formatNumber(val: number | null | undefined, decimals = 2): string {
  if (val === null || val === undefined || Number.isNaN(Number(val))) return '—';
  const num = Number(val);
  if (Number.isInteger(num)) {
    return new Intl.NumberFormat('id-ID').format(num);
  }
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(num);
}

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '0 KB';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1)).toLocaleString('id-ID')} ${sizes[i]}`;
}

const COLOR_PALETTES: Record<string, string[]> = {
  viridis: ['#134e4a', '#0f766e', '#14b8a6', '#f59e0b', '#ea580c'],
  ylorrd: ['#fef3c7', '#fdba74', '#fb923c', '#ea580c', '#9a3412'],
  blues: ['#ccfbf1', '#5eead4', '#14b8a6', '#0f766e', '#134e4a'],
  greens: ['#dcfce7', '#86efac', '#22c55e', '#15803d', '#14532d'],
  rdylgn: ['#dc2626', '#f97316', '#facc15', '#14b8a6', '#15803d'],
  coolwarm: ['#0f766e', '#5eead4', '#cbd5e1', '#fb923c', '#ea580c'],
  magma: ['#0b1214', '#134e4a', '#0d9488', '#ea580c', '#fed7aa'],
  // Refined 2-tone Deep Tosca & Burnt Orange categorical spectrum
  categorical: ['#0f766e', '#ea580c', '#14b8a6', '#f59e0b', '#115e59', '#c2410c', '#5a7478', '#fb923c'],
};


// --- Module: api/client.ts ---
interface LayerSchemaField {
  name: string;
  type: string;
  nullable: boolean;
  null_count: number;
  unique_count: number;
  sample: any;
  stats?: any;
}

interface LayerStyle {
  mode: 'single' | 'category' | 'choropleth' | 'proportional' | 'heatmap' | 'raster';
  color?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  opacity?: number;
  pointRadius?: number;
  column?: string | null;
  method?: 'quantile' | 'equal_interval' | 'natural_breaks';
  classes?: number;
  palette?: string;
  labelColumn?: string | null;
  cmap?: string;
  band?: number;
  vmin?: number;
  vmax?: number;
  hillshade?: boolean;
  heatPalette?: string;
  heatRadius?: number;
  heatIntensity?: number;
  heatWeightCol?: string | null;
  heatShowPoints?: boolean;
}

interface LayerItem {
  id: string;
  project_id: string;
  name: string;
  kind: 'vector' | 'raster' | 'table';
  geom_type: 'point' | 'line' | 'polygon' | 'raster' | null;
  crs: string | null;
  path: string;
  source_path?: string;
  feature_count: number;
  bbox: [number, number, number, number] | null;
  schema: LayerSchemaField[];
  style: LayerStyle;
  lineage: Record<string, any>;
  size_bytes: number;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

interface ProjectItem {
  id: string;
  name: string;
  description: string;
  basemap: string;
  view: { center: [number, number]; zoom: number };
  layer_order: string[];
  layer_count?: number;
  model_count?: number;
  size_bytes?: number;
  created_at: string;
  updated_at: string;
  layers?: LayerItem[];
}

interface JobItem {
  id: string;
  project_id: string;
  tool_id: string;
  tool_name?: string;
  params: Record<string, any>;
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
  progress: number;
  message: string;
  outputs?: Record<string, any>;
  logs?: string[];
  error_user?: string | null;
  error_detail?: string | null;
  started_at?: string;
  finished_at?: string | null;
}

interface ToolFieldSchema {
  name: string;
  title: string;
  type: string;
  default: any;
  required: boolean;
  enum?: string[];
  geom?: string[];
  kind?: string;
  advanced?: boolean;
  column_of?: string;
  description?: string;
}

interface ToolSchema {
  id: string;
  name: string;
  technical_name: string;
  group: string;
  level: 'pemula' | 'menengah' | 'lanjut';
  description: string;
  illustration: string;
  fields: ToolFieldSchema[];
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const sessionToken = (window as any).__PETALAB_SESSION_TOKEN__ || '';
  const res = await fetch(url, {
    ...options,
    headers: {
      ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(sessionToken ? { 'X-PetaLab-Token': sessionToken } : {}),
      ...(options?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error(data.message || `HTTP Error ${res.status}`);
    err.code = data.code || 'ERROR';
    err.hint = data.hint || '';
    err.actions = data.actions || [];
    err.detail = data.detail || '';
    throw err;
  }
  return data as T;
}

const api = {
  getHealth: () => request<any>('/api/health'),
  getSettings: () => request<any>('/api/settings'),
  updateSettings: (updates: Record<string, any>) =>
    request<any>('/api/settings', { method: 'PATCH', body: JSON.stringify(updates) }),

  listProjects: () => request<ProjectItem[]>('/api/projects'),
  createProject: (payload: { name: string; description?: string; basemap?: string }) =>
    request<ProjectItem>('/api/projects', { method: 'POST', body: JSON.stringify(payload) }),
  seedSampleProject: () => request<ProjectItem>('/api/projects/sample', { method: 'POST' }),
  getProject: (pid: string) => request<ProjectItem>(`/api/projects/${pid}`),
  updateProject: (pid: string, updates: Record<string, any>) =>
    request<ProjectItem>(`/api/projects/${pid}`, { method: 'PATCH', body: JSON.stringify(updates) }),

  listLayers: (pid: string, includeDeleted = false) =>
    request<LayerItem[]>(`/api/projects/${pid}/layers?include_deleted=${includeDeleted}`),
  uploadLayer: (pid: string, formData: FormData) =>
    request<{ layer: LayerItem; report: any }>(`/api/projects/${pid}/layers/upload`, {
      method: 'POST',
      body: formData,
    }),
  createDrawnLayer: (payload: { project_id: string; name: string; geojson: any }) =>
    request<LayerItem>('/api/layers/draw', { method: 'POST', body: JSON.stringify(payload) }),
  createCsvDataset: (payload: {
    project_id: string;
    dataset_name: string;
    points: any[];
    join_table_layer_id?: string | null;
    csv_delimiter?: ',' | ';';
    pair_mode?: boolean;
  }) =>
    request<{
      layer: LayerItem;
      csv_filename: string;
      csv_download_url: string;
      xlsx_filename?: string;
      xlsx_download_url?: string | null;
      row_count: number;
    }>(
      '/api/datasets/create_csv',
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  segmentLonLat: (
    lid: string,
    payload: {
      project_id?: string;
      lon_column: string;
      lat_column: string;
      swap_xy?: boolean;
      auto_fix_indonesia?: boolean;
      segment_mode?: 'none' | 'quadrant' | 'grid' | 'kmeans' | 'attribute';
      grid_nx?: number;
      grid_ny?: number;
      n_segments?: number;
      value_column?: string | null;
      create_zone_layer?: boolean;
      view_as_heatmap?: boolean;
      heat_weight_col?: string | null;
      output_name?: string | null;
    }
  ) =>
    request<{
      point_layer: LayerItem;
      zone_layer?: LayerItem | null;
      bbox: [number, number, number, number];
      accuracy: {
        total_rows: number;
        valid_points: number;
        dropped_invalid: number;
        lon_column_used: string;
        lat_column_used: string;
        swapped_detected: boolean;
        swapped_applied: boolean;
        lon_range: [number, number];
        lat_range: [number, number];
        center: [number, number];
        span_km: [number, number];
        utm_crs: string;
        region_hint: string;
      };
      segment_summary: { segment: string; count: number; pct: number }[];
    }>(`/api/layers/${lid}/segment_lonlat`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateLayer: (lid: string, updates: Record<string, any>, pid?: string) =>
    request<LayerItem>(`/api/layers/${lid}${pid ? `?project_id=${pid}` : ''}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }),
  deleteLayer: (lid: string, pid?: string) =>
    request<LayerItem>(`/api/layers/${lid}${pid ? `?project_id=${pid}` : ''}`, { method: 'DELETE' }),
  restoreLayer: (lid: string, pid?: string) =>
    request<LayerItem>(`/api/layers/${lid}/restore${pid ? `?project_id=${pid}` : ''}`, { method: 'POST' }),
  duplicateLayer: (lid: string, pid?: string) =>
    request<LayerItem>(`/api/layers/${lid}/duplicate${pid ? `?project_id=${pid}` : ''}`, { method: 'POST' }),
  getLayerGeoJSON: (lid: string, simplify = 0, pid?: string, zoom?: number, bbox?: string) => {
    const q = new URLSearchParams();
    q.set('simplify', String(simplify));
    if (pid) q.set('project_id', pid);
    if (zoom !== undefined) q.set('zoom', String(zoom));
    if (bbox) q.set('bbox', bbox);
    return request<any>(`/api/layers/${lid}/geojson?${q.toString()}`);
  },

  getFeatures: (
    lid: string,
    params: { offset?: number; limit?: number; sort?: string; desc?: boolean; filter?: string; fids?: number[]; project_id?: string }
  ) => {
    const q = new URLSearchParams();
    if (params.offset !== undefined) q.set('offset', String(params.offset));
    if (params.limit !== undefined) q.set('limit', String(params.limit));
    if (params.sort) q.set('sort', params.sort);
    if (params.desc) q.set('desc', 'true');
    if (params.filter) q.set('filter', params.filter);
    if (params.fids && params.fids.length > 0) q.set('fids', params.fids.join(','));
    if (params.project_id) q.set('project_id', params.project_id);
    return request<{ total: number; filtered: number; offset: number; limit: number; rows: Record<string, any>[] }>(
      `/api/layers/${lid}/features?${q.toString()}`
    );
  },

  getLayerStats: (
    lid: string,
    params: { fids?: number[]; column?: string; cat_col?: string; scatter_x?: string; scatter_y?: string; label_col?: string; project_id?: string } = {}
  ) => {
    const q = new URLSearchParams();
    if (params.fids && params.fids.length > 0) q.set('fids', params.fids.join(','));
    if (params.column) q.set('column', params.column);
    if (params.cat_col) q.set('cat_col', params.cat_col);
    if (params.scatter_x) q.set('scatter_x', params.scatter_x);
    if (params.scatter_y) q.set('scatter_y', params.scatter_y);
    if (params.label_col) q.set('label_col', params.label_col);
    if (params.project_id) q.set('project_id', params.project_id);
    return request<any>(`/api/layers/${lid}/stats?${q.toString()}`);
  },

  selectFeatures: (lid: string, payload: Record<string, any>, pid?: string) =>
    request<{ fids: number[]; count: number; mode: string }>(
      `/api/layers/${lid}/select${pid ? `?project_id=${pid}` : ''}`,
      { method: 'POST', body: JSON.stringify(payload) }
    ),
  saveSelectionAsLayer: (lid: string, fids: number[], output_name: string, pid?: string) =>
    request<LayerItem>(`/api/layers/${lid}/selection/save_layer${pid ? `?project_id=${pid}` : ''}`, {
      method: 'POST',
      body: JSON.stringify({ fids, output_name }),
    }),
  listNamedSelections: (pid: string) => request<any[]>(`/api/projects/${pid}/selections`),
  saveNamedSelection: (pid: string, payload: { layer_id: string; name: string; fids: number[]; rule?: any }) =>
    request<any>(`/api/projects/${pid}/selections`, { method: 'POST', body: JSON.stringify(payload) }),

  calculateField: (lid: string, payload: Record<string, any>, pid?: string) =>
    request<any>(`/api/layers/${lid}/calculate${pid ? `?project_id=${pid}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  suggestJoin: (payload: { project_id: string; left_layer_id: string; right_layer_id: string }) =>
    request<{ left_key: string; right_key: string; confidence: number }>('/api/join/suggest', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  runJoin: (payload: Record<string, any>) =>
    request<any>('/api/join', { method: 'POST', body: JSON.stringify(payload) }),
  groupByLayer: (lid: string, payload: Record<string, any>, pid?: string) =>
    request<LayerItem>(`/api/layers/${lid}/groupby${pid ? `?project_id=${pid}` : ''}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listTools: () => request<ToolSchema[]>('/api/tools'),
  previewTool: (toolId: string, payload: Record<string, any>) =>
    request<{ preview: any; geojson: any; python_code: string }>(`/api/tools/${toolId}/preview`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  runTool: (toolId: string, payload: Record<string, any>) =>
    request<{ job_id: string; job: JobItem; python_code: string }>(`/api/tools/${toolId}/run`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listJobs: (pid: string) => request<JobItem[]>(`/api/jobs?project_id=${pid}`),
  cancelJob: (jid: string) => request<any>(`/api/jobs/${jid}/cancel`, { method: 'POST' }),

  buildSpatialFeatures: (payload: { project_id: string; layer_id: string; specs: any[] }) =>
    request<any>('/api/models/features/build', { method: 'POST', body: JSON.stringify(payload) }),
  auditFeatures: (payload: { project_id: string; layer_id: string; target_column?: string; feature_columns: string[]; task: string }) =>
    request<any>('/api/models/features/audit', { method: 'POST', body: JSON.stringify(payload) }),
  previewSpatialCV: (payload: { project_id: string; layer_id: string; block_size_m: number; n_splits: number }) =>
    request<{ geojson: any; fold_summary: { fold: number; count: number }[] }>('/api/models/cv_preview', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  trainModel: (payload: { project_id: string; params: Record<string, any> }) =>
    request<{ job_id: string; job: JobItem }>('/api/models/train', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  listModels: (pid: string) => request<any[]>(`/api/models?project_id=${pid}`),
  predictModel: (mid: string, payload: { project_id: string; target_layer_id: string; output_name?: string }) =>
    request<{ job_id: string; job: JobItem }>(`/api/models/${mid}/predict`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  exportModelNotebook: (mid: string, pid: string) =>
    request<{ path: string; filename: string; notebook: any }>(`/api/models/${mid}/notebook?project_id=${pid}`),
  runPythonConsole: (payload: { project_id: string; code: string }) =>
    request<{ ok: boolean; output: string; error?: string; created_layers: LayerItem[] }>('/api/python/console', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  osmSearch: (q: string) => request<any[]>(`/api/osm/search?q=${encodeURIComponent(q)}`),
  osmDownload: (payload: { project_id: string; bbox: number[]; categories: string[]; custom_tag?: string }) =>
    request<{ job_id: string; job: JobItem; estimated_area_km2: number }>('/api/osm/download', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  exportResource: (payload: Record<string, any>) =>
    request<{ filename: string; download_url: string; script?: string; size_bytes?: number }>('/api/export', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  listHistory: (pid: string) => request<any[]>(`/api/history?project_id=${pid}`),
  undoHistory: (hid: number, pid: string) =>
    request<any>(`/api/history/${hid}/undo?project_id=${pid}`, { method: 'POST' }),

  // Google Earth Engine ("Katalog Bumi") API
  geeStatus: () => request<any>('/api/gee/status'),
  geeAuth: (payload: { project_id: string; auth_mode?: string; email?: string; service_account_json?: any }) =>
    request<any>('/api/gee/auth', { method: 'POST', body: JSON.stringify(payload) }),
  geeTest: (project_id?: string) =>
    request<any>('/api/gee/test', { method: 'POST', body: JSON.stringify({ project_id }) }),
  geeDisconnect: () => request<any>('/api/gee/disconnect', { method: 'POST' }),
  geeClearCache: () => request<any>('/api/gee/cache/clear', { method: 'POST' }),
  geeCatalog: (q?: string, includeAdvanced = true) =>
    request<any[]>(
      `/api/gee/catalog?include_advanced=${includeAdvanced}${q ? `&q=${encodeURIComponent(q)}` : ''}`
    ),
  geeEstimate: (payload: Record<string, any>) =>
    request<any>('/api/gee/estimate', { method: 'POST', body: JSON.stringify(payload) }),
  geePreview: (payload: Record<string, any>) =>
    request<any>('/api/gee/preview', { method: 'POST', body: JSON.stringify(payload) }),
  geeFetch: (payload: Record<string, any>) =>
    request<{ job_id: string; job: JobItem }>('/api/gee/fetch', { method: 'POST', body: JSON.stringify(payload) }),
};


// --- Module: stores/usePetaStore.ts ---


type NavTab =
  | 'home'
  | 'dashboard'
  | 'map'
  | 'data'
  | 'table'
  | 'process'
  | 'earth'
  | 'model'
  | 'history'
  | 'export'
  | 'settings';

interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  hint?: string;
}

type StudioView = 'split' | 'map' | 'table' | 'dashboard';
type DataSubTab = 'library' | 'upload' | 'osm' | 'earth';

interface PetaLabState {
  // Navigation & UI State
  activeTab: NavTab;
  studioView: StudioView;
  dataSubTab: DataSubTab;
  mode: 'pemula' | 'lanjut';
  theme: 'light' | 'dark';
  language: 'id' | 'en';
  splitMapTable: boolean;
  helpOpen: boolean;
  tourOpen: boolean;
  commandPaletteOpen: boolean;

  // Project & Layers State
  projectId: string;
  project: ProjectItem | null;
  projects: ProjectItem[];
  layers: LayerItem[];
  activeLayerId: string | null;
  visibleLayers: Record<string, boolean>;
  layerOpacity: Record<string, number>;
  basemap: 'osm_standard' | 'osm_light' | 'osm_dark' | 'satellite' | 'none';
  cursorCoords: { lat: number; lon: number };
  mapZoom: number;
  zoomToBboxRequest: [number, number, number, number] | null;
  swipeLayerId: string | null;

  // Global Selection State (synced across Map <-> Table <-> Dashboard)
  selectionsByLayer: Record<string, number[]>;
  selectionSource: 'map' | 'table' | 'chart' | 'query';

  // Tools, Models & Jobs
  tools: ToolSchema[];
  selectedToolId: string | null;
  previewGeoJSON: any | null;
  jobs: JobItem[];
  models: any[];
  health: any | null;
  geeStatus: any | null;
  lastImportReport: any | null;
  toasts: ToastMessage[];

  // Actions
  setActiveTab: (tab: NavTab) => void;
  setStudioView: (view: StudioView) => void;
  setDataSubTab: (sub: DataSubTab) => void;
  setMode: (mode: 'pemula' | 'lanjut') => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setLanguage: (lang: 'id' | 'en') => void;
  toggleSplitMapTable: () => void;
  setHelpOpen: (open: boolean) => void;
  setTourOpen: (open: boolean) => void;
  setCommandPaletteOpen: (open: boolean) => void;

  setActiveLayerId: (id: string | null) => void;
  toggleLayerVisibility: (id: string) => void;
  setLayerOpacity: (id: string, opacity: number) => void;
  moveLayerOrder: (id: string, direction: 'up' | 'down') => void;
  setBasemap: (bm: 'osm_standard' | 'osm_light' | 'osm_dark' | 'satellite' | 'none') => void;
  setCursorCoords: (coords: { lat: number; lon: number }) => void;
  setMapZoom: (zoom: number) => void;
  requestZoomToBbox: (bbox: [number, number, number, number] | null) => void;
  setSwipeLayerId: (id: string | null) => void;

  setLayerSelection: (layerId: string, fids: number[], source?: 'map' | 'table' | 'chart' | 'query') => void;
  toggleFeatureSelection: (layerId: string, fid: number, multi?: boolean) => void;
  clearLayerSelection: (layerId: string) => void;

  setSelectedToolId: (toolId: string | null) => void;
  setPreviewGeoJSON: (geojson: any | null) => void;
  setLastImportReport: (report: any | null) => void;
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Server Sync Actions
  initApp: () => Promise<void>;
  loadProject: (pid: string) => Promise<void>;
  refreshLayers: () => Promise<void>;
  refreshJobs: () => Promise<void>;
  refreshModels: () => Promise<void>;
  refreshGeeStatus: () => Promise<void>;
  upsertJobFromWS: (job: JobItem) => void;
}

const usePetaStore = create<PetaLabState>((set, get) => ({
  activeTab: 'map',
  studioView: 'split',
  dataSubTab: 'library',
  mode: 'pemula',
  theme: 'light',
  language: 'id',
  splitMapTable: true,
  helpOpen: false,
  tourOpen: false,
  commandPaletteOpen: false,

  projectId: 'banjir-surabaya',
  project: null,
  projects: [],
  layers: [],
  activeLayerId: null,
  visibleLayers: {},
  layerOpacity: {},
  basemap: 'osm_standard',
  cursorCoords: { lat: -7.2575, lon: 112.7521 },
  mapZoom: 11.6,
  zoomToBboxRequest: null,
  swipeLayerId: null,

  selectionsByLayer: {},
  selectionSource: 'map',

  tools: [],
  selectedToolId: 'vector.buffer',
  previewGeoJSON: null,
  jobs: [],
  models: [],
  health: null,
  geeStatus: null,
  lastImportReport: null,
  toasts: [],

  setActiveTab: (tab) => {
    // Smart canonical routing so legacy links ('table', 'dashboard', 'earth') land cleanly inside the 7-workspace architecture
    if (tab === 'table') {
      set({ activeTab: 'map', studioView: 'table', splitMapTable: false });
    } else if (tab === 'dashboard') {
      set({ activeTab: 'map', studioView: 'dashboard', splitMapTable: false });
    } else if (tab === 'earth') {
      set({ activeTab: 'data', dataSubTab: 'earth' });
    } else {
      set({ activeTab: tab });
    }
  },
  setStudioView: (studioView) => set({ studioView, splitMapTable: studioView === 'split' }),
  setDataSubTab: (dataSubTab) => set({ dataSubTab }),
  setMode: (mode) => {
    set({ mode });
    api.updateSettings({ mode }).catch(() => {});
  },
  setTheme: (theme) => {
    set({ theme });
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    api.updateSettings({ theme }).catch(() => {});
  },
  setLanguage: (language) => {
    set({ language });
    api.updateSettings({ language }).catch(() => {});
  },
  toggleSplitMapTable: () =>
    set((s) => {
      const nextSplit = s.studioView !== 'split';
      return { splitMapTable: nextSplit, studioView: nextSplit ? 'split' : 'map' };
    }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),
  setTourOpen: (tourOpen) => set({ tourOpen }),
  setCommandPaletteOpen: (commandPaletteOpen) => set({ commandPaletteOpen }),

  setActiveLayerId: (id) => set({ activeLayerId: id }),
  toggleLayerVisibility: (id) =>
    set((s) => ({
      visibleLayers: { ...s.visibleLayers, [id]: !(s.visibleLayers[id] ?? true) },
    })),
  setLayerOpacity: (id, opacity) =>
    set((s) => ({
      layerOpacity: { ...s.layerOpacity, [id]: opacity },
    })),
  moveLayerOrder: (id, direction) =>
    set((s) => {
      const idx = s.layers.findIndex((l) => l.id === id);
      if (idx === -1) return {};
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= s.layers.length) return {};
      const nextLayers = [...s.layers];
      const [item] = nextLayers.splice(idx, 1);
      nextLayers.splice(targetIdx, 0, item);
      const nextOrder = nextLayers.map((l) => l.id);
      api.updateProject(s.projectId, { layer_order: nextOrder }).catch(() => {});
      return { layers: nextLayers };
    }),
  setBasemap: (basemap) => set({ basemap }),
  setCursorCoords: (cursorCoords) => set({ cursorCoords }),
  setMapZoom: (mapZoom) => set({ mapZoom }),
  requestZoomToBbox: (zoomToBboxRequest) => set({ zoomToBboxRequest }),
  setSwipeLayerId: (swipeLayerId) => set({ swipeLayerId }),

  setLayerSelection: (layerId, fids, source = 'map') =>
    set((s) => ({
      selectionsByLayer: { ...s.selectionsByLayer, [layerId]: fids },
      selectionSource: source,
    })),

  toggleFeatureSelection: (layerId, fid, multi = false) =>
    set((s) => {
      const current = s.selectionsByLayer[layerId] || [];
      let next: number[];
      if (multi) {
        next = current.includes(fid) ? current.filter((x) => x !== fid) : [...current, fid];
      } else {
        next = current.length === 1 && current[0] === fid ? [] : [fid];
      }
      return {
        selectionsByLayer: { ...s.selectionsByLayer, [layerId]: next },
        selectionSource: 'map',
      };
    }),

  clearLayerSelection: (layerId) =>
    set((s) => ({
      selectionsByLayer: { ...s.selectionsByLayer, [layerId]: [] },
    })),

  setSelectedToolId: (selectedToolId) => set({ selectedToolId, previewGeoJSON: null }),
  setPreviewGeoJSON: (previewGeoJSON) => set({ previewGeoJSON }),
  setLastImportReport: (lastImportReport) => set({ lastImportReport }),

  addToast: (toast) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 6000);
  },

  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  initApp: async () => {
    try {
      const [health, settings, projects, tools, geeStatus] = await Promise.all([
        api.getHealth(),
        api.getSettings(),
        api.listProjects(),
        api.listTools(),
        api.geeStatus().catch(() => null),
      ]);
      const mode = settings.mode || 'pemula';
      const theme = settings.theme || 'light';
      const language = settings.language || 'id';
      if (theme === 'dark') document.documentElement.classList.add('dark');

      const firstPid = projects[0]?.id || 'banjir-surabaya';
      set({ health, geeStatus, mode, theme, language, projects, tools, projectId: firstPid });
      await get().loadProject(firstPid);
    } catch (err: any) {
      get().addToast({
        type: 'error',
        title: 'Gagal memuat status awal server',
        message: err.message,
      });
    }
  },

  loadProject: async (pid: string) => {
    try {
      const [proj, jobs, models] = await Promise.all([
        api.getProject(pid),
        api.listJobs(pid),
        api.listModels(pid),
      ]);
      const layers = proj.layers || [];
      const vis: Record<string, boolean> = {};
      const opac: Record<string, number> = {};
      layers.forEach((l) => {
        // Hide background DEM raster by default so vector layers shine clearly, user can toggle it with 1 click
        vis[l.id] = l.kind === 'vector';
        opac[l.id] = l.style?.opacity ?? 0.78;
      });
      const firstSpatial = layers.find((l) => l.kind === 'vector') || layers[0];
      set({
        projectId: pid,
        project: proj,
        layers,
        visibleLayers: vis,
        layerOpacity: opac,
        activeLayerId: firstSpatial?.id || null,
        jobs,
        models,
      });
    } catch (err: any) {
      get().addToast({ type: 'error', title: 'Gagal membuka proyek', message: err.message });
    }
  },

  refreshLayers: async () => {
    const pid = get().projectId;
    const [layers, projects] = await Promise.all([api.listLayers(pid), api.listProjects()]);
    const currentVis = { ...get().visibleLayers };
    const currentOpac = { ...get().layerOpacity };
    layers.forEach((l) => {
      if (currentVis[l.id] === undefined) currentVis[l.id] = l.kind !== 'table';
      if (currentOpac[l.id] === undefined) currentOpac[l.id] = l.style?.opacity ?? 0.78;
    });
    const activeId = get().activeLayerId;
    const validActive = layers.some((l) => l.id === activeId) ? activeId : layers[0]?.id || null;
    set({ layers, projects, visibleLayers: currentVis, layerOpacity: currentOpac, activeLayerId: validActive });
  },

  refreshJobs: async () => {
    const pid = get().projectId;
    const jobs = await api.listJobs(pid);
    set({ jobs });
  },

  refreshModels: async () => {
    const pid = get().projectId;
    const models = await api.listModels(pid);
    set({ models });
  },

  refreshGeeStatus: async () => {
    const geeStatus = await api.geeStatus();
    set({ geeStatus });
  },

  upsertJobFromWS: (job: JobItem) => {
    set((s) => {
      const exists = s.jobs.some((j) => j.id === job.id);
      const nextJobs = exists ? s.jobs.map((j) => (j.id === job.id ? { ...j, ...job } : j)) : [job, ...s.jobs];
      return { jobs: nextJobs };
    });
    if (job.status === 'succeeded') {
      get().refreshLayers();
      get().refreshModels();
      get().addToast({
        type: 'success',
        title: job.message || 'Proses selesai',
        message: 'Hasil telah ditambahkan sebagai layer baru di proyek.',
      });
    } else if (job.status === 'failed') {
      get().addToast({
        type: 'error',
        title: 'Proses belum berhasil',
        message: job.error_user || job.message,
      });
    }
  },
}));


// --- Module: components/map/MapView.tsx ---






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

const MapView: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
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


// --- Module: components/table/TabularView.tsx ---





const TabularView: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const {
    projectId,
    layers,
    activeLayerId,
    selectionsByLayer,
    mode,
    setActiveLayerId,
    setLayerSelection,
    toggleFeatureSelection,
    refreshLayers,
    addToast,
  } = usePetaStore();

  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0] || null;
  const selectedFids = (activeLayerId && selectionsByLayer[activeLayerId]) || [];

  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [totalRows, setTotalRows] = useState(0);
  const [filteredRows, setFilteredRows] = useState(0);
  const [offset, setOffset] = useState(0);
  const [limit] = useState(100);
  const [sortCol, setSortCol] = useState<string | undefined>(undefined);
  const [sortDesc, setSortDesc] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [onlySelected, setOnlySelected] = useState(false);

  // Active sub-modal: none | query_builder | calculator | join_wizard | groupby
  const [activeDialog, setActiveDialog] = useState<'none' | 'query_builder' | 'calculator' | 'join_wizard' | 'groupby'>('none');

  // Visual Query Builder state
  const [qbRules, setQbRules] = useState<{ column: string; operator: string; value: string }[]>([
    { column: '', operator: 'gt', value: '' },
  ]);
  const [qbLogic, setQbLogic] = useState<'AND' | 'OR'>('AND');
  const [sqlWhere, setSqlWhere] = useState('');

  // Field Calculator state
  const [calcColName, setCalcColName] = useState('kolom_baru');
  const [calcMode, setCalcMode] = useState<'template' | 'sql'>('template');
  const [calcTemplate, setCalcTemplate] = useState('area_km2');
  const [calcColA, setCalcColA] = useState('');
  const [calcColB, setCalcColB] = useState('');
  const [calcSqlExpr, setCalcSqlExpr] = useState('');
  const [calcPreview, setCalcPreview] = useState<Record<string, any>[]>([]);

  // 3-Step Table Join Wizard state
  const [joinRightLayerId, setJoinRightLayerId] = useState('');
  const [joinLeftKey, setJoinLeftKey] = useState('');
  const [joinRightKey, setJoinRightKey] = useState('');
  const [joinNormalize, setJoinNormalize] = useState(true);
  const [joinPreview, setJoinPreview] = useState<any | null>(null);

  // Group By state
  const [gbGroupCol, setGbGroupCol] = useState('');
  const [gbAggCol, setGbAggCol] = useState('');
  const [gbAggFunc, setGbAggFunc] = useState('sum');

  const fetchTableData = async () => {
    if (!activeLayer) return;
    try {
      const res = await api.getFeatures(activeLayer.id, {
        offset,
        limit,
        sort: sortCol,
        desc: sortDesc,
        filter: searchText || undefined,
        fids: onlySelected ? selectedFids : undefined,
        project_id: projectId,
      });
      setRows(res.rows);
      setTotalRows(res.total);
      setFilteredRows(res.filtered);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal memuat tabel atribut', message: err.message });
    }
  };

  useEffect(() => {
    fetchTableData();
  }, [activeLayer?.id, offset, sortCol, sortDesc, searchText, onlySelected, selectedFids.length, activeLayer?.updated_at]);

  // Initialize default columns when active layer changes
  useEffect(() => {
    if (!activeLayer) return;
    const cols = activeLayer.schema.map((s) => s.name).filter((n) => n !== '_fid');
    const numCols = activeLayer.schema.filter((s) => s.type === 'number' || s.type === 'integer').map((s) => s.name);
    if (cols.length > 0) {
      setQbRules([{ column: numCols[0] || cols[0], operator: 'gt', value: '50000' }]);
      setCalcColA(numCols[0] || cols[0]);
      setCalcColB(numCols[1] || cols[0]);
      setGbGroupCol(cols[0]);
      setGbAggCol(numCols[0] || cols[0]);
    }
  }, [activeLayer?.id]);

  // Auto-suggest Join columns when right layer changes
  useEffect(() => {
    if (!activeLayer || !joinRightLayerId) return;
    api
      .suggestJoin({ project_id: projectId, left_layer_id: activeLayer.id, right_layer_id: joinRightLayerId })
      .then((sug) => {
        setJoinLeftKey(sug.left_key);
        setJoinRightKey(sug.right_key);
      })
      .catch(() => {});
  }, [joinRightLayerId, activeLayer?.id]);

  const handleRunQueryBuilder = async () => {
    if (!activeLayer) return;
    try {
      const res = await api.selectFeatures(
        activeLayer.id,
        {
          mode: 'attribute',
          rules: qbRules,
          logic: qbLogic,
          sql_where: mode === 'lanjut' && sqlWhere.trim() ? sqlWhere : undefined,
        },
        projectId
      );
      setLayerSelection(activeLayer.id, res.fids, 'query');
      addToast({
        type: 'success',
        title: `Ditemukan ${res.count} fitur yang memenuhi syarat`,
      });
      setActiveDialog('none');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Filter belum berhasil', message: err.message });
    }
  };

  const handleRunCalculator = async (previewOnly: boolean) => {
    if (!activeLayer) return;
    try {
      const res = await api.calculateField(
        activeLayer.id,
        {
          target_column: calcColName,
          mode: calcMode,
          template: calcTemplate,
          param_col_a: calcColA,
          param_col_b: calcColB,
          sql_expr: calcSqlExpr,
          preview_only: previewOnly,
        },
        projectId
      );
      setCalcPreview(res.preview_rows || []);
      if (!previewOnly) {
        await refreshLayers();
        await fetchTableData();
        addToast({ type: 'success', title: `Kolom '${calcColName}' berhasil dihitung!` });
        setActiveDialog('none');
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Kalkulator kolom gagal', message: err.message });
    }
  };

  const handleRunJoin = async (previewOnly: boolean) => {
    if (!activeLayer || !joinRightLayerId) return;
    try {
      const res = await api.runJoin({
        project_id: projectId,
        left_layer_id: activeLayer.id,
        right_layer_id: joinRightLayerId,
        left_key: joinLeftKey,
        right_key: joinRightKey,
        normalize_text: joinNormalize,
        preview_only: previewOnly,
      });
      setJoinPreview(res);
      if (!previewOnly && res.layer) {
        await refreshLayers();
        setActiveLayerId(res.layer.id);
        addToast({
          type: 'success',
          title: `Join Tabel Berhasil (${res.matched_count}/${res.total_left} cocok)`,
          message: `Layer baru '${res.layer.name}' telah dibuat.`,
        });
        setActiveDialog('none');
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Join tabel gagal', message: err.message });
    }
  };

  const handleRunGroupBy = async () => {
    if (!activeLayer) return;
    try {
      const saved = await api.groupByLayer(
        activeLayer.id,
        {
          group_column: gbGroupCol,
          agg_column: gbAggCol,
          agg_func: gbAggFunc,
          dissolve_geometry: true,
        },
        projectId
      );
      await refreshLayers();
      setActiveLayerId(saved.id);
      addToast({ type: 'success', title: `Ringkasan per '${gbGroupCol}' berhasil dibuat!` });
      setActiveDialog('none');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal meringkas data', message: err.message });
    }
  };

  if (!activeLayer) {
    return <div className="p-6 text-sm text-slate-500">Pilih layer terlebih dahulu untuk melihat tabel atribut.</div>;
  }

  const columns = activeLayer.schema.map((s) => s.name);

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-800 text-xs">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
        <div className="flex flex-wrap items-center gap-2">
          {/* Layer Switcher */}
          <div className="flex items-center gap-1.5">
            <span className="font-normal text-slate-500">Tabel:</span>
            <select
              value={activeLayer.id}
              onChange={(e) => {
                setActiveLayerId(e.target.value);
                setOffset(0);
              }}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-normal"
            >
              {layers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.feature_count})
                </option>
              ))}
            </select>
          </div>

          {/* Fast Text Filter */}
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setOffset(0);
              }}
              placeholder="Cari teks di semua kolom..."
              className="pl-7 pr-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 w-48 focus:outline-none focus:border-teal-600"
            />
          </div>

          {/* Toggle Show Selected Only */}
          <label className="flex items-center gap-1.5 px-2 py-1 rounded bg-orange-50 dark:bg-orange-950/50 border border-orange-200 dark:border-orange-800 cursor-pointer font-medium text-orange-900 dark:text-orange-300">
            <input
              type="checkbox"
              checked={onlySelected}
              onChange={(e) => {
                setOnlySelected(e.target.checked);
                setOffset(0);
              }}
              className="rounded accent-orange-600"
            />
            <span>Terpilih saja ({selectedFids.length})</span>
          </label>
        </div>

        {/* Tabular Power Tools */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveDialog(activeDialog === 'query_builder' ? 'none' : 'query_builder')}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 font-medium"
          >
            <Filter className="w-3.5 h-3.5 text-teal-700" />
            <span>Pilih dengan Syarat</span>
          </button>

          <button
            onClick={() => setActiveDialog(activeDialog === 'calculator' ? 'none' : 'calculator')}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 font-medium"
          >
            <Calculator className="w-3.5 h-3.5 text-teal-600" />
            <span>Kalkulator Kolom</span>
          </button>

          <button
            onClick={() => {
              const firstTable = layers.find((l) => l.id !== activeLayer.id);
              if (firstTable) setJoinRightLayerId(firstTable.id);
              setActiveDialog(activeDialog === 'join_wizard' ? 'none' : 'join_wizard');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 font-medium"
          >
            <GitMerge className="w-3.5 h-3.5 text-teal-700" />
            <span>Join Tabel</span>
          </button>

          <button
            onClick={() => setActiveDialog(activeDialog === 'groupby' ? 'none' : 'groupby')}
            className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 hover:bg-slate-100 font-medium"
          >
            <Layers className="w-3.5 h-3.5 text-orange-600" />
            <span>Ringkas (Group By)</span>
          </button>

          <button
            onClick={async () => {
              const res = await api.exportResource({
                project_id: projectId,
                export_type: 'layer',
                layer_id: activeLayer.id,
                format: 'xlsx',
                only_selected_fids: onlySelected && selectedFids.length > 0 ? selectedFids : undefined,
              });
              window.open(res.download_url, '_blank');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-orange-600 text-white font-medium hover:bg-orange-700"
            title="Unduh Excel (.xlsx) rapi per kolom"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>

          <button
            onClick={async () => {
              const res = await api.exportResource({
                project_id: projectId,
                export_type: 'layer',
                layer_id: activeLayer.id,
                format: 'csv',
                csv_delimiter: ';',
                only_selected_fids: onlySelected && selectedFids.length > 0 ? selectedFids : undefined,
              });
              window.open(res.download_url, '_blank');
            }}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-700 text-white font-medium hover:bg-teal-800"
            title="Unduh CSV pemisah titik koma (;) siap buka di Excel Indonesia"
          >
            <Download className="w-3.5 h-3.5" />
            <span>CSV (;)</span>
          </button>
        </div>
      </div>

      {/* Expandable Tool Panels (Visual Query Builder / Field Calculator / 3-Step Join Wizard / Group By) */}
      {activeDialog === 'query_builder' && (
        <div className="p-3 bg-teal-50/70 dark:bg-slate-900 border-b border-teal-200 dark:border-slate-700 space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="font-normal text-teal-900 dark:text-teal-300">
               Pembuat Syarat Visual (Pilih Fitur Berdasarkan Atribut)
            </h4>
            <button onClick={() => setActiveDialog('none')} aria-label="Tutup Panel" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          {qbRules.map((rule, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              {idx > 0 && (
                <select
                  value={qbLogic}
                  onChange={(e) => setQbLogic(e.target.value as any)}
                  className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-normal"
                >
                  <option value="AND">DAN (AND)</option>
                  <option value="OR">ATAU (OR)</option>
                </select>
              )}
              <select
                value={rule.column}
                onChange={(e) => {
                  const next = [...qbRules];
                  next[idx].column = e.target.value;
                  setQbRules(next);
                }}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select
                value={rule.operator}
                onChange={(e) => {
                  const next = [...qbRules];
                  next[idx].operator = e.target.value;
                  setQbRules(next);
                }}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="gt">lebih dari (&gt;)</option>
                <option value="gte">minimal (&ge;)</option>
                <option value="lt">kurang dari (&lt;)</option>
                <option value="eq">sama dengan (=)</option>
                <option value="contains">mengandung teks</option>
                <option value="in">termasuk dalam daftar (pisahkan koma)</option>
              </select>
              <input
                type="text"
                value={rule.value}
                onChange={(e) => {
                  const next = [...qbRules];
                  next[idx].value = e.target.value;
                  setQbRules(next);
                }}
                placeholder="Nilai..."
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 w-44"
              />
            </div>
          ))}
          {mode === 'lanjut' && (
            <div className="pt-1">
              <label className="block text-[11px] font-normal text-slate-600 mb-0.5">
                Mode Lanjut — Atau tulis klausa SQL WHERE DuckDB langsung:
              </label>
              <input
                type="text"
                value={sqlWhere}
                onChange={(e) => setSqlWhere(e.target.value)}
                placeholder="Contoh: penduduk > 100000 AND wilayah = 'Timur'"
                className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
              />
            </div>
          )}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={() =>
                setQbRules([...qbRules, { column: columns[0] || '', operator: 'eq', value: '' }])
              }
              className="px-2.5 py-1 rounded border border-teal-300 bg-white dark:bg-slate-800 text-teal-800 font-medium"
            >
              + Tambah Syarat
            </button>
            <button
              onClick={handleRunQueryBuilder}
              className="px-3.5 py-1 rounded bg-teal-700 text-white font-normal hover:bg-teal-800"
            >
              Pilih Fitur yang Cocok
            </button>
          </div>
        </div>
      )}

      {activeDialog === 'calculator' && (
        <div className="p-3 bg-teal-50/70 dark:bg-slate-900 border-b border-teal-200 dark:border-slate-700 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-normal text-teal-900 dark:text-teal-300">
               Kalkulator Kolom (Field Calculator)
            </h4>
            <button onClick={() => setActiveDialog('none')} aria-label="Tutup Panel" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <label className="block text-[11px] font-normal mb-0.5">Nama Kolom Baru / Tujuan</label>
              <input
                type="text"
                value={calcColName}
                onChange={(e) => setCalcColName(e.target.value)}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 w-40"
              />
            </div>
            <div>
              <label className="block text-[11px] font-normal mb-0.5">Mode Rumus</label>
              <select
                value={calcMode}
                onChange={(e) => setCalcMode(e.target.value as any)}
                className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="template">Template Siap Pakai (Pemula)</option>
                <option value="sql">Ekspresi SQL DuckDB (Mode Lanjut)</option>
              </select>
            </div>

            {calcMode === 'template' ? (
              <>
                <div>
                  <label className="block text-[11px] font-normal mb-0.5">Pilih Template</label>
                  <select
                    value={calcTemplate}
                    onChange={(e) => setCalcTemplate(e.target.value)}
                    className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                  >
                    <option value="area_km2">Luas Wilayah (km² — UTM Otomatis)</option>
                    <option value="length_km">Panjang Garis/Keliling (km)</option>
                    <option value="density">Kepadatan = Kolom A / Luas km²</option>
                    <option value="percentage">Persentase (%) dari Total Kolom A</option>
                    <option value="categorize">Kategori (Rendah / Sedang / Tinggi) dari Kolom A</option>
                    <option value="centroid_x">Koordinat Bujur (Longitude Centroid)</option>
                    <option value="centroid_y">Koordinat Lintang (Latitude Centroid)</option>
                  </select>
                </div>
                {['density', 'percentage', 'categorize'].includes(calcTemplate) && (
                  <div>
                    <label className="block text-[11px] font-normal mb-0.5">Kolom A</label>
                    <select
                      value={calcColA}
                      onChange={(e) => setCalcColA(e.target.value)}
                      className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    >
                      {columns.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            ) : (
              <div className="flex-1 min-w-[240px]">
                <label className="block text-[11px] font-normal mb-0.5">Ekspresi SQL DuckDB</label>
                <input
                  type="text"
                  value={calcSqlExpr}
                  onChange={(e) => setCalcSqlExpr(e.target.value)}
                  placeholder="Contoh: ROUND(penduduk / luas_km2, 1)"
                  className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 font-mono"
                />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunCalculator(true)}
              className="px-3 py-1 rounded border border-teal-500/60 bg-white dark:bg-slate-800 text-teal-800 dark:text-teal-300 font-medium"
            >
              Pratinjau 5 Baris
            </button>
            <button
              onClick={() => handleRunCalculator(false)}
              className="px-3.5 py-1 rounded bg-teal-700 text-white font-normal hover:bg-teal-800"
            >
              ▶ Hitung & Simpan Kolom
            </button>
          </div>
          {calcPreview.length > 0 && (
            <div className="text-[11px] bg-white dark:bg-slate-800 p-2 rounded border border-teal-200 dark:border-teal-900">
              <b>Pratinjau 5 baris pertama untuk '{calcColName}':</b>{' '}
              {calcPreview.map((r, i) => (
                <span key={i} className="inline-block mr-3 px-1.5 py-0.5 rounded bg-teal-50 dark:bg-slate-700 tabular-nums">
                  #{r._fid}: <b>{String(r[calcColName])}</b>
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {activeDialog === 'join_wizard' && (
        <div className="p-3 bg-teal-50/70 dark:bg-slate-900 border-b border-teal-200 dark:border-slate-700 space-y-2.5">
          <div className="flex items-center justify-between">
            <h4 className="font-normal text-teal-900 dark:text-teal-300">
               Wizard Join Tabel 3-Langkah (Gabungkan CSV/Excel ke Peta)
            </h4>
            <button onClick={() => setActiveDialog('none')} aria-label="Tutup Panel" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 items-end">
            <div>
              <label className="block text-[11px] font-normal mb-0.5">① Tabel / Layer Sumber</label>
              <select
                value={joinRightLayerId}
                onChange={(e) => setJoinRightLayerId(e.target.value)}
                className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                <option value="">-- Pilih Tabel --</option>
                {layers
                  .filter((l) => l.id !== activeLayer.id)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.feature_count} baris)
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-normal mb-0.5">② Kolom Kunci di {activeLayer.name}</label>
              <select
                value={joinLeftKey}
                onChange={(e) => setJoinLeftKey(e.target.value)}
                className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                {columns.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-normal mb-0.5">② Kolom Kunci di Tabel Sumber</label>
              <select
                value={joinRightKey}
                onChange={(e) => setJoinRightKey(e.target.value)}
                className="w-full px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              >
                {(layers.find((l) => l.id === joinRightLayerId)?.schema || []).map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-1.5 py-1 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={joinNormalize}
                onChange={(e) => setJoinNormalize(e.target.checked)}
                className="rounded accent-teal-700"
              />
              <span>Normalisasi teks (abaikan spasi & huruf besar/kecil)</span>
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleRunJoin(true)}
              className="px-3 py-1 rounded border border-teal-400 bg-white dark:bg-slate-800 text-teal-800 font-medium"
            >
              ③ Cek Kecocokan Data
            </button>
            <button
              onClick={() => handleRunJoin(false)}
              className="px-3.5 py-1 rounded bg-teal-700 text-white font-normal hover:bg-teal-800"
            >
              ▶ Gabungkan & Buat Layer Baru
            </button>
          </div>
          {joinPreview && (
            <div className="p-2.5 rounded bg-white dark:bg-slate-800 border border-teal-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  <b>{joinPreview.matched_count}</b> dari <b>{joinPreview.total_left}</b> baris cocok ({joinPreview.match_rate_pct}%).
                </span>
                {joinPreview.unmatched_examples?.length > 0 && (
                  <span className="text-orange-700">
                    Contoh belum cocok:{' '}
                    {joinPreview.unmatched_examples.map((u: any) => `'${u.left_value}' vs '${u.suggested_right}'`).join(', ')}
                  </span>
                )}
              </div>
              {!joinNormalize && joinPreview.unmatched_count > 0 && (
                <button
                  onClick={() => {
                    setJoinNormalize(true);
                    setTimeout(() => handleRunJoin(true), 50);
                  }}
                  className="px-2.5 py-1 rounded bg-orange-100 text-orange-900 font-normal flex items-center gap-1"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Aktifkan Normalisasi Otomatis
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeDialog === 'groupby' && (
        <div className="p-3 bg-orange-50/70 dark:bg-slate-900 border-b border-orange-200 dark:border-slate-700 flex flex-wrap items-end gap-3">
          <div>
            <label className="block text-[11px] font-normal mb-0.5">Kelompokkan per Kolom</label>
            <select
              value={gbGroupCol}
              onChange={(e) => setGbGroupCol(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-normal mb-0.5">Kolom yang Diringkas</label>
            <select
              value={gbAggCol}
              onChange={(e) => setGbAggCol(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              {columns.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-normal mb-0.5">Fungsi Ringkasan</label>
            <select
              value={gbAggFunc}
              onChange={(e) => setGbAggFunc(e.target.value)}
              className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
            >
              <option value="sum">Jumlah Total (SUM)</option>
              <option value="mean">Rata-rata (MEAN)</option>
              <option value="count">Banyak Baris (COUNT)</option>
              <option value="min">Nilai Terkecil (MIN)</option>
              <option value="max">Nilai Terbesar (MAX)</option>
            </select>
          </div>
          <button
            onClick={handleRunGroupBy}
            className="px-3.5 py-1 rounded bg-orange-600 text-white font-normal hover:bg-orange-700"
          >
            ▶ Buat Layer Ringkasan
          </button>
        </div>
      )}

      {/* Virtualized / Paginated Attribute Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-left">
          <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-700/95 border-b border-slate-200 dark:border-slate-600">
            <tr>
              <th className="py-2 px-3 w-10 text-center font-normal text-slate-500">Pilih</th>
              {columns.map((col) => (
                <th
                  key={col}
                  onClick={() => {
                    if (sortCol === col) {
                      setSortDesc(!sortDesc);
                    } else {
                      setSortCol(col);
                      setSortDesc(false);
                    }
                  }}
                  className="py-2 px-3 font-normal text-slate-700 dark:text-slate-200 cursor-pointer hover:bg-slate-200/70 dark:hover:bg-slate-600 whitespace-nowrap select-none"
                >
                  <div className="flex items-center gap-1">
                    <span>{col}</span>
                    <ArrowDownUp className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
            {rows.map((row) => {
              const fid = Number(row._fid);
              const isSelected = selectedFids.includes(fid);
              return (
                <tr
                  key={fid}
                  onClick={(e) => toggleFeatureSelection(activeLayer.id, fid, e.shiftKey || e.ctrlKey)}
                  className={`cursor-pointer transition ${
 isSelected
 ? 'bg-orange-100/80 dark:bg-orange-900/40 font-medium'
 : 'hover:bg-teal-50/40 dark:hover:bg-slate-700/40'
 }`}
                >
                  <td className="py-1.5 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {}}
                      className="rounded accent-orange-600 pointer-events-none"
                    />
                  </td>
                  {columns.map((col) => {
                    const val = row[col];
                    const isNum = typeof val === 'number';
                    return (
                      <td
                        key={col}
                        className={`py-1.5 px-3 whitespace-nowrap ${
 isNum ? 'tabular-nums text-right font-medium' : ''
 }`}
                      >
                        {isNum ? formatNumber(val) : String(val ?? '—')}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Table Footer Pagination */}
      <div className="flex items-center justify-between px-3 py-1.5 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-[11px] text-slate-500">
        <div>
          Menampilkan <b>{rows.length}</b> dari <b>{formatNumber(filteredRows)}</b> baris (Total: {formatNumber(totalRows)}) ·{' '}
          <span className="text-orange-700 dark:text-orange-400 font-normal">{selectedFids.length} terpilih</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            disabled={offset === 0}
            onClick={() => setOffset(Math.max(0, offset - limit))}
            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"
          >
            ← Sebelumnya
          </button>
          <span className="tabular-nums">
            Hal {Math.floor(offset / limit) + 1} / {Math.max(1, Math.ceil(filteredRows / limit))}
          </span>
          <button
            disabled={offset + limit >= filteredRows}
            onClick={() => setOffset(offset + limit)}
            className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 disabled:opacity-40"
          >
            Berikutnya →
          </button>
        </div>
      </div>
    </div>
  );
};


// --- Module: pages/HomePage.tsx ---





const HomePage: React.FC = () => {
  const {
    projects,
    projectId,
    health,
    setActiveTab,
    setSelectedToolId,
    loadProject,
    refreshLayers,
    addToast,
    setTourOpen,
  } = usePetaStore();

  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjName.trim()) return;
    try {
      const created = await api.createProject({ name: newProjName, description: newProjDesc });
      setNewProjName('');
      setNewProjDesc('');
      setCreating(false);
      await loadProject(created.id);
      await refreshLayers();
      addToast({ type: 'success', title: `Proyek '${created.name}' berhasil dibuat!` });
      setActiveTab('data');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal membuat proyek', message: err.message });
    }
  };

  const handleSeedSample = async () => {
    try {
      const proj = await api.seedSampleProject();
      await loadProject(proj.id);
      addToast({
        type: 'success',
        title: 'Proyek Contoh Surabaya Siap!',
        message: '6 layer contoh (Kecamatan, Sekolah, Zona Banjir, Jalan, Raster DEM/Citra, Tabel Ekonomi) telah dimuat.',
      });
      setActiveTab('map');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal memuat data contoh', message: err.message });
    }
  };

  const recipes = [
    {
      title: 'Membuat peta tematik (Choropleth) dari data wilayah',
      desc: 'Warnai poligon kecamatan berdasarkan kepadatan penduduk atau kerawanan banjir.',
      icon: Layers,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400',
      action: () => setActiveTab('map'),
    },
    {
      title: 'Menggabungkan tabel Excel/CSV ke peta wilayah',
      desc: 'Gunakan Wizard Join 3-langkah dengan pencocokan nama & normalisasi ejaan otomatis.',
      icon: FileSpreadsheet,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-400',
      action: () => setActiveTab('table'),
    },
    {
      title: 'Menghitung jumlah titik fasilitas per wilayah',
      desc: 'Hitung berapa sekolah di tiap kecamatan beserta kepadatannya per km².',
      icon: MapPin,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
      action: () => {
        setSelectedToolId('analysis.count_points');
        setActiveTab('process');
      },
    },
    {
      title: 'Membuat zona jangkauan (Buffer) & mencari yang terdekat',
      desc: 'Buat radius 500 meter di sekitar sekolah atau cari jalan utama terdekat.',
      icon: Wand2,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400',
      action: () => {
        setSelectedToolId('vector.buffer');
        setActiveTab('process');
      },
    },
    {
      title: 'Menghitung Indeks Kehijauan (NDVI) & Kemiringan DEM',
      desc: 'Olah citra satelit multi-band dan raster ketinggian menjadi peta NDVI atau Slope.',
      icon: Activity,
      color: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400',
      action: () => {
        setSelectedToolId('raster.index');
        setActiveTab('process');
      },
    },
    {
      title: 'Memprediksi suhu / kerawanan di peta (Spatial ML)',
      desc: 'Latih Random Forest / Gradient Boosting dengan Spatial Block Cross-Validation.',
      icon: Sparkles,
      color: 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400',
      action: () => setActiveTab('model'),
    },
  ];

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto">
      {/* Minimalist Architectural Hero Banner (Flat Deep Tosca + Crisp Orange Accent, Zero Glow) */}
      <div className="rounded-md bg-slate-900 dark:bg-slate-800 text-white p-6 border border-slate-700 border-t-2 border-t-teal-600 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-sm bg-orange-500/15 border border-orange-500/35 text-orange-300 text-[11px] font-normal">
            <span>Local-First Web GIS &amp; Spatial Machine Learning</span>
          </div>
          <h1 className="text-2xl font-medium tracking-tight">
            Selamat Datang di <span className="text-teal-400">PetaLab</span>
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Lingkungan analisis geospasial lokal berbasis browser dengan mesin Python (GeoPandas, DuckDB, Raster Engine, Google Earth Engine, dan Scikit-learn) secara non-destruktif.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            onClick={handleSeedSample}
            className="flex items-center gap-2 px-4 py-2 rounded bg-teal-700 hover:bg-teal-600 text-white font-normal text-xs transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Coba Data Contoh Surabaya</span>
          </button>
          <button
            onClick={() => setCreating(!creating)}
            className="flex items-center gap-2 px-4 py-2 rounded bg-orange-600 hover:bg-orange-500 text-white font-normal text-xs transition"
          >
            <FolderPlus className="w-3.5 h-3.5" />
            <span>+ Proyek Baru</span>
          </button>
          <button
            onClick={() => setTourOpen(true)}
            className="px-3.5 py-2 rounded bg-transparent hover:bg-slate-700/60 text-slate-200 text-xs border border-slate-600 transition"
          >
            Tur 5 Langkah
          </button>
        </div>
      </div>

      {/* Create New Project Modal Inline */}
      {creating && (
        <form
          onSubmit={handleCreateProject}
          className="p-4 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-slate-700 flex flex-wrap items-end gap-3 text-xs"
        >
          <div className="flex-1 min-w-[200px]">
            <label className="block font-normal mb-1">Nama Proyek Baru</label>
            <input
              type="text"
              required
              value={newProjName}
              onChange={(e) => setNewProjName(e.target.value)}
              placeholder="Contoh: Analisis Tata Ruang Malang"
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
          </div>
          <div className="flex-1 min-w-[240px]">
            <label className="block font-normal mb-1">Deskripsi Singkat</label>
            <input
              type="text"
              value={newProjDesc}
              onChange={(e) => setNewProjDesc(e.target.value)}
              placeholder="Catatan tujuan proyek..."
              className="w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 rounded bg-teal-700 text-white font-normal hover:bg-teal-800"
          >
            Buat & Buka Proyek
          </button>
        </form>
      )}

      {/* Daftar Proyek */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-normal text-slate-800 dark:text-slate-100"> Proyek Tersimpan di Workspace Lokal</h2>
          <span className="text-xs text-slate-500">Satu proyek = satu folder mandiri (mudah di-zip & dipindah)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {projects.map((p) => {
            const isCurrent = p.id === projectId;
            return (
              <div
                key={p.id}
                onClick={async () => {
                  await loadProject(p.id);
                  setActiveTab('map');
                }}
                className={`p-4 rounded-md border transition cursor-pointer flex flex-col justify-between ${
 isCurrent
 ? 'border-teal-700 bg-teal-50/40 dark:bg-teal-950/30 shadow-sm'
 : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-teal-400'
 }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                      {p.id}
                    </span>
                    {isCurrent && (
                      <span className="text-[11px] font-normal px-2 py-0.5 rounded-sm bg-teal-700 text-white">
                        Aktif
                      </span>
                    )}
                  </div>
                  <h3 className="font-normal text-sm text-slate-900 dark:text-slate-100">{p.name}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                    {p.description || 'Proyek analisis spasial lokal.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs text-slate-500">
                  <span>
                    <b>{p.layer_count ?? 0}</b> layer · <b>{p.model_count ?? 0}</b> model
                  </span>
                  <span className="tabular-nums">{formatBytes(p.size_bytes)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* "Apa yang ingin kamu lakukan?" (Resep / Wizard Pemula) */}
      <div className="space-y-3">
        <h2 className="text-base font-normal text-slate-800 dark:text-slate-100">
           Apa yang ingin kamu lakukan? (Resep Cepat Pemula)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {recipes.map((r, i) => {
            const Icon = r.icon;
            return (
              <button
                key={i}
                onClick={r.action}
                className="text-left p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-teal-600 hover: transition group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className={`w-9 h-9 rounded flex items-center justify-center ${r.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-normal text-xs text-slate-900 dark:text-slate-100 group-hover:text-teal-700">
                    {r.title}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{r.desc}</p>
                </div>
                <div className="mt-3 flex items-center gap-1 text-[11px] font-normal text-teal-700">
                  <span>Mulai sekarang</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition" />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Compact System Status Link (Full Diagnostics live exclusively in Pengaturan to avoid duplication) */}
      {health && (
        <div className="px-4 py-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Mesin Spasial Lokal Aktif · Python v{health.python_version} · Ruang Disk Bebas{' '}
              <b className="tabular-nums">{health.disk_free_gb} GB</b>
            </span>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="text-teal-700 hover:underline flex items-center gap-1"
          >
            <span>Lihat Diagnostik Paket &amp; GEE di Pengaturan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};


// --- Module: pages/DashboardPage.tsx ---






const DashboardPage: React.FC = () => {
  const {
    projectId,
    layers,
    activeLayerId,
    selectionsByLayer,
    models,
    theme,
    setActiveLayerId,
    setLayerSelection,
    clearLayerSelection,
    addToast,
  } = usePetaStore();

  const activeLayer =
    layers.find((l) => l.id === activeLayerId && l.kind !== 'raster') ||
    layers.find((l) => l.kind === 'vector') ||
    layers[0] ||
    null;

  const selectedFids = (activeLayer && selectionsByLayer[activeLayer.id]) || [];

  const [stats, setStats] = useState<any | null>(null);
  const [numCol, setNumCol] = useState<string>('');
  const [catCol, setCatCol] = useState<string>('');
  const [scatterX, setScatterX] = useState<string>('');
  const [scatterY, setScatterY] = useState<string>('');
  const [labelCol, setLabelCol] = useState<string>('');
  const [rankMode, setRankMode] = useState<'top' | 'bottom'>('top');

  const segBarChartRef = useRef<HTMLDivElement | null>(null);
  const boxChartRef = useRef<HTMLDivElement | null>(null);
  const spatialMapRef = useRef<HTMLDivElement | null>(null);
  const corrMatrixRef = useRef<HTMLDivElement | null>(null);
  const barChartRef = useRef<HTMLDivElement | null>(null);
  const histChartRef = useRef<HTMLDivElement | null>(null);
  const pieChartRef = useRef<HTMLDivElement | null>(null);
  const scatterChartRef = useRef<HTMLDivElement | null>(null);

  // Reset column selections whenever active layer switches so backend smart defaults kick in
  useEffect(() => {
    setNumCol('');
    setCatCol('');
    setScatterX('');
    setScatterY('');
    setLabelCol('');
  }, [activeLayer?.id]);

  // Dispose ECharts instances cleanly when unmounting DashboardPage
  useEffect(() => {
    return () => {
      [
        segBarChartRef,
        boxChartRef,
        spatialMapRef,
        corrMatrixRef,
        barChartRef,
        histChartRef,
        pieChartRef,
        scatterChartRef,
      ].forEach((ref) => {
        if (ref.current) {
          echarts.getInstanceByDom(ref.current)?.dispose();
        }
      });
    };
  }, []);

  useEffect(() => {
    if (!activeLayer) return;
    let cancelled = false;
    const validCols = new Set((activeLayer.schema || []).map((s) => s.name));
    const safeNum = numCol && validCols.has(numCol) ? numCol : undefined;
    const safeCat = catCol && validCols.has(catCol) ? catCol : undefined;
    const safeSX = scatterX && validCols.has(scatterX) ? scatterX : undefined;
    const safeSY = scatterY && validCols.has(scatterY) ? scatterY : undefined;
    const safeLbl = labelCol && validCols.has(labelCol) ? labelCol : undefined;
    api
      .getLayerStats(activeLayer.id, {
        fids: selectedFids,
        column: safeNum,
        cat_col: safeCat,
        scatter_x: safeSX,
        scatter_y: safeSY,
        label_col: safeLbl,
        project_id: projectId,
      })
      .then((res) => {
        if (cancelled) return;
        setStats(res);
        if (!safeNum && res.histogram?.column) setNumCol(res.histogram.column);
        if (!safeCat && res.pie?.column) setCatCol(res.pie.column);
        if (!safeSX && res.scatter?.x_col) setScatterX(res.scatter.x_col);
        if (!safeSY && res.scatter?.y_col) setScatterY(res.scatter.y_col);
      })
      .catch((err) => {
        if (cancelled) return;
        addToast({ type: 'error', title: 'Gagal memuat statistik dashboard', message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [activeLayer?.id, selectedFids.join(','), numCol, catCol, scatterX, scatterY, labelCol, projectId]);

  // Render all 8 dark/light theme-aware interactive ECharts widgets with Cross-Filter click handlers
  useEffect(() => {
    if (!stats || !activeLayer) return;

    const isDark = theme === 'dark';
    const textCol = isDark ? '#d8e4e6' : '#1e2f33';
    const subTextCol = isDark ? '#7f999c' : '#5a7478';
    const gridLineCol = isDark ? 'rgba(127,153,156,0.14)' : 'rgba(90,116,120,0.2)';
    const axisLineCol = isDark ? '#243438' : '#cbd5d6';
    const tooltipStyle = {
      backgroundColor: isDark ? '#0b1214' : '#ffffff',
      borderColor: isDark ? '#243438' : '#d3dfdf',
      textStyle: { color: isDark ? '#e6f0f0' : '#131d20', fontSize: 11 },
    };

    const instances: echarts.ECharts[] = [];
    const initChart = (el: HTMLDivElement | null) => {
      if (!el) return null;
      const inst = echarts.getInstanceByDom(el) || echarts.init(el);
      instances.push(inst);
      return inst;
    };

    // 1. Segment Comparative Bar + Mean Line Chart
    const segRows: any[] = stats.segment_breakdown?.rows || [];
    if (segBarChartRef.current && segRows.length > 0) {
      const ch = initChart(segBarChartRef.current)!;
      const hasMean = segRows.some((r) => r.mean !== undefined);
      ch.setOption(
        {
          tooltip: { trigger: 'axis', ...tooltipStyle },
          legend: {
            data: hasMean ? ['Jumlah Fitur', `Rata-rata ${stats.segment_breakdown?.metric || ''}`] : ['Jumlah Fitur'],
            top: 0,
            textStyle: { color: textCol, fontSize: 11 },
          },
          grid: { left: 42, right: hasMean ? 48 : 18, top: 34, bottom: 52 },
          xAxis: {
            type: 'category',
            data: segRows.map((r) => r.segment),
            axisLabel: { color: subTextCol, fontSize: 10, rotate: 16, width: 92, overflow: 'truncate' },
            axisLine: { lineStyle: { color: axisLineCol } },
          },
          yAxis: [
            {
              type: 'value',
              name: 'Fitur',
              nameTextStyle: { color: subTextCol, fontSize: 10 },
              axisLabel: { color: subTextCol, fontSize: 10 },
              splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
            },
            ...(hasMean
              ? [
                  {
                    type: 'value',
                    name: 'Rata2',
                    nameTextStyle: { color: subTextCol, fontSize: 10 },
                    axisLabel: { color: subTextCol, fontSize: 10 },
                    splitLine: { show: false },
                  },
                ]
              : []),
          ],
          series: [
            {
              name: 'Jumlah Fitur',
              type: 'bar',
              barMaxWidth: 36,
              data: segRows.map((r, i) => ({
                value: r.count,
                fids: r.fids,
                itemStyle: {
                  color: r.selected_count > 0 ? '#f97316' : '#0f766e',
                  borderRadius: [2, 2, 0, 0],
                },
              })),
            },
            ...(hasMean
              ? [
                  {
                    name: `Rata-rata ${stats.segment_breakdown?.metric || ''}`,
                    type: 'line',
                    yAxisIndex: 1,
                    smooth: true,
                    symbolSize: 8,
                    data: segRows.map((r) => r.mean ?? 0),
                    lineStyle: { color: '#f97316', width: 2.5 },
                    itemStyle: { color: '#f97316' },
                  },
                ]
              : []),
          ],
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fids: number[] = params.data?.fids || segRows[params.dataIndex]?.fids || [];
        if (fids.length > 0) setLayerSelection(activeLayer.id, fids, 'chart');
      });
    }

    // 2. Box Plot Distribusi Nilai per Segmen
    const boxRows = segRows.filter((r) => Array.isArray(r.boxplot) && r.boxplot.length === 5);
    if (boxChartRef.current && boxRows.length > 0) {
      const ch = initChart(boxChartRef.current)!;
      ch.setOption(
        {
          tooltip: {
            trigger: 'item',
            ...tooltipStyle,
            formatter: (p: any) => {
              const v = p.value || [];
              return `<b>${p.name}</b><br/>Max: ${v[5]}<br/>Q3: ${v[4]}<br/>Median: ${v[3]}<br/>Q1: ${v[2]}<br/>Min: ${v[1]}`;
            },
          },
          grid: { left: 46, right: 18, top: 20, bottom: 52 },
          xAxis: {
            type: 'category',
            data: boxRows.map((r) => r.segment),
            axisLabel: { color: subTextCol, fontSize: 10, rotate: 16, width: 92, overflow: 'truncate' },
            axisLine: { lineStyle: { color: axisLineCol } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
          },
          series: [
            {
              name: stats.segment_breakdown?.metric || 'Distribusi',
              type: 'boxplot',
              data: boxRows.map((r, i) => ({
                value: r.boxplot,
                fids: r.fids,
                itemStyle: {
                  color: isDark ? 'rgba(15,118,110,0.24)' : 'rgba(15,118,110,0.14)',
                  borderColor: i % 2 === 0 ? '#14b8a6' : '#f97316',
                  borderWidth: 1.5,
                },
              })),
            },
          ],
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fids: number[] = params.data?.fids || boxRows[params.dataIndex]?.fids || [];
        if (fids.length > 0) setLayerSelection(activeLayer.id, fids, 'chart');
      });
    }

    // 3. 2D Spatial Distribution Map Plot (Long x Lat colored by Segment, sized by Metric + Mean Center)
    const spPts: any[] = stats.spatial_scatter?.points || [];
    const spSegs: string[] = stats.spatial_scatter?.segments || [];
    if (spatialMapRef.current && spPts.length > 0) {
      const ch = initChart(spatialMapRef.current)!;
      const vals = spPts.map((p) => p.value);
      const vmin = Math.min(...vals);
      const vmax = Math.max(...vals);
      const seriesList: any[] = spSegs.map((seg, idx) => ({
        name: seg,
        type: 'scatter',
        symbolSize: (d: any) => {
          const val = d[2] ?? vmin;
          if (vmax <= vmin) return 9;
          return 7 + ((val - vmin) / (vmax - vmin)) * 13;
        },
        itemStyle: {
          color: COLOR_PALETTES.categorical[idx % COLOR_PALETTES.categorical.length],
          opacity: 0.85,
          borderColor: isDark ? '#0b1214' : '#ffffff',
          borderWidth: 1,
        },
        data: spPts
          .filter((p) => p.segment === seg)
          .map((p) => ({
            value: [p.lon, p.lat, p.value],
            fid: p.fid,
            label: p.label,
            itemStyle: p.selected ? { color: '#f97316', borderColor: '#0b1214', borderWidth: 2 } : undefined,
          })),
      }));
      if (stats.spatial_scatter?.mean_center) {
        seriesList.push({
          name: 'Pusat Sebaran (Mean Center)',
          type: 'scatter',
          symbol: 'diamond',
          symbolSize: 15,
          itemStyle: { color: '#ea580c', borderColor: '#ffffff', borderWidth: 1.5 },
          data: [{ value: [...stats.spatial_scatter.mean_center, 0], label: 'Mean Center' }],
        });
      }
      ch.setOption(
        {
          tooltip: {
            trigger: 'item',
            ...tooltipStyle,
            formatter: (p: any) =>
              `<b>${p.seriesName}</b><br/>${p.data?.label || ''}<br/>Long: ${p.value[0]} · Lat: ${p.value[1]}<br/>${numCol || 'Nilai'}: ${p.value[2]}`,
          },
          legend: {
            type: 'scroll',
            top: 0,
            textStyle: { color: textCol, fontSize: 10 },
            pageTextStyle: { color: subTextCol },
          },
          grid: { left: 54, right: 18, top: 34, bottom: 34 },
          xAxis: {
            type: 'value',
            name: 'Bujur (Long)',
            nameLocation: 'middle',
            nameGap: 20,
            nameTextStyle: { color: subTextCol, fontSize: 10 },
            scale: true,
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
          },
          yAxis: {
            type: 'value',
            name: 'Lintang (Lat)',
            nameTextStyle: { color: subTextCol, fontSize: 10 },
            scale: true,
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
          },
          series: seriesList,
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fid = params.data?.fid;
        if (fid) {
          const next = selectedFids.includes(fid) ? selectedFids.filter((x) => x !== fid) : [...selectedFids, fid];
          setLayerSelection(activeLayer.id, next, 'chart');
        }
      });
    }

    // 4. Pearson Correlation Matrix Heatmap
    const corrCols: string[] = stats.correlation_matrix?.columns || [];
    const corrCells: any[] = stats.correlation_matrix?.cells || [];
    if (corrMatrixRef.current && corrCols.length >= 2) {
      const ch = initChart(corrMatrixRef.current)!;
      ch.setOption(
        {
          tooltip: {
            position: 'top',
            ...tooltipStyle,
            formatter: (p: any) =>
              `${corrCols[p.value[0]]} × ${corrCols[p.value[1]]}<br/>Korelasi Pearson r = <b>${p.value[2]}</b>`,
          },
          grid: { left: 76, right: 44, top: 14, bottom: 58 },
          xAxis: {
            type: 'category',
            data: corrCols,
            axisLabel: { color: subTextCol, fontSize: 10, rotate: 28, width: 70, overflow: 'truncate' },
            splitArea: { show: true },
          },
          yAxis: {
            type: 'category',
            data: corrCols,
            axisLabel: { color: subTextCol, fontSize: 10, width: 70, overflow: 'truncate' },
            splitArea: { show: true },
          },
          visualMap: {
            min: -1,
            max: 1,
            calculable: false,
            orient: 'vertical',
            right: 2,
            top: 'middle',
            itemWidth: 10,
            itemHeight: 110,
            textStyle: { color: subTextCol, fontSize: 10 },
            inRange: { color: ['#0f766e', '#5eead4', isDark ? '#131d20' : '#f4f7f7', '#fdba74', '#ea580c'] },
          },
          series: [
            {
              type: 'heatmap',
              data: corrCells,
              label: { show: true, fontSize: 10, color: isDark ? '#f4f7f7' : '#0b1214' },
            },
          ],
        },
        true
      );
    }

    // 5. Top-10 / Bottom-5 Bar Chart
    const rankList = rankMode === 'top' ? stats.top_n || [] : stats.bottom_n || [];
    if (barChartRef.current && rankList.length > 0) {
      const ch = initChart(barChartRef.current)!;
      const items = [...rankList].reverse();
      ch.setOption(
        {
          tooltip: { trigger: 'axis', ...tooltipStyle },
          grid: { left: 112, right: 24, top: 14, bottom: 24 },
          xAxis: {
            type: 'value',
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
          },
          yAxis: {
            type: 'category',
            data: items.map((d: any) => d.label),
            axisLabel: { color: textCol, width: 100, overflow: 'truncate', fontSize: 10 },
            axisLine: { lineStyle: { color: axisLineCol } },
          },
          series: [
            {
              type: 'bar',
              data: items.map((d: any) => ({
                value: d.value,
                fid: d.fid,
                itemStyle: {
                  color: d.selected ? '#f97316' : rankMode === 'top' ? '#0f766e' : '#ea580c',
                  borderRadius: [0, 2, 2, 0],
                },
              })),
            },
          ],
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fid = params.data?.fid;
        if (fid) {
          const next = selectedFids.includes(fid) ? selectedFids.filter((x) => x !== fid) : [...selectedFids, fid];
          setLayerSelection(activeLayer.id, next, 'chart');
        }
      });
    }

    // 6. Histogram Sebaran (Clean blue bars + amber overlay ONLY when features are selected!)
    if (histChartRef.current && stats.histogram?.bins?.length > 0) {
      const ch = initChart(histChartRef.current)!;
      const hasSelection = selectedFids.length > 0;
      ch.setOption(
        {
          tooltip: { trigger: 'axis', ...tooltipStyle },
          legend: {
            data: hasSelection ? ['Semua Fitur', 'Fitur Terpilih'] : ['Semua Fitur'],
            top: 0,
            textStyle: { color: textCol, fontSize: 11 },
          },
          grid: { left: 40, right: 16, top: 30, bottom: 48 },
          xAxis: {
            type: 'category',
            data: stats.histogram.bins,
            axisLabel: { rotate: 28, fontSize: 10, color: subTextCol },
            axisLine: { lineStyle: { color: axisLineCol } },
          },
          yAxis: {
            type: 'value',
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
          },
          series: [
            {
              name: 'Semua Fitur',
              type: 'bar',
              data: stats.histogram.counts_all,
              itemStyle: { color: hasSelection ? '#3f565a' : '#0d9488', borderRadius: [2, 2, 0, 0] },
            },
            ...(hasSelection
              ? [
                  {
                    name: 'Fitur Terpilih',
                    type: 'bar',
                    barGap: '-100%',
                    data: stats.histogram.counts_selected,
                    itemStyle: { color: '#f97316', borderRadius: [2, 2, 0, 0] },
                  },
                ]
              : []),
          ],
        },
        true
      );
    }

    // 7. Pie / Donut Proporsi Kategori
    if (pieChartRef.current && stats.pie?.data?.length > 0) {
      const ch = initChart(pieChartRef.current)!;
      ch.setOption(
        {
          tooltip: { trigger: 'item', ...tooltipStyle, formatter: '{b}: {c} ({d}%)' },
          color: COLOR_PALETTES.categorical,
          series: [
            {
              type: 'pie',
              radius: ['42%', '72%'],
              itemStyle: { borderRadius: 3, borderColor: isDark ? '#131d20' : '#ffffff', borderWidth: 2 },
              label: { fontSize: 11, color: textCol },
              data: stats.pie.data,
            },
          ],
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fids: number[] = params.data?.fids || [];
        if (fids.length > 0) setLayerSelection(activeLayer.id, fids, 'chart');
      });
    }

    // 8. Scatter Plot X vs Y + Trendline Regresi
    if (scatterChartRef.current && stats.scatter?.points?.length > 0) {
      const ch = initChart(scatterChartRef.current)!;
      ch.setOption(
        {
          tooltip: {
            trigger: 'item',
            ...tooltipStyle,
            formatter: (p: any) => `${p.data?.label || ''}<br/>X: ${p.value[0]}<br/>Y: ${p.value[1]}`,
          },
          grid: { left: 48, right: 20, top: 18, bottom: 34 },
          xAxis: {
            type: 'value',
            name: stats.scatter.x_col,
            nameLocation: 'middle',
            nameGap: 20,
            nameTextStyle: { color: subTextCol, fontSize: 10 },
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
            scale: true,
          },
          yAxis: {
            type: 'value',
            name: stats.scatter.y_col,
            nameTextStyle: { color: subTextCol, fontSize: 10 },
            axisLabel: { color: subTextCol, fontSize: 10 },
            splitLine: { lineStyle: { type: 'dashed', color: gridLineCol } },
            scale: true,
          },
          series: [
            {
              type: 'scatter',
              symbolSize: 9,
              data: stats.scatter.points.map((pt: any) => ({
                value: [pt.x, pt.y],
                fid: pt.fid,
                label: pt.label,
                itemStyle: { color: pt.selected ? '#f97316' : '#14b8a6' },
              })),
            },
            ...(stats.scatter.trendline?.length === 2
              ? [
                  {
                    type: 'line',
                    data: stats.scatter.trendline,
                    showSymbol: false,
                    lineStyle: { color: '#ea580c', width: 2, type: 'dashed' },
                  },
                ]
              : []),
          ],
        },
        true
      );
      ch.off('click');
      ch.on('click', (params: any) => {
        const fid = params.data?.fid;
        if (fid) {
          const next = selectedFids.includes(fid) ? selectedFids.filter((x) => x !== fid) : [...selectedFids, fid];
          setLayerSelection(activeLayer.id, next, 'chart');
        }
      });
    }

    const handleResize = () => instances.forEach((inst) => inst.resize());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [stats, activeLayer?.id, selectedFids.join(','), theme, rankMode]);

  if (!activeLayer) {
    return <div className="p-8 text-sm text-slate-500">Belum ada layer untuk ditampilkan di Dashboard.</div>;
  }

  const kpi = stats?.kpi || {};
  const sp = stats?.spatial_metrics || {};
  const hStats = stats?.histogram?.stats || {};
  const numCols: string[] = stats?.numeric_columns || [];
  const strCols: string[] = stats?.string_columns || [];
  const segRows: any[] = stats?.segment_breakdown?.rows || [];
  const insights: string[] = stats?.insights || [];
  const isPointLike = sp.geom_kind === 'point';

  return (
    <div className="h-full overflow-y-auto p-5 space-y-5 max-w-7xl mx-auto text-xs">
      {/* Header Bar with Global Metric & Segment Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-800 p-4 rounded-md border border-slate-200 dark:border-slate-700 shadow-sm">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-700" />
            <h1 className="text-base font-medium tracking-tight">Dashboard Analitik Spasial</h1>
          </div>

          <select
            value={activeLayer.id}
            onChange={(e) => setActiveLayerId(e.target.value)}
            className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 font-normal"
          >
            {layers
              .filter((l) => l.kind !== 'raster')
              .map((l) => (
                <option key={l.id} value={l.id} className="dark:bg-slate-800">
                  Layer: {l.name} ({l.feature_count})
                </option>
              ))}
          </select>

          {numCols.length > 0 && (
            <select
              value={numCol}
              onChange={(e) => setNumCol(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-teal-300 dark:border-teal-800 bg-teal-50/50 dark:bg-teal-950/30 text-teal-800 dark:text-teal-300"
              title="Kolom angka utama yang dianalisis di seluruh Dashboard"
            >
              {numCols.map((c) => (
                <option key={c} value={c} className="dark:bg-slate-800">
                  Metrik: {c}
                </option>
              ))}
            </select>
          )}

          {(strCols.length > 0 || numCols.length > 0) && (
            <select
              value={catCol}
              onChange={(e) => setCatCol(e.target.value)}
              className="px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              title="Kolom segmen / kategori pengelompokan"
            >
              {[...strCols, ...numCols].map((c) => (
                <option key={c} value={c} className="dark:bg-slate-800">
                  Segmen: {c}
                </option>
              ))}
            </select>
          )}

          {selectedFids.length > 0 && (
            <button
              onClick={() => clearLayerSelection(activeLayer.id)}
              className="px-2.5 py-1 rounded-sm bg-orange-100 dark:bg-orange-950/60 text-orange-900 dark:text-orange-300 font-normal hover:bg-orange-200 dark:hover:bg-orange-900/60"
            >
              {selectedFids.length} Terpilih (Reset)
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {hStats.outlier_count > 0 && (
            <button
              onClick={() => setLayerSelection(activeLayer.id, hStats.outlier_fids || [], 'chart')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-orange-50 dark:bg-orange-950/50 border border-orange-300 dark:border-orange-800 text-orange-800 dark:text-orange-300"
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Pilih {hStats.outlier_count} Outlier</span>
            </button>
          )}
          <button
            onClick={async () => {
              const res = await api.exportResource({
                project_id: projectId,
                export_type: 'layer',
                layer_id: activeLayer.id,
                format: 'xlsx',
                only_selected_fids: selectedFids.length > 0 ? selectedFids : undefined,
              });
              window.open(res.download_url, '_blank');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-teal-600/50 dark:border-teal-700 text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel (.xlsx)</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak / PDF</span>
          </button>
        </div>
      </div>

      {/* 6 Context-Aware Spatial & Statistical KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Jumlah Fitur</span>
          <div className="text-xl font-medium tracking-tight text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatNumber(kpi.feature_count)}
          </div>
          <div className="text-[11px] text-orange-500 mt-1 tabular-nums">
            {kpi.selected_count || 0} dipilih ({formatNumber(((kpi.selected_count || 0) / Math.max(1, kpi.feature_count || 1)) * 100, 1)}%)
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider truncate block">
            Rata-Rata ({numCol || '—'})
          </span>
          <div className="text-xl font-medium tracking-tight text-teal-700 dark:text-teal-400 mt-1 tabular-nums">
            {hStats.mean !== undefined ? formatNumber(hStats.mean, 2) : '—'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            Total: {hStats.sum !== undefined ? formatNumber(hStats.sum, 1) : '—'} · Med: {hStats.median !== undefined ? formatNumber(hStats.median, 1) : '—'}
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Sebaran &amp; Outlier</span>
          <div className="text-xl font-medium tracking-tight text-teal-700 dark:text-teal-400 mt-1 tabular-nums">
            σ {hStats.std !== undefined ? formatNumber(hStats.std, 2) : '—'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            CV {hStats.cv_pct ?? 0}% · {hStats.outlier_count ?? 0} outlier IQR
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">
            {isPointLike ? 'Luas Cakupan Hull' : 'Luas Cakupan UTM'}
          </span>
          <div className="text-xl font-medium tracking-tight text-orange-600 dark:text-orange-400 mt-1 tabular-nums">
            {formatNumber(isPointLike ? sp.hull_area_km2 : kpi.area_km2 || sp.hull_area_km2, 1)}{' '}
            <span className="text-xs font-normal">km²</span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {sp.span_width_km ?? 0} × {sp.span_height_km ?? 0} km · {sp.density_per_km2 ?? 0}/km²
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider flex items-center gap-1">
            <Compass className="w-3 h-3 text-teal-600" /> Pola Spasial (NNI)
          </span>
          <div className="text-sm font-medium text-teal-700 dark:text-teal-400 mt-1.5 truncate" title={sp.spatial_pattern}>
            {sp.spatial_pattern || 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
            {sp.nni_ratio !== null && sp.nni_ratio !== undefined
              ? `R = ${sp.nni_ratio} · NND ${formatNumber(sp.avg_nnd_m, 0)} m`
              : `Radius σ: ${sp.std_distance_km ?? 0} km`}
          </div>
        </div>

        <div className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <span className="text-[10px] text-slate-400 uppercase tracking-wider">Kualitas &amp; CRS</span>
          <div className="text-xl font-medium tracking-tight text-slate-900 dark:text-white mt-1 tabular-nums">
            {formatNumber(kpi.missing_pct)}% <span className="text-xs font-normal text-slate-400">kosong</span>
          </div>
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 truncate">
            <CheckCircle2 className="w-3 h-3 shrink-0" /> {kpi.invalid_geom_count || 0} rusak · {sp.utm_crs || '—'}
          </div>
        </div>
      </div>

      {/* Automatic Executive Insights Banner */}
      {insights.length > 0 && (
        <div className="p-4 rounded-md bg-teal-50/70 dark:bg-slate-800/90 border border-teal-200/80 dark:border-teal-900/70 space-y-1.5">
          <div className="flex items-center gap-1.5 text-teal-800 dark:text-teal-400 text-xs font-medium">
            <Sparkles className="w-4 h-4" />
            <span>Ringkasan Insight Otomatis ({activeLayer.name})</span>
          </div>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 text-[11px] text-slate-700 dark:text-slate-300 list-disc list-inside leading-relaxed">
            {insights.map((ins, i) => (
              <li key={i}>{ins}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Row 1: Segment Comparison + Box Plot Distribution */}
      {segRows.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="font-normal text-sm">Perbandingan Antar Segmen: {catCol}</h3>
                <p className="text-[11px] text-slate-400">
                  Batang = jumlah fitur · Garis oranye = rata-rata {numCol} (klik batang untuk memilih segmen)
                </p>
              </div>
              <Layers className="w-4 h-4 text-teal-600 shrink-0" />
            </div>
            <div ref={segBarChartRef} className="w-full h-64" />
          </div>

          <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <div>
                <h3 className="font-normal text-sm">Box Plot Distribusi {numCol} per {catCol}</h3>
                <p className="text-[11px] text-slate-400">
                  Membandingkan Min, Kuartil 1 (Q1), Median, Kuartil 3 (Q3), dan Maksimum tiap segmen
                </p>
              </div>
              <Activity className="w-4 h-4 text-teal-600 shrink-0" />
            </div>
            <div ref={boxChartRef} className="w-full h-64" />
          </div>
        </div>
      )}

      {/* Row 2: 2D Spatial Distribution Map + Pearson Correlation Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="font-normal text-sm">Peta Sebaran Spasial (Long × Lat) &amp; Mean Center</h3>
              <p className="text-[11px] text-slate-400">
                Warna = {catCol || 'Segmen'} · Ukuran titik = {numCol || 'Seragam'} · Wajik oranye = Pusat Sebaran
              </p>
            </div>
            <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
          </div>
          {stats?.spatial_scatter?.points?.length > 0 ? (
            <div ref={spatialMapRef} className="w-full h-72" />
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400">
              Layer ini belum memiliki geometri spasial.
            </div>
          )}
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="mb-1">
            <h3 className="font-normal text-sm">Matriks Korelasi Pearson (r) Antar Kolom Numerik</h3>
            <p className="text-[11px] text-slate-400">
              Oranye = korelasi positif (+1) · Tosca = korelasi negatif (-1) · Cepat deteksi variabel berpengaruh
            </p>
          </div>
          {(stats?.correlation_matrix?.columns?.length || 0) >= 2 ? (
            <div ref={corrMatrixRef} className="w-full h-72" />
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-400">
              Butuh minimal 2 kolom numerik untuk menghitung matriks korelasi.
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Histogram + Top 10 / Bottom 5 Ranking */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="mb-2">
            <h3 className="font-normal text-sm">Histogram Distribusi: {numCol}</h3>
            {hStats.min !== undefined && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                Min: <b>{formatNumber(hStats.min)}</b> · Q1: <b>{formatNumber(hStats.q1)}</b> · Med:{' '}
                <b>{formatNumber(hStats.median)}</b> · Q3: <b>{formatNumber(hStats.q3)}</b> · Max:{' '}
                <b>{formatNumber(hStats.max)}</b> · Skew: <b>{hStats.skewness}</b>
              </p>
            )}
          </div>
          <div ref={histChartRef} className="w-full h-64" />
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-normal text-sm">
                {rankMode === 'top' ? 'Top 10 Nilai Tertinggi' : 'Bottom 5 Nilai Terendah'}
              </h3>
              <div className="flex rounded bg-slate-100 dark:bg-slate-700 p-0.5 text-[10px]">
                <button
                  onClick={() => setRankMode('top')}
                  className={`px-2 py-0.5 rounded ${rankMode === 'top' ? 'bg-teal-700 text-white' : 'text-slate-500 dark:text-slate-300'}`}
                >
                  Top 10
                </button>
                <button
                  onClick={() => setRankMode('bottom')}
                  className={`px-2 py-0.5 rounded ${rankMode === 'bottom' ? 'bg-orange-600 text-white' : 'text-slate-500 dark:text-slate-300'}`}
                >
                  Bottom 5
                </button>
              </div>
            </div>
            <select
              value={labelCol}
              onChange={(e) => setLabelCol(e.target.value)}
              className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
            >
              {strCols.map((c) => (
                <option key={c} value={c} className="dark:bg-slate-800">
                  Label: {c}
                </option>
              ))}
            </select>
          </div>
          <div ref={barChartRef} className="w-full h-64" />
        </div>
      </div>

      {/* Row 4: Pie Proportion + Scatter Plot X vs Y */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="font-normal text-sm">Proporsi Segmen / Kategori ({catCol})</h3>
              <p className="text-[11px] text-slate-400">Klik irisan untuk langsung memilih seluruh fitur di segmen</p>
            </div>
          </div>
          <div ref={pieChartRef} className="w-full h-64" />
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <div>
              <h3 className="font-normal text-sm">
                Regresi Bivariat (r = <span className="text-teal-600 dark:text-teal-400 tabular-nums">{stats?.scatter?.r ?? 0}</span> · R² ={' '}
                <span className="text-orange-500 tabular-nums">{stats?.scatter?.r2 ?? 0}</span>)
              </h3>
              <p className="text-[11px] text-slate-400">Garis putus-putus oranye menunjukkan tren linear OLS</p>
            </div>
            <div className="flex items-center gap-1.5">
              <select
                value={scatterX}
                onChange={(e) => setScatterX(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
              >
                {numCols.map((c) => (
                  <option key={c} value={c} className="dark:bg-slate-800">
                    X: {c}
                  </option>
                ))}
              </select>
              <select
                value={scatterY}
                onChange={(e) => setScatterY(e.target.value)}
                className="px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
              >
                {numCols.map((c) => (
                  <option key={c} value={c} className="dark:bg-slate-800">
                    Y: {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div ref={scatterChartRef} className="w-full h-64" />
        </div>
      </div>

      {/* Row 5: Segment Comparative Summary Table (Interactive Cross-Filter per Segment) */}
      {segRows.length > 0 && (
        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-normal text-sm">
                Tabel Ringkasan Statistik per Segmen ({catCol} × {numCol || 'Jumlah'})
              </h3>
              <p className="text-[11px] text-slate-400">
                Perbandingan lengkap jumlah, proporsi, total, rata-rata, median, rentang, dan simpangan baku tiap segmen
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse tabular-nums">
              <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-400 text-[11px]">
                <tr>
                  <th className="py-2 px-2.5">Segmen / Kategori</th>
                  <th className="py-2 px-2.5 text-right">Jumlah</th>
                  <th className="py-2 px-2.5 text-right">Proporsi</th>
                  <th className="py-2 px-2.5 text-right">Total</th>
                  <th className="py-2 px-2.5 text-right">Rata-rata</th>
                  <th className="py-2 px-2.5 text-right">Median</th>
                  <th className="py-2 px-2.5 text-right">Min – Max</th>
                  <th className="py-2 px-2.5 text-right">Std Dev (σ)</th>
                  <th className="py-2 px-2.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {segRows.map((row, idx) => (
                  <tr key={row.segment} className="hover:bg-slate-50 dark:hover:bg-slate-700/40">
                    <td className="py-2 px-2.5 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: COLOR_PALETTES.categorical[idx % COLOR_PALETTES.categorical.length] }}
                      />
                      <span className="font-normal">{row.segment}</span>
                    </td>
                    <td className="py-2 px-2.5 text-right">{formatNumber(row.count)}</td>
                    <td className="py-2 px-2.5 text-right text-slate-500">{row.pct}%</td>
                    <td className="py-2 px-2.5 text-right">{row.sum !== undefined ? formatNumber(row.sum, 1) : '—'}</td>
                    <td className="py-2 px-2.5 text-right text-teal-700 dark:text-teal-400">
                      {row.mean !== undefined ? formatNumber(row.mean, 2) : '—'}
                    </td>
                    <td className="py-2 px-2.5 text-right">{row.median !== undefined ? formatNumber(row.median, 2) : '—'}</td>
                    <td className="py-2 px-2.5 text-right text-slate-500">
                      {row.min !== undefined ? `${formatNumber(row.min, 1)} – ${formatNumber(row.max, 1)}` : '—'}
                    </td>
                    <td className="py-2 px-2.5 text-right">{row.std !== undefined ? formatNumber(row.std, 2) : '—'}</td>
                    <td className="py-2 px-2.5 text-right">
                      <button
                        onClick={() => setLayerSelection(activeLayer.id, row.fids || [], 'chart')}
                        className="px-2 py-0.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-teal-700 hover:text-white hover:border-teal-700 text-[10px] transition"
                      >
                        Pilih di Peta
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 6: Data Quality Audit & Latest Model Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm">
          <h3 className="font-normal text-sm mb-2">Audit Kualitas Data per Kolom</h3>
          <div className="overflow-x-auto max-h-48">
            <table className="w-full text-left border-collapse">
              <thead className="border-b border-slate-200 dark:border-slate-700 text-slate-400">
                <tr>
                  <th className="py-1.5 px-2">Kolom</th>
                  <th className="py-1.5 px-2">Tipe</th>
                  <th className="py-1.5 px-2 text-right">Nilai Unik</th>
                  <th className="py-1.5 px-2 text-right">Nilai Kosong</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
                {(stats?.quality?.columns || []).map((qc: any) => (
                  <tr key={qc.column}>
                    <td className="py-1.5 px-2 font-normal">{qc.column}</td>
                    <td className="py-1.5 px-2 text-slate-500">{qc.type}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">{qc.unique_count}</td>
                    <td className="py-1.5 px-2 text-right tabular-nums">
                      {qc.null_count} ({qc.null_pct}%)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400 font-normal text-sm mb-2">
              <Sparkles className="w-4 h-4" />
              <span>Status Model Machine Learning</span>
            </div>
            {models.length > 0 ? (
              <div className="space-y-2">
                <div className="p-3 rounded bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800">
                  <div className="font-normal text-slate-900 dark:text-white">{models[0].name}</div>
                  <div className="text-[11px] text-teal-800 dark:text-teal-300 font-medium">
                    {models[0].algorithm} · Tugas: {models[0].task}
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {models[0].metrics?.narrative}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 dark:text-slate-400 text-xs">
                Belum ada model yang dilatih di proyek ini. Buka menu <b>Model ML</b> untuk membuat prediksi spasial.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Module: pages/EarthCatalogPage.tsx ---






const DATE_PRESETS = [
  { id: 'dry_2025', label: 'Musim kemarau 2025', start: '2025-06-01', end: '2025-09-30' },
  { id: 'wet_2025', label: 'Musim hujan 2025/26', start: '2025-11-01', end: '2026-02-28' },
  { id: 'year_2025', label: 'Sepanjang tahun 2025', start: '2025-01-01', end: '2025-12-31' },
  { id: 'dry_2024', label: 'Musim kemarau 2024', start: '2024-06-01', end: '2024-09-30' },
];

const EarthCatalogPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const {
    projectId,
    layers,
    jobs,
    mode,
    geeStatus,
    setActiveTab,
    setActiveLayerId,
    refreshGeeStatus,
    refreshLayers,
    addToast,
  } = usePetaStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Step 1: Area State
  const spatialLayers = layers.filter((l) => l.bbox);
  const [areaSource, setAreaSource] = useState<'layer' | 'custom_bbox'>('layer');
  const [areaLayerId, setAreaLayerId] = useState<string>(spatialLayers[0]?.id || '');
  const [customBbox, setCustomBbox] = useState<[number, number, number, number]>([112.595, -7.355, 112.818, -7.202]);

  // Step 2: Data Preset State
  const [selectedPresetId, setSelectedPresetId] = useState<string>('gee.ndvi');
  const [customDatasetId, setCustomDatasetId] = useState('COPERNICUS/S2_SR_HARMONIZED');
  const [customExpr, setCustomExpr] = useState('(B8 - B4) / (B8 + B4)');

  // Step 3: Time & Cloud Masking State (Indonesia default: cloud masking ON, 40%)
  const [tanggalMulai, setTanggalMulai] = useState('2025-06-01');
  const [tanggalAkhir, setTanggalAkhir] = useState('2025-09-30');
  const [buangAwan, setBuangAwan] = useState(true);
  const [batasAwan, setBatasAwan] = useState(40);

  // Step 4: Preview & Estimation State
  const [scaleM, setScaleM] = useState<number>(10);
  const [previewCmap, setPreviewCmap] = useState<string>('rdylgn');
  const [estimateData, setEstimateData] = useState<any | null>(null);
  const [previewTileUrl, setPreviewTileUrl] = useState<string>('');
  const [outputName, setOutputName] = useState<string>('');
  const [showPython, setShowPython] = useState(false);

  // Step 5: Download Job Status
  const [lastJobId, setLastJobId] = useState<string | null>(null);

  const previewMapContainer = useRef<HTMLDivElement | null>(null);
  const previewMapRef = useRef<maplibregl.Map | null>(null);

  const selectedPreset = catalogItems.find((c) => c.id === selectedPresetId) || catalogItems[0] || null;
  const activeAreaBbox: [number, number, number, number] =
    areaSource === 'layer'
      ? (layers.find((l) => l.id === areaLayerId)?.bbox as [number, number, number, number]) || customBbox
      : customBbox;

  // Keep areaLayerId in sync whenever project or layers change (prevent stale layer IDs across projects)
  useEffect(() => {
    if (spatialLayers.length === 0) {
      setAreaLayerId('');
      setAreaSource('custom_bbox');
    } else if (!spatialLayers.some((l) => l.id === areaLayerId)) {
      setAreaLayerId(spatialLayers[0].id);
    }
  }, [projectId, layers.map((l) => l.id).join(',')]);

  // Dispose WebGL preview map cleanly on component unmount
  useEffect(() => {
    return () => {
      if (previewMapRef.current) {
        previewMapRef.current.remove();
        previewMapRef.current = null;
      }
    };
  }, []);

  // Load Catalog presets
  useEffect(() => {
    api
      .geeCatalog(searchQuery || undefined, mode === 'lanjut')
      .then((items) => setCatalogItems(items))
      .catch(() => {});
  }, [searchQuery, mode]);

  // Update default scale & cmap when preset changes
  useEffect(() => {
    if (selectedPreset) {
      setScaleM(selectedPreset.native_scale_m || 10);
      setPreviewCmap(selectedPreset.default_cmap || 'viridis');
    }
  }, [selectedPreset?.id]);

  // Debounced Estimation (Steps 1-3: local lightweight math, 0 GEE quota) vs Live Preview (Step 4 ONLY)
  useEffect(() => {
    if (!selectedPresetId) return;
    const payload = {
      project_id: projectId,
      preset_id: selectedPresetId,
      layer_id: areaSource === 'layer' && areaLayerId ? areaLayerId : undefined,
      bbox: activeAreaBbox,
      scale: scaleM,
      cmap: previewCmap,
      tanggal_mulai: tanggalMulai,
      tanggal_akhir: tanggalAkhir,
      buang_awan: buangAwan,
      batas_awan: batasAwan,
    };
    let cancelled = false;
    const timer = setTimeout(() => {
      if (step === 4) {
        api
          .geePreview(payload)
          .then((res) => {
            if (cancelled) return;
            setEstimateData(res);
            setPreviewTileUrl(res.tile_url);
          })
          .catch(() => {});
      } else {
        api
          .geeEstimate(payload)
          .then((res) => {
            if (cancelled) return;
            setEstimateData(res);
          })
          .catch(() => {});
      }
    }, step === 4 ? 350 : 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [selectedPresetId, areaLayerId, areaSource, customBbox.join(','), scaleM, previewCmap, tanggalMulai, tanggalAkhir, buangAwan, batasAwan, step, projectId]);

  // Render live interactive MapLibre Preview in Step 4 (Path A — Instant Tile Preview)
  useEffect(() => {
    if (step !== 4 || !previewMapContainer.current) {
      if (previewMapRef.current) {
        previewMapRef.current.remove();
        previewMapRef.current = null;
      }
      return;
    }

    const [minx, miny, maxx, maxy] = activeAreaBbox;
    const tileFullUrl =
      previewTileUrl && previewTileUrl.startsWith('http')
        ? previewTileUrl
        : `${window.location.origin}/api/gee/tiles/${selectedPresetId}/{z}/{x}/{y}.png?bbox=${activeAreaBbox.join(',')}&cmap=${previewCmap}&d0=${tanggalMulai}&d1=${tanggalAkhir}`;

    if (!previewMapRef.current) {
      const m = new maplibregl.Map({
        container: previewMapContainer.current,
        style: {
          version: 8,
          sources: {
            osm: {
              type: 'raster',
              tiles: ['https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png'],
              tileSize: 256,
            },
            gee_preview: {
              type: 'raster',
              tiles: [tileFullUrl],
              tileSize: 256,
            },
          },
          layers: [
            { id: 'osm_base', type: 'raster', source: 'osm' },
            { id: 'gee_overlay', type: 'raster', source: 'gee_preview', paint: { 'raster-opacity': 0.82 } },
          ],
        },
        center: [(minx + maxx) / 2, (miny + maxy) / 2],
        zoom: 11.2,
        attributionControl: false,
      });
      m.on('load', () => {
        m.fitBounds(
          [
            [minx, miny],
            [maxx, maxy],
          ],
          { padding: 24, duration: 400 }
        );
      });
      previewMapRef.current = m;
    } else {
      const m = previewMapRef.current;
      const applyOverlay = () => {
        if (m.getLayer('gee_overlay')) m.removeLayer('gee_overlay');
        if (m.getSource('gee_preview')) m.removeSource('gee_preview');
        m.addSource('gee_preview', { type: 'raster', tiles: [tileFullUrl], tileSize: 256 });
        m.addLayer({ id: 'gee_overlay', type: 'raster', source: 'gee_preview', paint: { 'raster-opacity': 0.82 } });
      };
      if (m.isStyleLoaded()) {
        applyOverlay();
      } else {
        m.once('load', applyOverlay);
      }
    }
  }, [step, selectedPresetId, previewCmap, previewTileUrl, activeAreaBbox.join(','), tanggalMulai, tanggalAkhir]);

  const activeDownloadJob = lastJobId ? jobs.find((j) => j.id === lastJobId) || null : null;

  useEffect(() => {
    if (activeDownloadJob?.status === 'succeeded') {
      refreshGeeStatus();
      const createdId = activeDownloadJob.outputs?.id;
      if (createdId) setActiveLayerId(createdId);
    }
  }, [activeDownloadJob?.status, activeDownloadJob?.id]);

  const handleStartDownload = async () => {
    if (!geeStatus?.connected) {
      addToast({
        type: 'warning',
        title: 'Hubungkan Earth Engine terlebih dahulu',
        message: 'Kelola koneksi & ID Project Google Cloud Anda di menu Pengaturan.',
      });
      setActiveTab('settings');
      return;
    }
    try {
      const res = await api.geeFetch({
        project_id: projectId,
        preset_id: selectedPresetId,
        layer_id: areaSource === 'layer' ? areaLayerId : undefined,
        bbox: activeAreaBbox,
        scale: scaleM,
        tanggal_mulai: tanggalMulai,
        tanggal_akhir: tanggalAkhir,
        buang_awan: buangAwan,
        batas_awan: batasAwan,
        output_name: outputName || undefined,
        custom_dataset_id: selectedPresetId === 'gee.custom' ? customDatasetId : undefined,
        custom_expr: selectedPresetId === 'gee.custom' ? customExpr : undefined,
      });
      setLastJobId(res.job_id);
      setStep(5);
      addToast({
        type: 'info',
        title: `Mengunduh ${selectedPreset?.name}...`,
        message: 'Progress real-time dipantau langsung melalui WebSocket.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: err.message || 'Gagal mengunduh', message: err.hint });
    }
  };

  const plan = estimateData?.plan;
  const scenes = estimateData?.scenes;

  const pythonSnippet = `import ee
ee.Initialize(project="${geeStatus?.project_id || 'PROJECT_CLOUD_ANDA'}")

area = ee.Geometry.Rectangle([${activeAreaBbox.map((x) => x.toFixed(4)).join(', ')}])
col = (ee.ImageCollection("${selectedPreset?.dataset_id || 'COPERNICUS/S2_SR_HARMONIZED'}")
       .filterBounds(area)
       .filterDate("${tanggalMulai}", "${tanggalAkhir}"))
# Masking awan (${batasAwan}%) & komposit median
img = col.median().clip(area)
url = img.getDownloadURL({"scale": ${scaleM}, "region": area, "format": "GEO_TIFF"})
print("URL Unduhan GeoTIFF:", url)`;

  return (
    <div className={`h-full overflow-y-auto ${embedded ? 'p-4' : 'p-6'} space-y-5 max-w-7xl mx-auto text-xs`}>
      {/* Header + Status & Quota Panel (§6.4) */}
      <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded bg-slate-900 dark:bg-teal-700 text-white flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h1 className="text-base tracking-tight">Katalog Bumi — Google Earth Engine</h1>
            <p className="text-[11px] text-slate-500">
              Ambil citra satelit siap pakai (Sentinel-2, Landsat, DEM, WorldCover, CHIRPS), simpan sebagai COG lokal, olah offline dengan Python.
            </p>
          </div>
        </div>

        {/* Status & Quota Indicator */}
        <div className="flex flex-wrap items-center gap-3">
          {geeStatus?.connected ? (
            <div className="px-3 py-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>
                Terhubung · <b>{geeStatus.project_id}</b> · Cache: {formatBytes(geeStatus.cache_bytes)}
              </span>
              <a
                href={geeStatus.quota_url}
                target="_blank"
                rel="noreferrer"
                className="underline ml-1 text-[11px]"
              >
                Lihat kuota
              </a>
            </div>
          ) : (
            <div className="px-3 py-1.5 rounded bg-orange-50 dark:bg-orange-950/40 border border-orange-200 dark:border-orange-800 text-orange-800 dark:text-orange-300 flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Earth Engine belum terhubung</span>
              <button
                onClick={() => setActiveTab('settings')}
                className="underline ml-1"
              >
                Buka Pengaturan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Single-Source-of-Truth Redirect Banner if Not Connected (Auth managed exclusively in Pengaturan) */}
      {!geeStatus?.connected && (
        <div className="p-4 rounded-md bg-slate-900 text-slate-100 border border-slate-700 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-sm text-white">
              <ShieldCheck className="w-4 h-4 text-orange-400" />
              <span>Google Earth Engine Belum Terhubung</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Kelola ID Project Google Cloud, login OAuth, atau kunci Service Account di satu tempat melalui menu Pengaturan.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('settings')}
            className="px-4 py-2 rounded bg-teal-700 hover:bg-teal-600 text-white flex items-center gap-1.5 shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Hubungkan di Pengaturan →</span>
          </button>
        </div>
      )}

      {/* 5-Step Wizard Navigation (§6.2) */}
      <div className="flex flex-wrap items-center gap-1.5 bg-white dark:bg-slate-800 p-2 rounded-md border border-slate-200/80 dark:border-slate-700">
        {[
          { n: 1, label: '1. Area Cakupan' },
          { n: 2, label: '2. Pilih Data Satelit' },
          { n: 3, label: '3. Waktu & Awan' },
          { n: 4, label: '4. Pratinjau & Estimasi' },
          { n: 5, label: '5. Unduh Layer' },
        ].map((s) => (
          <button
            key={s.n}
            onClick={() => setStep(s.n as any)}
            className={`px-3.5 py-1.5 rounded transition ${
 step === s.n
 ? 'bg-slate-900 dark:bg-teal-700 text-white'
 : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* STEP 1: AREA */}
      {step === 1 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-4 max-w-3xl">
          <h2 className="text-base">Langkah 1 — Pilih Cakupan Area Unduhan</h2>
          <p className="text-slate-500">
            Luas area menentukan ukuran piksel unduhan. PetaLab akan menghitung estimasi ukuran dan memecah area luas menjadi petak secara otomatis.
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setAreaSource('layer')}
              className={`px-3.5 py-2 rounded border ${
 areaSource === 'layer'
 ? 'border-slate-900 dark:border-teal-600 bg-slate-50 dark:bg-teal-950/30'
 : 'border-slate-200 dark:border-slate-700'
 }`}
            >
              Dari Batas Layer Proyek
            </button>
            <button
              onClick={() => setAreaSource('custom_bbox')}
              className={`px-3.5 py-2 rounded border ${
 areaSource === 'custom_bbox'
 ? 'border-slate-900 dark:border-teal-600 bg-slate-50 dark:bg-teal-950/30'
 : 'border-slate-200 dark:border-slate-700'
 }`}
            >
              Koordinat Kotak Manual (BBox)
            </button>
          </div>

          {areaSource === 'layer' ? (
            <div>
              <label className="block mb-1 text-slate-500">Pilih Layer Acuan Wilayah</label>
              <select
                value={areaLayerId}
                onChange={(e) => setAreaLayerId(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              >
                {spatialLayers.map((l) => (
                  <option key={l.id} value={l.id} className="dark:bg-slate-800">
                    {l.name} ({l.geom_type || l.kind} · {l.feature_count} fitur)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {['Min Lon (Barat)', 'Min Lat (Selatan)', 'Max Lon (Timur)', 'Max Lat (Utara)'].map((lbl, idx) => (
                <div key={lbl}>
                  <label className="block text-[11px] text-slate-500 mb-1">{lbl}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={customBbox[idx]}
                    onChange={(e) => {
                      const next = [...customBbox] as [number, number, number, number];
                      next[idx] = Number(e.target.value);
                      setCustomBbox(next);
                    }}
                    className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent tabular-nums"
                  />
                </div>
              ))}
            </div>
          )}

          {plan && (
            <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-slate-500">Luas Cakupan Area:</span>{' '}
                <span className="text-sm text-teal-700 dark:text-teal-400 tabular-nums">
                  {formatNumber(plan.area_km2, 2)} km²
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                BBox: [{activeAreaBbox.map((x) => x.toFixed(4)).join(', ')}]
              </span>
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded bg-slate-900 dark:bg-teal-700 text-white"
            >
              Lanjut ke Pilih Data Satelit →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DATA PRESETS CATALOG (§6.3) */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base">Langkah 2 — Pilih Produk Satelit Katalog Bumi</h2>
            <div className="relative w-72">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Cari: "hijau", "panas", "tinggi", "hujan", "malam"...'
                className="w-full pl-8 pr-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            {catalogItems.map((item) => {
              const isSelected = selectedPresetId === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedPresetId(item.id)}
                  className={`p-4 rounded-md border transition cursor-pointer flex flex-col justify-between ${
 isSelected
 ? 'border-slate-900 dark:border-teal-600 bg-slate-50 dark:bg-teal-950/30 shadow-sm'
 : 'border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-slate-400'
 }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                        Resolusi asli {item.native_scale_m} m
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {item.dated ? 'Multi-waktu' : 'Global statis'}
                      </span>
                    </div>
                    <h3 className="text-sm text-slate-900 dark:text-white">{item.name}</h3>
                    <div className="text-[11px] font-mono text-teal-700 dark:text-teal-400">{item.dataset_id}</div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 dark:border-slate-700/60 text-[10px] text-slate-400">
                    <div>Dipakai untuk: {item.use_case}</div>
                    <div className="mt-0.5 truncate">Atribusi: {item.attribution}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedPresetId === 'gee.custom' && (
            <div className="p-4 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-slate-500">ID Dataset / ImageCollection GEE</label>
                <input
                  type="text"
                  value={customDatasetId}
                  onChange={(e) => setCustomDatasetId(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
              <div>
                <label className="block mb-1 text-slate-500">Ekspresi Band / Indeks</label>
                <input
                  type="text"
                  value={customExpr}
                  onChange={(e) => setCustomExpr(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-mono"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between">
            <button onClick={() => setStep(1)} className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600">
              ← Kembali
            </button>
            <button
              onClick={() => setStep(selectedPreset?.dated ? 3 : 4)}
              className="px-5 py-2.5 rounded bg-slate-900 dark:bg-teal-700 text-white"
            >
              Lanjut ke {selectedPreset?.dated ? 'Waktu & Awan' : 'Pratinjau & Estimasi'} →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: WAKTU & MASKING AWAN (Khusus Indonesia §6.2) */}
      {step === 3 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-4 max-w-3xl">
          <h2 className="text-base">Langkah 3 — Rentang Waktu & Penghapusan Awan ({selectedPreset?.name})</h2>

          <div className="flex flex-wrap gap-2">
            {DATE_PRESETS.map((dp) => (
              <button
                key={dp.id}
                onClick={() => {
                  setTanggalMulai(dp.start);
                  setTanggalAkhir(dp.end);
                }}
                className="px-3 py-1.5 rounded bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs"
              >
                {dp.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-1 text-slate-500">Dari Tanggal</label>
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              />
            </div>
            <div>
              <label className="block mb-1 text-slate-500">Sampai Tanggal</label>
              <input
                type="date"
                value={tanggalAkhir}
                onChange={(e) => setTanggalAkhir(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              />
            </div>
          </div>

          {/* Mandatory visible Cloud Masking block for Indonesia */}
          <div className="p-4 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={buangAwan}
                onChange={(e) => setBuangAwan(e.target.checked)}
                className="rounded accent-slate-900 w-4 h-4"
              />
              <span>Buang piksel berawan otomatis (disarankan untuk wilayah Indonesia)</span>
            </label>

            <div className="flex items-center gap-3">
              <span className="text-slate-500">Batas awan maksimum per citra:</span>
              <input
                type="number"
                min={5}
                max={100}
                value={batasAwan}
                onChange={(e) => setBatasAwan(Number(e.target.value))}
                className="w-20 p-1.5 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 tabular-nums"
              />
              <span>%</span>
            </div>

            <div className="flex items-start gap-2 text-[11px] text-slate-600 dark:text-slate-300">
              <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
              <span>
                Indonesia sering tertutup awan. PetaLab menggabungkan beberapa citra dalam rentang tanggal ini dan mengambil nilai tengahnya (komposit median) supaya hasilnya bersih. Rentang 2–3 bulan biasanya cukup.
              </span>
            </div>

            {scenes && (
              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>{scenes.summary}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between">
            <button onClick={() => setStep(2)} className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600">
              ← Kembali
            </button>
            <button
              onClick={() => setStep(4)}
              className="px-5 py-2.5 rounded bg-slate-900 dark:bg-teal-700 text-white"
            >
              Lanjut ke Pratinjau Peta →
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: INSTANT TILE PREVIEW & PRE-DOWNLOAD SIZE/TILE ESTIMATION (§6.2, §7.2, §7.3) */}
      {step === 4 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Live Interactive Preview Map */}
          <div className="lg:col-span-2 p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="text-sm">Pratinjau Langsung: {selectedPreset?.name}</h2>
                <p className="text-[11px] text-slate-400">
                  Pratinjau menggunakan tile ringan — tidak mengunduh file besar dan hampir tidak memakai kuota.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">Palet:</span>
                <select
                  value={previewCmap}
                  onChange={(e) => setPreviewCmap(e.target.value)}
                  className="px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  <option value="rdylgn">Hijau Vegetasi (NDVI)</option>
                  <option value="terrain">Terrain (Elevasi DEM)</option>
                  <option value="magma">Magma (Suhu / Cahaya)</option>
                  <option value="blues">Biru (Air / Curah Hujan)</option>
                  <option value="viridis">Viridis (Aman Buta Warna)</option>
                </select>
              </div>
            </div>

            <div ref={previewMapContainer} className="w-full h-96 rounded overflow-hidden border border-slate-200 dark:border-slate-700" />

            <div className="text-[10px] text-slate-400 flex items-center justify-between">
              <span>Atribusi Dataset: {selectedPreset?.attribution}</span>
              <span>© OpenStreetMap contributors</span>
            </div>
          </div>

          {/* Right Estimation & Download Commit Card */}
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-4 flex flex-col justify-between">
            <div className="space-y-3.5">
              <h3 className="text-sm">Estimasi & Pengaturan Unduhan</h3>

              <div>
                <label className="block mb-1 text-slate-500">
                  Resolusi Piksel / Scale (meter — asli {selectedPreset?.native_scale_m} m)
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={scaleM}
                    onChange={(e) => setScaleM(Number(e.target.value))}
                    className="flex-1 p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent tabular-nums"
                  />
                  {selectedPreset && scaleM < selectedPreset.native_scale_m && (
                    <button
                      onClick={() => setScaleM(selectedPreset.native_scale_m)}
                      className="px-2.5 py-2 rounded bg-orange-100 text-orange-900 text-[11px]"
                    >
                      Pakai {selectedPreset.native_scale_m} m
                    </button>
                  )}
                </div>
                {plan?.scale_warning && (
                  <p className="text-[11px] text-orange-600 mt-1">{plan.scale_warning}</p>
                )}
              </div>

              <div>
                <label className="block mb-1 text-slate-500">Nama Layer Hasil (Opsional)</label>
                <input
                  type="text"
                  value={outputName}
                  onChange={(e) => setOutputName(e.target.value)}
                  placeholder={`gee_${selectedPresetId.replace('gee.', '')}_${tanggalMulai.slice(0, 7).replace('-', '')}`}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                />
              </div>

              {/* Mandatory Pre-Download Estimate Box (§7.2) */}
              {plan && (
                <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1.5 tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Perkiraan Ukuran:</span>
                    <span>{formatNumber(plan.est_mb, 2)} MB</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dimensi Grid:</span>
                    <span>
                      {formatNumber(plan.width_px)} × {formatNumber(plan.height_px)} piksel
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Jalur Pengambilan:</span>
                    <span>
                      {plan.n_tiles > 1
                        ? `Berpetak otomatis (${plan.n_tiles} bagian)`
                        : 'Unduh langsung (1 bagian)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Perkiraan Waktu:</span>
                    <span>
                      {plan.est_seconds_min}–{plan.est_seconds_max} detik
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowPython(!showPython)}
                className="w-full py-2 rounded border border-slate-300 dark:border-slate-600 flex items-center justify-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>{showPython ? 'Sembunyikan Kode Python (ee)' : 'Lihat & Salin Kode Python (ee)'}</span>
              </button>

              {showPython && (
                <div className="rounded bg-slate-900 border border-slate-700 overflow-hidden">
                  <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-slate-800 text-[10px] text-slate-400">
                    <span>Python Earth Engine API</span>
                    <button
                      onClick={() => {
                        navigator.clipboard?.writeText(pythonSnippet);
                        addToast({ type: 'success', title: 'Kode Python (ee) disalin ke clipboard' });
                      }}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                      Salin Kode
                    </button>
                  </div>
                  <pre className="p-2.5 text-teal-300 font-mono text-[10px] overflow-x-auto max-h-36">
                    {pythonSnippet}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
              <button
                onClick={() => setStep(selectedPreset?.dated ? 3 : 2)}
                className="px-3.5 py-2.5 rounded border border-slate-300 dark:border-slate-600"
              >
                ← Ubah
              </button>
              <button
                onClick={handleStartDownload}
                disabled={Boolean(plan?.scale_warning)}
                className="flex-1 py-2.5 rounded bg-slate-900 dark:bg-teal-700 hover:opacity-90 text-white flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <Download className="w-4 h-4" />
                <span>Unduh jadi Layer Lokal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 5: LIVE WEBSOCKET JOB TRACKER & HANDOFF */}
      {step === 5 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-4 max-w-2xl">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-teal-700 dark:text-teal-400">
              {activeDownloadJob?.status === 'failed' ? (
                <AlertTriangle className="w-5 h-5 text-rose-500" />
              ) : (
                <CheckCircle2
                  className={`w-5 h-5 ${
 activeDownloadJob?.status === 'succeeded' ? 'text-emerald-600' : 'text-teal-600'
 }`}
                />
              )}
              <h2 className="text-base text-slate-900 dark:text-white">
                {activeDownloadJob?.status === 'succeeded'
                  ? 'Unduhan Katalog Bumi Selesai'
                  : activeDownloadJob?.status === 'failed'
                  ? 'Unduhan Katalog Bumi Gagal'
                  : 'Sedang Mengunduh Citra Katalog Bumi...'}
              </h2>
            </div>
            {activeDownloadJob && (
              <span className="text-[11px] font-mono tabular-nums px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700">
                {Math.round(activeDownloadJob.progress || 0)}%
              </span>
            )}
          </div>

          {activeDownloadJob && (
            <div className="space-y-1.5">
              <div className="w-full h-2 rounded-sm bg-slate-100 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full transition-all ${
 activeDownloadJob.status === 'failed'
 ? 'bg-rose-500'
 : activeDownloadJob.status === 'succeeded'
 ? 'bg-emerald-500'
 : 'bg-teal-700'
 }`}
                  style={{ width: `${Math.max(8, activeDownloadJob.progress || 0)}%` }}
                />
              </div>
              <div className="text-[11px] text-slate-500">{activeDownloadJob.message}</div>
              {activeDownloadJob.error_user && (
                <div className="p-2.5 rounded bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-[11px]">
                  {activeDownloadJob.error_user}
                </div>
              )}
            </div>
          )}

          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            Layer raster hasil unduhan disimpan secara permanen dalam format <b>GeoTIFF lokal</b> lengkap dengan atribusi ilmiah <i>({selectedPreset?.attribution})</i>. Setelah selesai, layer ini dapat digunakan oleh semua alat Raster, Zonal Statistics, dan Machine Learning.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              disabled={activeDownloadJob !== null && activeDownloadJob.status !== 'succeeded'}
              onClick={async () => {
                await refreshLayers();
                setActiveTab('map');
              }}
              className="px-4 py-2.5 rounded bg-slate-900 dark:bg-teal-700 text-white flex items-center gap-2 disabled:opacity-40"
            >
              <Eye className="w-4 h-4" /> Lihat Layer di Studio Peta
            </button>
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2.5 rounded border border-slate-300 dark:border-slate-600"
            >
              Ambil Dataset Lain
            </button>
          </div>
        </div>
      )}
    </div>
  );
};


// --- Module: pages/DataPage.tsx ---






const DataPage: React.FC = () => {
  const {
    projectId,
    layers,
    dataSubTab,
    lastImportReport,
    setActiveLayerId,
    setActiveTab,
    setDataSubTab,
    setLastImportReport,
    refreshLayers,
    addToast,
  } = usePetaStore();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showTrash, setShowTrash] = useState(false);
  const [trashedLayers, setTrashedLayers] = useState<LayerItem[]>([]);
  const [selectedInfoLayer, setSelectedInfoLayer] = useState<LayerItem | null>(null);

  // Optional Coordinate Wizard overrides
  const [crsOverride, setCrsOverride] = useState('');
  const [swapLatLon, setSwapLatLon] = useState(false);

  // OpenStreetMap Overpass Downloader state
  const [osmCategories, setOsmCategories] = useState<string[]>(['sekolah', 'rumah_sakit']);
  const [osmRefLayerId, setOsmRefLayerId] = useState('');
  const [osmCustomTag, setOsmCustomTag] = useState('');

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        if (crsOverride.trim()) fd.append('crs_override', crsOverride.trim());
        if (swapLatLon) fd.append('swap_latlon', 'true');

        const res = await api.uploadLayer(projectId, fd);
        setLastImportReport(res.report);
        setActiveLayerId(res.layer.id);
        addToast({
          type: 'success',
          title: `Layer '${res.layer.name}' berhasil diimpor!`,
          message: res.report?.summary,
        });
      }
      await refreshLayers();
    } catch (err: any) {
      addToast({
        type: 'error',
        title: err.message || 'Gagal mengimpor file',
        message: err.hint,
      });
    } finally {
      setUploading(false);
    }
  };

  const loadTrash = async () => {
    const all = await api.listLayers(projectId, true);
    setTrashedLayers(all.filter((l) => l.deleted_at));
  };

  const handleOsmDownload = async () => {
    const refLayer = layers.find((l) => l.id === osmRefLayerId) || layers.find((l) => l.bbox);
    const bbox = refLayer?.bbox || [112.71, -7.30, 112.77, -7.24];
    try {
      const res = await api.osmDownload({
        project_id: projectId,
        bbox,
        categories: osmCategories,
        custom_tag: osmCustomTag || undefined,
      });
      addToast({
        type: 'info',
        title: 'Unduhan OpenStreetMap Dimulai',
        message: `Area ±${res.estimated_area_km2} km² sedang diproses di latar belakang.`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal mengunduh OSM', message: err.message });
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden text-xs">
      {/* Unified Sumber Data Sub-Navigation (Zero Overlap: Library | Local Upload | OSM | Earth Catalog GEE) */}
      <div className="shrink-0 px-6 py-2.5 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: 'library', label: `Pustaka Layer (${layers.length})`, icon: Table },
            { id: 'upload', label: 'Unggah File Lokal', icon: UploadCloud },
            { id: 'osm', label: 'Unduh OpenStreetMap', icon: DownloadCloud },
            { id: 'earth', label: 'Katalog Bumi (GEE)', icon: Globe },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = dataSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDataSubTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded transition ${
 active
 ? 'bg-slate-900 dark:bg-teal-700 text-white shadow-sm'
 : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        <span className="text-[11px] text-slate-400">
          Satu pusat akuisisi & manajemen data proyek (File Lokal, OSM, & Citra Satelit GEE)
        </span>
      </div>

      {dataSubTab === 'earth' ? (
        <div className="flex-1 overflow-hidden">
          <EarthCatalogPage embedded />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-7xl w-full mx-auto">
      {/* Drag & Drop Upload Zone (shown in 'upload' tab, plus quick compact trigger in 'library') */}
      {dataSubTab === 'upload' && (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
        className="p-6 rounded-md border border-dashed border-teal-500/60 dark:border-teal-800 bg-teal-50/30 dark:bg-slate-800/70 flex flex-col items-center justify-center text-center space-y-3"
      >
        <div className="w-12 h-12 rounded-md bg-teal-700 text-white flex items-center justify-center">
          <UploadCloud className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-base font-medium tracking-tight text-slate-800 dark:text-slate-100">
            Tarik & Lepas File Data Spasial / Tabel ke Sini
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mendukung: <b>Shapefile (.zip)</b> · <b>GeoJSON</b> · <b>GeoPackage (.gpkg)</b> · <b>KML</b> ·{' '}
            <b>CSV / Excel (.xlsx)</b> · <b>GeoParquet</b> · <b>GeoTIFF Raster (.tif)</b>
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".zip,.shp,.geojson,.json,.gpkg,.kml,.csv,.xlsx,.xls,.parquet,.tif,.tiff"
            onChange={(e) => handleFileUpload(e.target.files)}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 rounded bg-teal-700 hover:bg-teal-800 text-white font-normal"
          >
            <FileUp className="w-4 h-4" />
            <span>{uploading ? 'Sedang Membaca & Memvalidasi...' : 'Pilih File dari Komputer'}</span>
          </button>

          <input
            type="text"
            value={crsOverride}
            onChange={(e) => setCrsOverride(e.target.value)}
            placeholder="CRS Manual (opsional, mis: EPSG:4326)"
            className="px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 w-56"
          />

          <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={swapLatLon}
              onChange={(e) => setSwapLatLon(e.target.checked)}
              className="rounded accent-teal-700"
            />
            <span>Tukar Lintang/Bujur jika terbalik</span>
          </label>
        </div>
      </div>
      )}

      {/* Beginner-Friendly Import Report Card */}
      {lastImportReport && (dataSubTab === 'upload' || dataSubTab === 'library') && (
        <div className="p-4 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-medium tracking-tight text-sm text-emerald-900 dark:text-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>Laporan Impor: {lastImportReport.layer_name} berhasil dibaca</span>
            </div>
            <button onClick={() => setLastImportReport(null)} aria-label="Tutup Laporan Impor" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-emerald-800 dark:text-emerald-300 font-medium">• {lastImportReport.summary}</p>
          {(lastImportReport.fixes_applied || []).map((fix: string, idx: number) => (
            <p key={idx} className="text-orange-800 dark:text-orange-300 font-medium">
               {fix}
            </p>
          ))}
          {(lastImportReport.tips || []).map((tip: string, idx: number) => (
            <p key={idx} className="text-teal-800 dark:text-teal-300">
               {tip}
            </p>
          ))}
        </div>
      )}

      {/* Pustaka Layer Aktif + Panel Info Lineage */}
      {dataSubTab === 'library' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-medium tracking-tight">Pustaka Layer Proyek ({layers.length})</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setDataSubTab('upload')}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-700 text-white text-xs hover:bg-teal-800"
              >
                <FileUp className="w-3.5 h-3.5" /> + Unggah File
              </button>
              <button
                onClick={async () => {
                  if (!showTrash) await loadTrash();
                  setShowTrash(!showTrash);
                }}
                className="flex items-center gap-1 text-xs font-normal text-slate-500 hover:text-teal-700"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{showTrash ? 'Tutup Sampah' : 'Lihat Sampah (Pulihkan Layer)'}</span>
              </button>
            </div>
          </div>

          <div className="space-y-2.5">
            {layers.map((lyr) => (
              <div
                key={lyr.id}
                className="p-3.5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-normal uppercase bg-teal-50 dark:bg-teal-900/50 text-teal-800 dark:text-teal-300">
                      {lyr.geom_type || lyr.kind}
                    </span>
                    <h4 className="font-normal text-sm">{lyr.name}</h4>
                  </div>
                  <div className="text-[11px] text-slate-500 flex flex-wrap items-center gap-3">
                    <span>
                      <b>{formatNumber(lyr.feature_count)}</b> {lyr.kind === 'raster' ? 'band' : 'fitur'}
                    </span>
                    <span>• CRS: {lyr.crs || 'Non-spasial'}</span>
                    <span>• Ukuran kerja: {formatBytes(lyr.size_bytes)}</span>
                    {lyr.lineage?.tool_name && (
                      <span className="text-teal-700 dark:text-teal-400 font-medium">
                        • Asal: {lyr.lineage.tool_name}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {lyr.kind !== 'table' && (
                    <button
                      onClick={() => {
                        setActiveLayerId(lyr.id);
                        setActiveTab('map');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded bg-teal-700 text-white font-normal hover:bg-teal-800"
                    >
                      <Eye className="w-3.5 h-3.5" /> Lihat di Peta
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setActiveLayerId(lyr.id);
                      setActiveTab('table');
                    }}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                  >
                    <Table className="w-3.5 h-3.5" /> Tabel
                  </button>
                  <button
                    onClick={() => setSelectedInfoLayer(lyr)}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
                  >
                    <Info className="w-3.5 h-3.5" /> Info & Asal-usul
                  </button>
                  <button
                    onClick={async () => {
                      await api.duplicateLayer(lyr.id, projectId);
                      await refreshLayers();
                      addToast({ type: 'success', title: `Layer '${lyr.name}' diduplikasi` });
                    }}
                    className="p-1.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
                    title="Duplikat Layer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={async () => {
                      await api.deleteLayer(lyr.id, projectId);
                      await refreshLayers();
                      if (showTrash) await loadTrash();
                      addToast({
                        type: 'info',
                        title: `Layer '${lyr.name}' dipindahkan ke Sampah`,
                        message: 'Dapat dipulihkan kapan saja dalam 7 hari.',
                      });
                    }}
                    className="p-1.5 rounded border border-rose-200 text-rose-600 hover:bg-rose-50"
                    title="Pindahkan ke Sampah"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Trash Bin Recovery */}
          {showTrash && (
            <div className="p-4 rounded-md bg-slate-100 dark:bg-slate-800/90 border border-slate-300 dark:border-slate-700 space-y-2">
              <h4 className="font-normal text-slate-700 dark:text-slate-200"> Sampah Layer (Soft Delete 7 Hari)</h4>
              {trashedLayers.length === 0 ? (
                <p className="text-slate-500">Sampah kosong.</p>
              ) : (
                trashedLayers.map((tl) => (
                  <div key={tl.id} className="flex items-center justify-between bg-white dark:bg-slate-800 p-2.5 rounded">
                    <span>
                      <b>{tl.name}</b> (dihapus {tl.deleted_at?.slice(0, 19)})
                    </span>
                    <button
                      onClick={async () => {
                        await api.restoreLayer(tl.id, projectId);
                        await refreshLayers();
                        await loadTrash();
                        addToast({ type: 'success', title: `Layer '${tl.name}' berhasil dipulihkan!` });
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-700 hover:bg-teal-800 text-white font-normal"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Pulihkan
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Right Column: Layer Info & Lineage Inspector */}
        <div className="space-y-4">
          {selectedInfoLayer ? (
            <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-teal-300 dark:border-teal-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-normal text-sm">Detail & Asal-usul Layer</h4>
                <button onClick={() => setSelectedInfoLayer(null)} aria-label="Tutup Detail Layer" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-1 text-[11px]">
                <div>
                  <b>Nama:</b> {selectedInfoLayer.name}
                </div>
                <div>
                  <b>File Internal:</b> <code className="font-mono">{selectedInfoLayer.path}</code>
                </div>
                {selectedInfoLayer.bbox && (
                  <div>
                    <b>Bounding Box:</b> [{selectedInfoLayer.bbox.map((x) => x.toFixed(4)).join(', ')}]
                  </div>
                )}
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 mt-2">
                  <div className="font-normal flex items-center gap-1 text-teal-700 mb-1">
                    <GitBranch className="w-3.5 h-3.5" /> Lineage (Riwayat Asal-usul):
                  </div>
                  <pre className="text-[10px] whitespace-pre-wrap font-mono overflow-x-auto">
                    {JSON.stringify(selectedInfoLayer.lineage, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 space-y-2">
              <h4 className="text-sm text-slate-800 dark:text-slate-200">Inspektor Asal-usul Layer</h4>
              <p className="text-[11px] leading-relaxed">
                Klik tombol <b>Info &amp; Asal-usul</b> pada salah satu layer di sebelah kiri untuk melihat CRS, bounding box, sumber dataset, dan atribusi ilmiahnya.
              </p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* OpenStreetMap Overpass Downloader Tab */}
      {dataSubTab === 'osm' && (
          <div className="max-w-2xl p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-teal-700" />
              <div>
                <h3 className="font-normal text-sm">Unduh Data Vektor dari OpenStreetMap</h3>
                <p className="text-[11px] text-slate-500">Overpass API live (garis jalan/sungai, poligon bangunan/taman, &amp; titik fasilitas)</p>
              </div>
            </div>

            <div>
              <label className="block font-normal mb-1">1. Batas Wilayah Unduhan</label>
              <select
                value={osmRefLayerId}
                onChange={(e) => setOsmRefLayerId(e.target.value)}
                className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              >
                {layers
                  .filter((l) => l.bbox)
                  .map((l) => (
                    <option key={l.id} value={l.id} className="dark:bg-slate-800">
                      Sesuai cakupan: {l.name}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block font-normal mb-1">2. Pilih Kategori Objek OSM</label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'jalan', label: 'Jalan (Garis)' },
                  { id: 'bangunan', label: 'Bangunan (Poligon)' },
                  { id: 'sungai', label: 'Sungai (Garis)' },
                  { id: 'sekolah', label: 'Sekolah (Titik)' },
                  { id: 'rumah_sakit', label: 'Rumah Sakit (Titik)' },
                  { id: 'taman', label: 'Taman (Poligon)' },
                  { id: 'tempat_ibadah', label: 'Tempat Ibadah (Titik)' },
                ].map((cat) => (
                  <label
                    key={cat.id}
                    className="flex items-center gap-1.5 p-1.5 rounded border border-slate-200 dark:border-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={osmCategories.includes(cat.id)}
                      onChange={(e) => {
                        if (e.target.checked) setOsmCategories([...osmCategories, cat.id]);
                        else setOsmCategories(osmCategories.filter((x) => x !== cat.id));
                      }}
                      className="rounded accent-teal-700"
                    />
                    <span>{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              onClick={handleOsmDownload}
              disabled={osmCategories.length === 0}
              className="w-full py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-normal flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <DownloadCloud className="w-4 h-4" />
              <span>Unduh &amp; Jadikan Layer</span>
            </button>
          </div>
      )}
        </div>
      )}
    </div>
  );
};


// --- Module: pages/ProcessingPage.tsx ---




const ProcessingPage: React.FC = () => {
  const {
    projectId,
    layers,
    tools,
    selectedToolId,
    selectionsByLayer,
    mode,
    setSelectedToolId,
    setPreviewGeoJSON,
    setActiveTab,
    addToast,
  } = usePetaStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeGroup, setActiveGroup] = useState<string>('Semua');
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [pythonSnippet, setPythonSnippet] = useState<string>('');
  const [previewResult, setPreviewResult] = useState<any | null>(null);
  const [runningPreview, setRunningPreview] = useState(false);

  // Anti-overlap: keep GEE satellite downloaders in Sumber Data -> Katalog Bumi and Clustering in Model ML
  // (gee.zonal_direct remains here because it is a vector-to-raster spatial analysis operation!)
  const canonicalTools = tools.filter(
    (t) => t.id !== 'stats.clustering' && (!t.id.startsWith('gee.') || t.id === 'gee.zonal_direct')
  );

  const selectedTool: ToolSchema | null =
    canonicalTools.find((t) => t.id === selectedToolId) || canonicalTools[0] || null;

  // Populate default form values whenever selected tool or layers change
  useEffect(() => {
    if (!selectedTool) return;
    const defaults: Record<string, any> = {};
    const vectorLayers = layers.filter((l) => l.kind === 'vector');
    const rasterLayers = layers.filter((l) => l.kind === 'raster');

    selectedTool.fields.forEach((f) => {
      if (f.type === 'layer') {
        if (f.kind === 'raster') {
          const r = rasterLayers[0];
          defaults[f.name] = r ? { id: r.id, name: r.name } : { id: '', name: '' };
        } else {
          // Match preferred geometry if specified
          const preferred = f.geom
            ? vectorLayers.find((l) => l.geom_type && f.geom?.includes(l.geom_type)) || vectorLayers[0]
            : vectorLayers[0];
          defaults[f.name] = preferred ? { id: preferred.id, name: preferred.name } : { id: '', name: '' };
        }
      } else if (f.column_of) {
        const refLayerId = defaults[f.column_of]?.id || vectorLayers[0]?.id;
        const refLayer = layers.find((l) => l.id === refLayerId);
        const numCol = refLayer?.schema.find((s) => s.type === 'number' || s.type === 'integer')?.name;
        defaults[f.name] = numCol || refLayer?.schema[0]?.name || '';
      } else {
        defaults[f.name] = f.default ?? '';
      }
    });
    setFormValues(defaults);
    setPythonSnippet('');
    setPreviewResult(null);
  }, [selectedTool?.id, projectId, layers.map((l) => l.id).join(',')]);

  const groups = ['Semua', ...Array.from(new Set(canonicalTools.map((t) => t.group)))];

  const filteredTools = canonicalTools.filter((t) => {
    const matchGroup = activeGroup === 'Semua' || t.group === activeGroup;
    const q = searchQuery.trim().toLowerCase();
    const matchSearch =
      !q ||
      t.name.toLowerCase().includes(q) ||
      t.technical_name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q);
    return matchGroup && matchSearch;
  });

  const handlePreview = async () => {
    if (!selectedTool) return;
    setRunningPreview(true);
    try {
      const res = await api.previewTool(selectedTool.id, {
        project_id: projectId,
        params: formValues,
        selected_fids_by_layer: selectionsByLayer,
      });
      setPreviewResult(res.preview);
      setPythonSnippet(res.python_code);
      if (res.geojson) {
        setPreviewGeoJSON(res.geojson);
        addToast({
          type: 'info',
          title: 'Pratinjau Siap di Peta',
          message: `Pratinjau (${res.preview?.feature_count || 'sampel'} fitur) ditampilkan dengan garis tosca putus-putus di Peta.`,
        });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Pratinjau belum berhasil', message: err.message, hint: err.hint });
    } finally {
      setRunningPreview(false);
    }
  };

  const handleRunFull = async () => {
    if (!selectedTool) return;
    try {
      const res = await api.runTool(selectedTool.id, {
        project_id: projectId,
        params: formValues,
        selected_fids_by_layer: selectionsByLayer,
      });
      setPythonSnippet(res.python_code);
      setPreviewGeoJSON(null);
      addToast({
        type: 'info',
        title: `Menjalankan ${selectedTool.name}...`,
        message: 'Progress dapat dipantau di Job Tray kanan bawah.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal menjalankan tool', message: err.message });
    }
  };

  const renderFieldInput = (field: ToolFieldSchema) => {
    const val = formValues[field.name];

    if (field.type === 'layer') {
      const eligibleLayers = layers.filter((l) =>
        field.kind === 'raster' ? l.kind === 'raster' : l.kind === 'vector'
      );
      return (
        <select
          value={val?.id || ''}
          onChange={(e) => {
            const lyr = layers.find((l) => l.id === e.target.value);
            setFormValues({
              ...formValues,
              [field.name]: lyr ? { id: lyr.id, name: lyr.name } : { id: '', name: '' },
            });
          }}
          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 font-medium"
        >
          <option value="">-- Pilih Layer --</option>
          {eligibleLayers.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.geom_type || l.kind} · {l.feature_count})
            </option>
          ))}
        </select>
      );
    }

    if (field.column_of) {
      const targetLayerId = formValues[field.column_of]?.id;
      const targetLayer = layers.find((l) => l.id === targetLayerId) || layers[0];
      const cols = (targetLayer?.schema || []).filter((s) => s.name !== '_fid');
      return (
        <select
          value={val || ''}
          onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value || null })}
          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
        >
          <option value="">-- Pilih Kolom --</option>
          {cols.map((c) => (
            <option key={c.name} value={c.name}>
              {c.name} ({c.type})
            </option>
          ))}
        </select>
      );
    }

    if (field.enum && field.enum.length > 0) {
      return (
        <select
          value={val ?? field.default ?? ''}
          onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value })}
          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
        >
          {field.enum.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
    }

    if (field.type === 'boolean') {
      const primaryLayerId = formValues.input?.id || formValues.target?.id || formValues.polygons?.id || formValues.zones?.id;
      const selCount = (primaryLayerId && selectionsByLayer[primaryLayerId]?.length) || 0;
      return (
        <label className="flex items-center gap-2 cursor-pointer py-1 font-medium">
          <input
            type="checkbox"
            checked={Boolean(val)}
            onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.checked })}
            className="rounded accent-teal-700 w-4 h-4"
          />
          <span>
            {field.title}
            {field.name === 'only_selected' && ` (${selCount} terpilih)`}
          </span>
        </label>
      );
    }

    if (field.type === 'number' || field.type === 'integer') {
      return (
        <input
          type="number"
          step={field.type === 'integer' ? 1 : 'any'}
          value={val ?? ''}
          onChange={(e) =>
            setFormValues({
              ...formValues,
              [field.name]: e.target.value === '' ? '' : Number(e.target.value),
            })
          }
          className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 tabular-nums"
        />
      );
    }

    return (
      <input
        type="text"
        value={val ?? ''}
        onChange={(e) => setFormValues({ ...formValues, [field.name]: e.target.value || null })}
        placeholder={field.name === 'output_name' ? 'Otomatis jika dikosongkan...' : ''}
        className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700"
      />
    );
  };

  return (
    <div className="flex h-full w-full overflow-hidden text-xs">
      {/* Left Catalog Sidebar */}
      <div className="w-96 shrink-0 h-full border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-teal-700" />
            <h2 className="text-sm font-medium tracking-tight">Kotak Alat Geoprocessing ({canonicalTools.length})</h2>
          </div>

          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-slate-400 absolute left-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Cari: "buffer", "zona", "potong", "ndvi", "hotspot"...'
              className="w-full pl-9 pr-3 py-2 rounded bg-slate-100 dark:bg-slate-700 focus:outline-none focus:border-teal-600"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {groups.map((g) => (
              <button
                key={g}
                onClick={() => setActiveGroup(g)}
                className={`px-2.5 py-1 rounded font-normal text-[11px] transition ${
 activeGroup === g
 ? 'bg-teal-700 text-white'
 : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
 }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Tool Cards List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredTools.map((tool) => {
            const isSelected = selectedTool?.id === tool.id;
            const levelBadge =
              tool.level === 'pemula'
                ? 'bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                : tool.level === 'menengah'
                ? 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                : 'bg-orange-50 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300';

            return (
              <div
                key={tool.id}
                onClick={() => setSelectedToolId(tool.id)}
                className={`p-3 rounded-md border transition cursor-pointer ${
 isSelected
 ? 'border-teal-700 bg-teal-50/60 dark:bg-teal-950/40 shadow-sm'
 : 'border-slate-200 dark:border-slate-700 hover:border-teal-400'
 }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-normal text-slate-900 dark:text-slate-100">{tool.name}</h3>
                    <span className="text-[11px] text-teal-700 dark:text-teal-400 font-normal">
                      ({tool.technical_name})
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-sm text-[10px] font-normal capitalize ${levelBadge}`}>
                    {tool.level}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2">
                  {tool.description}
                </p>
                <div className="mt-2 inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700/70 font-mono text-[10px] text-slate-600 dark:text-slate-300">
                  {tool.illustration}
                </div>
              </div>
            );
          })}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5 text-[11px] text-slate-500">
            <button
              onClick={() => setActiveTab('earth')}
              className="w-full text-left px-3 py-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-700 transition"
            >
              Unduh citra satelit GEE → <b className="text-teal-700">Sumber Data · Katalog Bumi</b>
            </button>
            <button
              onClick={() => setActiveTab('model')}
              className="w-full text-left px-3 py-2 rounded bg-slate-50 dark:bg-slate-900 hover:bg-teal-50 dark:hover:bg-slate-700 transition"
            >
              Clustering K-Means / DBSCAN → <b className="text-teal-700">Model ML</b>
            </button>
          </div>
        </div>
      </div>

      {/* Right Main Form Area (Auto-generated from Backend Pydantic JSON Schema) */}
      <div className="flex-1 h-full overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
        {selectedTool ? (
          <div className="max-w-2xl mx-auto space-y-5">
            <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
              {/* Tool Header */}
              <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-normal uppercase tracking-wider text-teal-700">
                    {selectedTool.group}
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-700 font-mono text-xs font-normal">
                    {selectedTool.illustration}
                  </span>
                </div>
                <h1 className="text-xl font-medium tracking-tight text-slate-900 dark:text-white mt-1">
                  {selectedTool.name}{' '}
                  <span className="text-sm font-normal text-slate-400">({selectedTool.technical_name})</span>
                </h1>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                  <b>Apa ini?</b> {selectedTool.description}
                </p>
              </div>

              {/* Primary Beginner Fields */}
              <div className="space-y-3.5">
                {selectedTool.fields
                  .filter((f) => !f.advanced)
                  .map((field) => (
                    <div key={field.name}>
                      {field.type !== 'boolean' && (
                        <label className="block font-normal text-slate-700 dark:text-slate-200 mb-1">
                          {field.title} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                      )}
                      {renderFieldInput(field)}
                    </div>
                  ))}
              </div>

              {/* Advanced Options Accordion */}
              {selectedTool.fields.some((f) => f.advanced) && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="text-xs font-normal text-teal-700 hover:underline flex items-center gap-1"
                  >
                    <span>{showAdvanced || mode === 'lanjut' ? '▾ Sembunyikan' : '▸ Tampilkan'} Opsi Lanjutan</span>
                  </button>
                  {(showAdvanced || mode === 'lanjut') && (
                    <div className="mt-3 space-y-3 pl-3 border-l-2 border-teal-200 dark:border-teal-800">
                      {selectedTool.fields
                        .filter((f) => f.advanced)
                        .map((field) => (
                          <div key={field.name}>
                            {field.type !== 'boolean' && (
                              <label className="block font-normal text-slate-700 dark:text-slate-200 mb-1">
                                {field.title}
                              </label>
                            )}
                            {renderFieldInput(field)}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              )}

              {/* Automatic Metric CRS & Non-Destructive Assurance Banner */}
              <div className="p-3 rounded bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-[11px] text-teal-900 dark:text-teal-200 space-y-1">
                <div className="flex items-center gap-1.5 font-normal">
                  <Info className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>Jarak & luas dihitung otomatis menggunakan proyeksi UTM lokal (meter) agar akurat.</span>
                </div>
                <div className="text-slate-600 dark:text-slate-400 pl-5">
                  Estimasi eksekusi: &lt; 2 detik · Non-destruktif (data asli tetap aman, hasil menjadi layer baru).
                </div>
              </div>

              {/* Action Buttons: Preview, Copy Python Code, Run */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePreview}
                    disabled={runningPreview}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal"
                  >
                    <Eye className="w-4 h-4 text-teal-700" />
                    <span>{runningPreview ? 'Menghitung...' : 'Pratinjau Sampel'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      const res = await api.previewTool(selectedTool.id, {
                        project_id: projectId,
                        params: formValues,
                      });
                      setPythonSnippet(res.python_code);
                      navigator.clipboard?.writeText(res.python_code);
                      addToast({ type: 'success', title: 'Kode Python GeoPandas disalin ke clipboard!' });
                    }}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal"
                  >
                    <Code2 className="w-4 h-4 text-teal-700" />
                    <span>Salin sebagai Kode Python</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleRunFull}
                  className="flex items-center gap-2 px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight transition"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Jalankan Proses</span>
                </button>
              </div>
            </div>

            {/* Preview Summary & Switch to Map Button */}
            {previewResult && (
              <div className="p-4 rounded-md bg-teal-50 dark:bg-teal-950/40 border border-teal-300 dark:border-teal-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-teal-700" />
                  <div>
                    <div className="font-normal text-teal-900 dark:text-teal-200">
                      Pratinjau Berhasil ({previewResult.feature_count || 'Sampel'} fitur)
                    </div>
                    <div className="text-[11px] text-teal-800 dark:text-teal-300">
                      Layer pratinjau telah digambar di kanvas Peta.
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setActiveTab('map')}
                  className="px-3 py-1.5 rounded bg-teal-700 text-white font-normal"
                >
                  Lihat Pratinjau di Peta →
                </button>
              </div>
            )}

            {/* Educational Python Code Box ("Fitur Belajar") */}
            {pythonSnippet && (
              <div className="p-4 rounded-md bg-slate-900 text-slate-100 space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-normal text-teal-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Kode Python GeoPandas Setara (Fitur Belajar)
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(pythonSnippet);
                      addToast({ type: 'success', title: 'Disalin ke clipboard' });
                    }}
                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                  >
                    Salin Kode
                  </button>
                </div>
                <pre className="text-xs font-mono overflow-x-auto text-teal-300 leading-relaxed">
                  {pythonSnippet}
                </pre>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
};


// --- Module: pages/ModelPage.tsx ---





const ModelPage: React.FC = () => {
  const {
    projectId,
    layers,
    models,
    jobs,
    mode,
    setActiveLayerId,
    setActiveTab,
    setPreviewGeoJSON,
    refreshLayers,
    refreshModels,
    addToast,
  } = usePetaStore();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [task, setTask] = useState<'regression' | 'classification' | 'clustering' | 'pixel'>('regression');

  const vectorLayers = layers.filter((l) => l.kind === 'vector');
  const rasterLayers = layers.filter((l) => l.kind === 'raster');

  const [trainLayerId, setTrainLayerId] = useState<string>(vectorLayers[0]?.id || '');
  const [pixelRasterLayerId, setPixelRasterLayerId] = useState<string>(rasterLayers[0]?.id || '');
  const [sampleLayerId, setSampleLayerId] = useState<string>('');
  const [targetCol, setTargetCol] = useState<string>('suhu_permukaan_c');
  const [featureCols, setFeatureCols] = useState<string[]>(['ndvi_rata', 'elevasi_m', 'kepadatan']);

  // Spatial Feature Builder state
  const [builderType, setBuilderType] = useState('distance_to');
  const [builderGeePreset, setBuilderGeePreset] = useState('gee.ndvi');
  const [builderTargetLayerId, setBuilderTargetLayerId] = useState('');
  const [builderRadiusM, setBuilderRadiusM] = useState(1000);
  const [builderColName, setBuilderColName] = useState('');
  const [buildingFeature, setBuildingFeature] = useState(false);
  const [auditWarnings, setAuditWarnings] = useState<any[]>([]);

  // Step 4: Spatial CV state
  const [cvMethod, setCvMethod] = useState<'spatial_block' | 'random' | 'group'>('spatial_block');
  const [blockSizeM, setBlockSizeM] = useState(3500);
  const [nSplits, setNSplits] = useState(5);
  const [groupCol, setGroupCol] = useState('wilayah');
  const [cvFoldSummary, setCvFoldSummary] = useState<{ fold: number; count: number }[]>([]);

  // Step 5: Training Preset / Algorithm state
  const [algorithm, setAlgorithm] = useState('seimbang');
  const [modelName, setModelName] = useState('Prediksi_Suhu_Surabaya');
  const [nClusters, setNClusters] = useState(4);
  const [autoTune, setAutoTune] = useState(false);
  const [balanceClasses, setBalanceClasses] = useState(true);

  // Step 6: Selected Model, Reactive WebSocket Training Job & Prediction target
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [predictTargetLayerId, setPredictTargetLayerId] = useState<string>('');
  const [lastTrainJobId, setLastTrainJobId] = useState<string | null>(null);

  // Python Console (Mode Lanjut)
  const [showConsole, setShowConsole] = useState(false);
  const [pyCode, setPyCode] = useState(
    '# Objek siap pakai: layers["kecamatan_surabaya"], gpd, pd, np, save_layer(gdf, "nama")\n' +
      'gdf = layers["kecamatan_surabaya"]\n' +
      'print("Jumlah kecamatan:", len(gdf))\n' +
      'print(gdf[["kecamatan", "penduduk", "suhu_permukaan_c"]].head())'
  );
  const [pyOutput, setPyOutput] = useState('');

  const trainLayer = layers.find((l) => l.id === trainLayerId) || vectorLayers[0] || null;

  // Keep selected training / raster / model IDs synchronized whenever project or layers switch
  useEffect(() => {
    if (!vectorLayers.some((l) => l.id === trainLayerId)) {
      setTrainLayerId(vectorLayers[0]?.id || '');
    }
    if (!rasterLayers.some((l) => l.id === pixelRasterLayerId)) {
      setPixelRasterLayerId(rasterLayers[0]?.id || '');
    }
    if (sampleLayerId && !vectorLayers.some((l) => l.id === sampleLayerId)) {
      setSampleLayerId('');
    }
    if (predictTargetLayerId && !vectorLayers.some((l) => l.id === predictTargetLayerId)) {
      setPredictTargetLayerId('');
    }
  }, [projectId, layers.map((l) => l.id).join(',')]);

  useEffect(() => {
    if (models.length === 0) {
      setSelectedModelId('');
    } else if (!models.some((m) => m.id === selectedModelId)) {
      setSelectedModelId(models[0].id);
    }
  }, [projectId, models.map((m) => m.id).join(',')]);

  useEffect(() => {
    if (!trainLayer) return;
    const numCols = trainLayer.schema
      .filter((s) => (s.type === 'number' || s.type === 'integer') && s.name !== '_fid')
      .map((s) => s.name);
    const strCols = trainLayer.schema
      .filter((s) => s.type === 'string' && !['kode_kec', 'kecamatan', 'nama', 'nama_sekolah'].includes(s.name))
      .map((s) => s.name);

    if (task === 'regression') {
      const defTarget = numCols.includes('suhu_permukaan_c') ? 'suhu_permukaan_c' : numCols[numCols.length - 1] || '';
      setTargetCol(defTarget);
      setFeatureCols(numCols.filter((c) => c !== defTarget));
    } else if (task === 'classification') {
      const defTarget = strCols.includes('kategori_banjir') ? 'kategori_banjir' : strCols[0] || numCols[0] || '';
      setTargetCol(defTarget);
      setFeatureCols(numCols.filter((c) => c !== defTarget && c !== 'skor_rawan_banjir'));
    } else if (task === 'clustering') {
      setFeatureCols(numCols.slice(0, 5));
    }
  }, [trainLayer?.id, task]);

  // Run leakage & imbalance audit when features or target change
  useEffect(() => {
    if (!trainLayer || task === 'clustering' || task === 'pixel') return;
    api
      .auditFeatures({
        project_id: projectId,
        layer_id: trainLayer.id,
        target_column: targetCol,
        feature_columns: featureCols,
        task,
      })
      .then((res) => setAuditWarnings(res.warnings || []))
      .catch(() => {});
  }, [trainLayer?.id, targetCol, featureCols.join(','), task, projectId]);

  const handleAddSpatialFeature = async () => {
    if (!trainLayer) return;
    setBuildingFeature(true);
    try {
      const spec: Record<string, any> = { type: builderType, name: builderColName || undefined };
      if (builderType === 'distance_to' || builderType === 'count_within') {
        spec.target_layer_id = builderTargetLayerId || vectorLayers.find((l) => l.id !== trainLayer.id)?.id;
        spec.radius_m = builderRadiusM;
      } else if (builderType === 'raster_value') {
        spec.raster_layer_id = rasterLayers[0]?.id;
        spec.band = 1;
      } else if (builderType === 'spatial_lag') {
        spec.column = targetCol || featureCols[0];
        spec.k = 5;
      } else if (builderType === 'gee_zonal') {
        spec.preset_id = builderGeePreset;
      }
      const res = await api.buildSpatialFeatures({
        project_id: projectId,
        layer_id: trainLayer.id,
        specs: [spec],
      });
      await refreshLayers();
      setFeatureCols((prev) => Array.from(new Set([...prev, ...(res.added_columns || [])])));
      addToast({
        type: 'success',
        title: 'Fitur Spasial Baru Ditambahkan!',
        message: `Kolom baru: ${(res.added_columns || []).join(', ')}`,
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal membuat fitur spasial', message: err.message });
    } finally {
      setBuildingFeature(false);
    }
  };

  const handlePreviewSpatialCV = async () => {
    if (!trainLayer) return;
    try {
      const res = await api.previewSpatialCV({
        project_id: projectId,
        layer_id: trainLayer.id,
        block_size_m: blockSizeM,
        n_splits: nSplits,
      });
      setCvFoldSummary(res.fold_summary || []);
      setPreviewGeoJSON(res.geojson);
      addToast({
        type: 'info',
        title: 'Blok Spatial CV Siap Ditampilkan',
        message: 'Pembagian blok wilayah per lipatan (Fold) telah digambar di Peta.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal membuat preview Spatial CV', message: err.message });
    }
  };

  const activeTrainJob = lastTrainJobId ? jobs.find((j) => j.id === lastTrainJobId) || null : null;

  useEffect(() => {
    if (!activeTrainJob) return;
    if (activeTrainJob.status === 'succeeded') {
      (async () => {
        await refreshModels();
        await refreshLayers();
        const newModelId = activeTrainJob.outputs?.id;
        if (newModelId) setSelectedModelId(newModelId);
        setLastTrainJobId(null);
        setStep(6);
      })();
    }
  }, [activeTrainJob?.status, activeTrainJob?.id]);

  const handleStartTraining = async () => {
    try {
      const res = await api.trainModel({
        project_id: projectId,
        params: {
          model_name: modelName,
          task,
          algorithm,
          layer_id: task === 'pixel' ? (pixelRasterLayerId || rasterLayers[0]?.id) : trainLayer?.id,
          raster_layer_id: pixelRasterLayerId || rasterLayers[0]?.id,
          sample_layer_id: sampleLayerId || undefined,
          target_column: targetCol,
          feature_columns: featureCols,
          cv_method: cvMethod,
          n_splits: nSplits,
          block_size_m: blockSizeM,
          group_column: groupCol,
          n_clusters: nClusters,
          auto_tune: autoTune,
          balance_classes: balanceClasses,
          create_output_layer: true,
        },
      });
      setLastTrainJobId(res.job_id);
      addToast({
        type: 'info',
        title: `Training '${modelName}' Dimulai`,
        message: 'Progress real-time dipantau via WebSocket; halaman akan pindah ke Rapor otomatis saat selesai.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal melatih model', message: err.message });
    }
  };

  const activeModel = models.find((m) => m.id === selectedModelId) || models[0] || null;

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto text-xs">
      {/* Wizard Progress Stepper */}
      <div className="p-4 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-teal-700" />
          <h1 className="text-base font-medium tracking-tight">Spatial Machine Learning & Training Wizard</h1>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { n: 1, label: '① Tujuan' },
            { n: 2, label: '② Data & Target' },
            { n: 3, label: '③ Fitur Spasial' },
            { n: 4, label: '④ Validasi Spasial' },
            { n: 5, label: '⑤ Training' },
            { n: 6, label: `⑥ Hasil & Rapor (${models.length})` },
          ].map((s) => (
            <button
              key={s.n}
              onClick={() => setStep(s.n as any)}
              className={`px-3 py-1.5 rounded font-normal transition ${
 step === s.n
 ? 'bg-teal-700 text-white shadow-sm'
 : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
 }`}
            >
              {s.label}
            </button>
          ))}

          {mode === 'lanjut' && (
            <button
              onClick={() => setShowConsole(!showConsole)}
              className="ml-2 flex items-center gap-1 px-3 py-1.5 rounded bg-slate-900 border border-slate-700 text-orange-400 font-normal"
            >
              <Terminal className="w-3.5 h-3.5" /> Konsol Python
            </button>
          )}
        </div>
      </div>

      {/* Advanced Mode Python Console Bridge */}
      {showConsole && (
        <div className="p-4 rounded-md bg-slate-900 text-slate-100 space-y-3 border border-slate-700 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-normal text-orange-400 flex items-center gap-1.5">
              <Terminal className="w-4 h-4" /> Konsol Python Interaktif (Mode Lanjut)
            </span>
            <button onClick={() => setShowConsole(false)} aria-label="Tutup Konsol Python" className="p-0.5 rounded text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            rows={5}
            value={pyCode}
            onChange={(e) => setPyCode(e.target.value)}
            className="w-full p-3 rounded bg-slate-950 text-teal-300 font-mono text-xs border border-slate-800 focus:outline-none"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Gunakan <code>layers["nama_layer"]</code> untuk mengakses GeoDataFrame dan <code>save_layer(gdf, "nama_baru")</code>.
            </span>
            <button
              onClick={async () => {
                const res = await api.runPythonConsole({ project_id: projectId, code: pyCode });
                setPyOutput(res.error ? `${res.output}\nERROR: ${res.error}` : res.output);
                if (res.created_layers?.length > 0) await refreshLayers();
              }}
              className="px-4 py-1.5 rounded bg-teal-700 hover:bg-teal-600 text-white font-normal"
            >
              ▶ Jalankan Script Python
            </button>
          </div>
          {pyOutput && (
            <pre className="p-3 rounded bg-black/60 text-slate-200 font-mono text-[11px] whitespace-pre-wrap">
              {pyOutput}
            </pre>
          )}
        </div>
      )}

      {/* STEP 1: TUJUAN */}
      {step === 1 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h2 className="text-base font-medium tracking-tight">① Apa tujuan pemodelan spasial yang ingin kamu lakukan?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                id: 'regression',
                title: 'Memprediksi Angka (Regresi Spasial)',
                sub: 'Regression',
                desc: 'Menebak nilai kontinu di setiap wilayah atau titik, misalnya: suhu permukaan (°C), harga tanah, atau skor kerawanan.',
                example: 'Contoh di proyek ini: Memprediksi suhu_permukaan_c dari NDVI, elevasi, dan kepadatan.',
              },
              {
                id: 'classification',
                title: 'Memprediksi Kategori (Klasifikasi Spasial)',
                sub: 'Classification',
                desc: 'Menebak kelas atau status suatu lokasi, misalnya: Rawan Tinggi / Sedang / Rendah.',
                example: 'Contoh di proyek ini: Memprediksi kategori_banjir per kecamatan.',
              },
              {
                id: 'clustering',
                title: 'Menemukan Kelompok Wilayah (Clustering)',
                sub: 'Unsupervised Spatial Clustering',
                desc: 'Mengelompokkan wilayah yang punya kemiripan karakteristik tanpa perlu kolom target.',
                example: 'Contoh: Segmentasi tipologi kecamatan Surabaya.',
              },
              {
                id: 'pixel',
                title: 'Klasifikasi Citra / Raster per Piksel',
                sub: 'Pixel-level Land Cover Classification',
                desc: 'Mengklasifikasi setiap piksel citra multi-band menjadi peta tutupan lahan (Vegetasi, Perairan, Terbangun).',
                example: 'Contoh: Klasifikasi tutupan lahan dari layer dem_citra_surabaya.',
              },
            ].map((card) => (
              <div
                key={card.id}
                onClick={() => {
                  setTask(card.id as any);
                  setModelName(
                    card.id === 'regression'
                      ? 'Prediksi_Suhu_Surabaya'
                      : card.id === 'classification'
                      ? 'Klasifikasi_Rawan_Banjir'
                      : card.id === 'clustering'
                      ? 'Klaster_Tipologi_Kecamatan'
                      : 'Tutupan_Lahan_Surabaya'
                  );
                }}
                className={`p-4 rounded-md border transition cursor-pointer ${
 task === card.id
 ? 'border-teal-700 bg-teal-50/50 dark:bg-teal-950/30'
 : 'border-slate-200 dark:border-slate-700 hover:border-teal-400'
 }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium tracking-tight">{card.title}</h3>
                  <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-normal text-[10px]">
                    {card.sub}
                  </span>
                </div>
                <p className="text-slate-600 dark:text-slate-300 mt-2 leading-relaxed">{card.desc}</p>
                <p className="text-[11px] text-teal-800 dark:text-teal-300 font-medium mt-2"> {card.example}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              className="px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight"
            >
              Lanjut ke Data & Target →
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: DATA & TARGET */}
      {step === 2 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-3xl">
          <h2 className="text-base font-medium tracking-tight">② Pilih Layer Data Latih & Kolom Target</h2>

          {task === 'pixel' ? (
            <div className="space-y-3">
              <div>
                <label className="block font-normal mb-1">Layer Citra Multi-Band</label>
                <select
                  value={pixelRasterLayerId || rasterLayers[0]?.id || ''}
                  onChange={(e) => setPixelRasterLayerId(e.target.value)}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
                >
                  {rasterLayers.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name} ({r.feature_count} band)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-normal mb-1">
                  Layer Sampel Latih Berlabel (Opsional — otomatis menggunakan aturan spektral NDVI/DEM jika dikosongkan)
                </label>
                <select
                  value={sampleLayerId}
                  onChange={(e) => setSampleLayerId(e.target.value)}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  <option value="">-- Otomatis Ekstrak Sampel Spektral (Vegetasi / Perairan / Terbangun) --</option>
                  {vectorLayers.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-normal mb-1">Layer Vektor Data Latih</label>
                <select
                  value={trainLayer?.id || ''}
                  onChange={(e) => setTrainLayerId(e.target.value)}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
                >
                  {vectorLayers.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.feature_count} fitur)
                    </option>
                  ))}
                </select>
              </div>

              {task !== 'clustering' && trainLayer && (
                <div>
                  <label className="block font-normal mb-1">Kolom Target yang Diprediksi (y)</label>
                  <select
                    value={targetCol}
                    onChange={(e) => setTargetCol(e.target.value)}
                    className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
                  >
                    {trainLayer.schema
                      .filter((s) => s.name !== '_fid')
                      .map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.type} · contoh: {String(s.sample)})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 font-normal"
            >
              ← Kembali
            </button>
            <button
              onClick={() => setStep(task === 'pixel' ? 5 : 3)}
              className="px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight"
            >
              Lanjut ke Pemilihan Fitur →
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: FITUR & SPATIAL FEATURE BUILDER */}
      {step === 3 && trainLayer && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
            <h2 className="text-base font-medium tracking-tight">③ Pilih Kolom Fitur Penjelas (X)</h2>
            <p className="text-slate-500">
              Centang kolom yang akan dipelajari model. Kolom ID dan teks nama otomatis tidak dicentang agar model tidak menghafal nama.
            </p>

            {/* Audit Warnings (Leakage / Imbalance) */}
            {auditWarnings.map((w, idx) => (
              <div
                key={idx}
                className="p-3 rounded bg-orange-50 dark:bg-orange-950/50 border border-orange-300 dark:border-orange-800 flex items-center justify-between gap-2 text-orange-900 dark:text-orange-200"
              >
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0" />
                  <span>{w.message}</span>
                </div>
                {w.column && (
                  <button
                    onClick={() => setFeatureCols(featureCols.filter((c) => c !== w.column))}
                    className="px-2.5 py-1 rounded bg-orange-200 dark:bg-orange-800 font-normal shrink-0"
                  >
                    Keluarkan '{w.column}'
                  </button>
                )}
              </div>
            ))}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {trainLayer.schema
                .filter((s) => s.name !== '_fid' && s.name !== targetCol)
                .map((s) => {
                  const checked = featureCols.includes(s.name);
                  return (
                    <label
                      key={s.name}
                      className={`flex items-center gap-2 p-2.5 rounded border cursor-pointer transition ${
 checked
 ? 'border-teal-700 bg-teal-50/50 dark:bg-teal-950/30 font-normal'
 : 'border-slate-200 dark:border-slate-700'
 }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) setFeatureCols([...featureCols, s.name]);
                          else setFeatureCols(featureCols.filter((c) => c !== s.name));
                        }}
                        className="rounded accent-teal-700"
                      />
                      <div className="truncate">
                        <div>{s.name}</div>
                        <div className="text-[10px] text-slate-400">{s.type}</div>
                      </div>
                    </label>
                  );
                })}
            </div>

            <div className="flex justify-between pt-3">
              <button
                onClick={() => setStep(2)}
                className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 font-normal"
              >
                ← Kembali
              </button>
              <button
                onClick={() => setStep(task === 'clustering' ? 5 : 4)}
                disabled={featureCols.length === 0}
                className="px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight disabled:opacity-40"
              >
                Lanjut ke Validasi Spasial →
              </button>
            </div>
          </div>

          {/* Spatial Feature Builder Card */}
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-teal-200 dark:border-teal-900 shadow-sm space-y-3">
            <div className="flex items-center gap-2 text-teal-700 font-medium tracking-tight text-sm">
              <Plus className="w-4 h-4" />
              <span>+ Tambah Fitur Spasial Otomatis</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Perkaya data dengan menghitung hubungan lokasi terhadap layer lain atau raster:
            </p>

            <div>
              <label className="block font-normal mb-1">Jenis Fitur Spasial</label>
              <select
                value={builderType}
                onChange={(e) => setBuilderType(e.target.value)}
                className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              >
                <option value="distance_to">Jarak ke Layer Lain (meter)</option>
                <option value="count_within">Jumlah Objek dalam Radius X meter</option>
                <option value="raster_value">Nilai Piksel Raster Lokal di Lokasi</option>
                <option value="gee_zonal">Dari Katalog Bumi (Satelit Earth Engine)</option>
                <option value="spatial_lag">Spatial Lag (Rata-rata 5 Tetangga Terdekat)</option>
                <option value="geometry_metrics">Luas (km²) & Keliling (km)</option>
                <option value="coordinates">Koordinat Lintang & Bujur</option>
              </select>
            </div>

            {builderType === 'gee_zonal' && (
              <div>
                <label className="block mb-1">Dataset Satelit Katalog Bumi (Zonal Langsung)</label>
                <select
                  value={builderGeePreset}
                  onChange={(e) => setBuilderGeePreset(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  <option value="gee.ndvi">Kehijauan Vegetasi (NDVI Sentinel-2)</option>
                  <option value="gee.lst">Suhu Permukaan (LST Landsat 8/9)</option>
                  <option value="gee.dem">Ketinggian Tanah (DEM Copernicus)</option>
                  <option value="gee.builtup">Kepadatan Bangunan (NDBI)</option>
                  <option value="gee.rainfall">Curah Hujan (CHIRPS)</option>
                  <option value="gee.nightlights">Cahaya Malam (VIIRS)</option>
                  <option value="gee.water">Okurensi Air Permukaan (JRC)</option>
                </select>
              </div>
            )}

            {(builderType === 'distance_to' || builderType === 'count_within') && (
              <div>
                <label className="block font-normal mb-1">Layer Tujuan</label>
                <select
                  value={builderTargetLayerId}
                  onChange={(e) => setBuilderTargetLayerId(e.target.value)}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  {vectorLayers
                    .filter((l) => l.id !== trainLayer.id)
                    .map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name}
                      </option>
                    ))}
                </select>
              </div>
            )}

            {builderType === 'count_within' && (
              <div>
                <label className="block font-normal mb-1">Radius (meter)</label>
                <input
                  type="number"
                  value={builderRadiusM}
                  onChange={(e) => setBuilderRadiusM(Number(e.target.value))}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                />
              </div>
            )}

            <button
              onClick={handleAddSpatialFeature}
              disabled={buildingFeature}
              className="w-full py-2 rounded bg-teal-700 hover:bg-teal-800 text-white font-normal"
            >
              {buildingFeature ? 'Menghitung...' : '+ Hitung & Tambahkan ke Fitur'}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: VALIDASI SPASIAL */}
      {step === 4 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-3xl">
          <h2 className="text-base font-medium tracking-tight">④ Bagaimana data dibagi untuk menguji kejujuran model?</h2>

          <div className="p-3.5 rounded bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 leading-relaxed">
             <b>Mengapa Spatial Block Cross-Validation penting?</b> Data geospasial yang berdekatan cenderung mirip
            (Hukum Pertama Geografi Tobler). Jika data dibagi acak, model terlihat lebih pintar daripada aslinya karena
            menyontek tetangga sebelahnya. Pembagian per blok wilayah memberi nilai akurasi yang jauh lebih jujur.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'spatial_block', title: 'Per Blok Wilayah (Disarankan)', desc: 'Spatial Block K-Fold' },
              { id: 'random', title: 'Acak Standar', desc: 'Random K-Fold' },
              { id: 'group', title: 'Per Kelompok Kolom', desc: 'Group K-Fold (mis: Wilayah)' },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setCvMethod(opt.id as any)}
                className={`p-3 rounded border text-left ${
 cvMethod === opt.id
 ? 'border-teal-700 bg-teal-50/50 dark:bg-teal-950/40 font-normal'
 : 'border-slate-200 dark:border-slate-700'
 }`}
              >
                <div>{opt.title}</div>
                <div className="text-[11px] text-slate-400 font-normal">{opt.desc}</div>
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {cvMethod === 'spatial_block' && (
              <div>
                <label className="block font-normal mb-1">Ukuran Blok Wilayah (meter)</label>
                <input
                  type="number"
                  value={blockSizeM}
                  onChange={(e) => setBlockSizeM(Number(e.target.value))}
                  className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                />
              </div>
            )}
            <div>
              <label className="block font-normal mb-1">Jumlah Lipatan Pengujian (K-Folds)</label>
              <input
                type="number"
                min={2}
                max={10}
                value={nSplits}
                onChange={(e) => setNSplits(Number(e.target.value))}
                className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
              />
            </div>
          </div>

          {cvMethod === 'spatial_block' && (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePreviewSpatialCV}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded border border-teal-400 text-teal-800 dark:text-teal-300 font-normal"
              >
                <Eye className="w-4 h-4" /> Pratinjau Kotak Blok Fold di Peta
              </button>
              {cvFoldSummary.length > 0 && (
                <div className="flex items-center gap-2 text-[11px]">
                  {cvFoldSummary.map((f) => (
                    <span key={f.fold} className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 font-normal">
                      Fold {f.fold}: {f.count} fitur
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(3)}
              className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 font-normal"
            >
              ← Kembali
            </button>
            <button
              onClick={() => setStep(5)}
              className="px-5 py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight"
            >
              Lanjut ke Training →
            </button>
          </div>
        </div>
      )}

      {/* STEP 5: TRAINING */}
      {step === 5 && (
        <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4 max-w-3xl">
          <h2 className="text-base font-medium tracking-tight">⑤ Pilih Algoritma & Jalankan Training</h2>

          <div>
            <label className="block font-normal mb-1">Nama Model</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
            />
          </div>

          {task === 'clustering' ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-normal mb-1">Algoritma Clustering</label>
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  <option value="kmeans">K-Means Clustering</option>
                  <option value="dbscan">DBSCAN (Berbasis Kepadatan)</option>
                </select>
              </div>
              <div>
                <label className="block font-normal mb-1">Jumlah Kelompok (Klaster)</label>
                <input
                  type="number"
                  min={2}
                  max={12}
                  value={nClusters}
                  onChange={(e) => setNClusters(Number(e.target.value))}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                {
                  id: 'seimbang',
                  title: 'Seimbang (Disarankan)',
                  sub: 'Random Forest (200 Pohon)',
                  desc: 'Tangguh terhadap pencilan, tidak mudah overfit, dan menangkap hubungan non-linear.',
                },
                {
                  id: 'cepat',
                  title: 'Cepat & Sederhana',
                  sub: task === 'regression' ? 'Ridge Linear Regression' : 'Logistic Regression',
                  desc: 'Sangat cepat untuk melihat hubungan garis lurus antar-faktor.',
                },
                {
                  id: 'akurat',
                  title: 'Paling Akurat (Boosting)',
                  sub: 'Histogram Gradient Boosting',
                  desc: 'Ensemble pohon bertingkat untuk akurasi tabular maksimum.',
                },
              ].map((preset) => (
                <div
                  key={preset.id}
                  onClick={() => setAlgorithm(preset.id)}
                  className={`p-3.5 rounded-md border cursor-pointer transition ${
 algorithm === preset.id
 ? 'border-teal-700 bg-teal-50/50 dark:bg-teal-950/40'
 : 'border-slate-200 dark:border-slate-700'
 }`}
                >
                  <div className="font-medium tracking-tight text-sm">{preset.title}</div>
                  <div className="text-[11px] text-teal-700 font-normal">{preset.sub}</div>
                  <p className="text-[11px] text-slate-500 mt-1.5">{preset.desc}</p>
                </div>
              ))}
            </div>
          )}

          {mode === 'lanjut' && task !== 'clustering' && (
            <div className="p-3.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-2">
              <div className="font-normal text-slate-700 dark:text-slate-200">Opsi Mode Lanjut</div>
              <div className="flex flex-wrap items-center gap-4">
                <select
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                  className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                >
                  <option value="seimbang">Random Forest</option>
                  <option value="extra_trees">Extra Trees</option>
                  <option value="akurat">Gradient Boosting (HistGBM)</option>
                  <option value="cepat">Linear / Logistic</option>
                  <option value="svm">Support Vector Machine (SVM)</option>
                  <option value="knn">K-Nearest Neighbors (KNN)</option>
                  <option value="mlp">Neural Network (MLP)</option>
                </select>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoTune}
                    onChange={(e) => setAutoTune(e.target.checked)}
                    className="rounded accent-teal-700"
                  />
                  <span>Hyperparameter Tuning Otomatis (RandomizedSearchCV)</span>
                </label>
                {task === 'classification' && (
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={balanceClasses}
                      onChange={(e) => setBalanceClasses(e.target.checked)}
                      className="rounded accent-teal-700"
                    />
                    <span>Seimbangkan Bobot Kelas (class_weight="balanced")</span>
                  </label>
                )}
              </div>
            </div>
          )}

          {activeTrainJob && (
            <div className="p-3.5 rounded bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-teal-800 dark:text-teal-200">
                  {activeTrainJob.status === 'failed'
                    ? 'Training gagal'
                    : activeTrainJob.message || 'Sedang melatih & memvalidasi model...'}
                </span>
                <span className="font-mono tabular-nums text-teal-700">{Math.round(activeTrainJob.progress || 0)}%</span>
              </div>
              <div className="w-full h-1.5 rounded-sm bg-teal-200/70 dark:bg-slate-700 overflow-hidden">
                <div
                  className={`h-full transition-all ${activeTrainJob.status === 'failed' ? 'bg-rose-500' : 'bg-teal-700'}`}
                  style={{ width: `${Math.max(8, activeTrainJob.progress || 0)}%` }}
                />
              </div>
              {activeTrainJob.error_user && (
                <div className="text-[11px] text-rose-600">{activeTrainJob.error_user}</div>
              )}
            </div>
          )}

          <div className="flex justify-between pt-3">
            <button
              onClick={() => setStep(4)}
              className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 font-normal"
            >
              ← Kembali
            </button>
            <button
              onClick={handleStartTraining}
              disabled={activeTrainJob?.status === 'running' || activeTrainJob?.status === 'queued'}
              className="flex items-center gap-2 px-6 py-3 rounded bg-teal-700 hover:bg-teal-800 text-white font-medium tracking-tight shadow-sm disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {activeTrainJob?.status === 'running' || activeTrainJob?.status === 'queued'
                  ? 'Sedang Melatih Model...'
                  : 'Latih Model & Buat Peta Prediksi'}
              </span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 6: HASIL, RAPOR MODEL, FEATURE IMPORTANCE & PREDIKSI */}
      {step === 6 && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Model Registry List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium tracking-tight text-sm"> Registri Model Proyek ({models.length})</h3>
              <button
                onClick={() => setStep(1)}
                className="text-xs font-normal text-teal-700 hover:underline"
              >
                + Latih Model Baru
              </button>
            </div>

            {models.length === 0 ? (
              <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 text-center space-y-2">
                <p className="text-slate-500">Belum ada model yang selesai dilatih.</p>
                <button
                  onClick={() => setStep(5)}
                  className="px-4 py-2 rounded bg-teal-700 text-white font-normal"
                >
                  Ke Langkah Training
                </button>
              </div>
            ) : (
              models.map((m) => (
                <div
                  key={m.id}
                  onClick={() => setSelectedModelId(m.id)}
                  className={`p-3.5 rounded-md border cursor-pointer transition ${
 activeModel?.id === m.id
 ? 'border-teal-700 bg-teal-50/50 dark:bg-teal-950/40 shadow-sm'
 : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'
 }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-normal text-sm">{m.name}</span>
                    <span className="px-2 py-0.5 rounded bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200 font-normal text-[10px]">
                      {m.task}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {m.algorithm} · Target: <b>{m.card?.target_column || 'Klaster'}</b>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right: Active Model Report Card */}
          {activeModel && (
            <div className="lg:col-span-2 space-y-4">
              <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-normal uppercase tracking-wider text-teal-700">
                      Rapor Evaluasi Model Spasial
                    </span>
                    <h2 className="text-lg font-medium tracking-tight">{activeModel.name}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeModel.card?.prediction_layer_id && (
                      <button
                        onClick={() => {
                          setActiveLayerId(activeModel.card.prediction_layer_id);
                          setActiveTab('map');
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-teal-700 text-white font-normal"
                      >
                        <Eye className="w-3.5 h-3.5" /> Lihat Peta Prediksi & Residual
                      </button>
                    )}
                    <button
                      onClick={async () => {
                        const res = await api.exportModelNotebook(activeModel.id, projectId);
                        const blob = new Blob([JSON.stringify(res.notebook, null, 2)], {
                          type: 'application/json',
                        });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = res.filename;
                        a.click();
                        addToast({ type: 'success', title: `Notebook '${res.filename}' berhasil diunduh!` });
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 font-normal"
                    >
                      <Code className="w-3.5 h-3.5" /> Ekspor Jupyter (.ipynb)
                    </button>
                  </div>
                </div>

                {/* Plain-language Narrative Box */}
                <div className="p-4 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200 text-xs leading-relaxed font-medium">
                   <b>Artinya dalam bahasa sederhana:</b> {activeModel.metrics?.narrative}
                </div>

                {/* Metric KPI Badges */}
                {activeModel.task === 'regression' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-700/50">
                      <div className="text-[10px] text-slate-400 uppercase font-normal">RMSE (Rata2 Meleset)</div>
                      <div className="text-xl font-medium tracking-tight text-slate-900 dark:text-white tabular-nums">
                        ±{formatNumber(activeModel.metrics?.rmse, 3)}
                      </div>
                    </div>
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-700/50">
                      <div className="text-[10px] text-slate-400 uppercase font-normal">MAE (Error Absolut)</div>
                      <div className="text-xl font-medium tracking-tight text-slate-900 dark:text-white tabular-nums">
                        ±{formatNumber(activeModel.metrics?.mae, 3)}
                      </div>
                    </div>
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-700/50">
                      <div className="text-[10px] text-slate-400 uppercase font-normal">Skor R² (Variasi Dijelaskan)</div>
                      <div className="text-xl font-medium tracking-tight text-teal-700 tabular-nums">
                        {formatNumber((activeModel.metrics?.r2 || 0) * 100, 1)}%
                      </div>
                    </div>
                  </div>
                )}

                {activeModel.task === 'classification' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-700/50">
                      <div className="text-[10px] text-slate-400 uppercase font-normal">Akurasi Spatial CV</div>
                      <div className="text-xl font-medium tracking-tight text-emerald-600 tabular-nums">
                        {formatNumber((activeModel.metrics?.accuracy || 0) * 100, 1)}%
                      </div>
                    </div>
                    <div className="p-3 rounded bg-slate-50 dark:bg-slate-700/50">
                      <div className="text-[10px] text-slate-400 uppercase font-normal">Skor F1 Weighted</div>
                      <div className="text-xl font-medium tracking-tight text-teal-700 tabular-nums">
                        {formatNumber(activeModel.metrics?.f1, 3)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Feature Importance Bars */}
                {activeModel.metrics?.feature_importance?.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h4 className="font-normal text-slate-700 dark:text-slate-200">
                       Faktor Terpenting (Permutation Feature Importance)
                    </h4>
                    <div className="space-y-1.5">
                      {activeModel.metrics.feature_importance.map((fi: any) => (
                        <div key={fi.feature} className="space-y-0.5">
                          <div className="flex justify-between text-[11px]">
                            <span className="font-normal">{fi.feature}</span>
                            <span className="tabular-nums font-normal text-teal-700">{fi.importance_pct}%</span>
                          </div>
                          <div className="w-full h-2 rounded-sm bg-slate-100 dark:bg-slate-700 overflow-hidden">
                            <div
                              className="h-full bg-teal-700 rounded-sm"
                              style={{ width: `${Math.max(4, fi.importance_pct)}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Apply Model Prediction to Another Layer */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-wrap items-end gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block font-normal mb-1">Terapkan Prediksi Model Ini ke Layer Lain:</label>
                    <select
                      value={predictTargetLayerId}
                      onChange={(e) => setPredictTargetLayerId(e.target.value)}
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                    >
                      <option value="">-- Pilih Layer Target Prediksi --</option>
                      {layers
                        .filter((l) => l.kind !== 'table')
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.kind})
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    disabled={!predictTargetLayerId}
                    onClick={async () => {
                      await api.predictModel(activeModel.id, {
                        project_id: projectId,
                        target_layer_id: predictTargetLayerId,
                      });
                      addToast({ type: 'info', title: 'Menjalankan prediksi ke layer baru...' });
                    }}
                    className="px-4 py-2 rounded bg-slate-900 dark:bg-teal-700 text-white font-normal disabled:opacity-40"
                  >
                    ▶ Prediksi ke Peta
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};


// --- Module: pages/HistoryPage.tsx ---




const HistoryPage: React.FC = () => {
  const { projectId, layers, jobs, refreshLayers, refreshJobs, addToast } = usePetaStore();
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  const loadHistory = async () => {
    try {
      const h = await api.listHistory(projectId);
      setHistoryItems(h);
    } catch {}
  };

  useEffect(() => {
    loadHistory();
    refreshJobs();
  }, [projectId, layers.length, jobs.length]);

  const handleUndo = async (hid: number) => {
    try {
      await api.undoHistory(hid, projectId);
      await refreshLayers();
      await loadHistory();
      addToast({ type: 'info', title: `Aksi #${hid} berhasil dibatalkan (Undo)` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal melakukan Undo', message: err.message });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto text-xs">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Timeline Riwayat & Undo */}
        <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-teal-700" />
              <h2 className="text-base font-medium tracking-tight">Timeline Riwayat Proyek & Undo</h2>
            </div>
            <span className="text-slate-400">{historyItems.length} aktivitas tercatat</span>
          </div>

          <div className="space-y-2.5 max-h-[520px] overflow-y-auto pr-1">
            {historyItems.map((h) => (
              <div
                key={h.id}
                className="p-3 rounded border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-normal uppercase text-[10px]">
                      {h.action}
                    </span>
                    <span className="font-normal text-slate-800 dark:text-slate-100">{h.title}</span>
                  </div>
                  <div className="text-[10px] text-slate-400">{h.created_at?.slice(0, 19).replace('T', ' ')} UTC</div>
                </div>

                {h.undo?.type && (
                  <button
                    onClick={() => handleUndo(h.id)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal shrink-0"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Undo
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Right: Lineage Asal-usul Layer & Daftar Background Jobs */}
        <div className="space-y-6">
          {/* Grafik Asal-usul (Lineage) Layer */}
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-teal-600" />
              <h2 className="text-base font-medium tracking-tight">Pohon Asal-Usul Layer (Data Lineage)</h2>
            </div>
            <p className="text-slate-500">
              Setiap layer mencatat dari file atau proses tool mana ia dihasilkan demi reproduksibilitas ilmiah:
            </p>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {layers.map((l) => (
                <div
                  key={l.id}
                  className="p-2.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-sm bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-mono text-[10px]">
                      {l.lineage?.tool_name || l.lineage?.tool || 'Sumber Asli'}
                    </span>
                    <span className="text-slate-400">──►</span>
                    <span className="font-normal">{l.name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{l.crs || 'Tabel'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Background Jobs List */}
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h2 className="text-base font-medium tracking-tight"> Antrean & Log Pekerjaan (Jobs)</h2>
            <div className="space-y-2.5 max-h-64 overflow-y-auto">
              {jobs.length === 0 ? (
                <p className="text-slate-400">Belum ada job yang dijalankan.</p>
              ) : (
                jobs.map((j) => (
                  <div
                    key={j.id}
                    className="p-3 rounded border border-slate-200 dark:border-slate-700 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-normal">{j.tool_name || j.tool_id}</span>
                      <span
                        className={`px-2 py-0.5 rounded-sm text-[10px] font-normal uppercase ${
 j.status === 'succeeded'
 ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
 : j.status === 'failed'
 ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
 : 'bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300'
 }`}
                      >
                        {j.status} ({j.progress}%)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">{j.message}</div>
                    {j.error_user && (
                      <div className="p-2 rounded bg-rose-50 text-rose-800 text-[11px]">{j.error_user}</div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Module: pages/ExportPage.tsx ---





const ExportPage: React.FC = () => {
  const { projectId, project, layers, activeLayerId, selectionsByLayer, addToast } = usePetaStore();

  const [selectedLayerId, setSelectedLayerId] = useState(activeLayerId || layers[0]?.id || '');
  const [exportFormat, setExportFormat] = useState('gpkg');
  const [csvDelimiter, setCsvDelimiter] = useState<';' | ','>(';');
  const [onlySelected, setOnlySelected] = useState(false);
  const [pyScript, setPyScript] = useState('');

  // Print Layout Settings
  const [mapTitle, setMapTitle] = useState(project?.name || 'Peta Tematik Analisis Spasial');
  const [mapSubtitle, setMapSubtitle] = useState('Dibuat dengan PetaLab GIS Web · Proyeksi WGS 84 (Metrik UTM Otomatis)');
  const [mapAuthor, setMapAuthor] = useState('Laboratorium Spasial PetaLab');

  const targetLayer = layers.find((l) => l.id === selectedLayerId) || layers[0];
  const selFids = (targetLayer && selectionsByLayer[targetLayer.id]) || [];

  // Collect all unique dataset attributions from project layers (including GEE Earth Catalog layers, §15.2)
  const datasetAttributions = Array.from(
    new Set(
      layers
        .map((l) => l.lineage?.extra?.atribusi || l.lineage?.atribusi)
        .filter((a): a is string => Boolean(a))
    )
  );

  const handleExportLayer = async () => {
    if (!targetLayer) return;
    try {
      const res = await api.exportResource({
        project_id: projectId,
        export_type: 'layer',
        layer_id: targetLayer.id,
        format: targetLayer.kind === 'raster' ? 'tif' : exportFormat,
        csv_delimiter: csvDelimiter,
        only_selected_fids: onlySelected && selFids.length > 0 ? selFids : undefined,
      });
      window.open(res.download_url, '_blank');
      addToast({ type: 'success', title: `File '${res.filename}' siap diunduh!` });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal mengekspor layer', message: err.message });
    }
  };

  const handleExportProjectZip = async () => {
    try {
      const res = await api.exportResource({
        project_id: projectId,
        export_type: 'project_zip',
      });
      window.open(res.download_url, '_blank');
      addToast({ type: 'success', title: 'Arsip proyek (.petalab.zip) berhasil dibuat!' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal mengekspor proyek', message: err.message });
    }
  };

  const handleGeneratePythonScript = async () => {
    try {
      const res = await api.exportResource({
        project_id: projectId,
        export_type: 'python_script',
      });
      setPyScript(res.script || '');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal membuat skrip Python', message: err.message });
    }
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-7xl mx-auto text-xs">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Layer, Project & Reproducibility Exporter */}
        <div className="space-y-4">
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3.5">
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-teal-700" />
              <h2 className="text-sm font-medium tracking-tight">Ekspor Layer Vektor / Raster / Tabel</h2>
            </div>

            <div>
              <label className="block font-normal mb-1">Pilih Layer</label>
              <select
                value={targetLayer?.id || ''}
                onChange={(e) => setSelectedLayerId(e.target.value)}
                className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
              >
                {layers.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name} ({l.kind})
                  </option>
                ))}
              </select>
            </div>

            {targetLayer?.kind !== 'raster' && (
              <div>
                <label className="block font-normal mb-1">Format File Ekspor</label>
                <select
                  value={exportFormat}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
                >
                  <option value="gpkg">GeoPackage (.gpkg — Disarankan)</option>
                  <option value="geojson">GeoJSON (.geojson)</option>
                  <option value="shp.zip">ESRI Shapefile (.shp.zip)</option>
                  <option value="csv">CSV (+ Kolom long, lat &amp; WKT)</option>
                  <option value="xlsx">Microsoft Excel (.xlsx — Rapi per Kolom + long/lat)</option>
                  <option value="parquet">GeoParquet (.parquet)</option>
                </select>
                {exportFormat === 'csv' && (
                  <div className="mt-2">
                    <label className="block text-[11px] text-slate-500 mb-1">Pemisah Kolom CSV</label>
                    <select
                      value={csvDelimiter}
                      onChange={(e) => setCsvDelimiter(e.target.value as ';' | ',')}
                      className="w-full p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent text-[11px]"
                    >
                      <option value=";" className="dark:bg-slate-800">Titik Koma (;) — Rapi di Excel Indonesia</option>
                      <option value="," className="dark:bg-slate-800">Koma (,) — Standar GIS / Python / QGIS</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                checked={onlySelected}
                onChange={(e) => setOnlySelected(e.target.checked)}
                className="rounded accent-teal-700"
              />
              <span>Hanya fitur terpilih ({selFids.length} fitur)</span>
            </label>

            <button
              onClick={handleExportLayer}
              className="w-full py-2.5 rounded bg-teal-700 hover:bg-teal-800 text-white font-normal flex items-center justify-center gap-2 shadow"
            >
              <Download className="w-4 h-4" />
              <span>Unduh Layer Sekarang</span>
            </button>
          </div>

          {/* Export Whole Project & Python Reproducibility */}
          <div className="p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-3">
            <h3 className="font-medium tracking-tight text-sm"> Paket Proyek & Reproduksi</h3>
            <button
              onClick={handleExportProjectZip}
              className="w-full py-2 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal flex items-center justify-center gap-2"
            >
              <Archive className="w-4 h-4 text-orange-600" />
              <span>Ekspor Seluruh Proyek (.petalab.zip)</span>
            </button>

            <button
              onClick={handleGeneratePythonScript}
              className="w-full py-2 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 font-normal flex items-center justify-center gap-2"
            >
              <Code2 className="w-4 h-4 text-teal-700" />
              <span>Buat Skrip Python dari Riwayat</span>
            </button>

            {pyScript && (
              <pre className="p-3 rounded bg-slate-900 text-teal-300 font-mono text-[10px] overflow-x-auto max-h-44">
                {pyScript}
              </pre>
            )}
          </div>
        </div>

        {/* Right 2 Columns: Print-Ready Map Layout (A4 Landscape/Portrait) */}
        <div className="lg:col-span-2 p-5 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-medium tracking-tight"> Layout Cetak Peta Siap Laporan (A4)</h2>
              <p className="text-[11px] text-slate-500">
                Dilengkapi Judul, Panah Utara, Skala, Legenda Otomatis, dan Atribusi Sumber Data
              </p>
            </div>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 rounded bg-orange-600 hover:bg-orange-700 text-white font-normal"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Peta / Simpan PDF</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            <input
              type="text"
              value={mapTitle}
              onChange={(e) => setMapTitle(e.target.value)}
              placeholder="Judul Peta"
              className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-normal"
            />
            <input
              type="text"
              value={mapSubtitle}
              onChange={(e) => setMapSubtitle(e.target.value)}
              placeholder="Sub-judul / CRS"
              className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
            <input
              type="text"
              value={mapAuthor}
              onChange={(e) => setMapAuthor(e.target.value)}
              placeholder="Sumber / Pembuat"
              className="p-2 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
          </div>

          {/* Printable Map Sheet Frame */}
          <div className="p-4 rounded border border-slate-800 dark:border-slate-500 bg-white dark:bg-slate-900 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
              <div>
                <h3 className="text-base font-medium tracking-tight text-slate-900 dark:text-white">{mapTitle}</h3>
                <p className="text-[11px] text-slate-500">{mapSubtitle}</p>
              </div>
              <div className="flex flex-col items-center justify-center px-3 py-1 rounded border border-slate-300 dark:border-slate-700">
                <span className="text-[10px] font-normal">UTARA</span>
                <Compass className="w-5 h-5 text-slate-800 dark:text-slate-200" />
              </div>
            </div>

            <div className="h-96 w-full rounded overflow-hidden border border-slate-300 dark:border-slate-700">
              <MapView compact />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-500 pt-1">
              <span>
                Sumber Data: © OpenStreetMap contributors
                {datasetAttributions.length > 0 ? ` · ${datasetAttributions.join(' · ')}` : ''} · {mapAuthor}
              </span>
              <span>Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


// --- Module: pages/SettingsPage.tsx ---





const SettingsPage: React.FC = () => {
  const {
    mode,
    theme,
    language,
    health,
    geeStatus,
    setMode,
    setTheme,
    setLanguage,
    refreshGeeStatus,
    addToast,
  } = usePetaStore();

  const [geeProjectId, setGeeProjectId] = useState(geeStatus?.project_id || '');
  const [geeAuthMode, setGeeAuthMode] = useState<'oauth' | 'service_account'>('oauth');
  const [geeEmail, setGeeEmail] = useState(geeStatus?.email || '');
  const [saJsonText, setSaJsonText] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (geeStatus?.project_id && !geeProjectId) setGeeProjectId(geeStatus.project_id);
    if (geeStatus?.email && !geeEmail) setGeeEmail(geeStatus.email);
  }, [geeStatus?.project_id, geeStatus?.email]);

  const handleConnectGee = async () => {
    setBusy(true);
    try {
      await api.geeAuth({
        project_id: geeProjectId,
        auth_mode: geeAuthMode,
        email: geeEmail || undefined,
        service_account_json: geeAuthMode === 'service_account' && saJsonText.trim() ? saJsonText : undefined,
      });
      await refreshGeeStatus();
      addToast({
        type: 'success',
        title: `Google Earth Engine Terhubung (${geeProjectId})`,
        message: 'Kredensial disimpan aman dengan izin akses 0600 di luar folder proyek.',
      });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Gagal menghubungkan GEE', message: err.message });
    } finally {
      setBusy(false);
    }
  };

  const handleTestGee = async () => {
    setBusy(true);
    try {
      const res = await api.geeTest(geeProjectId);
      setTestResult(res.ok ? res.message : res.error?.message || 'Uji koneksi gagal.');
    } catch (err: any) {
      setTestResult(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleDisconnectGee = async () => {
    await api.geeDisconnect();
    await refreshGeeStatus();
    setTestResult(null);
    addToast({ type: 'info', title: 'Koneksi Earth Engine diputus & file kredensial dihapus permanen.' });
  };

  const handleClearCache = async () => {
    await api.geeClearCache();
    await refreshGeeStatus();
    addToast({ type: 'success', title: 'Cache unduhan Earth Engine berhasil dibersihkan.' });
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-6 max-w-4xl mx-auto text-xs">
      {/* Preferensi Umum */}
      <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-5">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <Settings className="w-5 h-5 text-teal-700" />
          <h1 className="text-base">Pengaturan PetaLab & Preferensi Antarmuka</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-sm">Tingkat Antarmuka</div>
            <p className="text-[11px] text-slate-500">
              Mode Pemula menyembunyikan parameter teknis rumit; Mode Lanjut membuka SQL DuckDB, Dataset Kustom GEE, & Konsol Python.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setMode('pemula')}
                className={`flex-1 py-2 rounded ${
 mode === 'pemula' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                Mode Pemula
              </button>
              <button
                onClick={() => setMode('lanjut')}
                className={`flex-1 py-2 rounded ${
 mode === 'lanjut' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                Mode Lanjut
              </button>
            </div>
          </div>

          <div className="p-4 rounded border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-sm">Tema Visual</div>
            <p className="text-[11px] text-slate-500">
              UI dirancang netral dan tenang agar warna hanya fokus untuk data di peta dan grafik.
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setTheme('light')}
                className={`flex-1 py-2 rounded flex items-center justify-center gap-1.5 ${
 theme === 'light' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                <Sun className="w-3.5 h-3.5" /> Terang
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`flex-1 py-2 rounded flex items-center justify-center gap-1.5 ${
 theme === 'dark' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                <Moon className="w-3.5 h-3.5" /> Gelap
              </button>
            </div>
          </div>

          <div className="p-4 rounded border border-slate-200 dark:border-slate-700 space-y-2">
            <div className="text-sm">Bahasa (i18n)</div>
            <p className="text-[11px] text-slate-500">
              Format angka lokal Indonesia (12.345,67) dengan satuan metrik (m / km / km²).
            </p>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setLanguage('id')}
                className={`flex-1 py-2 rounded ${
 language === 'id' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                Indonesia
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`flex-1 py-2 rounded ${
 language === 'en' ? 'bg-slate-900 dark:bg-teal-700 text-white' : 'bg-slate-100 dark:bg-slate-700'
 }`}
              >
                English
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Pengaturan Google Earth Engine ("Katalog Bumi", §3.2 & §12.1) */}
      <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-teal-700" />
            <h2 className="text-base">Integrasi Google Earth Engine (Katalog Bumi)</h2>
          </div>
          <span
            className={`px-2.5 py-1 rounded-sm text-[11px] ${
 geeStatus?.connected
 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
 : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'
 }`}
          >
            {geeStatus?.connected
              ? `Terhubung sebagai ${geeStatus.email} · Project: ${geeStatus.project_id}`
              : 'Belum terhubung'}
          </span>
        </div>

        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          Earth Engine memberi citra satelit siap pakai (Sentinel-2, Landsat 8/9, DEM, WorldCover, CHIRPS) tanpa perlu mengunduh file mentah raksasa. Gratis untuk mahasiswa, dosen, dan peneliti nonkomersial.{' '}
          <a
            href="https://code.earthengine.google.com/register"
            target="_blank"
            rel="noreferrer"
            className="text-teal-700 underline"
          >
            Buka halaman pendaftaran Earth Engine ↗
          </a>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 text-slate-500">ID Project Google Cloud</label>
            <input
              type="text"
              value={geeProjectId}
              onChange={(e) => setGeeProjectId(e.target.value)}
              placeholder="petalab-riset-2026"
              className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
          </div>
          <div>
            <label className="block mb-1 text-slate-500">Cara Masuk</label>
            <select
              value={geeAuthMode}
              onChange={(e) => setGeeAuthMode(e.target.value as any)}
              className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            >
              <option value="oauth">Akun Google Saya (OAuth — Disarankan)</option>
              <option value="service_account">Service Account (.json — Mode Lanjut)</option>
            </select>
          </div>
        </div>

        {geeAuthMode === 'oauth' ? (
          <div>
            <label className="block mb-1 text-slate-500">Email Akun Google (Opsional)</label>
            <input
              type="email"
              value={geeEmail}
              onChange={(e) => setGeeEmail(e.target.value)}
              placeholder="nama@universitas.ac.id"
              className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />
          </div>
        ) : (
          <div>
            <label className="block mb-1 text-slate-500">Tempel Isi JSON Kunci Service Account</label>
            <textarea
              rows={3}
              value={saJsonText}
              onChange={(e) => setSaJsonText(e.target.value)}
              placeholder='{"type": "service_account", "client_email": "...", ...}'
              className="w-full p-2.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent font-mono text-[11px]"
            />
            <p className="text-[11px] text-orange-600 mt-1">
              Kunci disimpan di folder terpisah <code>credentials/</code> (izin 0600, di luar folder proyek). Disarankan menghapus salinan asli dari folder Unduhan Anda.
            </p>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <button
              onClick={handleTestGee}
              disabled={busy}
              className="px-4 py-2 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              Uji Koneksi
            </button>
            <button
              onClick={handleConnectGee}
              disabled={busy}
              className="px-4 py-2 rounded bg-slate-900 dark:bg-teal-700 text-white"
            >
              {geeStatus?.connected ? 'Perbarui Koneksi' : 'Hubungkan'}
            </button>
            {geeStatus?.connected && (
              <button
                onClick={handleDisconnectGee}
                className="px-3.5 py-2 rounded border border-rose-300 text-rose-600 hover:bg-rose-50"
              >
                Putuskan
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-slate-500">
            <span>
              Cache Earth Engine: <b>{formatBytes(geeStatus?.cache_bytes || 0)}</b> ({geeStatus?.cache_entries || 0} entri)
            </span>
            <button
              onClick={handleClearCache}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Trash2 className="w-3.5 h-3.5" /> Bersihkan Cache
            </button>
          </div>
        </div>

        {testResult && (
          <div className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
            {testResult}
          </div>
        )}
      </div>

      {/* Keamanan Lokal & Diagnostik */}
      <div className="p-6 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <div className="p-4 rounded bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Keamanan Lokal & Isolasi Kredensial</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
            • Server berjalan lokal di <code>127.0.0.1</code> · Ekspor <code>.petalab.zip</code> memakai <i>allowlist</i> ketat sehingga folder <code>credentials/</code> tidak pernah terbawa.
            <br />• File asli di folder <code>sources/</code> bersifat read-only; setiap proses menghasilkan layer baru dengan catatan lineage & atribusi.
          </p>
        </div>

        {health && (
          <div className="space-y-2">
            <h3 className="text-sm flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-teal-700" /> Diagnostik Paket Geospasial & Machine Learning
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
              {Object.entries(health.packages || {}).map(([k, pkg]: [string, any]) => (
                <div
                  key={k}
                  className="p-2.5 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 flex items-center justify-between"
                >
                  <div>
                    <div>{pkg.label}</div>
                    <div className="text-[10px] text-slate-400">v{pkg.version || 'N/A'}</div>
                  </div>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// --- Module: App.tsx ---


















const App: React.FC = () => {
  const {
    activeTab,
    studioView,
    mode,
    theme,
    language,
    helpOpen,
    tourOpen,
    project,
    projects,
    layers,
    activeLayerId,
    selectionsByLayer,
    cursorCoords,
    mapZoom,
    jobs,
    tools,
    toasts,
    setActiveTab,
    setStudioView,
    setMode,
    setTheme,
    setHelpOpen,
    setTourOpen,
    loadProject,
    setSelectedToolId,
    removeToast,
    initApp,
    upsertJobFromWS,
  } = usePetaStore();

  const [glossarySearch, setGlossarySearch] = useState('');
  const [quickSearch, setQuickSearch] = useState('');
  const [jobTrayOpen, setJobTrayOpen] = useState(false);

  const t = language === 'en' ? enDict : idDict;
  const activeLayer = layers.find((l) => l.id === activeLayerId) || layers[0];
  const selectedCount = (activeLayer && selectionsByLayer[activeLayer.id]?.length) || 0;
  const runningJobs = jobs.filter((j) => j.status === 'running' || j.status === 'queued');
  const utmZone = Math.min(60, Math.max(1, Math.floor((cursorCoords.lon + 180) / 6) + 1));
  const utmHemi = cursorCoords.lat >= 0 ? 'N' : 'S';
  const utmEpsg = (cursorCoords.lat >= 0 ? 32600 : 32700) + utmZone;

  useEffect(() => {
    initApp();
  }, []);

  // Connect to WebSocket /ws/jobs for real-time job progress updates
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws/jobs`;
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && data.id) {
            upsertJobFromWS(data);
          }
        } catch {}
      };
    } catch {}
    return () => {
      ws?.close();
    };
  }, []);

  // Keyboard shortcuts (Ctrl+K search, M map, T table, D dashboard)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        document.getElementById('petalab-quick-search')?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Clean 7-Workspace Navigation (Input -> Explore -> Analyze -> Model -> Export -> History & Settings)
  const navItems: { id: NavTab; label: string; icon: any }[] = [
    { id: 'home', label: t.nav.home, icon: Home },
    { id: 'data', label: 'Sumber Data', icon: FolderOpen },
    { id: 'map', label: 'Studio Peta', icon: MapIcon },
    { id: 'process', label: t.nav.process, icon: Wrench },
    { id: 'model', label: 'Model ML', icon: Brain },
    { id: 'export', label: t.nav.export, icon: Download },
    { id: 'history', label: t.nav.history, icon: Clock },
  ];

  const matchingQuickTools = quickSearch.trim()
    ? tools.filter(
        (tl) =>
          tl.name.toLowerCase().includes(quickSearch.toLowerCase()) ||
          tl.technical_name.toLowerCase().includes(quickSearch.toLowerCase())
      )
    : [];

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100">
      {/* Top Global Header */}
      <header className="h-12 shrink-0 px-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-4 z-30">
        {/* Brand + Active Project Selector */}
        <div className="flex items-center gap-3">
          <div
            onClick={() => setActiveTab('home')}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="relative w-7 h-7 rounded bg-teal-700 text-white font-medium text-sm flex items-center justify-center">
              <span>P</span>
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-sm bg-orange-500" />
            </div>
            <span className="font-medium tracking-tight text-sm">PetaLab</span>
          </div>

          <span className="text-slate-300 dark:text-slate-600">▸</span>

          <select
            value={project?.id || 'banjir-surabaya'}
            onChange={(e) => loadProject(e.target.value)}
            className="text-xs font-normal bg-slate-100 dark:bg-slate-700 px-2.5 py-1 rounded border border-transparent hover:border-slate-300 focus:outline-none cursor-pointer"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Center Quick Tool & Data Search (Ctrl+K) */}
        <div className="relative hidden md:block w-80">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2" />
          <input
            id="petalab-quick-search"
            type="text"
            value={quickSearch}
            onChange={(e) => setQuickSearch(e.target.value)}
            placeholder="Cari tool (Buffer, Clip, NDVI, Moran)... [Ctrl+K]"
            className="w-full pl-8 pr-3 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700/80 border border-transparent focus:border-teal-600 focus:outline-none"
          />
          {matchingQuickTools.length > 0 && (
            <div className="absolute top-8 left-0 w-full bg-white dark:bg-slate-800 shadow-sm rounded border border-slate-200 dark:border-slate-700 py-1 z-50">
              {matchingQuickTools.slice(0, 6).map((tl) => (
                <button
                  key={tl.id}
                  onClick={() => {
                    setSelectedToolId(tl.id);
                    setActiveTab('process');
                    setQuickSearch('');
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs hover:bg-teal-50 dark:hover:bg-slate-700 flex items-center justify-between"
                >
                  <span className="font-normal">{tl.name}</span>
                  <span className="text-[10px] text-teal-700">{tl.technical_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Controls: Mode Pemula/Lanjut, Theme, Help/Glossary */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-0.5 rounded text-xs">
            <button
              onClick={() => setMode('pemula')}
              className={`px-2.5 py-1 rounded-sm font-normal transition ${
                mode === 'pemula'
                  ? 'bg-teal-700 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Pemula
            </button>
            <button
              onClick={() => setMode('lanjut')}
              className={`px-2.5 py-1 rounded-sm font-normal transition ${
                mode === 'lanjut'
                  ? 'bg-orange-600 text-white'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Mode Lanjut
            </button>
          </div>

          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300"
            title="Ubah Tema Terang / Gelap"
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setHelpOpen(!helpOpen)}
            className="flex items-center gap-1 px-2.5 py-1 rounded bg-teal-50 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 font-normal text-xs border border-teal-200 dark:border-teal-800"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Bantuan & Glosarium</span>
          </button>
        </div>
      </header>

      {/* Main Content Area with Left Navigation Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Navigation Sidebar (Minimalist Flat with Crisp Orange Active Accent) */}
        <aside className="w-24 shrink-0 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col justify-between py-2 z-20">
          <nav className="space-y-0.5 px-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded text-[11px] font-normal transition ${
                    isActive
                      ? 'bg-teal-700/15 dark:bg-teal-900/45 text-teal-800 dark:text-teal-300 border-l-2 border-orange-500'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-l-2 border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 mb-0.5 ${isActive ? 'text-teal-700 dark:text-teal-400' : ''}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="px-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex flex-col items-center justify-center py-2 px-1 rounded text-[11px] font-normal transition ${
                activeTab === 'settings'
                  ? 'bg-teal-700/15 dark:bg-teal-900/45 text-teal-800 dark:text-teal-300 border-l-2 border-orange-500'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 border-l-2 border-transparent'
              }`}
            >
              <Settings className="w-4 h-4 mb-0.5" />
              <span>{t.nav.settings}</span>
            </button>
          </div>
        </aside>

        {/* Active Workspace Pane (7 Clean Non-Overlapping Workspaces) */}
        <main className="flex-1 h-full overflow-hidden relative">
          {activeTab === 'home' && <HomePage />}
          {activeTab === 'data' && <DataPage />}
          {activeTab === 'map' && (
            <div className="flex flex-col h-full w-full overflow-hidden">
              {/* Unified Studio Peta Layout Switcher: Peta + Tabel | Peta Penuh | Tabel Penuh | Dashboard */}
              <div className="h-9 shrink-0 px-3 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1">
                  {[
                    { id: 'split', label: 'Peta + Tabel', icon: MapIcon },
                    { id: 'map', label: 'Peta Penuh', icon: Globe },
                    { id: 'table', label: 'Tabel Penuh', icon: Table },
                    { id: 'dashboard', label: 'Dashboard Analitik', icon: BarChart3 },
                  ].map((v) => {
                    const VIcon = v.icon;
                    const active = studioView === v.id;
                    return (
                      <button
                        key={v.id}
                        onClick={() => setStudioView(v.id as any)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition ${
 active
 ? 'bg-slate-900 dark:bg-teal-700 text-white'
 : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
 }`}
                      >
                        <VIcon className="w-3.5 h-3.5" />
                        <span>{v.label}</span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-[11px] text-slate-400 hidden sm:block">
                  Seleksi cross-filter tersinkronisasi otomatis antar Peta, Tabel, dan Dashboard
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                {(studioView === 'split' || studioView === 'map') && (
                  <div className={studioView === 'split' ? 'h-[58%] w-full' : 'h-full w-full'}>
                    <MapView />
                  </div>
                )}
                {studioView === 'split' && (
                  <div className="h-[42%] w-full border-t border-slate-200 dark:border-slate-700 overflow-hidden">
                    <TabularView compact />
                  </div>
                )}
                {studioView === 'table' && (
                  <div className="h-full w-full overflow-hidden">
                    <TabularView />
                  </div>
                )}
                {studioView === 'dashboard' && (
                  <div className="h-full w-full overflow-hidden">
                    <DashboardPage />
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === 'process' && <ProcessingPage />}
          {activeTab === 'model' && <ModelPage />}
          {activeTab === 'history' && <HistoryPage />}
          {activeTab === 'export' && <ExportPage />}
          {activeTab === 'settings' && <SettingsPage />}
        </main>

        {/* Contextual Help & Interactive Glossary Drawer */}
        {helpOpen && (
          <div className="w-80 shrink-0 h-full bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700 p-4 overflow-y-auto space-y-4 text-xs z-30 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
              <div className="flex items-center gap-1.5 font-medium tracking-tight text-sm text-teal-700">
                <BookOpen className="w-4 h-4" />
                <span>Glosarium & Panduan Pemula</span>
              </div>
              <button onClick={() => setHelpOpen(false)} aria-label="Tutup Glosarium" className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => setTourOpen(true)}
              className="w-full py-2 rounded bg-teal-700 text-white font-normal flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" /> Mulai Tur Singkat 5 Langkah
            </button>

            <input
              type="text"
              value={glossarySearch}
              onChange={(e) => setGlossarySearch(e.target.value)}
              placeholder="Cari istilah (CRS, Buffer, NDVI, Spatial CV)..."
              className="w-full px-3 py-1.5 rounded border border-slate-300 dark:border-slate-600 bg-transparent"
            />

            <div className="space-y-2.5">
              {GLOSSARY_ITEMS.filter(
                (g) =>
                  !glossarySearch.trim() ||
                  g.term.toLowerCase().includes(glossarySearch.toLowerCase()) ||
                  g.short.toLowerCase().includes(glossarySearch.toLowerCase())
              ).map((g) => (
                <div
                  key={g.term}
                  className="p-3 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium tracking-tight text-slate-900 dark:text-white">{g.term}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 font-normal">
                      {g.category}
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{g.short}</p>
                  <p className="text-[11px] text-teal-700 dark:text-teal-400">Contoh: {g.example}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Floating Toast Notifications */}
      <div className="fixed top-14 right-4 z-50 space-y-2 max-w-sm">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-3.5 rounded-md shadow-sm border flex items-start justify-between gap-3 text-xs ${
 toast.type === 'error'
 ? 'bg-rose-50/95 dark:bg-rose-950/95 border-rose-300 text-rose-900 dark:text-rose-200'
 : toast.type === 'warning'
 ? 'bg-orange-50/95 dark:bg-orange-950/95 border-orange-300 text-orange-900 dark:text-orange-200'
 : 'bg-white/95 dark:bg-slate-800/95 border-teal-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
 }`}
          >
            <div className="space-y-0.5">
              <div className="font-medium tracking-tight">{toast.title}</div>
              {toast.message && <div className="text-[11px] opacity-90">{toast.message}</div>}
              {toast.hint && <div className="text-[11px] font-medium text-teal-700"> {toast.hint}</div>}
            </div>
            <button onClick={() => removeToast(toast.id)} aria-label="Tutup Notifikasi" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Floating Job Tray (Bottom Right) */}
      {(runningJobs.length > 0 || jobTrayOpen) && (
        <div className="fixed bottom-9 right-4 z-40 w-80 bg-white dark:bg-slate-800 shadow-sm rounded-md border border-teal-300 dark:border-slate-700 p-3 text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-medium tracking-tight flex items-center gap-1.5 text-teal-700">
              {runningJobs.length > 0 && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Job Tray ({runningJobs.length} aktif)</span>
            </span>
            <button onClick={() => setJobTrayOpen(false)} aria-label="Tutup Job Tray" className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          {jobs.slice(0, 3).map((j) => (
            <div key={j.id} className="p-2 rounded bg-slate-50 dark:bg-slate-900 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-normal truncate">{j.tool_name || j.tool_id}</span>
                {j.status === 'running' ? (
                  <button
                    onClick={() => api.cancelJob(j.id)}
                    className="text-rose-600 hover:underline flex items-center gap-0.5 text-[10px] font-normal"
                  >
                    <XCircle className="w-3 h-3" /> Batal
                  </button>
                ) : (
                  <span className="text-[10px] font-normal uppercase text-emerald-600">{j.status}</span>
                )}
              </div>
              <div className="w-full h-1.5 rounded-sm bg-slate-200 dark:bg-slate-700 overflow-hidden">
                <div className="h-full bg-teal-700 transition-all" style={{ width: `${j.progress || 0}%` }} />
              </div>
              <div className="text-[10px] text-slate-500 truncate">{j.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* 5-Step Beginner Onboarding Tour Modal */}
      {tourOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-md max-w-lg w-full p-6 shadow-sm border border-slate-200 dark:border-slate-700 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium tracking-tight text-teal-700">Tur Singkat 5 Langkah PetaLab</h3>
              <button onClick={() => setTourOpen(false)} aria-label="Tutup Tur" className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            </div>
            <ol className="space-y-2.5 list-decimal list-inside text-slate-700 dark:text-slate-200 leading-relaxed">
              <li>
                <b> Data:</b> Unggah Shapefile (.zip), GeoJSON, CSV/Excel, atau GeoTIFF di menu <b>Data</b> — atau gunakan <b>Data Contoh Surabaya</b> yang sudah dimuat otomatis.
              </li>
              <li>
                <b> Peta & Gaya:</b> Buka menu <b>Peta</b> untuk melihat layer di atas OpenStreetMap dan atur pewarnaan <b>Choropleth</b> di panel kanan.
              </li>
              <li>
                <b> Pilih & Tabel:</b> Klik objek di peta atau gunakan <b>Pembuat Syarat Visual</b> & <b>Wizard Join Tabel</b> di tampilan belah <b>Peta + Tabel</b>.
              </li>
              <li>
                <b> Proses &  Model:</b> Jalankan 26+ alat geoprocessing (Buffer, Clip, NDVI, Hotspot Gi*) atau latih model <b>Random Forest dengan Spatial Block CV</b>.
              </li>
              <li>
                <b> Ekspor:</b> Simpan hasil ke GeoPackage, Shapefile, CSV, Jupyter Notebook (.ipynb), atau cetak <b>Layout Peta PDF</b> siap laporan.
              </li>
            </ol>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setTourOpen(false);
                  setActiveTab('map');
                }}
                className="px-4 py-2 rounded bg-teal-700 text-white font-normal"
              >
                Mulai Eksplorasi Peta →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Status Bar */}
      <footer className="h-7 shrink-0 px-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 z-30">
        <div className="flex items-center gap-4 tabular-nums">
          <span>
            {cursorCoords.lat.toFixed(4)}, {cursorCoords.lon.toFixed(4)}
          </span>
          <span>• Zoom: {mapZoom}</span>
          <span>• CRS: WGS 84 (EPSG:4326) · Metrik Otomatis: UTM Zona {utmZone}{utmHemi} (EPSG:{utmEpsg})</span>
        </div>

        <div className="flex items-center gap-4">
          {activeLayer && (
            <span>
              Layer aktif: <b className="text-slate-700 dark:text-slate-200">{activeLayer.name}</b> ({selectedCount}{' '}
              terpilih)
            </span>
          )}
          <button
            onClick={() => setJobTrayOpen(!jobTrayOpen)}
            className="hover:text-teal-700 font-normal flex items-center gap-1"
          >
            <Clock className="w-3 h-3" />
            <span>{runningJobs.length} job berjalan</span>
          </button>
        </div>
      </footer>
    </div>
  );
};



const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
