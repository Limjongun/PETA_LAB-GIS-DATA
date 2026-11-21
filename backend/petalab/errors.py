from typing import Any


ERROR_CATALOG: dict[str, dict[str, Any]] = {
    "SHP_INCOMPLETE": {
        "message": "Shapefile butuh beberapa file sekaligus (.shp, .dbf, .shx, .prj). Unggah semuanya atau dalam satu .zip.",
        "hint": "Kompres semua file pendukung shapefile menjadi satu file .zip sebelum diunggah.",
        "actions": [{"label": "Unggah lagi", "action": "reupload"}],
    },
    "CRS_MISSING": {
        "message": "File ini tidak punya info sistem koordinat.",
        "hint": "Jika datanya dari GPS atau Google Maps, pilih WGS 84 (EPSG:4326).",
        "actions": [
            {"label": "Pakai WGS 84", "action": "set_crs", "value": "EPSG:4326"},
            {"label": "Pilih lain", "action": "choose_crs"},
        ],
    },
    "LATLON_SWAPPED": {
        "message": "Sepertinya kolom lintang dan bujur tertukar (titik muncul di luar rentang normal atau Antartika).",
        "hint": "Di Indonesia, Lintang (Latitude) sekitar -11 s/d 6, dan Bujur (Longitude) sekitar 95 s/d 141.",
        "actions": [{"label": "Tukar Lintang & Bujur", "action": "swap_latlon"}],
    },
    "GEOM_INVALID": {
        "message": "Ada bentuk geometri yang rusak (garis saling silang atau poligon tidak menutup).",
        "hint": "PetaLab dapat memperbaiki bentuk yang rusak secara otomatis tanpa mengubah atribut.",
        "actions": [
            {"label": "Perbaiki otomatis", "action": "make_valid"},
            {"label": "Lihat fitur", "action": "inspect_invalid"},
        ],
    },
    "CRS_MISMATCH": {
        "message": "Dua layer memakai sistem koordinat berbeda. PetaLab menyamakannya secara otomatis.",
        "hint": "Operasi spasial membutuhkan sistem koordinat yang sama.",
        "actions": [{"label": "OK", "action": "dismiss"}],
    },
    "NO_OVERLAP": {
        "message": "Kedua layer tidak bertumpuk di lokasi yang sama, jadi hasilnya kosong.",
        "hint": "Pastikan kedua layer berada di wilayah yang sama dan sistem koordinatnya benar.",
        "actions": [{"label": "Zoom ke keduanya", "action": "zoom_both"}],
    },
    "JOIN_LOW_MATCH": {
        "message": "Sebagian data tidak cocok saat digabungkan. Mungkin penulisan nama berbeda.",
        "hint": "Gunakan fitur Normalisasi Teks (huruf kecil, hapus spasi/tanda baca) untuk meningkatkan kecocokan.",
        "actions": [
            {"label": "Normalisasi teks", "action": "normalize_join"},
            {"label": "Cocokkan manual", "action": "manual_match"},
        ],
    },
    "MEMORY_LIMIT": {
        "message": "Data terlalu besar untuk diproses sekaligus.",
        "hint": "Anda dapat menjalankan proses pada fitur yang terpilih saja atau memproses per bagian.",
        "actions": [
            {"label": "Proses per bagian", "action": "chunk_process"},
            {"label": "Pakai seleksi saja", "action": "use_selection"},
        ],
    },
    "TARGET_IMBALANCED": {
        "message": "Distribusi kelas target sangat tidak seimbang. Model bisa cenderung menebak kelas mayoritas.",
        "hint": "Aktifkan penyeimbang bobot kelas (class_weight='balanced') pada pengaturan training.",
        "actions": [{"label": "Seimbangkan bobot kelas", "action": "balance_weights"}],
    },
    "LEAKAGE_SUSPECT": {
        "message": "Ada kolom fitur yang hampir identik dengan target, sehingga model bisa 'menyontek'.",
        "hint": "Keluarkan kolom tersebut dari daftar fitur agar evaluasi model tetap jujur.",
        "actions": [{"label": "Keluarkan kolom", "action": "drop_leakage_col"}],
    },
    "OFFLINE": {
        "message": "Tidak ada koneksi internet. Basemap online dan unduh OSM dinonaktifkan; fitur lain tetap jalan.",
        "hint": "Anda tetap dapat mengolah data lokal, menjalankan tool, dan melatih model secara offline.",
        "actions": [{"label": "Coba lagi", "action": "retry_online"}],
    },
    "OVERPASS_TOO_BIG": {
        "message": "Area terlalu luas untuk diunduh sekaligus dari OpenStreetMap.",
        "hint": "Perkecil kotak area unduhan (disarankan < 25 km²) agar server Overpass tidak menolak.",
        "actions": [
            {"label": "Perkecil area", "action": "shrink_bbox"},
            {"label": "Bagi otomatis", "action": "split_bbox"},
        ],
    },
}


class PetaLabError(Exception):
    def __init__(
        self,
        code: str,
        message: str | None = None,
        hint: str | None = None,
        actions: list[dict[str, Any]] | None = None,
        detail: str = "",
        status_code: int = 400,
    ):
        catalog_entry = ERROR_CATALOG.get(code, {})
        self.code = code
        self.message = message or catalog_entry.get("message", "Prosesnya belum berhasil dijalankan.")
        self.hint = hint or catalog_entry.get("hint", "Periksa parameter masukan dan coba kembali.")
        self.actions = actions if actions is not None else catalog_entry.get("actions", [])
        self.detail = detail
        self.status_code = status_code
        super().__init__(self.message)

    def to_dict(self) -> dict[str, Any]:
        return {
            "code": self.code,
            "message": self.message,
            "hint": self.hint,
            "actions": self.actions,
            "detail": self.detail,
        }
