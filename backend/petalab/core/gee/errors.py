"""
Beginner-friendly error translator and token/URL redactor for Google Earth Engine (§10.3 & §14).
Ensures no raw tracebacks, OAuth tokens, or signed URLs ever leak to the UI or logs.
"""

import re
from typing import Any

from petalab.errors import ERROR_CATALOG, PetaLabError

GEE_ERROR_CATALOG: dict[str, dict[str, Any]] = {
    "GEE_NOT_INSTALLED": {
        "message": "Fitur ini butuh paket Earth Engine yang belum terpasang.",
        "hint": "Jalankan `pip install earthengine-api google-auth` atau gunakan Mode Simulator Katalog Bumi.",
        "actions": [{"label": "Cara memasang", "action": "open_gee_help"}],
    },
    "GEE_NOT_CONNECTED": {
        "message": "Kamu belum menghubungkan akun Earth Engine.",
        "hint": "Buka Pengaturan → Earth Engine untuk memasukkan ID Project Cloud dan menghubungkan akun.",
        "actions": [{"label": "Hubungkan", "action": "open_gee_settings"}],
    },
    "GEE_NOT_REGISTERED": {
        "message": "Project Google Cloud ini belum terdaftar untuk Earth Engine.",
        "hint": "Daftarkan project-nya di konsol Google Earth Engine, lalu klik Uji Koneksi lagi.",
        "actions": [
            {"label": "Buka halaman pendaftaran", "action": "open_gee_signup"},
            {"label": "Uji ulang", "action": "test_gee_connection"},
        ],
    },
    "GEE_TOO_BIG": {
        "message": "Area yang diminta terlalu besar untuk sekali unduh.",
        "hint": "PetaLab akan memecahnya otomatis menjadi beberapa petak. Kalau masih gagal, perkecil area atau turunkan resolusi.",
        "actions": [
            {"label": "Lanjutkan berpetak", "action": "proceed_tiled"},
            {"label": "Perkecil area", "action": "shrink_area"},
        ],
    },
    "GEE_MEMORY": {
        "message": "Perhitungan di server Earth Engine terlalu berat.",
        "hint": "Coba perpendek rentang tanggal, perkecil area, atau turunkan resolusi.",
        "actions": [
            {"label": "Perpendek tanggal", "action": "shorten_dates"},
            {"label": "Turunkan resolusi", "action": "coarsen_scale"},
        ],
    },
    "GEE_NO_IMAGE": {
        "message": "Tidak ada citra yang cocok. Rentang tanggalnya mungkin terlalu sempit, atau semuanya tertutup awan.",
        "hint": "Perlebar rentang tanggal menjadi 2–3 bulan atau naikkan batas toleransi awan.",
        "actions": [
            {"label": "Perlebar rentang", "action": "widen_dates"},
            {"label": "Naikkan batas awan", "action": "increase_cloud_limit"},
        ],
    },
    "GEE_ALL_CLOUDY": {
        "message": "Semua citra di rentang ini tertutup awan. Wajar untuk wilayah tropis.",
        "hint": "Perlebar rentang waktu menjadi 3 bulan agar komposit median mendapat piksel bebas awan.",
        "actions": [{"label": "Perlebar jadi 3 bulan", "action": "widen_dates_3m"}],
    },
    "GEE_QUOTA": {
        "message": "Kuota Earth Engine bulan ini sudah habis.",
        "hint": "Kuota diperbarui tiap awal bulan. Sementara itu, pratinjau dan layer yang sudah diunduh tetap bisa dipakai.",
        "actions": [{"label": "Lihat kuota", "action": "open_gee_quota"}],
    },
    "GEE_BUSY": {
        "message": "Server Earth Engine sedang sibuk melayani permintaanmu.",
        "hint": "PetaLab sudah mencoba ulang otomatis. Coba lagi beberapa menit lagi.",
        "actions": [{"label": "Coba lagi", "action": "retry"}],
    },
    "GEE_DATASET_GONE": {
        "message": "Dataset ini tidak lagi tersedia di katalog Earth Engine.",
        "hint": "Google kadang mengganti dataset dengan versi baru. Perbarui katalog di core/gee/catalog.py.",
        "actions": [{"label": "Lihat alternatif", "action": "show_alternatives"}],
    },
    "GEE_SCALE_TOO_FINE": {
        "message": "Resolusi yang diminta lebih halus daripada resolusi asli satelit.",
        "hint": "Meminta resolusi lebih halus dari aslinya tidak menambah detail, hanya memperbesar ukuran file.",
        "actions": [{"label": "Pakai resolusi asli", "action": "use_native_scale"}],
    },
    "GEE_PARTIAL": {
        "message": "Sebagian petak berhasil diunduh, namun ada bagian yang gagal.",
        "hint": "Anda dapat mengulangi bagian yang gagal atau memakai hasil yang sudah terunduh.",
        "actions": [
            {"label": "Ulangi bagian gagal", "action": "retry_failed_tiles"},
            {"label": "Pakai yang ada", "action": "use_partial"},
        ],
    },
}

# Register into global ERROR_CATALOG as well
ERROR_CATALOG.update(GEE_ERROR_CATALOG)

POLA = [
    (
        r"Total request size .* must be less than",
        "GEE_TOO_BIG",
        "Area yang diminta terlalu besar untuk sekali unduh.",
        "PetaLab akan memecahnya otomatis. Kalau masih gagal, perkecil area atau turunkan resolusi.",
    ),
    (
        r"User memory limit exceeded",
        "GEE_MEMORY",
        "Perhitungan di server Earth Engine terlalu berat.",
        "Coba perpendek rentang tanggal, perkecil area, atau turunkan resolusi.",
    ),
    (
        r"not.*(signed up|registered).*Earth Engine|Caller does not have permission",
        "GEE_NOT_REGISTERED",
        "Project Google Cloud ini belum terdaftar untuk Earth Engine.",
        "Daftarkan project-nya, lalu klik Uji Koneksi lagi.",
    ),
    (
        r"Image\.(load|select).*not found|Collection\.loadTable.*not found|asset.*not found",
        "GEE_DATASET_GONE",
        "Dataset ini tidak lagi tersedia di katalog Earth Engine.",
        "Google kadang mengganti dataset dengan versi baru. Laporkan ini supaya PetaLab diperbarui.",
    ),
    (
        r"Quota exceeded|RESOURCE_EXHAUSTED",
        "GEE_QUOTA",
        "Kuota Earth Engine bulan ini sudah habis.",
        "Kuota diperbarui tiap bulan. Sementara itu, pratinjau tetap bisa dipakai.",
    ),
    (
        r"429|Too Many Requests",
        "GEE_BUSY",
        "Server Earth Engine sedang sibuk melayani permintaanmu.",
        "PetaLab sudah mencoba ulang otomatis. Coba lagi beberapa menit lagi.",
    ),
    (
        r"No images found|empty collection",
        "GEE_NO_IMAGE",
        "Tidak ada citra yang cocok dalam rentang tanggal dan batas awan ini.",
        "Perlebar rentang tanggal menjadi 2–3 bulan atau naikkan batas awan.",
    ),
]


def redact(teks: str) -> str:
    """Removes signed URLs, access tokens, and long secrets from error messages and logs."""
    if not teks:
        return ""
    teks = re.sub(
        r"https?://\S*[?&](token|key|signature|access_token)=\S*",
        "[url disembunyikan]",
        teks,
        flags=re.I,
    )
    teks = re.sub(r"ya29\.[A-Za-z0-9_\-\.]+", "***", teks)
    return re.sub(r"\b[A-Za-z0-9_\-]{40,}\b", "***", teks)


def to_user_error(exc: Exception) -> dict[str, Any]:
    if isinstance(exc, PetaLabError):
        d = exc.to_dict()
        d["detail"] = redact(d.get("detail", ""))
        return d

    teks = str(exc)
    for pola, kode, pesan, saran in POLA:
        if re.search(pola, teks, re.I):
            actions = GEE_ERROR_CATALOG.get(kode, {}).get("actions", [])
            return {
                "code": kode,
                "message": pesan,
                "hint": saran,
                "actions": actions,
                "detail": redact(teks),
            }
    return {
        "code": "GEE_UNKNOWN",
        "message": "Earth Engine menolak permintaan ini.",
        "hint": "Coba perkecil area atau perpendek rentang tanggal.",
        "actions": [],
        "detail": redact(teks),
    }
