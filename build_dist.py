"""
Builds `frontend/dist/index.html` and `frontend/dist/assets/petalab_app.tsx` directly
from `frontend/src` with a clean, emoji-free, thin & elegant typography design system,
built-in React 18 Zustand store implementation, and thin-stroke (1.5px) Lucide SVG icons.
"""

from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
SRC_DIR = ROOT / "frontend" / "src"
DIST_DIR = ROOT / "frontend" / "dist"
ASSETS_DIR = DIST_DIR / "assets"

MODULE_ORDER = [
    "i18n/id.json",
    "i18n/en.json",
    "lib/glossary.ts",
    "lib/format.ts",
    "api/client.ts",
    "stores/usePetaStore.ts",
    "components/map/MapView.tsx",
    "components/table/TabularView.tsx",
    "pages/HomePage.tsx",
    "pages/DashboardPage.tsx",
    "pages/EarthCatalogPage.tsx",
    "pages/DataPage.tsx",
    "pages/ProcessingPage.tsx",
    "pages/ModelPage.tsx",
    "pages/HistoryPage.tsx",
    "pages/ExportPage.tsx",
    "pages/SettingsPage.tsx",
    "App.tsx",
]

# Regex matching Unicode emoji blocks without destroying standard UI punctuation (such as × / ✓ / ✕)
EMOJI_PATTERN = re.compile(
    "["
    "\U0001F300-\U0001F9FF"
    "\U0001FA00-\U0001FAFF"
    "\u23F0-\u23FF"
    "\u2600-\u26FF"
    "\u2B50"
    "\uFE0F"
    "]+",
    flags=re.UNICODE,
)


RUNTIME_SHIMS = """
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
"""


def strip_emojis_and_refine_typography(text: str) -> str:
    # 1. Remove all Unicode emojis/emoticons & clean up extra spaces left behind
    text = EMOJI_PATTERN.sub("", text)
    # Also remove specific decorative symbols if used as emoji prefixes
    for sym in ["★ ", "◯ ", "⇕ "]:
        text = text.replace(sym, "")

    # 2. Shift heavy font weights to thin, refined, architectural weights
    text = text.replace("font-black", "font-medium")
    text = text.replace("font-extrabold", "font-medium tracking-tight")
    text = text.replace("font-bold", "font-normal")
    text = text.replace("font-semibold", "font-normal")
    return text


def transform_module_to_global(rel_path: str, content: str) -> str:
    if rel_path.endswith(".json"):
        var_name = "idDict" if "id.json" in rel_path else "enDict"
        clean_json = strip_emojis_and_refine_typography(content.strip())
        return f"const {var_name} = {clean_json};\n"

    # 1. Strip multi-line import statements FIRST
    body = re.sub(
        r"^\s*import\s+[\s\S]*?from\s+['\"][^'\"]+['\"];?\s*$",
        "",
        content,
        flags=re.MULTILINE,
    )
    # 2. Strip any remaining single-line import statements
    body = re.sub(r"^\s*import\s+['\"][^'\"]+['\"];?\s*$", "", body, flags=re.MULTILINE)
    # 3. Replace `export const/function/interface/type/class`
    body = re.sub(r"\bexport\s+(const|function|interface|type|class)\b", r"\1", body)
    # 4. Strip emojis and refine typography weights to thin & elegant
    body = strip_emojis_and_refine_typography(body)
    return f"// --- Module: {rel_path} ---\n{body}\n"


def build() -> None:
    DIST_DIR.mkdir(parents=True, exist_ok=True)
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    chunks = [RUNTIME_SHIMS.strip()]

    for mod_path in MODULE_ORDER:
        full = SRC_DIR / mod_path
        text = full.read_text(encoding="utf-8")
        chunks.append(transform_module_to_global(mod_path, text))

    chunks.append(
        "\nconst root = ReactDOM.createRoot(document.getElementById('root'));\n"
        "root.render(<App />);\n"
    )

    bundle_code = "\n".join(chunks)
    (ASSETS_DIR / "petalab_app.tsx").write_text(bundle_code, encoding="utf-8")

    index_html = """<!doctype html>
<html lang="id">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PetaLab — Spatial Analysis & Machine Learning</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600&family=JetBrains+Mono:wght@300;400&display=swap" rel="stylesheet" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
      tailwind.config = {
        darkMode: 'class',
        theme: {
          extend: {
            colors: {
              slate: {
                50:  '#f4f7f7',
                100: '#e9efef',
                200: '#d3dfdf',
                300: '#b3c6c7',
                400: '#7f999c',
                500: '#5a7478',
                600: '#3f565a',
                700: '#243438',
                800: '#131d20',
                900: '#0b1214',
                950: '#060a0b',
              },
            },
            fontFamily: {
              sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
              mono: ['"JetBrains Mono"', 'monospace'],
            }
          }
        }
      };
    </script>
    <link rel="stylesheet" href="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css" />
    <script src="https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js"></script>
    <script src="https://unpkg.com/echarts@5.5.1/dist/echarts.min.js"></script>
    <script crossorigin src="https://unpkg.com/react@18.3.1/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18.3.1/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone@7.26.2/babel.min.js"></script>
    <style>
      body {
        font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
        font-weight: 400;
        letter-spacing: -0.01em;
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }
      h1, h2, h3, h4 {
        font-weight: 500;
        letter-spacing: -0.015em;
      }
      button, select, input {
        font-weight: 400;
      }
      html.dark select option {
        background-color: #131d20;
        color: #e6f0f0;
      }
      select:focus, input:focus, textarea:focus {
        outline: none;
        border-color: #0d9488;
      }
      .tabular-nums { font-variant-numeric: tabular-nums; }
      ::-webkit-scrollbar { width: 5px; height: 5px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: rgba(90, 116, 120, 0.35); border-radius: 2px; }
      ::-webkit-scrollbar-thumb:hover { background: rgba(13, 148, 136, 0.55); }
    </style>
  </head>
  <body class="bg-slate-50/80 text-slate-800 antialiased selection:bg-slate-900 selection:text-white">
    <div id="root">
      <div class="flex flex-col items-center justify-center h-screen w-screen bg-slate-950 text-slate-300 text-xs font-light tracking-widest uppercase">
        <span>PetaLab Spatial Studio</span>
      </div>
    </div>
    <script>
      (async function bootPetaLab() {
        try {
          const res = await fetch('/assets/petalab_app.tsx?v=' + Date.now());
          const tsxCode = await res.text();
          const compiled = Babel.transform(tsxCode, {
            filename: 'petalab_app.tsx',
            presets: ['react', 'typescript'],
          }).code;
          const fn = new Function(compiled);
          fn();
        } catch (err) {
          console.error('PetaLab Boot Error:', err);
          const root = document.getElementById('root');
          if (root) {
            root.innerHTML = '<div style="padding:24px;color:#ef4444;font-family:monospace;white-space:pre-wrap;">Gagal memuat UI PetaLab:\\n' + (err && err.stack ? err.stack : err) + '</div>';
          }
        }
      })();
    </script>
  </body>
</html>
"""
    (DIST_DIR / "index.html").write_text(index_html, encoding="utf-8")
    print(f"Clean, emoji-free, thin-typography frontend built at: {DIST_DIR / 'index.html'}")


if __name__ == "__main__":
    build()
