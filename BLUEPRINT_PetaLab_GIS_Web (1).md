# Blueprint — **PetaLab**
### Web App GIS Lokal untuk Membaca, Mengolah, Menganalisis, dan Memodelkan Data Spasial
*Mudah untuk pemula · Reliable · Terhubung ke Python lokal untuk processing, modeling, dan training*

---

## Daftar Isi

1. [Ringkasan Produk](#1-ringkasan-produk)
2. [Prinsip Desain](#2-prinsip-desain)
3. [Pengguna & Skenario Utama](#3-pengguna--skenario-utama)
4. [Arsitektur Sistem](#4-arsitektur-sistem)
5. [Tech Stack](#5-tech-stack)
6. [Struktur Proyek & Penyimpanan Data](#6-struktur-proyek--penyimpanan-data)
7. [Format Data yang Didukung](#7-format-data-yang-didukung)
8. [Peta Modul (Fitur Lengkap)](#8-peta-modul-fitur-lengkap)
   - 8.1 Beranda / Proyek
   - 8.2 Dashboard
   - 8.3 Data (Pustaka Layer)
   - 8.4 Map View (OpenStreetMap)
   - 8.5 Selection (Seleksi)
   - 8.6 Tabular (Tabel Atribut)
   - 8.7 Processing (Kotak Alat)
   - 8.8 Modeling & Training
   - 8.9 Riwayat & Jobs
   - 8.10 Export & Laporan
   - 8.11 Pengaturan
9. [Panduan UI/UX untuk Pemula](#9-panduan-uiux-untuk-pemula)
10. [Wireframe Layar Utama](#10-wireframe-layar-utama)
11. [Backend Python: Engine, Job, & API](#11-backend-python-engine-job--api)
12. [Strategi Rendering Data Besar](#12-strategi-rendering-data-besar)
13. [Reliability: Supaya Tidak Gampang Rusak](#13-reliability-supaya-tidak-gampang-rusak)
14. [Model Data Internal](#14-model-data-internal)
15. [Kontrak API (Ringkas)](#15-kontrak-api-ringkas)
16. [Katalog Pesan Error Ramah Pemula](#16-katalog-pesan-error-ramah-pemula)
17. [Keamanan Lokal](#17-keamanan-lokal)
18. [Testing & Quality](#18-testing--quality)
19. [Roadmap Pengerjaan](#19-roadmap-pengerjaan)
20. [Checklist "Definition of Done"](#20-checklist-definition-of-done)
21. [Lampiran: Glosarium Pemula](#21-lampiran-glosarium-pemula)

---

## 1. Ringkasan Produk

**PetaLab** adalah aplikasi web yang berjalan **di komputer sendiri** (local-first). Antarmuka dibuka di browser (`http://127.0.0.1:8765`), sedangkan semua pekerjaan berat (membaca file, processing spasial, training model) dijalankan oleh **server Python lokal**.

| Aspek | Keputusan |
|---|---|
| Target | Pemula GIS (mahasiswa, analis data, peneliti) sampai pengguna menengah |
| Tempat jalan | Lokal (laptop/PC), tidak butuh cloud |
| Internet | Hanya untuk basemap OpenStreetMap, pencarian lokasi, dan unduh data OSM. Semua fitur lain tetap jalan offline |
| Inti nilai | *"Buka file → lihat di peta → pilih → olah → modelkan → ekspor"* tanpa harus paham QGIS/ArcGIS |
| Filosofi olah data | **Non-destruktif**: data asli tidak pernah diubah. Setiap proses menghasilkan **layer baru** |

**Satu kalimat:** *"Seperti QGIS versi ramah pemula, di browser, dengan Python dan machine learning sudah terpasang di belakangnya."*

---

## 2. Prinsip Desain

1. **Satu layar, satu tujuan.** Setiap halaman punya satu pertanyaan utama: *"Data apa yang mau dilihat?"*, *"Bagian mana yang mau dipilih?"*, *"Proses apa yang mau dijalankan?"*
2. **Bahasa manusia dulu, istilah teknis kemudian.** Tombol bertuliskan *"Buat Zona di Sekitar"* dengan sub-label kecil *"(Buffer)"*. Istilah teknis tetap ada supaya pengguna belajar.
3. **Preview sebelum eksekusi.** Semua proses menampilkan pratinjau (pada sampel data) dan estimasi waktu sebelum dijalankan penuh.
4. **Tidak ada yang hilang.** Hasil selalu layer baru, ada riwayat, ada undo, dan autosave.
5. **Default yang benar.** CRS, satuan, dan parameter otomatis diatur ke nilai yang masuk akal. Pengguna cukup klik "Jalankan".
6. **Error menjelaskan solusi.** Bukan *"GEOSException: TopologyException"*, tetapi *"Beberapa bentuk di data ini rusak (garis saling silang). [Perbaiki otomatis]"*.
7. **Mode Pemula / Mode Lanjut.** Mode Pemula menyembunyikan parameter lanjutan. Mode Lanjut membuka semuanya, termasuk konsol Python.
8. **Cepat terasa.** UI tidak pernah membeku. Semua kerja berat berjalan sebagai *job* di latar belakang dengan progress bar.

---

## 3. Pengguna & Skenario Utama

### Persona
| Persona | Kebutuhan | Fitur kunci |
|---|---|---|
| **Pemula total** (mahasiswa semester awal) | Membuka shapefile/GeoJSON tugas, melihat di peta, membuat peta tematik | Wizard, Map View, Styling otomatis, Export PNG |
| **Analis data** (paham Excel/Python, baru di GIS) | Menggabungkan CSV dengan wilayah, menghitung statistik per wilayah | Tabular, Join, Spatial Join, Dashboard |
| **Peneliti/ML** | Membuat fitur spasial, melatih model, memprediksi ke peta | Processing, Modeling & Training, Notebook bridge |

### Skenario Utama (User Journey)
1. **"Lihat data saya"**: Drag & drop `kecamatan.zip` (shapefile) → otomatis tampil di peta + tabel + ringkasan.
2. **"Gabungkan data Excel ke peta"**: Upload `penduduk.xlsx` → Wizard Join → pilih kolom kunci → peta choropleth kepadatan.
3. **"Cari titik di dalam area"**: Upload titik sekolah → pilih area banjir → "Pilih titik di dalam area" → ekspor daftar.
4. **"Berapa sekolah per kecamatan?"**: Processing → Hitung Titik dalam Poligon → layer baru + grafik batang di dashboard.
5. **"Prediksi suhu/kerawanan"**: Siapkan fitur (NDVI, jarak ke jalan, kepadatan) → Training Random Forest dengan Spatial CV → peta prediksi + metrik.
6. **"Ambil data jalan dari OSM"**: Gambar kotak di peta → Unduh OSM: jalan & bangunan → otomatis jadi layer.

---

## 4. Arsitektur Sistem

```
┌──────────────────────────────────────────────────────────────────────┐
│                         BROWSER (Frontend)                           │
│  React + TypeScript + Vite                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │Dashboard │ │ Map View │ │ Tabular  │ │Processing│ │ Modeling   │ │
│  │(ECharts) │ │(MapLibre)│ │(TanStack)│ │ (Forms)  │ │ & Training │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └────────────┘ │
│        State: Zustand  ·  Server state: TanStack Query               │
└───────────────┬───────────────────────────────┬──────────────────────┘
                │ REST (JSON / GeoJSON / MVT)   │ WebSocket (progress, log)
                ▼                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                  PYTHON LOCAL SERVER (FastAPI + Uvicorn)             │
│  ┌────────────┐ ┌─────────────┐ ┌────────────┐ ┌──────────────────┐ │
│  │ Data I/O   │ │ Tile Server │ │ Processing │ │ ML Engine        │ │
│  │ GeoPandas  │ │ MVT vector  │ │ Toolbox    │ │ scikit-learn     │ │
│  │ pyogrio    │ │ raster tile │ │ (registry) │ │ LightGBM/XGBoost │ │
│  │ Rasterio   │ │ (rio-tiler) │ │            │ │ PyTorch (opsi)   │ │
│  └────────────┘ └─────────────┘ └────────────┘ └──────────────────┘ │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ Job Manager: antrean, worker process, progress, cancel, retry│   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌───────────────┐ ┌──────────────────┐ ┌────────────────────────┐ │
│  │ DuckDB Spatial│ │ SQLite (metadata,│ │ File cache (GeoParquet,│ │
│  │ (query cepat) │ │ jobs, riwayat)   │ │ COG, model .joblib)    │ │
│  └───────────────┘ └──────────────────┘ └────────────────────────┘ │
└───────────────────────────────────────┬──────────────────────────────┘
                                        │ (opsional, butuh internet)
                                        ▼
                ┌───────────────────────────────────────────┐
                │ OSM Tile · Nominatim (cari lokasi) ·       │
                │ Overpass API (unduh data OSM)              │
                └───────────────────────────────────────────┘
```

### Alur kerja dasar
1. Pengguna menjalankan `petalab start` (atau klik `PetaLab.bat` / `PetaLab.command`).
2. Server Python menyala di `127.0.0.1:8765`, lalu browser terbuka otomatis.
3. Frontend (hasil build statis) disajikan langsung oleh FastAPI, jadi cukup **satu proses**.
4. Saat data diunggah, backend membaca → memvalidasi → mengonversi ke **format kerja internal** (GeoParquet / COG) → mendaftarkannya sebagai *layer*.
5. Peta mengambil **tile** dari backend (bukan seluruh file), sehingga data besar tetap lancar.
6. Proses/training dikirim sebagai **job** → berjalan di worker process → progress lewat WebSocket → hasil menjadi layer/model baru.

---

## 5. Tech Stack

### Frontend
| Kebutuhan | Pilihan | Alasan |
|---|---|---|
| Framework | **React 18 + TypeScript + Vite** | Ekosistem besar, typing aman |
| Peta | **MapLibre GL JS** | Open-source, WebGL (cepat), mendukung vector tile & raster tile |
| Layer data besar (opsi) | **deck.gl** (overlay di MapLibre) | Jutaan titik, heatmap, hexbin |
| Gambar/edit geometri | **terra-draw** | Gambar poligon/garis/titik/kotak untuk seleksi & edit |
| Tabel | **TanStack Table + TanStack Virtual** | Virtual scroll untuk ratusan ribu baris |
| Grafik dashboard | **Apache ECharts** | Lengkap: bar, histogram, scatter, pie, box plot |
| State | **Zustand** (UI state) + **TanStack Query** (server state, cache, retry) | Sederhana dan reliable |
| Form parameter tool | **React Hook Form + Zod** | Form dibuat otomatis dari skema tool backend |
| Komponen UI | **Radix UI primitives + Tailwind CSS** | Aksesibel, konsisten, mudah diberi tema |
| Ikon | **Lucide** | Sederhana dan jelas |
| Editor kode (Mode Lanjut) | **Monaco Editor** | Konsol Python / SQL |

### Backend (Python lokal, versi 3.11 atau 3.12)
| Kebutuhan | Pilihan |
|---|---|
| Web server | **FastAPI + Uvicorn** (+ `websockets`) |
| Vektor | **GeoPandas**, **Shapely 2**, **pyogrio** (baca/tulis cepat), **pyproj** |
| Raster | **Rasterio**, **rioxarray**, **xarray**, **rio-tiler** (tile raster), **rio-cogeo** |
| Query cepat | **DuckDB** + ekstensi `spatial` (SQL di GeoParquet, ST_AsMVT) |
| Vector tile | DuckDB `ST_AsMVT` atau `mapbox-vector-tile` sebagai fallback |
| Statistik spasial | **PySAL** (`libpysal`, `esda`: Moran's I, Getis-Ord Gi*) |
| Interpolasi | **SciPy** (IDW), **PyKrige** (Kriging) |
| Jaringan jalan (opsi) | **OSMnx**, **NetworkX** |
| ML klasik | **scikit-learn**, **LightGBM**, **XGBoost** |
| Deep learning (opsi) | **PyTorch** (+ `torchgeo` untuk citra) |
| Explainability | **SHAP** (opsi), permutation importance (bawaan sklearn) |
| Metadata & jobs | **SQLite** (via `sqlmodel`/`sqlite3`) |
| Validasi | **Pydantic v2** |
| Logging | `structlog` / `logging` ke file berotasi |
| Packaging env | **uv** atau **conda/mamba** (disarankan conda di Windows karena GDAL) dengan `environment.yml` versi terkunci |

> **Catatan Windows:** GDAL/Rasterio paling aman lewat `conda-forge`. Sediakan `environment.yml` dan skrip `install.bat` yang membuat env `petalab` dan menjalankan health check.

---

## 6. Struktur Proyek & Penyimpanan Data

### 6.1 Struktur kode (monorepo)
```
petalab/
├── backend/
│   ├── petalab/
│   │   ├── main.py                 # FastAPI app, mount frontend build
│   │   ├── config.py               # port, path workspace, batas memori
│   │   ├── api/
│   │   │   ├── projects.py
│   │   │   ├── layers.py           # upload, info, delete, styling
│   │   │   ├── tiles.py            # /tiles/{layer}/{z}/{x}/{y}.pbf|png
│   │   │   ├── features.py         # tabel, query, edit atribut
│   │   │   ├── selection.py
│   │   │   ├── tools.py            # daftar tool + skema param + run
│   │   │   ├── jobs.py             # status, cancel, log
│   │   │   ├── models.py           # training, evaluate, predict
│   │   │   ├── osm.py              # Nominatim, Overpass
│   │   │   ├── export.py
│   │   │   └── ws.py               # WebSocket progress
│   │   ├── core/
│   │   │   ├── io_vector.py        # baca/tulis + konversi GeoParquet
│   │   │   ├── io_raster.py        # baca + konversi COG
│   │   │   ├── validate.py         # cek CRS, geometri rusak, encoding
│   │   │   ├── crs.py              # deteksi & rekomendasi UTM otomatis
│   │   │   ├── stats.py            # ringkasan kolom, histogram
│   │   │   └── duck.py             # koneksi DuckDB
│   │   ├── tools/                  # SATU FILE = SATU TOOL (plugin)
│   │   │   ├── _base.py            # class Tool, decorator @register
│   │   │   ├── vector_buffer.py
│   │   │   ├── vector_clip.py
│   │   │   ├── spatial_join.py
│   │   │   ├── count_points_in_polygon.py
│   │   │   ├── raster_zonal_stats.py
│   │   │   ├── raster_ndvi.py
│   │   │   └── ...
│   │   ├── ml/
│   │   │   ├── features.py         # feature builder spasial
│   │   │   ├── cv.py               # random / spatial block / buffer CV
│   │   │   ├── trainers.py         # wrapper sklearn/lgbm/torch
│   │   │   ├── registry.py         # simpan model + metadata
│   │   │   └── predict.py          # ke layer vektor / raster
│   │   ├── jobs/
│   │   │   ├── manager.py          # antrean + worker pool
│   │   │   └── context.py          # progress(), log(), check_cancel()
│   │   └── db/
│   │       ├── schema.sql
│   │       └── repo.py
│   ├── tests/
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── app/                    # routing, layout
│   │   ├── pages/                  # Home, Dashboard, Map, Data, Table, Process, Model, History, Export, Settings
│   │   ├── components/
│   │   │   ├── map/                # MapCanvas, LayerPanel, Legend, DrawTools
│   │   │   ├── table/              # AttributeTable, ColumnMenu, FilterBar
│   │   │   ├── tools/              # ToolCard, ToolForm (auto dari skema), PreviewPane
│   │   │   ├── jobs/               # JobTray, JobDetail
│   │   │   └── ui/                 # Button, Dialog, Tooltip, EmptyState, Toast
│   │   ├── stores/                 # zustand: project, layers, selection, ui
│   │   ├── api/                    # client fetch + ws, tipe dari OpenAPI
│   │   ├── lib/                    # format angka, warna, glossary
│   │   └── i18n/                   # id.json (utama), en.json
│   └── package.json
├── environment.yml
├── install.bat / install.sh
├── PetaLab.bat / PetaLab.command
└── README.md
```

### 6.2 Struktur workspace pengguna (data)
```
~/PetaLab/
├── settings.json
├── logs/petalab.log                # rotasi 5 x 10 MB
└── projects/
    └── banjir-surabaya/
        ├── project.json            # nama, basemap, view terakhir, urutan layer
        ├── petalab.db              # SQLite: layer, riwayat, jobs, models
        ├── sources/                # salinan file asli (read-only)
        ├── layers/                 # format kerja: *.parquet (vektor), *.tif (COG)
        ├── models/                 # *.joblib / *.pt + model_card.json
        ├── exports/
        └── .autosave/              # snapshot state UI (setiap 30 detik)
```

**Aturan penting:**
- File asli disalin ke `sources/` dan **tidak pernah diubah**.
- Format kerja: **GeoParquet** untuk vektor (cepat, ringkas, dibaca DuckDB) dan **Cloud-Optimized GeoTIFF** untuk raster (mendukung tile dan overview).
- Satu proyek = satu folder, jadi gampang di-zip dan dipindah ke laptop lain.

---

## 7. Format Data yang Didukung

| Jenis | Format masuk | Catatan otomatis |
|---|---|---|
| Vektor | Shapefile (`.zip` atau `.shp`+`.dbf`+`.shx`+`.prj`), GeoJSON, GeoPackage (`.gpkg`, multi-layer), KML/KMZ, GPX, FlatGeobuf, GeoParquet, File Geodatabase (baca) | Deteksi encoding `.dbf` (UTF-8/Latin-1), deteksi `.prj` hilang |
| Tabular berkoordinat | CSV, XLSX, Parquet | **Wizard koordinat**: deteksi kolom `lat/lon`, `latitude/longitude`, `x/y`, `bujur/lintang`, kolom WKT |
| Tabular non-spasial | CSV, XLSX | Bisa di-*join* ke layer berdasarkan kolom kunci |
| Raster | GeoTIFF, COG, JP2, NetCDF (opsi), ASC | Konversi ke COG + overview, deteksi nodata, info band |
| Online | OSM via Overpass, WMS/XYZ tile URL (sebagai basemap) | Butuh internet |

### Pipeline import (otomatis)
```
Upload → Deteksi jenis → Baca metadata → VALIDASI → Laporan Import → Konversi → Daftarkan layer
                                          │
                                          ├─ CRS ada?              → tidak: tanya user (default EPSG:4326) + saran
                                          ├─ Koordinat masuk akal? → deteksi lat/lon tertukar
                                          ├─ Geometri valid?       → jumlah rusak + [Perbaiki otomatis: make_valid]
                                          ├─ Geometri kosong?      → bisa dibuang
                                          ├─ Encoding teks?        → deteksi, tampilkan contoh
                                          ├─ Tipe kolom?           → angka yang tersimpan sebagai teks
                                          └─ Ukuran?               → >1 jt fitur: aktifkan mode tile
```

**Laporan Import** (kartu ramah pemula):
> ✅ **kecamatan_surabaya** berhasil dibaca
> • 31 poligon · 8 kolom · Sistem koordinat: WGS 84 (EPSG:4326)
> ⚠️ 2 bentuk rusak, sudah diperbaiki otomatis [Lihat]
> 💡 Untuk mengukur jarak/luas, PetaLab akan memakai UTM Zona 49S secara otomatis.

---

## 8. Peta Modul (Fitur Lengkap)

### Navigasi utama (sidebar kiri, ikon + label)
```
🏠 Beranda   📊 Dashboard   🗺️ Peta   📁 Data   ▦ Tabel   ⚙️ Proses   🧠 Model   🕘 Riwayat   📤 Ekspor
                                                                                       ⚙ Pengaturan (bawah)
```

---

### 8.1 Beranda / Proyek
- **Daftar proyek** (kartu dengan thumbnail peta, tanggal ubah, ukuran).
- Tombol besar: **[+ Proyek Baru]**, **[Buka Folder Proyek]**, **[Coba Data Contoh]**.
- **Data contoh bawaan** (offline): batas kecamatan contoh, titik fasilitas, raster DEM kecil, dan CSV penduduk. Pemula bisa mencoba tanpa mencari data.
- **"Apa yang ingin kamu lakukan?"** (Resep / Wizard):
  - Membuat peta tematik dari data wilayah
  - Menggabungkan Excel ke peta
  - Menghitung jumlah titik per wilayah
  - Mencari lokasi terdekat
  - Mengklasifikasi tutupan lahan dari citra
  - Memprediksi nilai di peta (ML)
- **Status sistem**: Python ✅ · GDAL ✅ · GPU (opsional) ⚪ · Internet ✅

---

### 8.2 Dashboard
Ringkasan cepat proyek dan layer aktif. **Dashboard otomatis** dibuat begitu data masuk; pengguna bisa menambah atau menghapus widget.

**Widget bawaan:**
| Widget | Isi |
|---|---|
| Kartu KPI | Jumlah fitur, luas total (km²), panjang total (km), jumlah kolom, % nilai kosong |
| Mini map | Cakupan layer aktif |
| Histogram | Sebaran kolom angka terpilih |
| Bar chart Top-N | Contoh: 10 kecamatan dengan nilai tertinggi |
| Pie/Donut | Proporsi kategori (maksimal 8 kategori + "Lainnya") |
| Scatter | Hubungan dua kolom angka (+ garis tren, nilai r) |
| Tabel ringkas | 5 baris teratas berdasarkan kolom |
| Kualitas data | Nilai kosong per kolom, geometri rusak, duplikat |
| Status model | Model terakhir: metrik, tanggal |

**Interaksi kunci (cross-filter):**
- Klik batang di grafik → fitur terkait **terseleksi** di peta dan tabel.
- Seleksi di peta → semua grafik menampilkan **"Terpilih vs Semua"**.
- Tombol **[Simpan Dashboard sebagai PNG/PDF]**.

---

### 8.3 Data (Pustaka Layer)
- Area **drag & drop** besar: *"Tarik file ke sini atau [Pilih File]"*.
- Daftar layer: ikon tipe (titik / garis / poligon / raster / tabel), nama, jumlah fitur, CRS, ukuran, sumber.
- Aksi per layer: **Lihat di Peta · Buka Tabel · Info · Ganti Nama · Duplikat · Ubah CRS · Hapus** (konfirmasi + bisa dipulihkan dari Sampah selama 7 hari).
- **Panel Info Layer**: metadata, daftar kolom + tipe + contoh nilai, bounding box, sumber/asal-usul (*lineage*: "dibuat dari Buffer 500 m atas layer sekolah").
- **Unduh dari OpenStreetMap** (butuh internet):
  1. Pilih area: gambar kotak/poligon di peta, atau pilih dari layer wilayah.
  2. Pilih kategori dengan centang: Jalan · Bangunan · Sungai · Sekolah · Rumah sakit · Taman · Tempat ibadah · Kustom (tag OSM).
  3. Estimasi ukuran → **[Unduh]** → otomatis menjadi layer.
  - Batasi luas area dan hormati batas pemakaian Overpass (jeda antar-request, cache hasil).

---

### 8.4 Map View (OpenStreetMap)

**Basemap** (pemilih bergambar thumbnail):
- OpenStreetMap Standar (default), Terang (tanpa label), Gelap, Satelit (dari URL XYZ yang diisi pengguna), Kosong/Tanpa basemap (mode offline).
- **Atribusi OSM wajib** tampil di pojok peta: *© OpenStreetMap contributors*.
- Patuhi **OSM Tile Usage Policy**: header User-Agent yang jelas, tidak ada prefetch massal, dan cache tile lokal yang wajar. Untuk penggunaan berat, sediakan opsi URL tile server lain.

**Panel Layer (kanan):**
- Daftar layer dengan **drag untuk urutan**, toggle 👁, slider transparansi, tombol zoom ke layer.
- **Styling sederhana (Mode Pemula):**
  - *Satu warna*
  - *Warna berdasarkan kategori* (otomatis palet kategorikal)
  - *Warna berdasarkan angka* (choropleth: kelas Natural Breaks / Kuantil / Interval sama, 3–9 kelas, palet sequential/diverging yang aman untuk buta warna)
  - *Ukuran titik berdasarkan angka* (proportional symbol)
  - *Heatmap* (untuk titik)
  - *Label* dari kolom
- **Raster**: palet warna (viridis, terrain, NDVI), rentang min–max (auto persentil 2–98%), pilihan band RGB, hillshade untuk DEM.
- **Legenda otomatis** yang sinkron dengan styling.

**Toolbar peta (atas):**
| Ikon | Fungsi |
|---|---|
| 🔍 | Cari lokasi (Nominatim) / cari fitur di layer |
| ✋ | Geser (default) |
| ℹ️ | **Identify**: klik fitur → popup atribut |
| ▭ ⬠ ◯ | Seleksi kotak / poligon / lingkaran |
| 📏 | Ukur jarak & luas (geodesik) |
| ✏️ | Gambar layer baru (titik/garis/poligon) |
| 🧭 | Kembali ke cakupan layer / Indonesia |
| 🖼️ | Bandingkan (*swipe*) dua layer |
| ⛶ | Layar penuh |

**Status bar bawah:** koordinat kursor (lat, lon + UTM), skala, zoom, CRS tampilan, jumlah fitur terpilih, job berjalan.

---

### 8.5 Selection (Seleksi)

Seleksi adalah **state global**: satu set fitur terpilih per layer, dan selalu sinkron di Peta ↔ Tabel ↔ Dashboard.

**Cara memilih:**
1. **Klik di peta** (Shift = tambah, Ctrl = kurangi).
2. **Gambar area**: kotak, poligon, lingkaran (radius dalam meter).
3. **Berdasarkan atribut**: *Query Builder* visual, bukan SQL:
   ```
   [ populasi ▾ ] [ lebih dari ▾ ] [ 10000 ]   [+ Tambah syarat]
   [ DAN ▾ ]
   [ kecamatan ▾ ] [ termasuk ▾ ] [ Rungkut, Gubeng ]
   → Ditemukan 7 fitur  [Pilih]
   ```
   Mode Lanjut: input SQL `WHERE` langsung (dijalankan di DuckDB).
4. **Berdasarkan lokasi** (*select by location*):
   *"Pilih fitur dari [sekolah] yang [berada di dalam ▾] fitur [zona_banjir] (yang terpilih saja ☐)"*
   Relasi: di dalam, bersinggungan, menyentuh, dalam jarak X meter dari, tidak bersinggungan.
5. **Pilih semua / Balik seleksi / Hapus seleksi**.

**Aksi untuk seleksi:**
- **Simpan sebagai layer baru** · **Zoom ke seleksi** · **Statistik seleksi** · **Ekspor seleksi** · **Jalankan proses hanya pada seleksi** (setiap form tool punya centang "Hanya fitur terpilih").
- **Seleksi tersimpan** (*named selection*): contoh "Sekolah rawan banjir", bisa dipanggil lagi.

---

### 8.6 Tabular (Tabel Atribut)

- Tabel **virtual scroll** (lancar untuk ±1 juta baris; data diambil per halaman dari DuckDB).
- **Sinkron dua arah** dengan peta: klik baris → peta zoom dan highlight; seleksi peta → baris disorot dan bisa difilter "tampilkan terpilih saja".
- **Menu kolom** (klik header): urutkan, filter, statistik kolom (min, max, rata-rata, median, kosong, unik), histogram mini, ganti nama, ubah tipe, sembunyikan, hapus (menjadi layer baru / versi baru).
- **Filter bar** cepat di atas tabel (cari teks di semua kolom).
- **Kalkulator kolom (Field Calculator)**:
  - Mode Pemula: template siap pakai: *Luas (km²)*, *Panjang (km)*, *Kepadatan = kolom A / luas*, *Persentase*, *Kategori dari rentang angka*, *Gabung teks*, *Koordinat X/Y centroid*.
  - Mode Lanjut: ekspresi (sintaks SQL DuckDB) dengan autocomplete nama kolom + pratinjau 5 baris hasil.
- **Edit sel** (opsional, dengan tanda "diubah" dan undo).
- **Join tabel** (wizard 3 langkah):
  1. Pilih layer peta + tabel (CSV/XLSX).
  2. Pilih kolom kunci di masing-masing (**auto-saran** berdasarkan kemiripan nama dan nilai).
  3. Pratinjau kecocokan: *"29 dari 31 cocok. 2 tidak cocok: 'Sukomanunggal' vs 'Suko Manunggal'"* → [Cocokkan manual] / [Normalisasi teks (huruf kecil, hapus spasi)].
- **Group by / Ringkas**: pilih kolom kelompok + agregasi (jumlah, rata-rata, hitung, min, max) → tabel/layer hasil.
- **Ekspor tabel**: CSV, XLSX, Parquet.

---

### 8.7 Processing (Kotak Alat)

**Tampilan:** halaman berisi **kartu tool** yang dikelompokkan, dilengkapi pencarian (*"buffer", "zona", "jarak"* → menemukan Buffer). Setiap kartu memuat: nama ramah, nama teknis, ilustrasi mini (sebelum → sesudah), tingkat (Pemula / Menengah / Lanjut).

**Anatomi form tool (dibuat otomatis dari skema backend):**
```
┌ Buat Zona di Sekitar (Buffer) ──────────────────────────────────┐
│ Apa ini? Membuat area selebar jarak tertentu di sekitar objek.  │
│ [ilustrasi: titik → lingkaran]                                  │
│                                                                 │
│ Layer masukan    [ sekolah ▾ ]   ☐ Hanya fitur terpilih (12)    │
│ Jarak            [ 500 ] [ meter ▾ ]                             │
│ ▸ Opsi lanjutan  (gabungkan hasil, jumlah segmen, sisi)         │
│                                                                 │
│ Nama hasil       [ sekolah_buffer_500m ]                        │
│                                                                 │
│ ℹ Jarak dihitung di UTM 49S agar akurat (otomatis).             │
│ ⏱ Estimasi: < 2 detik · 245 fitur                               │
│                                                                 │
│        [ Pratinjau ]                 [ ▶ Jalankan ]             │
└─────────────────────────────────────────────────────────────────┘
```

**Katalog tool (MVP → lengkap):**

**A. Vektor: Dasar** (Pemula)
| Tool (nama ramah) | Teknis |
|---|---|
| Buat Zona di Sekitar | Buffer |
| Potong dengan Area | Clip |
| Hapus Bagian yang Bertumpuk | Difference / Erase |
| Irisan Dua Layer | Intersection |
| Gabung Bentuk | Dissolve (opsional per kolom) |
| Gabung Layer | Merge / Union |
| Titik Tengah | Centroid / Point on surface |
| Sederhanakan Bentuk | Simplify (toleransi meter) |
| Perbaiki Bentuk Rusak | Make valid |
| Pecah Multi-bagian | Explode |
| Ubah Sistem Koordinat | Reproject |

**B. Vektor: Analisis** (Menengah)
| Tool | Teknis |
|---|---|
| Ambil Data dari Layer Lain berdasarkan Lokasi | Spatial join (dalam / bersinggungan / terdekat + jarak) |
| Hitung Titik di Setiap Wilayah | Count points in polygon |
| Cari yang Terdekat | Nearest neighbor (k terdekat + jarak) |
| Matriks Jarak | Distance matrix |
| Grid Kotak / Heksagon | Fishnet / H3 hexbin + agregasi |
| Zona Pengaruh | Voronoi / Thiessen |
| Kepadatan Titik | Kernel Density (output raster) |
| Area Jangkauan | Isochrone via jaringan jalan OSMnx (opsi) |
| Rute Terpendek | Shortest path (opsi) |

**C. Raster** (Menengah)
| Tool | Teknis |
|---|---|
| Potong Raster dengan Area | Clip/mask |
| Statistik Raster per Wilayah | Zonal statistics (mean, min, max, sum, std, count, mayoritas) |
| Ambil Nilai Raster ke Titik | Sample/extract |
| Kalkulator Raster | Raster calculator (ekspresi band, contoh `(B8-B4)/(B8+B4)`) |
| Indeks Vegetasi/Air/Bangunan | NDVI, NDWI, NDBI (preset band Sentinel-2/Landsat) |
| Kemiringan & Arah Lereng | Slope, aspect, hillshade dari DEM |
| Klasifikasi Ulang | Reclassify (tabel rentang → kelas) |
| Ubah Resolusi | Resample |
| Gabung Raster | Mosaic |
| Raster ke Poligon / Poligon ke Raster | Polygonize / Rasterize |

**D. Statistik Spasial** (Lanjut)
| Tool | Teknis |
|---|---|
| Apakah Data Mengelompok? | Global Moran's I (+ penjelasan hasil dalam bahasa sederhana) |
| Peta Hotspot | Getis-Ord Gi* / LISA (High-High, Low-Low, dll) |
| Isi Nilai di Antara Titik | Interpolasi IDW / Kriging |
| Pengelompokan | K-Means, DBSCAN (spasial dan atribut) |
| Regresi Spasial (opsi) | GWR (mgwr) |

**Aturan semua tool:**
- Input bisa layer penuh atau **hanya fitur terpilih**.
- **CRS otomatis**: operasi jarak/luas diproyeksikan ke UTM zona yang tepat, lalu hasil dikembalikan ke CRS asal.
- **Pratinjau** dijalankan pada maksimal 500 fitur / potongan raster kecil sebelum full-run.
- Output selalu **layer baru** + catatan *lineage* (tool, parameter, input, waktu, versi).
- Setiap tool punya tombol **"Salin sebagai kode Python"** yang memberi potongan GeoPandas setara. Ini fitur belajar.

**Model Builder sederhana (fase lanjut):** rangkai beberapa tool menjadi alur (*Buffer → Clip → Hitung*), simpan sebagai **Resep** yang bisa dijalankan ulang pada data lain.

---

### 8.8 Modeling & Training

Wizard 6 langkah. Mode Pemula hanya menampilkan pilihan yang aman; Mode Lanjut membuka semua hyperparameter.

```
① Tujuan → ② Data & Target → ③ Fitur → ④ Validasi → ⑤ Training → ⑥ Hasil & Prediksi
```

**① Tujuan** (kartu besar):
| Pilihan pemula | Tipe ML | Contoh |
|---|---|---|
| Memprediksi **angka** | Regresi | Suhu permukaan, harga tanah |
| Memprediksi **kategori** | Klasifikasi | Rawan/tidak rawan, tutupan lahan |
| Menemukan **kelompok** | Clustering | Segmentasi wilayah |
| Klasifikasi **citra/raster** per piksel | Klasifikasi piksel | Peta tutupan lahan dari Sentinel-2 |

**② Data & Target**
- Pilih layer (vektor/raster) + kolom target.
- Untuk klasifikasi citra: pilih raster + layer **sampel latih** (poligon/titik berlabel). Sediakan alat gambar sampel langsung di peta dengan kelas berwarna.
- Ringkasan target: distribusi kelas (peringatan jika tidak seimbang) / histogram nilai.

**③ Fitur**
- Centang kolom yang dipakai (kolom ID, nama, dan teks bebas otomatis tidak dicentang).
- **Feature builder spasial** (tombol "+ Tambah fitur spasial"):
  - Jarak ke layer lain (contoh: jarak ke jalan, sungai)
  - Nilai raster di lokasi / rata-rata raster per poligon
  - Jumlah objek dalam radius X
  - Koordinat (lat/lon) atau koordinat terproyeksi
  - Luas, keliling, kepadatan
  - Spatial lag (rata-rata tetangga)
- Peringatan **kebocoran data** (*leakage*): kolom yang sangat berkorelasi dengan target ditandai ⚠.
- Preprocessing otomatis: imputasi nilai kosong, encoding kategori, scaling bila perlu (dibangun sebagai `sklearn.Pipeline`, ikut tersimpan dalam model).

**④ Validasi** *(penting dan dijelaskan untuk pemula)*
- Default: **Spatial Block Cross-Validation** (data dibagi per blok wilayah).
  > 💡 *"Data yang berdekatan cenderung mirip. Jika dibagi acak, model tampak lebih pintar daripada aslinya. Pembagian per blok memberi nilai yang lebih jujur."*
- Opsi: Random K-Fold, Group K-Fold (per kolom, misalnya kota), Buffer/Leave-location-out.
- Pratinjau peta: warna blok/fold sehingga pembagian terlihat.

**⑤ Training**
| Mode Pemula (preset) | Mode Lanjut |
|---|---|
| **"Seimbang" (disarankan)**: Random Forest | Random Forest, Extra Trees, LightGBM, XGBoost, Linear/Logistic, SVM, KNN, MLP |
| **"Cepat"**: model linear | Hyperparameter manual atau **tuning otomatis** (Random/Optuna search, budget waktu) |
| **"Paling akurat"**: LightGBM + tuning ringan | PyTorch (MLP tabular / CNN patch citra via torchgeo), GPU otomatis bila tersedia |

- Berjalan sebagai **job**: progress per fold, log live, kurva loss (untuk DL), tombol **Batalkan**.
- Seed acak dikunci, sehingga hasil bisa direproduksi.

**⑥ Hasil & Prediksi**
- **Rapor model** dengan bahasa sederhana:
  > *"Model ini rata-rata meleset ±1,2 °C (RMSE). Ia menjelaskan 78% variasi suhu (R²). Faktor terpenting: NDVI, jarak ke jalan utama, kepadatan bangunan."*
- Metrik:
  - Regresi: RMSE, MAE, R², plot prediksi vs aktual, **peta residual** (di mana model sering salah).
  - Klasifikasi: Akurasi, F1 per kelas, Precision/Recall, Confusion matrix, Kappa, peta salah klasifikasi.
  - Clustering: Silhouette, ukuran klaster, peta klaster, profil rata-rata per klaster.
- **Feature importance** (permutation) + SHAP (opsi).
- **Prediksi**: ke layer yang sama, layer baru, atau raster (prediksi per piksel diproses blok demi blok agar hemat memori). Hasil langsung tampil di peta dengan legenda.
- **Registri model**: daftar model per proyek (nama, tipe, metrik, data, tanggal), bandingkan 2–3 model berdampingan, ekspor model (`.joblib`/`.pt` + `model_card.json`).

**Jembatan ke Python (Mode Lanjut):**
- **Konsol Python** di app (Monaco) dengan objek siap pakai: `layers["sekolah"]` → GeoDataFrame, `save_layer(gdf, "nama")`.
- **Ekspor ke Jupyter**: membuat `notebook.ipynb` berisi kode pemuatan layer + pipeline model yang sama.
- **Custom tool**: pengguna menaruh file `.py` berisi class `Tool` di `~/PetaLab/plugins/`, lalu tool otomatis muncul di Kotak Alat (form dibuat dari skema).

---

### 8.9 Riwayat & Jobs
- **Job Tray** (pojok kanan bawah, selalu terlihat): job berjalan + progress + ETA + [Batal]. Klik untuk detail log.
- **Halaman Riwayat**: timeline semua aksi (import, proses, training, ekspor) dengan parameter lengkap.
  - **[Jalankan ulang]** dengan parameter sama / diubah.
  - **[Lihat lineage]**: grafik asal-usul layer (layer A → Buffer → Clip → layer C).
  - **[Undo]** untuk aksi terakhir (menyembunyikan/menghapus layer hasil, mengembalikan atribut).
- Job gagal menampilkan **pesan ramah + detail teknis tersembunyi** + tombol [Salin laporan error].

---

### 8.10 Export & Laporan
| Ekspor | Format |
|---|---|
| Layer vektor | GeoPackage (disarankan), Shapefile (zip), GeoJSON, KML, CSV (+WKT/lat-lon), GeoParquet |
| Raster | GeoTIFF / COG |
| Tabel | CSV, XLSX |
| Peta | PNG/PDF dengan **Layout sederhana**: judul, legenda, skala, panah utara, atribusi, sumber data, ukuran A4/A3, potret/lanskap |
| Dashboard | PNG / PDF |
| Model | `.joblib` / `.pt` + model card |
| Proyek | `.petalab.zip` (seluruh folder proyek) |
| Reproduksi | Skrip Python / notebook dari Riwayat |

---

### 8.11 Pengaturan
- Bahasa (Indonesia / English), tema (terang / gelap), **Mode Pemula / Lanjut**.
- Satuan (metrik), format angka (`1.234,56`), CRS default proyek.
- Basemap & URL tile kustom, mode offline.
- Batas sumber daya: jumlah worker, batas RAM per job, penggunaan GPU.
- Lokasi folder workspace, pembersihan cache.
- Diagnostik: versi paket, tes GDAL, [Buka folder log].

---

## 9. Panduan UI/UX untuk Pemula

### 9.1 Layout global
```
┌──────┬──────────────────────────────────────────────────────┬──────────────┐
│ Nav  │  Header: Nama Proyek ▾ · Breadcrumb · 🔍 Cari Tool/Data│ ❓ Bantuan    │
│ (ikon│──────────────────────────────────────────────────────│──────────────│
│  +   │                                                      │ Panel Konteks│
│label)│              AREA KERJA UTAMA                        │ (Layer/Param/│
│      │      (Peta / Tabel / Dashboard / Form)               │  Info/Style) │
│      │                                                      │              │
├──────┴──────────────────────────────────────────────────────┴──────────────┤
│ Status: 📍 -7.2575, 112.7521 · Skala 1:25.000 · 12 terpilih · ⏳ 1 job    │
└────────────────────────────────────────────────────────────────────────────┘
```
- **Split view** Peta + Tabel (atas-bawah, bisa digeser) adalah tampilan kerja favorit, aktif via tombol `⇕`.

### 9.2 Aturan visual
- **Netral dan tenang**: UI berwarna abu-abu/putih (atau gelap). **Warna hanya untuk data** di peta dan grafik, plus satu warna aksen untuk tombol utama dan status seleksi (contoh: biru). Seleksi selalu memakai warna yang sama (kuning/cyan) di seluruh app.
- Tipografi: 1 keluarga font (Inter / sistem), ukuran dasar 14–15 px, angka memakai `tabular-nums`.
- Tombol utama per layar **hanya satu** (contoh: "▶ Jalankan").
- Ikon **selalu disertai label** di mode Pemula.
- Kontras memenuhi WCAG AA; palet peta *colorblind-safe* (viridis, ColorBrewer).

### 9.3 Pola bantuan pemula
| Pola | Implementasi |
|---|---|
| **Empty state yang mengajak** | *"Belum ada data. [Unggah File] atau [Pakai Data Contoh]"* + ilustrasi kecil |
| **Tooltip istilah** | Kata bergaris putus-putus (CRS, buffer, choropleth) → hover menampilkan definisi 1 kalimat + gambar |
| **Tur singkat** (sekali, bisa dilewati) | 5 langkah: Data → Peta → Pilih → Proses → Ekspor |
| **Ilustrasi sebelum/sesudah** | Di setiap kartu tool |
| **Saran cerdas** | Setelah upload poligon + CSV: *"Sepertinya kamu ingin menggabungkan tabel ini ke peta. [Mulai Join]"* |
| **Penjelasan hasil** | Setelah analisis statistik, tampilkan *"Artinya:"* dalam bahasa sederhana |
| **Panel ❓ Bantuan** | Kontekstual per halaman + video/gif pendek + "Resep" langkah demi langkah |
| **Konfirmasi hanya untuk aksi berbahaya** | Hapus layer / timpa file. Aksi lain cukup undo |
| **Shortcut** (Mode Lanjut) | `Ctrl+K` palet perintah, `S` seleksi, `I` identify, `T` tabel, `Ctrl+Z` undo |

### 9.4 Microcopy (gaya bahasa)
- Kalimat aktif, pendek, berbahasa Indonesia baku santai: *"Pilih layer yang mau dipotong."*
- Hindari: *"Eksekusi operasi geoprocessing gagal."* → Gunakan: *"Prosesnya belum berhasil. Penyebabnya … Coba …"*
- Angka diformat lokal: `12.345 fitur`, `3,2 km²`.

---

## 10. Wireframe Layar Utama

### 10.1 Peta + Tabel (split)
```
┌ PetaLab ▸ banjir-surabaya ▸ Peta ───────────────────── 🔍 ─ ❓ ┐
│🏠│ [✋][ℹ️][▭][⬠][◯][📏][✏️]  Basemap: OSM ▾          │ LAYER   │
│📊│┌──────────────────────────────────────────────┐   │ ☰ 👁 sekolah    ●│
│🗺│                                                │   │ ☰ 👁 zona_banjir ■│
│📁││        (peta OSM + layer)                     │   │ ☰ 👁 kecamatan  □│
│▦ │                                                │   │ [+ Tambah Data]   │
│⚙ ││                         [Legenda]             │   │──────────────────│
│🧠│└──────────────────────────────────────────────┘   │ GAYA: sekolah     │
│🕘│ ═══════════════ ⇕ ═══════════════                   │ ○ Satu warna      │
│📤│ Tabel: sekolah (245)  🔎 cari…  ☑ Terpilih saja    │ ● Per kategori    │
│  │ ┌────┬──────────────┬────────┬─────────┐           │   Kolom: [jenjang▾]│
│  │ │ id │ nama         │jenjang │ siswa   │           │ ○ Per angka       │
│  │ │ 12 │ SDN Rungkut 1│ SD     │ 412     │ ← sorot   │ Transparansi ▭▭▭▭ │
│  │ └────┴──────────────┴────────┴─────────┘           │                   │
├──┴────────────────────────────────────────────────────┴──────────────────┤
│📍 -7.3012, 112.7790 · 1:18.000 · 12 terpilih · ⏳ Buffer 60%  [Batal]     │
└───────────────────────────────────────────────────────────────────────────┘
```

### 10.2 Dashboard
```
┌ Dashboard ▸ Layer: kecamatan ▾ ───────────────── [+ Widget] [⤓ PDF] ┐
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                     │
│ │ 31      │ │ 350 km² │ │ 2,9 jt  │ │ 1,2 %   │                     │
│ │ wilayah │ │ luas    │ │ penduduk│ │ kosong  │                     │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘                     │
│ ┌────────────────────────┐ ┌────────────────────────────────────┐   │
│ │ Top 10 kepadatan (bar) │ │ Mini map (choropleth kepadatan)    │   │
│ └────────────────────────┘ └────────────────────────────────────┘   │
│ ┌────────────────────────┐ ┌────────────────────────────────────┐   │
│ │ Histogram NDVI         │ │ Scatter NDVI vs Suhu (r = -0,71)   │   │
│ └────────────────────────┘ └────────────────────────────────────┘   │
│  ℹ Klik batang/titik untuk memilih wilayah di peta.                  │
└──────────────────────────────────────────────────────────────────────┘
```

### 10.3 Wizard Model (langkah ④ Validasi)
```
┌ Model Baru ─ ①Tujuan ✓ ②Data ✓ ③Fitur ✓ ④Validasi ● ⑤Latih ⑥Hasil ┐
│ Bagaimana data dibagi untuk menguji model?                          │
│ ● Per blok wilayah (disarankan)   ○ Acak   ○ Per kelompok [kota ▾]  │
│ Ukuran blok: [ 2 km ]   Jumlah lipatan: [ 5 ]                       │
│ ┌───────────────────────────────┐  💡 Data yang berdekatan cenderung│
│ │ peta: blok berwarna per fold  │  mirip. Pembagian per blok memberi│
│ └───────────────────────────────┘  nilai akurasi yang lebih jujur.  │
│                                     [ ← Kembali ]  [ Lanjut → ]     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 11. Backend Python: Engine, Job, & API

### 11.1 Sistem Tool berbasis registry (plugin)
Setiap tool adalah class dengan **skema parameter Pydantic**. Frontend membaca skema ini (`GET /api/tools`) dan **membuat form secara otomatis**, sehingga menambah tool baru tidak perlu menyentuh frontend.

```python
# backend/petalab/tools/vector_buffer.py
from pydantic import BaseModel, Field
from petalab.tools._base import Tool, register, LayerRef, JobContext

class BufferParams(BaseModel):
    input: LayerRef = Field(..., title="Layer masukan", json_schema_extra={"geom": ["point","line","polygon"]})
    only_selected: bool = Field(False, title="Hanya fitur terpilih")
    distance: float = Field(100, gt=0, title="Jarak")
    unit: str = Field("m", title="Satuan", json_schema_extra={"enum": ["m", "km"]})
    dissolve: bool = Field(False, title="Gabungkan hasil", json_schema_extra={"advanced": True})
    output_name: str | None = Field(None, title="Nama hasil")

@register
class BufferTool(Tool):
    id = "vector.buffer"
    name = "Buat Zona di Sekitar"
    technical_name = "Buffer"
    group = "Vektor: Dasar"
    level = "pemula"
    description = "Membuat area selebar jarak tertentu di sekitar objek."
    Params = BufferParams

    def run(self, p: BufferParams, ctx: JobContext):
        gdf = ctx.load_layer(p.input, only_selected=p.only_selected)
        ctx.progress(10, "Menyiapkan sistem koordinat")
        work = ctx.to_metric_crs(gdf)            # UTM otomatis
        dist = p.distance * (1000 if p.unit == "km" else 1)
        ctx.progress(30, "Membuat zona")
        work["geometry"] = work.geometry.buffer(dist)
        if p.dissolve:
            work = work.dissolve()
        ctx.check_cancel()
        out = ctx.from_metric_crs(work, like=gdf)
        ctx.progress(90, "Menyimpan hasil")
        return ctx.save_layer(out, name=p.output_name or f"{p.input.name}_buffer_{p.distance:g}{p.unit}")

    def to_python(self, p: BufferParams) -> str:   # fitur "Salin sebagai kode"
        return f'''gdf = gpd.read_file("{p.input.name}.gpkg")
gdf_m = gdf.to_crs(gdf.estimate_utm_crs())
gdf_m["geometry"] = gdf_m.buffer({p.distance}{" * 1000" if p.unit=="km" else ""})
result = gdf_m.to_crs(gdf.crs)'''
```

### 11.2 Job Manager
- **Antrean** di SQLite (tabel `jobs`), jadi tetap tercatat walau server restart.
- **Worker pool**: `ProcessPoolExecutor` (default `cores - 1`, maksimal 4) supaya proses berat tidak memblokir API dan crash di worker tidak menjatuhkan server.
- **JobContext** menyediakan: `progress(pct, msg)`, `log(msg)`, `check_cancel()`, `load_layer()`, `save_layer()`, `to_metric_crs()`.
- Progress dikirim ke main process via `multiprocessing.Queue` → disiarkan ke WebSocket `/ws/jobs`.
- **Cancel**: flag di shared memory, dicek oleh `check_cancel()`; jika tidak responsif, worker dihentikan setelah 10 detik.
- **Timeout & batas memori** per job (bisa diatur), dengan pesan ramah saat terlampaui.
- **Penulisan atomik**: hasil ditulis ke `*.tmp` lalu di-`rename` setelah sukses, sehingga tidak ada layer setengah jadi.
- Status job: `queued → running → (succeeded | failed | cancelled)`.

### 11.3 Engine ML
```python
# ringkas: pipeline yang disimpan selalu lengkap (preprocessing + model)
pipe = Pipeline([
    ("prep", ColumnTransformer([
        ("num", Pipeline([("imp", SimpleImputer(strategy="median")), ("sc", StandardScaler())]), num_cols),
        ("cat", Pipeline([("imp", SimpleImputer(strategy="most_frequent")), ("oh", OneHotEncoder(handle_unknown="ignore"))]), cat_cols),
    ])),
    ("model", RandomForestRegressor(n_estimators=300, random_state=42, n_jobs=-1)),
])
cv = SpatialBlockKFold(block_size_m=2000, n_splits=5, random_state=42)   # ml/cv.py
scores = cross_validate(pipe, X, y, groups=blocks, cv=cv, scoring=[...])
pipe.fit(X, y)
registry.save(pipe, card={...})   # joblib + model_card.json
```
- `model_card.json` memuat: tipe tugas, fitur dan urutannya, CRS, target, metode CV, metrik per fold, versi paket, hash data latih, dan seed.
- **Prediksi raster** diproses per *window* (contoh 512×512) via Rasterio agar raster besar tidak memenuhi RAM.
- **GPU**: jika `torch.cuda.is_available()`, tampilkan opsi GPU di form.

---

## 12. Strategi Rendering Data Besar

| Ukuran layer | Cara kirim ke peta |
|---|---|
| ≤ 20.000 fitur & ≤ 15 MB | GeoJSON sekaligus (disederhanakan sesuai zoom) |
| > 20.000 fitur | **Vector tile (MVT)** dari `/tiles/{layer}/{z}/{x}/{y}.pbf` via DuckDB `ST_AsMVT` + cache tile di disk |
| > 1 juta titik | MVT + opsi **deck.gl** (ScatterplotLayer/HexagonLayer) |
| Raster | Tile PNG dari COG via **rio-tiler** (`/tiles/raster/{layer}/{z}/{x}/{y}.png?cmap=viridis&rescale=…`) |

- **Seleksi** di peta untuk data besar dikirim ke backend sebagai geometri, dihitung di DuckDB/GeoPandas, lalu dikembalikan **daftar ID** (bukan geometri). Highlight memakai `feature-state` MapLibre.
- **Tabel** memakai paginasi server (`LIMIT/OFFSET` + sort/filter di DuckDB).
- **Statistik dashboard** dihitung di backend, dan frontend hanya menerima angka ringkasan.
- Kolom internal `_fid` (integer stabil) ada di setiap layer sebagai ID untuk sinkronisasi Peta ↔ Tabel ↔ Seleksi.

---

## 13. Reliability: Supaya Tidak Gampang Rusak

| Risiko | Penanganan |
|---|---|
| Data asli rusak/tertimpa | Salinan read-only di `sources/`, semua proses non-destruktif |
| App/browser tertutup tiba-tiba | Autosave state UI (30 detik) + `project.json`; job tercatat di SQLite dan dilanjutkan/ditandai gagal saat restart |
| Layer setengah jadi | Tulis ke `.tmp` → rename atomik; SQLite dalam mode WAL |
| Proses berat membekukan UI | Semua kerja berat di worker process; API utama tetap responsif |
| Worker crash (segfault GDAL, OOM) | Process isolation; job ditandai gagal + pesan ramah; server tetap hidup |
| CRS salah/tidak ada | Validasi saat import, deteksi lat/lon tertukar, UTM otomatis untuk ukuran |
| Geometri rusak | Deteksi `is_valid`, tombol perbaiki (`make_valid`), opsi otomatis di setiap tool |
| Encoding teks kacau | Deteksi encoding `.dbf`/CSV, pratinjau, pilihan manual |
| Memori habis | Estimasi ukuran sebelum run, pemrosesan per chunk/window, batas RAM per job |
| Versi paket bentrok | `environment.yml` dengan versi terkunci + **health check** saat start |
| Internet mati | Semua fitur inti offline; basemap jatuh ke "Kosong" dengan banner info; Overpass/Nominatim dinonaktifkan dengan pesan |
| Port terpakai | Coba port berikutnya otomatis (8765 → 8766 …) |
| Bug sulit dilacak | Log terstruktur per job (`job_id`), tombol "Salin laporan error" (tanpa data pribadi) |
| Reproduksibilitas | Riwayat lengkap + lineage + seed + versi paket di model card |

**Health check saat start** (`GET /api/health`): versi Python, GDAL, PROJ, GeoPandas, Rasterio, DuckDB spatial, ruang disk, RAM, GPU. Jika ada yang gagal, halaman Beranda menampilkan kartu merah dengan langkah perbaikan.

---

## 14. Model Data Internal

### SQLite `petalab.db` (per proyek)
```sql
CREATE TABLE layers (
  id TEXT PRIMARY KEY,               -- uuid
  name TEXT NOT NULL,
  kind TEXT NOT NULL,                -- vector | raster | table
  geom_type TEXT,                    -- point | line | polygon | multi* | null
  crs TEXT,                          -- "EPSG:4326"
  path TEXT NOT NULL,                -- layers/xxx.parquet | layers/xxx.tif
  feature_count INTEGER,
  bbox TEXT,                         -- json [minx,miny,maxx,maxy]
  schema_json TEXT,                  -- kolom + tipe
  style_json TEXT,                   -- styling peta
  lineage_json TEXT,                 -- {tool, params, inputs, job_id}
  created_at TEXT, updated_at TEXT,
  deleted_at TEXT                    -- soft delete (Sampah 7 hari)
);

CREATE TABLE selections (
  id TEXT PRIMARY KEY, layer_id TEXT, name TEXT,
  fids BLOB,                         -- array int terkompresi
  rule_json TEXT,                    -- query/lokasi yang membentuknya
  created_at TEXT
);

CREATE TABLE jobs (
  id TEXT PRIMARY KEY, tool_id TEXT, params_json TEXT,
  status TEXT, progress REAL, message TEXT,
  outputs_json TEXT, error_user TEXT, error_detail TEXT,
  started_at TEXT, finished_at TEXT
);

CREATE TABLE history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT, target_id TEXT, payload_json TEXT, undo_json TEXT, created_at TEXT
);

CREATE TABLE models (
  id TEXT PRIMARY KEY, name TEXT, task TEXT,        -- regression|classification|clustering|pixel
  algorithm TEXT, path TEXT, card_json TEXT, metrics_json TEXT,
  train_layer_id TEXT, created_at TEXT
);
```

### State frontend (Zustand)
```ts
type ProjectState = { id: string; name: string; view: { center: [number, number]; zoom: number } }
type LayerState   = { order: string[]; visible: Record<string, boolean>; opacity: Record<string, number>; activeId?: string }
type SelectionState = { byLayer: Record<string, Set<number>>; source: 'map' | 'table' | 'chart' | 'query' }
type UIState      = { mode: 'pemula' | 'lanjut'; split: boolean; theme: 'light' | 'dark' }
```

---

## 15. Kontrak API (Ringkas)

| Metode | Endpoint | Fungsi |
|---|---|---|
| GET | `/api/health` | Status sistem & paket |
| GET/POST | `/api/projects` | Daftar / buat proyek |
| POST | `/api/projects/{pid}/layers/upload` | Upload file (multipart) → job import |
| GET | `/api/projects/{pid}/layers` | Daftar layer |
| GET | `/api/layers/{lid}` | Info, skema, bbox, lineage |
| PATCH | `/api/layers/{lid}` | Ganti nama, style |
| DELETE | `/api/layers/{lid}` | Soft delete |
| GET | `/api/layers/{lid}/geojson?simplify=…` | Data kecil langsung |
| GET | `/tiles/{lid}/{z}/{x}/{y}.pbf` | Vector tile |
| GET | `/tiles/raster/{lid}/{z}/{x}/{y}.png?cmap=&rescale=&bands=` | Raster tile |
| GET | `/api/layers/{lid}/features?offset=&limit=&sort=&filter=` | Tabel berhalaman |
| GET | `/api/layers/{lid}/stats?column=` | Statistik + histogram kolom |
| POST | `/api/layers/{lid}/select` | `{mode: geometry|attribute|location, ...}` → `{fids, count}` |
| POST | `/api/layers/{lid}/calculate` | Kalkulator kolom (preview / apply) |
| POST | `/api/join` | Join tabel (preview / apply) |
| GET | `/api/tools` | Daftar tool + JSON Schema parameter |
| POST | `/api/tools/{tool_id}/preview` | Pratinjau pada sampel |
| POST | `/api/tools/{tool_id}/run` | Jalankan → `{job_id}` |
| GET | `/api/jobs/{jid}` · POST `/api/jobs/{jid}/cancel` | Status / batal |
| WS | `/ws/jobs` | Stream `{job_id, progress, message, status}` |
| POST | `/api/models/train` | Training → `{job_id}` |
| GET | `/api/models` · `/api/models/{mid}` | Registri & rapor |
| POST | `/api/models/{mid}/predict` | Prediksi ke layer/raster → `{job_id}` |
| GET | `/api/osm/search?q=` | Geocoding (Nominatim) |
| POST | `/api/osm/download` | Unduh data Overpass → `{job_id}` |
| POST | `/api/export` | Ekspor layer/peta/dashboard/proyek |
| GET | `/api/history` · POST `/api/history/{id}/undo` | Riwayat & undo |

Format error seragam:
```json
{ "code": "CRS_MISSING", "message": "File ini tidak punya info sistem koordinat.",
  "hint": "Jika datanya dari GPS/Google Maps, pilih WGS 84 (EPSG:4326).",
  "actions": [{"label": "Pakai WGS 84", "action": "set_crs", "value": "EPSG:4326"}],
  "detail": "pyogrio: no .prj found" }
```

---

## 16. Katalog Pesan Error Ramah Pemula

| Kode | Pesan ke pengguna | Tombol aksi |
|---|---|---|
| `SHP_INCOMPLETE` | "Shapefile butuh beberapa file sekaligus (.shp, .dbf, .shx, .prj). Unggah semuanya atau dalam satu .zip." | [Unggah lagi] |
| `CRS_MISSING` | "File ini tidak punya info sistem koordinat." | [Pakai WGS 84] [Pilih lain] |
| `LATLON_SWAPPED` | "Sepertinya kolom lintang dan bujur tertukar (titik muncul di Antartika)." | [Tukar] |
| `GEOM_INVALID` | "Ada N bentuk yang rusak (garis saling silang)." | [Perbaiki otomatis] [Lihat] |
| `CRS_MISMATCH` | "Dua layer memakai sistem koordinat berbeda. PetaLab akan menyamakannya otomatis." | [OK] |
| `NO_OVERLAP` | "Kedua layer tidak bertumpuk di lokasi yang sama, jadi hasilnya kosong." | [Zoom ke keduanya] |
| `JOIN_LOW_MATCH` | "Hanya 40% data yang cocok. Mungkin penulisan nama berbeda." | [Normalisasi teks] [Cocokkan manual] |
| `MEMORY_LIMIT` | "Data terlalu besar untuk diproses sekaligus." | [Proses per bagian] [Pakai seleksi saja] |
| `TARGET_IMBALANCED` | "Kelas 'rawan' hanya 3% data. Model bisa malas menebak 'aman'." | [Seimbangkan bobot kelas] |
| `LEAKAGE_SUSPECT` | "Kolom X hampir identik dengan target, jadi model bisa 'menyontek'." | [Keluarkan kolom] |
| `OFFLINE` | "Tidak ada internet. Basemap dan unduh OSM dinonaktifkan; fitur lain tetap jalan." | [Coba lagi] |
| `OVERPASS_TOO_BIG` | "Area terlalu luas untuk diunduh sekaligus." | [Perkecil area] [Bagi otomatis] |

---

## 17. Keamanan Lokal
- Server **hanya bind ke `127.0.0.1`**, tidak bisa diakses dari jaringan lain kecuali pengguna mengaktifkan opsi "Akses LAN" secara eksplisit.
- **Token sesi** acak dibuat saat start, disisipkan ke URL pertama dan disimpan sebagai cookie; semua API mewajibkannya (melindungi dari situs lain yang mencoba memanggil `localhost`).
- CORS ketat (hanya origin app sendiri).
- Validasi path agar tidak bisa keluar dari folder workspace (*path traversal*).
- Kalkulator kolom memakai **ekspresi DuckDB tersandbox** (bukan `eval` Python). Konsol Python hanya ada di Mode Lanjut dengan peringatan jelas.
- Batas ukuran upload yang bisa diatur; file zip diperiksa terhadap *zip-slip*.

---

## 18. Testing & Quality

| Lapisan | Alat | Fokus |
|---|---|---|
| Unit backend | `pytest` | Setiap tool: input kecil → output yang sudah diketahui (golden file) |
| Data aneh | `pytest` + fixture | Shapefile tanpa `.prj`, encoding Latin-1, geometri rusak, kolom kosong, CRS lokal (DGN95/TM-3) |
| Properti | `hypothesis` | Buffer → luas ≥ luas asal; Clip ⊆ batas clip |
| API | `httpx` + FastAPI TestClient | Kontrak & format error |
| ML | `pytest` | Spatial CV tidak bocor (blok train/test terpisah), reprodusibilitas seed |
| Frontend unit | `Vitest` + Testing Library | Form auto dari skema, store seleksi |
| E2E | `Playwright` | Skenario: upload → join → choropleth → ekspor PNG |
| Performa | skrip benchmark | 1 juta titik: tile < 200 ms, tabel scroll 60 fps, seleksi < 1 detik |
| Usability | Uji 5 pemula | Bisa menyelesaikan 3 skenario utama tanpa bantuan dalam < 10 menit |

---

## 19. Roadmap Pengerjaan

### Fase 0: Fondasi (±1 minggu)
- Monorepo, `environment.yml`, FastAPI menyajikan frontend build, health check.
- Struktur proyek/workspace, SQLite, Job Manager + WebSocket.

### Fase 1: MVP "Lihat & Pilih" (±2–3 minggu)
- Import vektor (SHP zip, GeoJSON, GPKG, CSV lat/lon) + validasi + Laporan Import.
- Map View: basemap OSM, panel layer, styling dasar (satu warna, kategori, choropleth), legenda, identify.
- Tabel atribut virtual + sinkron seleksi.
- Seleksi: klik, kotak, poligon, query builder atribut.
- Ekspor GeoPackage/GeoJSON/CSV + PNG peta.
- Data contoh + tur singkat.

### Fase 2: "Olah" (±3 minggu)
- Registry tool + form otomatis + pratinjau + "Salin sebagai Python".
- Tool Vektor Dasar (11 tool) + Spatial Join + Hitung Titik per Wilayah + Terdekat.
- Select by location, kalkulator kolom, wizard Join tabel, group by.
- Riwayat, lineage, undo, Sampah.
- Dashboard otomatis + cross-filter.

### Fase 3: "Raster & Data Besar" (±2–3 minggu)
- Import raster → COG, tile raster, styling raster.
- Tool raster (clip, zonal stats, sample, kalkulator, NDVI/NDWI, slope, reclassify).
- Vector tile MVT untuk layer besar, paginasi tabel di DuckDB.
- Unduh OSM (Overpass) + pencarian lokasi.

### Fase 4: "Model" (±3–4 minggu)
- Wizard 6 langkah, feature builder spasial, Spatial Block CV.
- RF/ExtraTrees/LightGBM/XGBoost/Linear, rapor model, importance, peta residual.
- Prediksi ke vektor & raster (windowed), registri + perbandingan model.
- Klasifikasi tutupan lahan dari citra + alat gambar sampel.
- Clustering + statistik spasial (Moran's I, Gi*, IDW/Kriging).

### Fase 5: "Pro" (berkelanjutan)
- Model Builder / Resep, plugin tool kustom, konsol Python, ekspor notebook.
- PyTorch/torchgeo, tuning Optuna, SHAP.
- Layout peta lanjutan, dashboard kustom tersimpan, i18n English.
- Installer satu-klik (conda-pack / PyInstaller + frontend statis).

---

## 20. Checklist "Definition of Done"

Sebuah fitur dianggap selesai jika:
- [ ] Bisa dipakai pemula **tanpa membaca dokumentasi** (diuji ke minimal 1 orang).
- [ ] Punya **empty state**, **loading state**, **error state** yang ramah.
- [ ] Proses > 1 detik berjalan sebagai **job** dengan progress & tombol batal.
- [ ] **Tidak mengubah data asli**; hasil = layer baru + lineage tercatat.
- [ ] CRS ditangani otomatis dan benar untuk operasi jarak/luas.
- [ ] Ada **unit test** + minimal 1 skenario data "aneh".
- [ ] Berfungsi **offline** (kecuali fitur yang memang butuh internet, dengan pesan jelas).
- [ ] Teks UI ada di `i18n/id.json` (tidak hardcode).
- [ ] Bekerja lancar pada data contoh besar (benchmark lulus).

---

## 21. Lampiran: Glosarium Pemula
*(Ditampilkan sebagai tooltip dan halaman Bantuan)*

| Istilah | Penjelasan singkat |
|---|---|
| **Layer** | Satu "lapisan" data di peta, seperti satu lembar plastik transparan berisi gambar. |
| **Vektor** | Data berupa titik, garis, atau bidang (poligon). Contoh: lokasi sekolah, jalan, batas kecamatan. |
| **Raster** | Data berupa kotak-kotak piksel seperti foto. Contoh: citra satelit, peta ketinggian. |
| **Atribut** | Informasi tambahan tiap objek, tampil sebagai kolom di tabel (nama, jumlah penduduk). |
| **CRS / Sistem Koordinat** | "Bahasa" untuk menyatakan posisi di bumi. WGS 84 (derajat) untuk GPS; UTM (meter) untuk mengukur jarak/luas. |
| **EPSG** | Nomor kode CRS. 4326 = WGS 84; 32749 = UTM Zona 49S (Jawa Timur). |
| **Buffer** | Zona selebar jarak tertentu di sekitar objek. |
| **Clip** | Memotong layer menggunakan batas area lain, seperti memotong kertas dengan cetakan. |
| **Dissolve** | Menggabungkan bidang-bidang yang bersebelahan menjadi satu. |
| **Spatial Join** | Mengambil informasi dari layer lain berdasarkan posisi, bukan nama. |
| **Choropleth** | Peta yang mewarnai wilayah berdasarkan nilai angka. |
| **Zonal Statistics** | Menghitung rata-rata/jumlah nilai raster di dalam setiap wilayah. |
| **NDVI** | Indeks kehijauan tanaman dari citra satelit (−1 sampai 1; makin tinggi makin hijau). |
| **Hotspot** | Area tempat nilai tinggi mengelompok secara signifikan. |
| **Interpolasi** | Menebak nilai di lokasi yang tidak diukur berdasarkan titik-titik sekitar. |
| **Spatial CV** | Cara menguji model dengan membagi data per wilayah agar hasil penilaian jujur. |
| **RMSE / MAE** | Rata-rata besar kesalahan prediksi (makin kecil makin baik). |
| **R²** | Seberapa banyak variasi data yang dijelaskan model (0–1, makin besar makin baik). |
| **Feature Importance** | Faktor mana yang paling berpengaruh dalam keputusan model. |
| **GeoParquet / COG** | Format penyimpanan internal yang cepat untuk vektor / raster. |
| **Vector Tile** | Data peta dipotong kecil-kecil per zoom supaya data besar tetap lancar. |

---

*Blueprint PetaLab v1.0 · siap diturunkan menjadi backlog (issue per fitur di Fase 1–5).*
