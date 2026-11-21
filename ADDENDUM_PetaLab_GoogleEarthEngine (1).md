# Addendum Blueprint — **PetaLab × Google Earth Engine**
### Modul "Katalog Bumi": sumber data raster global untuk Processing, Statistik, dan Modeling
*Pelengkap dokumen `BLUEPRINT_PetaLab_GIS_Web.md` — bukan pengganti*

---

## Daftar Isi

1. [Tujuan & Ruang Lingkup](#1-tujuan--ruang-lingkup)
2. [Keputusan Desain Utama](#2-keputusan-desain-utama)
3. [Prasyarat & Model Akses](#3-prasyarat--model-akses)
4. [Arsitektur Integrasi](#4-arsitektur-integrasi)
5. [Penyimpanan Kredensial & Keamanan](#5-penyimpanan-kredensial--keamanan)
6. [Modul UI Baru: Katalog Bumi](#6-modul-ui-baru-katalog-bumi)
7. [Batas Teknis GEE yang Wajib Ditangani](#7-batas-teknis-gee-yang-wajib-ditangani)
8. [Tiga Jalur Pengambilan Data](#8-tiga-jalur-pengambilan-data)
9. [Tool Baru di Kotak Alat](#9-tool-baru-di-kotak-alat)
10. [Implementasi Backend](#10-implementasi-backend)
11. [Integrasi ke Modul Modeling](#11-integrasi-ke-modul-modeling)
12. [Cache & Reproduksibilitas](#12-cache--reproduksibilitas)
13. [Mode Offline & Degradasi](#13-mode-offline--degradasi)
14. [Pesan Error Ramah Pemula (GEE)](#14-pesan-error-ramah-pemula-gee)
15. [Lisensi & Atribusi Dataset](#15-lisensi--atribusi-dataset)
16. [Dependensi Baru](#16-dependensi-baru)
17. [Testing](#17-testing)
18. [Roadmap: Fase 3.5](#18-roadmap-fase-35)
19. [Checklist Definition of Done](#19-checklist-definition-of-done)
20. [Glosarium Tambahan](#20-glosarium-tambahan)

---

## 1. Tujuan & Ruang Lingkup

### Masalah yang diselesaikan
PetaLab sudah punya modul raster lengkap (Zonal Statistics, NDVI, Slope, Reclassify) dan modul Modeling. Tetapi **pengguna pemula tidak punya data raster untuk dimasukkan ke sana**. Mencari citra Sentinel-2, mengunduh scene 700 MB, lalu melakukan koreksi atmosfer dan mosaicking adalah penghalang yang membuat sebagian besar pemula berhenti sebelum mulai.

Google Earth Engine (GEE) menyelesaikan ini: katalog citra satelit global yang sudah terkoreksi, diproses **di server Google**, dan PetaLab hanya mengunduh hasil akhir untuk area kecil yang dibutuhkan.

### Yang MASUK ruang lingkup
- Mengambil raster siap pakai untuk area kerja pengguna: citra komposit, NDVI, suhu permukaan, DEM, tutupan lahan, curah hujan.
- Pratinjau cepat di peta tanpa mengunduh apa pun.
- Hasil unduhan menjadi **layer raster biasa** di PetaLab, lalu bisa dipakai oleh semua tool raster dan modul Modeling yang sudah ada.

### Yang TIDAK masuk ruang lingkup
- **Menulis balik ke GEE** (upload asset, Export ke Drive milik pengguna). PetaLab tetap local-first.
- **Data titik/POI** (rumah makan, sekolah, jalan). GEE adalah katalog raster dan beberapa vektor ilmiah; untuk POI tetap pakai OpenStreetMap lewat modul Overpass yang sudah ada.
- **Analisis berat di GEE** (time series ribuan citra, klasifikasi global). PetaLab mengambil data, pemodelan tetap dijalankan di Python lokal sesuai filosofi blueprint.
- **Menjadi pengganti Code Editor GEE.** PetaLab menyediakan preset, bukan editor skrip GEE umum.

### Prinsip pemandu
> **GEE adalah sumber data, bukan mesin pemroses PetaLab.**
> Ambil secukupnya, simpan secara lokal, olah dengan Python lokal.

Ini menjaga janji inti blueprint: semua pekerjaan analisis tetap reproducible, offline-capable, dan tidak bergantung pada layanan yang bisa berubah harga atau kebijakan.

---

## 2. Keputusan Desain Utama

| Pertanyaan | Keputusan | Alasan |
|---|---|---|
| GEE wajib atau opsional? | **Opsional penuh.** PetaLab berjalan normal tanpa GEE | Blueprint menjanjikan offline-capable. GEE adalah modul tambahan |
| Kapan dipasang? | Lazy: paket `earthengine-api` hanya diimpor saat modul dibuka | Startup tetap cepat, pengguna tanpa GEE tidak terbebani |
| Autentikasi | OAuth pengguna (default) + Service Account (Mode Lanjut) | OAuth ramah pemula; SA untuk tugas terjadwal |
| Hasil GEE disimpan sebagai | **COG lokal** di `layers/`, sama seperti raster lain | Setelah diunduh, GEE tidak relevan lagi. Layer jadi warga kelas satu |
| Pratinjau | Tile `getMapId()` langsung dari server GEE | Instan, tidak menghabiskan kuota unduh |
| Batas unduh | Estimasi ukuran **sebelum** eksekusi, petak otomatis jika besar | Batas keras GEE 32 MB per request (lihat §7) |
| Komputasi di mana? | Penyiapan citra (komposit, masking awan, indeks) di GEE; analisis & ML di lokal | Memanfaatkan kekuatan masing-masing |
| Kuota | Ditampilkan di UI, diperingatkan sebelum operasi berat | Tier nonkomersial punya batas EECU |
| Skrip GEE kustom? | Hanya Mode Lanjut, dengan peringatan jelas | Pemula memakai preset; pengguna lanjut tidak dibatasi |

---

## 3. Prasyarat & Model Akses

### 3.1 Yang dibutuhkan pengguna

GEE **tidak bisa dipakai hanya dengan akun Google biasa**. Alurnya:

1. Punya **Google Cloud project** yang didaftarkan untuk Earth Engine, dengan Earth Engine API diaktifkan.
2. **Verifikasi kelayakan nonkomersial** jika memakai jalur gratis.
3. Memilih **tier kuota** (Community / Contributor / Partner).

> **Catatan status (per November 2026):** Earth Engine gratis untuk mahasiswa, dosen, dan staf institusi akademik yang memakainya untuk riset atau pembelajaran. Tier Contributor memberi kuota lebih besar tetapi mensyaratkan billing account aktif (tidak ditagih untuk pemakaian nonkomersial). Angka kuota dan syarat tier bisa berubah — **UI PetaLab tidak boleh menuliskan angka kuota secara hardcode**, melainkan membacanya dari API atau sekadar menautkan ke halaman resmi.

### 3.2 Alur onboarding di PetaLab (halaman Pengaturan → Earth Engine)

```
┌ Hubungkan Google Earth Engine ──────────────────────────────────┐
│ Status: ⚪ Belum terhubung                                       │
│                                                                 │
│ Earth Engine memberi kamu citra satelit siap pakai tanpa perlu  │
│ mengunduh file raksasa. Gratis untuk keperluan akademik.        │
│                                                                 │
│ Sebelum mulai, kamu perlu:                                      │
│  ① Akun Google                                                  │
│  ② Google Cloud project yang terdaftar untuk Earth Engine       │
│     [Buka halaman pendaftaran ↗]                                │
│                                                                 │
│ ID Project Cloud   [ petalab-riset-2026          ]              │
│                                                                 │
│ Cara masuk:                                                     │
│  ● Akun Google saya (disarankan)                                │
│  ○ Service Account (untuk tugas terjadwal)  [file .json]        │
│                                                                 │
│              [ Uji Koneksi ]      [ Hubungkan ]                 │
└─────────────────────────────────────────────────────────────────┘
```

**Alur OAuth lokal:** backend menjalankan `ee.Authenticate()` yang membuka browser; PetaLab menunggu callback ke `127.0.0.1`. Setelah sukses, status berubah menjadi **🟢 Terhubung sebagai nama@email · Project: petalab-riset-2026** dan tombol berubah menjadi **[Putuskan]**.

**Uji Koneksi** menjalankan satu permintaan ringan (mengambil metadata satu citra kecil) dan melaporkan hasilnya dalam bahasa sederhana, bukan melempar traceback.

### 3.3 Health check
Tambahkan baris di `GET /api/health` dan kartu Beranda:

| Pemeriksaan | Hasil |
|---|---|
| Paket `earthengine-api` terpasang | ✅ / ⚪ (opsional) |
| Kredensial tersimpan | ✅ / ⚪ |
| Project Cloud terdaftar & API aktif | ✅ / ❌ + langkah perbaikan |
| Koneksi internet ke endpoint GEE | ✅ / ❌ |

---

## 4. Arsitektur Integrasi

GEE masuk sebagai **satu adapter baru di lapisan Data I/O**, tidak mengubah arsitektur inti.

```
┌──────────────────────── FRONTEND ────────────────────────┐
│  [BARU] Halaman "Katalog Bumi"  ──┐                      │
│  Peta · Data · Proses · Model     │ pakai Job Tray &     │
│  (semuanya tidak berubah)         │ Layer Panel yang ada │
└───────────────────────────────────┴──────────────────────┘
                     │ REST + WebSocket (sama seperti tool lain)
                     ▼
┌──────────────────────── BACKEND ─────────────────────────┐
│  api/gee.py  [BARU]                                      │
│    /api/gee/status · /auth · /catalog · /preview         │
│    /api/gee/estimate · /api/gee/fetch → {job_id}         │
│                     │                                     │
│  core/gee/  [BARU]  ▼                                    │
│   ├ auth.py        OAuth & Service Account, simpan token │
│   ├ catalog.py     definisi preset (dataset + resep)     │
│   ├ builder.py     bangun ee.Image dari parameter form   │
│   ├ estimate.py    hitung perkiraan piksel & byte        │
│   ├ fetch.py       unduh: langsung / berpetak            │
│   └ errors.py      terjemahkan error GEE → pesan ramah   │
│                     │                                     │
│  tools/gee_*.py  [BARU]  ← registry tool yang sudah ada  │
│                     │                                     │
│  jobs/manager.py   (tidak berubah)                       │
│  core/io_raster.py (tidak berubah) → COG + overview      │
└──────────────────────────────────────────────────────────┘
                     │ HTTPS
                     ▼
            Google Earth Engine (komputasi server-side)
```

**Titik integrasi penting:** keluaran `core/gee/fetch.py` adalah file GeoTIFF biasa. Ia masuk ke `core/io_raster.py` yang sudah ada, dikonversi ke COG, lalu didaftarkan sebagai layer. **Setelah titik ini, tidak ada satu baris pun kode PetaLab yang tahu data itu berasal dari GEE** — kecuali catatan `lineage_json`.

---

## 5. Penyimpanan Kredensial & Keamanan

Ini bagian paling mudah salah, dan konsekuensinya serius.

### 5.1 Aturan keras

> **Kredensial TIDAK PERNAH disimpan di dalam folder proyek.**

Blueprint menyebutkan fitur **Ekspor Proyek → `.petalab.zip`** yang membungkus seluruh folder proyek untuk dibagikan atau dipindah ke laptop lain. Jika token OAuth atau kunci Service Account ada di dalam folder itu, pengguna akan membagikan kredensial Google Cloud mereka tanpa sadar.

### 5.2 Letak yang benar

```
~/PetaLab/
├── credentials/                 ← DI LUAR projects/, permission 0700
│   ├── gee_oauth.json           ← token OAuth, permission 0600
│   └── gee_service_account.json ← opsional, permission 0600
└── projects/
    └── <nama-proyek>/           ← ini yang di-zip, BERSIH dari kredensial
```

### 5.3 Daftar pemeriksaan keamanan

- [ ] Fungsi ekspor proyek memakai **allowlist** folder (`sources/`, `layers/`, `models/`, `exports/`, `project.json`, `petalab.db`), bukan blocklist. Allowlist gagal dengan aman; blocklist gagal dengan bocor.
- [ ] File di `credentials/` dibuat dengan `os.chmod(path, 0o600)` segera setelah ditulis.
- [ ] ID project Cloud boleh disimpan di `settings.json` (bukan rahasia); token tidak boleh.
- [ ] Token **tidak pernah** dikirim ke frontend. API hanya mengembalikan status: terhubung/tidak, email, nama project.
- [ ] Log tidak pernah mencetak isi token. Gunakan filter pada logger: ganti string yang cocok pola token dengan `***`.
- [ ] Tombol **[Putuskan]** benar-benar menghapus file kredensial, bukan sekadar mengubah flag.
- [ ] Pesan error dari GEE disaring sebelum ditampilkan — beberapa error menyertakan URL bertanda tangan yang sebaiknya tidak ditampilkan mentah.
- [ ] Jika pengguna memakai Service Account, PetaLab menyalin file `.json` ke `credentials/` lalu **menyarankan** pengguna menghapus salinan aslinya dari folder unduhan.

---

## 6. Modul UI Baru: Katalog Bumi

### 6.1 Posisi di navigasi

```
🏠 Beranda  📊 Dashboard  🗺️ Peta  📁 Data  ▦ Tabel
⚙️ Proses   🛰️ Katalog Bumi  🧠 Model  🕘 Riwayat  📤 Ekspor
```

Diletakkan **sesudah Proses, sebelum Model** karena posisinya dalam alur kerja: pengguna mengambil data bumi untuk dipakai dalam pemodelan.

### 6.2 Wizard 5 langkah

Mengikuti pola wizard Modeling yang sudah ada, supaya pengguna tidak belajar pola baru.

```
① Area → ② Data → ③ Waktu → ④ Pratinjau → ⑤ Unduh
```

**① Area** — Pilih cakupan:
- Dari layer yang ada (dropdown; otomatis memakai bounding box-nya)
- Hanya fitur terpilih
- Gambar kotak/poligon di peta
- Seluruh tampilan peta saat ini

Tampilkan luas area dalam km² secara langsung, karena luas inilah yang menentukan ukuran unduhan.

**② Data** — Kartu preset bergambar (lihat §6.3). Pencarian: *"hijau"*, *"panas"*, *"tinggi"*, *"hujan"* harus menemukan preset yang relevan.

**③ Waktu** — Hanya muncul untuk dataset bertanggal:
```
Rentang tanggal  [ 01/06/2026 ] s/d [ 31/08/2026 ]   [Preset ▾]
                                     Preset: 3 bulan terakhir · Tahun ini ·
                                             Musim kemarau 2026 · Musim hujan 2025/26

Awan             [●] Buang piksel berawan otomatis (disarankan)
                 Batas awan maksimum per citra: [ 40 ]%

ℹ️ Indonesia sering tertutup awan. PetaLab menggabungkan beberapa
   citra dalam rentang ini dan mengambil nilai tengahnya, supaya
   hasilnya bersih. Rentang 2–3 bulan biasanya cukup.

✅ Ditemukan 31 citra dalam rentang ini.
```

> **Catatan khusus Indonesia:** masking awan bukan opsi lanjutan, melainkan **default wajib**. Citra tunggal di wilayah tropis hampir selalu berawan. Komposit median 2–3 bulan adalah titik awal yang masuk akal, dan UI harus mengatakannya, bukan menyembunyikannya di balik "Opsi lanjutan".

**④ Pratinjau** — Peta menampilkan hasil sebagai tile dari server GEE, **tanpa mengunduh apa pun**. Pengguna bisa menggeser dan memperbesar, mengganti palet, dan mengubah rentang tanggal lalu melihat perubahannya seketika. Ini langkah terpenting untuk pemula: mereka melihat sebelum berkomitmen.

```
┌───────────────────────────────────────────────────────────┐
│ [peta dengan overlay NDVI]              Palet [Hijau ▾]  │
│                                          Rentang 0 — 0,8 │
└───────────────────────────────────────────────────────────┘
📐 Perkiraan unduhan: 18,4 MB · 2.340 × 1.980 piksel · resolusi 10 m
⏱ Perkiraan waktu: 40–90 detik
                           [ ← Ubah ]    [ ⬇ Unduh jadi Layer ]
```

**⑤ Unduh** — Menjadi job biasa di Job Tray, dengan progress dan tombol batal. Setelah selesai, layer muncul di panel Peta dengan styling dan legenda otomatis sesuai jenis datanya.

### 6.3 Katalog preset

Setiap preset = satu Tool di registry yang sudah ada, sehingga formnya dibuat otomatis dari skema Pydantic (pola yang sama persis dengan Buffer dan Clip).

| Preset (nama ramah) | Isinya | Resolusi | Dipakai untuk |
|---|---|---|---|
| **Foto Satelit Warna Asli** | Komposit Sentinel-2 RGB bebas awan | 10 m | Basemap, verifikasi visual, digitasi |
| **Kehijauan Tanaman (NDVI)** | NDVI dari Sentinel-2 | 10 m | Vegetasi, ruang terbuka hijau, fitur ML |
| **Suhu Permukaan** | Thermal Landsat 8/9 | ~30 m (dari 100 m) | Urban heat island, kenyamanan termal |
| **Ketinggian Tanah (DEM)** | SRTM atau Copernicus DEM | 30 m | Kemiringan, aliran air, kerawanan banjir |
| **Tutupan Lahan** | Peta kelas lahan global | 10 m | Klasifikasi, validasi model |
| **Kepadatan Bangunan** | NDBI atau produk terbangun | 10–100 m | Analisis perkotaan |
| **Curah Hujan** | CHIRPS harian/bulanan | ~5 km | Hidrologi, kerawanan banjir |
| **Cahaya Malam** | VIIRS nighttime lights | ~500 m | Proksi aktivitas ekonomi |
| **Air Permukaan** | Riwayat & okurensi air global | 30 m | Genangan, badan air, banjir historis |
| **[Mode Lanjut] Dataset Kustom** | Masukkan ID dataset + ekspresi band | bervariasi | Pengguna berpengalaman |

> **Peringatan implementasi:** ID dataset GEE (misalnya `COPERNICUS/S2_SR_HARMONIZED`, `USGS/SRTMGL1_003`, `ESA/WorldCover/v200`) **berubah seiring waktu** — koleksi di-deprecate dan diganti versi baru. Jangan menyebar ID ini di seluruh kode. Simpan semuanya di **satu file registry** `core/gee/catalog.py`, dan sediakan health check yang memverifikasi tiap ID masih dapat diakses saat modul dibuka. Saat sebuah ID mati, hanya satu file yang perlu diperbarui, dan pengguna mendapat pesan jelas, bukan crash.

### 6.4 Panel status & kuota

Di pojok halaman Katalog Bumi:
```
🟢 Terhubung · petalab-riset-2026 · Tier: Community
Pemakaian bulan ini: ▓▓▓▓░░░░░░░░  [Lihat detail ↗]
ℹ️ Pratinjau hampir tidak memakai kuota. Unduhan area luas memakainya.
```

Angka kuota dibaca dari API atau, jika tidak tersedia, panel cukup menautkan ke halaman kuota resmi tanpa mengarang angka.

---

## 7. Batas Teknis GEE yang Wajib Ditangani

Ini yang membuat integrasi GEE sering gagal di tangan pemula. Semuanya harus ditangani PetaLab, bukan dilempar ke pengguna.

### 7.1 Evaluasi malas (lazy evaluation)

GEE **tidak menghitung apa pun** saat kamu menyusun `ee.Image`. Komputasi baru terjadi ketika kamu memanggil `getInfo()`, `getMapId()`, `getDownloadURL()`, `computePixels()`, atau `Export.*`.

**Implikasi untuk PetaLab:** menyusun ekspresi itu instan dan aman dijalankan di thread API. Pemanggilan yang memicu komputasi **harus** masuk ke Job Manager, karena bisa berjalan puluhan detik hingga menit.

### 7.2 Batas ukuran unduhan

`ee.Image.getDownloadURL()` punya **batas keras 32 MB per permintaan dan dimensi grid maksimum 10.000 piksel**. Melebihi itu menghasilkan error seperti `Total request size (691287720 bytes) must be less than or equal to 50331648 bytes`.

**Implikasi:** PetaLab **wajib** menghitung perkiraan ukuran sebelum mengunduh, dan memecah permintaan menjadi petak jika melebihi batas. Rumus perkiraan:

```
lebar_piksel   = lebar_area_meter  / scale
tinggi_piksel  = tinggi_area_meter / scale
byte_perkiraan = lebar_piksel × tinggi_piksel × jumlah_band × byte_per_tipe_data
```

Tampilkan hasilnya ke pengguna sebelum tombol Unduh aktif. Jika melebihi batas, jangan menolak — **pecah otomatis** dan katakan "Area ini akan diunduh dalam 6 bagian lalu disatukan."

### 7.3 Parameter `scale` (resolusi)

GEE mengharuskan `scale` dalam meter. Pemula tidak tahu angka ini, dan salah memilihnya adalah penyebab error paling umum.

**Solusi PetaLab:**
- Default = resolusi asli dataset (Sentinel-2 → 10 m, Landsat → 30 m, CHIRPS → ~5.000 m).
- Jangan pernah membiarkan `scale` lebih kecil dari resolusi asli. Itu hanya memperbesar file tanpa menambah informasi. Jika pengguna mencoba, tampilkan: *"Data ini aslinya 30 meter. Meminta 10 meter tidak menambah detail, hanya memperbesar file."*
- Jika area terlalu luas untuk resolusi asli, tawarkan dua pilihan konkret: perkecil area, atau turunkan resolusi (misalnya 10 m → 30 m) dengan angka ukuran baru ditampilkan.

### 7.4 Kuota permintaan paralel

Terlalu banyak permintaan interaktif bersamaan menghasilkan **HTTP 429 Too Many Requests**. Pustaka klien Earth Engine membungkus permintaan dengan exponential backoff dan **mencoba ulang hingga lima kali**.

**Implikasi:** saat mengunduh berpetak, batasi konkurensi (**maksimal 2–3 petak bersamaan**, bukan 16). Jangan menambahkan retry sendiri di atas retry bawaan pustaka; itu akan memperburuk keadaan.

### 7.5 Batas memori server

Permintaan yang terlalu kompleks gagal dengan **"User memory limit exceeded"**. Ini bukan masalah komputer pengguna, melainkan batas di sisi GEE.

**Penyebab umum di PetaLab:** rentang tanggal terlalu panjang digabung dengan area luas dan resolusi tinggi. Pesan error harus menyarankan solusi konkret: perpendek rentang tanggal, perkecil area, atau turunkan resolusi.

### 7.6 Ringkasan batas

| Batas | Nilai | Penanganan PetaLab |
|---|---|---|
| Ukuran request unduh | 32 MB | Estimasi di muka + petak otomatis |
| Dimensi grid | 10.000 piksel | Estimasi + petak otomatis |
| Permintaan paralel | kuota per project (HTTP 429) | Batasi 2–3 petak bersamaan |
| Memori komputasi | "User memory limit exceeded" | Pesan + saran konkret |
| Kuota EECU bulanan | tergantung tier | Tampilkan status, peringatkan sebelum operasi berat |

---

## 8. Tiga Jalur Pengambilan Data

PetaLab memilih jalur secara otomatis berdasarkan perkiraan ukuran. Pengguna tidak perlu tahu jalur mana yang dipakai.

| Jalur | Kapan dipakai | Mekanisme | Waktu khas |
|---|---|---|---|
| **A. Pratinjau** | Langkah ④ wizard, dan saat styling diubah | `getMapId()` → tile XYZ langsung dari GEE ke peta | Instan |
| **B. Unduh langsung** | Perkiraan < 32 MB | `getDownloadURL()` → GeoTIFF → konversi COG | 20–90 detik |
| **C. Unduh berpetak** | Perkiraan ≥ 32 MB | Bagi area jadi grid, unduh tiap petak (maks 2–3 paralel), mosaic lokal dengan Rasterio, konversi COG | 1–10 menit |

### Detail jalur C
```
1. Hitung grid petak sehingga tiap petak < 24 MB (sisakan margin 25%)
2. Tampilkan ke pengguna: "Area ini akan diunduh dalam N bagian"
3. Untuk tiap petak:
   - check_cancel()  ← wajib, supaya tombol Batal responsif
   - unduh ke <tmp>/petak_<i>.tif
   - progress(i/N × 85, f"Mengunduh bagian {i} dari {N}")
4. Mosaic semua petak dengan rasterio.merge → <tmp>/gabungan.tif
5. Konversi ke COG + overview → layers/<uuid>.tif
6. Tulis atomik: rename dari .tmp ke nama final
7. Daftarkan layer + lineage
```

Petak yang gagal setelah retry bawaan pustaka **tidak membatalkan seluruh job**. Catat petak yang gagal, selesaikan sisanya, lalu laporkan: *"5 dari 6 bagian berhasil. Bagian 3 gagal. [Coba lagi bagian yang gagal]"*. Ini jauh lebih baik daripada membuang pekerjaan 8 menit.

---

## 9. Tool Baru di Kotak Alat

Preset Katalog Bumi didaftarkan sebagai tool biasa, sehingga **langsung muncul di pencarian Kotak Alat, bisa dipakai di Model Builder, dan punya tombol "Salin sebagai kode Python"**.

| ID Tool | Nama Ramah | Grup | Tingkat |
|---|---|---|---|
| `gee.rgb` | Foto Satelit Warna Asli | Katalog Bumi | pemula |
| `gee.ndvi` | Kehijauan Tanaman (NDVI) | Katalog Bumi | pemula |
| `gee.lst` | Suhu Permukaan | Katalog Bumi | menengah |
| `gee.dem` | Ketinggian Tanah | Katalog Bumi | pemula |
| `gee.landcover` | Tutupan Lahan | Katalog Bumi | pemula |
| `gee.rainfall` | Curah Hujan | Katalog Bumi | menengah |
| `gee.nightlights` | Cahaya Malam | Katalog Bumi | menengah |
| `gee.water` | Air Permukaan | Katalog Bumi | menengah |
| `gee.custom` | Dataset Kustom | Katalog Bumi | lanjut |

Ditambah satu tool gabungan yang sangat berguna untuk modul Modeling:

| `gee.zonal_direct` | **Statistik Bumi per Wilayah** | Katalog Bumi | menengah |

Tool terakhir ini menghitung statistik zonal **di server GEE** lalu mengembalikan hanya tabel angkanya, tanpa mengunduh raster sama sekali. Untuk kasus "rata-rata NDVI per kecamatan", ini jauh lebih cepat dan hemat kuota daripada mengunduh raster lalu menjalankan Zonal Statistics lokal. Keluarannya langsung berupa kolom baru pada layer vektor.

---

## 10. Implementasi Backend

### 10.1 Contoh satu tool lengkap

```python
# backend/petalab/tools/gee_ndvi.py
from datetime import date
from pydantic import BaseModel, Field
from petalab.tools._base import Tool, register, LayerRef, JobContext
from petalab.core.gee import builder, estimate, fetch, auth


class NdviParams(BaseModel):
    area: LayerRef = Field(..., title="Area",
                           json_schema_extra={"accepts": ["layer_bbox", "drawn", "map_view"]})
    tanggal_mulai: date = Field(..., title="Dari tanggal")
    tanggal_akhir: date = Field(..., title="Sampai tanggal")
    buang_awan: bool = Field(True, title="Buang piksel berawan otomatis")
    batas_awan: int = Field(40, ge=0, le=100, title="Batas awan per citra (%)",
                            json_schema_extra={"advanced": True})
    resolusi_m: int = Field(10, title="Resolusi (meter)",
                            json_schema_extra={"advanced": True, "native": 10})
    output_name: str | None = Field(None, title="Nama hasil")


@register
class GeeNdviTool(Tool):
    id = "gee.ndvi"
    name = "Kehijauan Tanaman (NDVI)"
    technical_name = "Sentinel-2 NDVI composite"
    group = "Katalog Bumi"
    level = "pemula"
    requires = ["gee"]            # dipakai UI untuk menonaktifkan kartu jika GEE belum terhubung
    description = ("Mengukur kerapatan tanaman hijau dari citra satelit. "
                   "Nilai mendekati 1 berarti vegetasi rapat, mendekati 0 berarti gundul.")

    Params = NdviParams

    def run(self, p: NdviParams, ctx: JobContext):
        auth.ensure_initialized()                       # lempar GEE_NOT_CONNECTED jika belum

        ctx.progress(5, "Menyiapkan permintaan ke Earth Engine")
        geom = ctx.geometry_of(p.area)
        img = builder.sentinel2_ndvi(
            geom, p.tanggal_mulai, p.tanggal_akhir,
            mask_clouds=p.buang_awan, max_cloud=p.batas_awan,
        )

        ctx.progress(10, "Menghitung perkiraan ukuran")
        plan = estimate.plan_download(img, geom, scale=p.resolusi_m, n_bands=1, dtype="float32")
        if plan.n_tiles > 1:
            ctx.log(f"Area besar: akan diunduh dalam {plan.n_tiles} bagian.")

        tif = fetch.download(img, geom, plan, ctx)      # jalur B atau C, panggil ctx.check_cancel()

        ctx.progress(90, "Mengubah ke format COG")
        return ctx.save_raster(
            tif,
            name=p.output_name or f"ndvi_{p.tanggal_mulai:%Y%m}_{p.tanggal_akhir:%Y%m}",
            style={"palette": "ndvi", "range": [0, 0.8]},
            lineage={"source": "Google Earth Engine",
                     "dataset": builder.S2_COLLECTION_ID,
                     "params": p.model_dump(mode="json")},
        )

    def to_python(self, p: NdviParams) -> str:
        return f'''import ee
ee.Initialize(project="PROJECT_ID_ANDA")

area = ee.Geometry.Rectangle({list(p.area.bbox)})
col = (ee.ImageCollection("{builder.S2_COLLECTION_ID}")
       .filterBounds(area)
       .filterDate("{p.tanggal_mulai}", "{p.tanggal_akhir}")
       .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", {p.batas_awan})))

ndvi = col.map(lambda im: im.normalizedDifference(["B8", "B4"]).rename("NDVI")).median()
url = ndvi.clip(area).getDownloadURL({{"scale": {p.resolusi_m}, "region": area, "format": "GEO_TIFF"}})
print(url)'''
```

Perhatikan bahwa tool ini **tidak menambahkan konsep baru**: ia memakai `JobContext`, `ctx.progress()`, `ctx.check_cancel()`, `save_raster()`, dan `lineage` yang sudah ada. Satu-satunya yang baru adalah `requires = ["gee"]`.

### 10.2 Estimasi ukuran

```python
# backend/petalab/core/gee/estimate.py
from dataclasses import dataclass
import math

BYTES_PER_DTYPE = {"uint8": 1, "int16": 2, "uint16": 2, "float32": 4, "float64": 8}
MAX_REQUEST_BYTES = 32 * 1024 * 1024      # batas keras GEE
SAFETY = 0.75                              # sisakan margin 25%
MAX_GRID_DIM = 10_000


@dataclass
class DownloadPlan:
    width_px: int
    height_px: int
    est_bytes: int
    n_tiles: int
    tile_grid: tuple[int, int]             # (kolom, baris)
    scale: int


def plan_download(img, geom, scale: int, n_bands: int, dtype: str) -> DownloadPlan:
    w_m, h_m = geom.extent_meters()                     # dihitung di CRS metrik (UTM)
    w_px, h_px = math.ceil(w_m / scale), math.ceil(h_m / scale)
    total = w_px * h_px * n_bands * BYTES_PER_DTYPE[dtype]

    budget = MAX_REQUEST_BYTES * SAFETY
    # jumlah petak minimum agar memenuhi batas byte DAN batas dimensi grid
    by_bytes = math.ceil(total / budget)
    by_dim = math.ceil(w_px / MAX_GRID_DIM) * math.ceil(h_px / MAX_GRID_DIM)
    n = max(1, by_bytes, by_dim)

    cols = math.ceil(math.sqrt(n * w_px / max(h_px, 1)))
    rows = math.ceil(n / max(cols, 1))
    return DownloadPlan(w_px, h_px, total, cols * rows, (cols, rows), scale)
```

### 10.3 Terjemahan error

```python
# backend/petalab/core/gee/errors.py
import re

POLA = [
    (r"Total request size .* must be less than",
     "GEE_TOO_BIG",
     "Area yang diminta terlalu besar untuk sekali unduh.",
     "PetaLab akan memecahnya otomatis. Kalau masih gagal, perkecil area atau turunkan resolusi."),
    (r"User memory limit exceeded",
     "GEE_MEMORY",
     "Perhitungan di server Earth Engine terlalu berat.",
     "Coba perpendek rentang tanggal, perkecil area, atau turunkan resolusi."),
    (r"not.*(signed up|registered).*Earth Engine|Caller does not have permission",
     "GEE_NOT_REGISTERED",
     "Project Google Cloud ini belum terdaftar untuk Earth Engine.",
     "Daftarkan project-nya, lalu klik Uji Koneksi lagi."),
    (r"Image\.(load|select).*not found|Collection\.loadTable.*not found",
     "GEE_DATASET_GONE",
     "Dataset ini tidak lagi tersedia di katalog Earth Engine.",
     "Google kadang mengganti dataset dengan versi baru. Laporkan ini supaya PetaLab diperbarui."),
    (r"Quota exceeded|RESOURCE_EXHAUSTED",
     "GEE_QUOTA",
     "Kuota Earth Engine bulan ini sudah habis.",
     "Kuota diperbarui tiap bulan. Sementara itu, pratinjau tetap bisa dipakai."),
    (r"429|Too Many Requests",
     "GEE_BUSY",
     "Server Earth Engine sedang sibuk melayani permintaanmu.",
     "PetaLab sudah mencoba ulang otomatis. Coba lagi beberapa menit lagi."),
]


def to_user_error(exc: Exception) -> dict:
    teks = str(exc)
    for pola, kode, pesan, saran in POLA:
        if re.search(pola, teks, re.I):
            return {"code": kode, "message": pesan, "hint": saran, "detail": redact(teks)}
    return {"code": "GEE_UNKNOWN",
            "message": "Earth Engine menolak permintaan ini.",
            "hint": "Coba perkecil area atau perpendek rentang tanggal.",
            "detail": redact(teks)}


def redact(teks: str) -> str:
    """Buang URL bertanda tangan dan token dari pesan error sebelum ditampilkan."""
    teks = re.sub(r"https?://\S*[?&](token|key|signature)=\S*", "[url disembunyikan]", teks, flags=re.I)
    return re.sub(r"\b[A-Za-z0-9_\-]{40,}\b", "***", teks)
```

---

## 11. Integrasi ke Modul Modeling

Di sinilah GEE memberi nilai terbesar. Blueprint sudah punya **Feature Builder Spasial** di langkah ③ wizard Modeling. GEE menambahkan sumber fitur baru.

### 11.1 Tambahan pada Feature Builder

```
+ Tambah fitur spasial
  ├ Jarak ke layer lain
  ├ Nilai raster di lokasi
  ├ Rata-rata raster per poligon
  ├ Jumlah objek dalam radius
  └ 🛰️ Dari Katalog Bumi            ← BARU
      ├ Kehijauan (NDVI) rata-rata
      ├ Suhu permukaan rata-rata
      ├ Ketinggian & kemiringan
      ├ Kelas tutupan lahan dominan
      └ Curah hujan rata-rata
```

Memilih salah satu akan menjalankan `gee.zonal_direct` di latar belakang dan menambahkan kolom baru ke data latih. Pengguna tidak perlu meninggalkan wizard Modeling.

### 11.2 Contoh alur lengkap

> Pengguna punya 400 titik sensor suhu dan ingin memodelkan suhu permukaan.
>
> 1. Modeling → ① Tujuan: Memprediksi angka
> 2. ② Data: layer `sensor_suhu`, target `suhu_c`
> 3. ③ Fitur: centang kolom yang ada, lalu **+ Dari Katalog Bumi** → NDVI (rata-rata radius 100 m) dan Ketinggian
> 4. PetaLab menjalankan job: ambil NDVI dan DEM dari GEE untuk cakupan titik, sampel nilainya di tiap titik, tambahkan jadi kolom
> 5. ④ Validasi: Spatial Block CV
> 6. ⑤ Latih → ⑥ Hasil: feature importance menunjukkan NDVI sebagai faktor terkuat

Alur ini sepenuhnya memakai wizard yang sudah ada; GEE hanya menyumbang kolom fitur.

### 11.3 Peringatan kebocoran data (leakage)

Blueprint sudah punya deteksi kebocoran. Tambahkan satu aturan khusus GEE:

> ⚠️ *"Kamu memprediksi suhu permukaan, dan fitur `gee_lst` juga berisi suhu permukaan dari satelit. Model akan terlihat hampir sempurna karena pada dasarnya menyalin jawabannya. Keluarkan fitur ini kecuali kamu memang ingin membandingkan keduanya."*

Ini kesalahan yang sangat sering terjadi saat orang pertama kali memakai data satelit untuk ML, dan PetaLab berada di posisi tepat untuk mencegahnya.

### 11.4 Batas yang harus dinyatakan jujur

Prediksi model ke seluruh raster (`predict` per piksel) dijalankan **di lokal**, bukan di GEE. Untuk area seluas kota dengan resolusi 10 m, ini berarti ratusan juta piksel. Blueprint sudah menetapkan pemrosesan per window Rasterio, dan itu tetap berlaku. UI harus menampilkan estimasi waktu sebelum mulai, bukan membiarkan pengguna menunggu tanpa kabar.

---

## 12. Cache & Reproduksibilitas

### 12.1 Cache unduhan

```
~/PetaLab/cache/gee/
└── <hash>/
    ├── data.tif
    └── meta.json      # dataset_id, bbox, tanggal, scale, params, waktu_unduh
```

`hash = sha256(dataset_id + bbox_dibulatkan + tanggal_mulai + tanggal_akhir + scale + params_terurut)`

Manfaatnya nyata: pengguna sering mengulang permintaan yang sama saat bereksperimen dengan parameter model. Cache membuat percobaan kedua **instan dan tanpa kuota**.

Kebijakan: cache tidak kedaluwarsa otomatis (data satelit historis tidak berubah), tetapi halaman Pengaturan punya tombol **[Bersihkan cache Earth Engine]** dengan ukuran terpakai ditampilkan.

> **Pengecualian:** dataset yang sering diperbarui (near-real-time) diberi penanda `volatile: true` di katalog dan cache-nya kedaluwarsa dalam 24 jam.

### 12.2 Lineage

Setiap layer hasil GEE menyimpan lineage lengkap:

```json
{
  "source": "Google Earth Engine",
  "dataset_id": "COPERNICUS/S2_SR_HARMONIZED",
  "dataset_label": "Sentinel-2 Surface Reflectance (Harmonized)",
  "tanggal": ["2026-06-01", "2026-08-31"],
  "n_citra": 31,
  "masking_awan": true,
  "batas_awan_persen": 40,
  "komposit": "median",
  "scale_m": 10,
  "bbox": [112.68, -7.36, 112.80, -7.25],
  "crs": "EPSG:4326",
  "diambil_pada": "2026-11-20T08:14:00+07:00",
  "atribusi": "Contains modified Copernicus Sentinel data 2026, processed by ESA",
  "versi_earthengine_api": "1.x.y"
}
```

Ini yang membuat hasilnya bisa dipertanggungjawabkan dalam laporan atau skripsi: siapa pun bisa mengulang pengambilan yang persis sama. Tombol **"Salin sebagai kode Python"** menghasilkan skrip yang mereproduksi layer ini.

---

## 13. Mode Offline & Degradasi

PetaLab wajib tetap berfungsi penuh tanpa GEE.

| Kondisi | Perilaku |
|---|---|
| Paket `earthengine-api` tidak terpasang | Menu Katalog Bumi tetap terlihat, tetapi berisi kartu penjelasan + cara memasang. Tool `gee.*` tidak didaftarkan |
| Terpasang tapi belum terhubung | Kartu preset tampil redup dengan tombol **[Hubungkan dulu]** yang membuka Pengaturan |
| Terhubung tapi internet mati | Banner: *"Tidak ada internet. Layer Earth Engine yang sudah diunduh tetap bisa dipakai."* Layer yang sudah ada **berfungsi penuh** karena sudah jadi COG lokal |
| Kuota habis | Pratinjau dan unduhan dinonaktifkan dengan pesan jelas; layer yang ada tetap jalan |
| Dataset di-deprecate Google | Error `GEE_DATASET_GONE` dengan pesan jelas. Layer lama tetap jalan |

**Poin penting:** setelah sebuah layer diunduh, ia tidak pernah lagi bergantung pada GEE. Proyek yang sudah jadi tetap bisa dibuka dan dianalisis bertahun-tahun kemudian, bahkan jika akses GEE hilang. Ini konsekuensi langsung dari keputusan "simpan sebagai COG lokal" di §2.

---

## 14. Pesan Error Ramah Pemula (GEE)

Melengkapi katalog error di blueprint utama.

| Kode | Pesan ke pengguna | Tombol aksi |
|---|---|---|
| `GEE_NOT_INSTALLED` | "Fitur ini butuh paket Earth Engine yang belum terpasang." | [Cara memasang] |
| `GEE_NOT_CONNECTED` | "Kamu belum menghubungkan akun Earth Engine." | [Hubungkan] |
| `GEE_NOT_REGISTERED` | "Project Google Cloud ini belum terdaftar untuk Earth Engine." | [Buka halaman pendaftaran ↗] [Uji ulang] |
| `GEE_TOO_BIG` | "Area terlalu besar untuk sekali unduh. PetaLab akan memecahnya jadi N bagian." | [Lanjutkan] [Perkecil area] |
| `GEE_MEMORY` | "Perhitungan di server terlalu berat." | [Perpendek tanggal] [Turunkan resolusi] |
| `GEE_NO_IMAGE` | "Tidak ada citra yang cocok. Rentang tanggalnya mungkin terlalu sempit, atau semuanya tertutup awan." | [Perlebar rentang] [Naikkan batas awan] |
| `GEE_ALL_CLOUDY` | "Semua citra di rentang ini tertutup awan. Wajar untuk wilayah tropis." | [Perlebar jadi 3 bulan] |
| `GEE_QUOTA` | "Kuota Earth Engine bulan ini habis. Diperbarui awal bulan depan." | [Lihat kuota ↗] |
| `GEE_BUSY` | "Server sedang sibuk. PetaLab sudah mencoba ulang otomatis." | [Coba lagi] |
| `GEE_DATASET_GONE` | "Dataset ini sudah tidak tersedia di katalog Earth Engine." | [Lihat alternatif] |
| `GEE_SCALE_TOO_FINE` | "Data ini aslinya N meter. Meminta resolusi lebih halus tidak menambah detail." | [Pakai N meter] |
| `GEE_PARTIAL` | "N dari M bagian berhasil diunduh." | [Ulangi bagian yang gagal] [Pakai yang ada] |

---

## 15. Lisensi & Atribusi Dataset

Ini bagian yang sering dilupakan dan bisa menimbulkan masalah pada publikasi akademik.

### 15.1 Dua lapis aturan

**Lapis 1 — Syarat Earth Engine.** Earth Engine gratis untuk mahasiswa, dosen, dan staf institusi akademik yang memakainya untuk riset atau pembelajaran. Pemakaian komersial memerlukan lisensi berbayar. PetaLab **tidak boleh** mengaburkan batas ini.

**Lapis 2 — Lisensi dataset itu sendiri.** Setiap dataset di katalog GEE punya syarat dan atribusinya sendiri, yang ditetapkan oleh penyedia aslinya (ESA, NASA, USGS, dan lainnya). Mengakses lewat GEE tidak menghapus kewajiban itu.

### 15.2 Yang harus dilakukan PetaLab

- Setiap preset di katalog menyimpan string atribusi resmi dataset-nya, dan string itu ikut dalam `lineage_json`.
- Panel Info Layer menampilkan atribusi secara jelas, bukan disembunyikan.
- **Layout Peta** (ekspor PNG/PDF) menyertakan atribusi dataset secara otomatis di bagian sumber data, sejajar dengan atribusi OpenStreetMap yang sudah ada.
- Saat pertama kali menghubungkan, tampilkan satu kartu informasi: *"Earth Engine gratis untuk keperluan akademik dan nonkomersial. Jika kamu memakainya untuk pekerjaan komersial, Google mensyaratkan lisensi berbayar."* Tanpa nada menggurui, satu kali saja.
- Ekspor proyek menyertakan file `SUMBER_DATA.md` yang merangkum semua dataset yang dipakai beserta atribusinya. Ini sangat membantu saat menulis bab metodologi.

### 15.3 Batas pengetahuan

Syarat layanan, tier kuota, dan daftar dataset berubah dari waktu ke waktu. **Jangan menanam teks lisensi atau angka kuota ke dalam kode.** Simpan di satu file katalog yang mudah diperbarui, dan selalu sediakan tautan ke halaman resmi daripada mengarang ringkasan yang bisa jadi usang.

---

## 16. Dependensi Baru

```yaml
# tambahan untuk environment.yml
dependencies:
  - python=3.11
  # ... dependensi yang sudah ada ...
  - pip:
      - earthengine-api>=1.0        # klien resmi GEE
      - google-auth>=2.0            # OAuth & Service Account
      - google-auth-oauthlib>=1.0   # alur OAuth lokal
```

Tidak ada dependensi GDAL baru. Mosaicking memakai `rasterio.merge` yang sudah ada, dan konversi COG memakai `rio-cogeo` yang sudah ada.

**Instalasi opsional:** blueprint utama memakai satu `environment.yml`. Tambahkan grup opsional sehingga pengguna yang tidak butuh GEE tidak perlu memasangnya:

```bash
petalab install-extra gee     # memasang tiga paket di atas lalu menjalankan health check
```

Impor `earthengine-api` dilakukan **di dalam fungsi**, bukan di tingkat modul, supaya PetaLab tetap menyala normal jika paket tidak ada.

---

## 17. Testing

| Lapisan | Alat | Fokus |
|---|---|---|
| Unit — estimasi | `pytest` | `plan_download()` menghasilkan jumlah petak benar untuk berbagai luas, scale, dan dtype. Kasus batas: tepat 32 MB, tepat 10.000 piksel |
| Unit — error | `pytest` | Tiap pola di `errors.py` cocok dengan contoh pesan error asli. `redact()` benar-benar menyembunyikan token dan URL bertanda tangan |
| Unit — katalog | `pytest` | Semua preset punya atribusi, resolusi asli, dan ID dataset yang terisi |
| Integrasi (mock) | `pytest` + stub `ee` | Alur tool lengkap tanpa menyentuh jaringan. **CI tidak boleh memanggil GEE** |
| Integrasi (nyata) | tes bertanda `@pytest.mark.gee` | Dijalankan manual dengan kredensial, bukan di CI. Memverifikasi ID dataset masih hidup |
| Keamanan | `pytest` | **Ekspor proyek tidak pernah memuat file dari `credentials/`.** Tes ini wajib ada |
| Keamanan | `pytest` | File kredensial dibuat dengan permission 0600 |
| E2E | `Playwright` | Skenario: hubungkan (mock) → pilih area → pratinjau → unduh → layer muncul di peta |
| Pembatalan | `pytest` | Job berpetak berhenti dalam < 5 detik setelah Batal ditekan |

Tes keamanan ekspor proyek layak ditulis lebih dulu, sebelum fitur ekspornya sendiri disentuh. Kebocoran kredensial adalah jenis bug yang tidak terdeteksi sampai sudah terlambat.

---

## 18. Roadmap: Fase 3.5

Disisipkan antara Fase 3 (Raster & Data Besar) dan Fase 4 (Model), karena Fase 4 akan jauh lebih bernilai jika sudah ada sumber data raster nyata.

### 3.5a — Fondasi (±1 minggu)
- `core/gee/auth.py`: OAuth lokal + Service Account, penyimpanan aman di `credentials/`
- Halaman Pengaturan → Earth Engine, Uji Koneksi, health check
- **Tes keamanan ekspor proyek** (ditulis lebih dulu)
- `core/gee/errors.py` dengan katalog pesan

### 3.5b — Pengambilan Data (±1,5 minggu)
- `estimate.py` + `fetch.py`: jalur B (langsung) dan C (berpetak dengan mosaic)
- Tiga preset pertama: RGB, NDVI, DEM
- Integrasi ke `io_raster.py` → COG → layer
- Cache berbasis hash

### 3.5c — Katalog Bumi (±1,5 minggu)
- Halaman Katalog Bumi + wizard 5 langkah
- Pratinjau `getMapId()` di MapLibre
- Sisa preset: LST, tutupan lahan, curah hujan, cahaya malam, air permukaan
- Panel status & kuota

### 3.5d — Jembatan ke Modeling (±1 minggu)
- Tool `gee.zonal_direct` (statistik zonal di server)
- Tombol "Dari Katalog Bumi" di Feature Builder wizard Modeling
- Aturan peringatan kebocoran khusus GEE
- Preset "Dataset Kustom" untuk Mode Lanjut
- `SUMBER_DATA.md` otomatis saat ekspor proyek

**Total perkiraan: ±5 minggu.**

---

## 19. Checklist Definition of Done

Fitur GEE dianggap selesai jika:

- [ ] PetaLab **menyala dan berfungsi penuh** tanpa `earthengine-api` terpasang.
- [ ] Ekspor proyek `.petalab.zip` terbukti **tidak memuat kredensial** (ada tes otomatisnya).
- [ ] File kredensial dibuat dengan permission 0600 di luar folder proyek.
- [ ] Setiap unduhan menampilkan **perkiraan ukuran dan waktu sebelum** tombol Unduh ditekan.
- [ ] Area besar dipecah otomatis; pengguna hanya diberi tahu, tidak diminta menghitung sendiri.
- [ ] Tombol **Batal** menghentikan job berpetak dalam < 5 detik.
- [ ] Job berpetak yang sebagian gagal tetap menyimpan bagian yang berhasil.
- [ ] Semua error GEE muncul sebagai pesan bahasa Indonesia dengan tombol aksi, **tidak ada traceback mentah** yang sampai ke pengguna.
- [ ] Pesan error tidak pernah menampilkan token atau URL bertanda tangan.
- [ ] Layer hasil GEE menyimpan lineage lengkap dan **atribusi dataset**.
- [ ] Layout peta dan ekspor proyek menyertakan atribusi dataset otomatis.
- [ ] Layer yang sudah diunduh **berfungsi penuh saat internet mati**.
- [ ] Tombol "Salin sebagai kode Python" menghasilkan skrip yang benar-benar jalan.
- [ ] Masking awan menyala secara default, dengan penjelasan satu kalimat yang terlihat tanpa membuka Opsi Lanjutan.
- [ ] Teks UI ada di `i18n/id.json`.
- [ ] Diuji ke minimal 1 pemula: berhasil mendapat layer NDVI untuk satu kecamatan tanpa bantuan dalam < 10 menit.

---

## 20. Glosarium Tambahan

| Istilah | Penjelasan singkat |
|---|---|
| **Earth Engine** | Layanan Google yang menyimpan arsip citra satelit dunia dan memprosesnya di server mereka, sehingga kamu tidak perlu mengunduh file raksasa. |
| **Komposit (composite)** | Gabungan banyak citra pada rentang waktu tertentu menjadi satu gambar bersih. Nilai tiap piksel diambil dari tengah-tengah semua citra yang ada. |
| **Masking awan** | Membuang piksel yang tertutup awan sebelum digabungkan. Penting di Indonesia karena langit jarang benar-benar cerah. |
| **Scale (dalam GEE)** | Ukuran satu piksel dalam meter. Sentinel-2 aslinya 10 meter, Landsat 30 meter. |
| **Resolusi asli** | Ukuran piksel sebenarnya dari satelit. Meminta lebih halus dari ini tidak menambah detail apa pun. |
| **EECU** | Satuan hitung pemakaian komputasi Earth Engine, mirip "jam mesin". Tier gratis punya jatah bulanan. |
| **Evaluasi malas** | GEE tidak menghitung apa pun sampai kamu benar-benar meminta hasilnya. Menyusun rumus itu instan; meminta hasil yang butuh waktu. |
| **Sentinel-2** | Satelit Eropa, resolusi 10 meter, lewat tiap ~5 hari. Pilihan utama untuk analisis skala kota. |
| **Landsat** | Satelit Amerika, resolusi 30 meter, punya sensor termal untuk mengukur suhu permukaan. |
| **LST** | *Land Surface Temperature*, suhu permukaan tanah dari satelit. Berbeda dari suhu udara yang diukur termometer. |
| **DEM** | *Digital Elevation Model*, peta ketinggian tanah. Bahan dasar untuk menghitung kemiringan dan arah aliran air. |
| **Tiling / berpetak** | Memecah permintaan besar menjadi beberapa bagian kecil, mengunduhnya satu per satu, lalu menyatukannya kembali. |

---

## Catatan Penutup

Dokumen ini menambahkan **satu modul** dan **satu adapter**, tanpa mengubah arsitektur inti PetaLab. Semua yang baru menumpang pada pola yang sudah ada: registry tool, Job Manager, lineage, katalog error, dan wizard.

Dua hal yang paling mudah salah dan paling mahal akibatnya:

1. **Kebocoran kredensial lewat ekspor proyek** (§5). Tulis tesnya lebih dulu.
2. **Mengunduh tanpa estimasi** (§7.2). Tanpa ini, pengguna akan menemui error mentah dari Google dan menyimpulkan PetaLab rusak.

Sisanya adalah pekerjaan yang lurus.

*Addendum PetaLab × Google Earth Engine v1.0 — November 2026*
