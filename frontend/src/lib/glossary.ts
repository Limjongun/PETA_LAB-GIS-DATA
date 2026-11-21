export interface GlossaryItem {
  term: string;
  category: 'Dasar' | 'Geoprocessing' | 'Raster' | 'Machine Learning';
  short: string;
  example: string;
}

export const GLOSSARY_ITEMS: GlossaryItem[] = [
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
