export interface LayerSchemaField {
  name: string;
  type: string;
  nullable: boolean;
  null_count: number;
  unique_count: number;
  sample: any;
  stats?: any;
}

export interface LayerStyle {
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

export interface LayerItem {
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

export interface ProjectItem {
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

export interface JobItem {
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

export interface ToolFieldSchema {
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

export interface ToolSchema {
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

export const api = {
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
