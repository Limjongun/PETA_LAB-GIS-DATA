CREATE TABLE IF NOT EXISTS layers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  kind TEXT NOT NULL,                -- vector | raster | table
  geom_type TEXT,                    -- point | line | polygon | multipoint | multiline | multipolygon | null
  crs TEXT,                          -- "EPSG:4326"
  path TEXT NOT NULL,                -- layers/xxx.parquet | layers/xxx.tif
  source_path TEXT,                  -- sources/original_file
  feature_count INTEGER DEFAULT 0,
  bbox TEXT,                         -- json [minx,miny,maxx,maxy]
  schema_json TEXT,                  -- json list of {name, type, nullable, sample}
  style_json TEXT,                   -- json map styling configuration
  lineage_json TEXT,                 -- json {tool, tool_name, params, inputs, job_id, report}
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  deleted_at TEXT                    -- soft delete (Sampah 7 hari)
);

CREATE TABLE IF NOT EXISTS selections (
  id TEXT PRIMARY KEY,
  layer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  fids_json TEXT NOT NULL,           -- json array of integer _fid
  rule_json TEXT,                    -- json query/location rule
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT,
  tool_id TEXT NOT NULL,
  params_json TEXT,
  status TEXT NOT NULL,              -- queued | running | succeeded | failed | cancelled
  progress REAL DEFAULT 0,
  message TEXT,
  outputs_json TEXT,
  logs_json TEXT,
  error_user TEXT,
  error_detail TEXT,
  started_at TEXT,
  finished_at TEXT
);

CREATE TABLE IF NOT EXISTS history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,              -- import | process | calculate | join | style | train | delete | export
  title TEXT,
  target_id TEXT,
  payload_json TEXT,
  undo_json TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS models (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  task TEXT NOT NULL,                -- regression | classification | clustering | pixel
  algorithm TEXT NOT NULL,
  path TEXT NOT NULL,
  card_json TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  train_layer_id TEXT,
  created_at TEXT NOT NULL
);
