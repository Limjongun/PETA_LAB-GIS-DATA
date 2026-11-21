# PetaLab — Local Web GIS & Spatial Machine Learning Studio

**PetaLab** adalah aplikasi web GIS lokal (*local-first*) untuk membaca, mengolah, memvisualisasikan, menganalisis, dan memodelkan data geospasial serta citra satelit langsung di browser (`http://127.0.0.1:8765`), didukung oleh mesin Python geospasial dan Spatial Machine Learning di belakang layar.

> *"Seperti QGIS versi ramah pemula, di browser, dengan Python, Spatial Machine Learning, dan Google Earth Engine siap pakai."*

---

## Fitur Utama

### 1. Arsitektur 7 Workspace Terstruktur (Anti-Tumpang Tindih)
Alur kerja disusun linear dari akuisisi data hingga laporan akhir dengan **Mode Pemula** dan **Mode Lanjut**:

| Workspace | Fungsi Utama |
| :--- | :--- |
| **Beranda** | Ringkasan proyek aktif, pembuatan proyek baru, proyek contoh bawaan (*Surabaya Spatial Lab*), dan resep analisis cepat. |
| **Sumber Data** | Satu pusat input data dengan 4 sub-tab: **Pustaka Layer**, **Unggah File Lokal** (Shapefile `.zip`, GeoJSON, GeoPackage, KML, CSV/Excel, GeoParquet, GeoTIFF), **Unduh OpenStreetMap (Overpass)**, dan **Katalog Bumi (Google Earth Engine)**. |
| **Studio Peta** | 4 mode terintegrasi dengan sinkronisasi *cross-filter* penuh: **Peta + Tabel**, **Peta Penuh**, **Tabel Penuh**, dan **Dashboard Analitik Spasial**. |
| **Proses** | Kotak alat geoprocessing dengan **43 tool** (Vektor Dasar, Analisis Vektor, Raster, Statistik Spasial, dan Zonal GEE) lengkap dengan pratinjau langsung di peta dan generator kode Python. |
| **Model ML** | Wizard **Spatial Machine Learning 6-Langkah** (Regresi, Klasifikasi, Clustering, Klasifikasi Piksel Raster), *Spatial Feature Builder*, audit *Data Leakage*, *Spatial Block CV*, ekspor `.ipynb`, dan Konsol Python Interaktif. |
| **Ekspor** | Ekspor multi-format (**Excel `.xlsx`** terformat, **CSV `;` / `,`**, GeoJSON, GeoPackage, GeoParquet, paket proyek `.petalab.zip`, skrip Python reproduksibilitas) serta layout cetak peta A4. |
| **Riwayat & Pengaturan** | Timeline riwayat aktivitas + **Undo**, pohon asal-usul data (*Data Lineage*), antrean background jobs WebSocket, diagnostik sistem, dan manajemen autentikasi Google Earth Engine. |

### 2. Studio Peta Interaktif, Segmentasi Long/Lat, & View Heatmap
- **Rendering Vektor & Raster Cepat**: Didukung MapLibre GL JS dengan simplifikasi adaptif, styling *Single*, *Category*, *Choropleth* (Quantile / Equal Interval / Natural Breaks), *Proportional Symbol*, **GPU Heatmap**, *Swipe Compare* 2 layer, serta pen tool untuk seleksi, pengukuran jarak/luas geodesik, dan digitasi layer baru.
- **Segmentasi & Akurasi Long/Lat (Pemilih 2 Kolom)**: Pilih kolom **Bujur (Long)** dan **Lintang (Lat)** dari dataset tabel/CSV/Excel mana pun, otomatis mem-parsing desimal koma/DMS, mendeteksi & memperbaiki koordinat Indonesia yang tertukar, menghitung proyeksi **UTM otomatis** (mis. `EPSG:32748`/`EPSG:32749`), lalu membentuk segmentasi **Kuadran (NW/NE/SW/SE)**, **Grid Koordinat**, **Klaster K-Means UTM**, atau **Rentang Atribut**, lengkap dengan poligon zona & opsi langsung ke **View Heatmap**.
- **Tangkap Titik & Create New Dataset**: Klik titik atau pasangan titik asal–tujuan langsung di peta, ukur jarak otomatis, opsional *Join* dengan tabel proyek, dan buat dataset baru berformat **`.csv`** (`;` siap Excel Indonesia atau `,` standar GIS/Python) serta **`.xlsx`** native yang rapi.

### 3. Dashboard Analitik Spasial (8 Chart ECharts Cross-Filter)
- **6 Kartu KPI Kontekstual**: Jumlah fitur & persentase terpilih, Rata-rata/Total/Median metrik, Simpangan Baku ($\sigma$) & Outlier IQR (dengan tombol 1-klik *Pilih Outlier*), Luas Cakupan UTM / Convex Hull & densitas per km², Pola Spasial **Nearest Neighbor Index ($R$)**, serta kualitas data & CRS.
- **Ringkasan Insight Otomatis** berbasis statistik distribusi, segmen dominan, dan korelasi variabel.
- **8 Visualisasi Interaktif Sinkron dengan Peta & Tabel**: Perbandingan Antar Segmen (Bar + Garis Rata-rata), Box Plot per Segmen, Peta Sebaran 2D (Long × Lat) + *Mean Center*, Matriks Korelasi Pearson ($r$), Histogram Distribusi, Ranking Top 10 / Bottom 5, Proporsi Donut, dan Scatter Plot Regresi Linear OLS ($r$, $R^2$).

### 4. Katalog Bumi — Integrasi Google Earth Engine (GEE)
- **10 Preset Satelit Siap Pakai**: Sentinel-2 (NDVI, True Color RGB, NDWI, NDBI), Landsat 8/9 Land Surface Temperature (LST), SRTM/NASADEM Elevasi, ESA WorldCover 10m, CHIRPS Curah Hujan, VIIRS Nighttime Lights, serta Custom Collection/Expression (Mode Lanjut).
- **Cloud Masking Default untuk Indonesia**, estimasi ukuran & dimensi piksel sebelum unduh, pemecahan petak otomatis (batas 32 MB / 10.000 px), pratinjau tile langsung di Langkah 4 dengan pemilih palet warna, penyimpanan permanen sebagai GeoTIFF lokal + `SUMBER_DATA.md`, dan isolasi kredensial ketat di luar folder proyek.

### 5. Keamanan Lokal, Non-Destruktif, & UI Profesional
- **Non-Destruktif**: File mentah tersimpan *read-only* di `sources/`; format kerja internal memakai **GeoParquet** (dengan indeks `_fid` stabil) dan **GeoTIFF**; setiap proses menghasilkan layer baru + *Soft Delete 7 hari*.
- **Keamanan Lokal**: Proteksi token sesi (`X-PetaLab-Token`) pada endpoint eksekusi Konsol Python, DuckDB SQL sandbox yang memblokir DDL/DML & pembacaan file lokal, serta pembatasan CORS khusus `localhost`/`127.0.0.1`.
- **Desain Minimalis 2-Tone**: Palet terfokus **Deep Tosca** & **Burnt Orange** (dengan Hijau/Merah khusus untuk indikator sukses/gagal), sudut tajam rapi, tanpa efek glow berlebih, mendukung mode Gelap & Terang.

---

## Tech Stack

| Lapisan | Teknologi |
| :--- | :--- |
| **Backend API & Jobs** | Python 3.11+, FastAPI, Uvicorn, Pydantic v2, WebSockets, SQLite (WAL) |
| **Mesin Geospasial & Tabular** | GeoPandas, Shapely 2.x, Pyogrio, PyProj, DuckDB, Rasterio / Pillow, OpenPyXL |
| **Spatial Machine Learning** | Scikit-learn, SciPy, NumPy, Pandas, Joblib |
| **Satelit & Data Eksternal** | Google Earth Engine Python API (`earthengine-api`, opsional), OpenStreetMap Overpass & Nominatim |
| **Frontend Studio** | React 18, TypeScript, Tailwind CSS, Zustand, MapLibre GL JS, Apache ECharts |

---

## Struktur Direktori

```text
.
├── backend/
│   ├── petalab/
│   │   ├── api/            # Endpoint FastAPI (projects, layers, tiles, features, selection, tools, gee, models, osm, jobs)
│   │   ├── core/           # I/O vektor/raster, validasi, CRS UTM, DuckDB, stats, health, sample data, GEE engine
│   │   ├── db/             # Repositori SQLite proyek, layer, lineage, riwayat & undo
│   │   ├── jobs/           # Background Job Manager & broadcaster WebSocket /ws/jobs
│   │   ├── ml/             # Spatial Feature Builder, leakage audit, Spatial Block CV, trainer & notebook exporter
│   │   ├── tools/          # 43 alat geoprocessing (vektor dasar, analisis, raster, statistik spasial, GEE)
│   │   └── main.py         # Entrypoint FastAPI + SPA server & injeksi session token
│   ├── tests/              # Suite uji otomatis (test_petalab.py & test_gee.py)
│   └── pyproject.toml
├── frontend/
│   ├── src/
│   │   ├── api/            # Klien REST API & tipe TypeScript (client.ts)
│   │   ├── components/     # MapView (MapLibre GL) & TabularView (DuckDB query/calc/join)
│   │   ├── pages/          # Home, Data, Dashboard, EarthCatalog, Processing, Model, Export, History, Settings
│   │   ├── stores/         # State global Zustand (usePetaStore.ts)
│   │   └── lib/            # Formatter, palet warna, glosarium istilah GIS
│   ├── dist/               # Bundle siap jalan (index.html + assets/petalab_app.tsx)
│   └── tailwind.config.js
├── build_dist.py           # Bundler frontend tanpa Node/npm untuk distribusi lokal cepat
├── environment.yml         # Definisi environment Conda
├── install.bat             # Skrip instalasi & health check Windows
├── PetaLab.bat             # Launcher satu-klik Windows
├── PetaLab.command         # Launcher macOS/Linux
└── *.csv / *.geojson       # Dataset sampel uji (Surabaya & data uji validasi)
```

---

## Instalasi & Cara Menjalankan

### Prasyarat
- **Python 3.11+** (disarankan memakai Conda atau `pip` 64-bit).

### 1. Instalasi Dependensi Backend
Menggunakan `pip`:
```powershell
python -m pip install -e backend
```
Atau dengan dukungan opsional **Google Earth Engine**:
```powershell
python -m pip install -e "backend[gee]"
```
Atau menggunakan Conda:
```bash
conda env create -f environment.yml
conda activate petalab
```

### 2. Menjalankan Aplikasi

**Windows (Satu-Klik):**
```bat
PetaLab.bat
```

**Terminal (Windows PowerShell / Linux / macOS):**
```powershell
$env:PYTHONPATH = "backend"
python -m petalab.main --open-browser
```
Aplikasi berjalan di **`http://127.0.0.1:8765`** (dokumentasi OpenAPI/Swagger di `http://127.0.0.1:8765/docs`). Pada peluncuran pertama, PetaLab otomatis membuat proyek contoh **Analisis Spasial & Banjir Surabaya** lengkap dengan 6 layer vektor, raster, dan tabel.

### 3. Membangun Ulang Frontend (Setelah Mengubah `frontend/src/`)
```powershell
python build_dist.py
```

### 4. Menjalankan Suite Pengujian (`pytest`)
```powershell
python -m pytest backend/tests -v
```

---

## Konfigurasi Opsional: Google Earth Engine (Katalog Bumi)

1. Daftar proyek nonkomersial di [Google Earth Engine](https://code.earthengine.google.com/register) dan siapkan **Google Cloud Project ID** Anda.
2. Autentikasi akun OAuth satu kali di terminal lokal:
   ```powershell
   python -c "import ee; ee.Authenticate(); ee.Initialize(project='<PROJECT_ID_GCP_ANDA>')"
   ```
3. Buka menu **Pengaturan** di PetaLab, masukkan Project ID Anda, lalu klik **Hubungkan & Uji Koneksi**.
   - Kredensial disimpan lokal di `workspace/credentials/` (terisolasi di luar `workspace/projects/`, diabaikan oleh `.gitignore`, dan tidak pernah ikut terekspor ke `.petalab.zip`).

---

## Lisensi & Catatan Atribusi

- Peta dasar standar menggunakan **OpenStreetMap contributors**, **CARTO**, dan **Esri World Imagery**.
- Setiap unduhan dari Katalog Bumi (Sentinel-2 Copernicus, Landsat USGS/NASA, SRTM/NASADEM, ESA WorldCover, CHIRPS UCSB, VIIRS NOAA) secara otomatis menyertakan atribusi ilmiah pada metadata layer dan file `SUMBER_DATA.md` saat proyek diekspor.
