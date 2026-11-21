import { create } from 'zustand';
import { api, JobItem, LayerItem, ProjectItem, ToolSchema } from '../api/client';

export type NavTab =
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

export interface ToastMessage {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title: string;
  message?: string;
  hint?: string;
}

export type StudioView = 'split' | 'map' | 'table' | 'dashboard';
export type DataSubTab = 'library' | 'upload' | 'osm' | 'earth';

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

export const usePetaStore = create<PetaLabState>((set, get) => ({
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
