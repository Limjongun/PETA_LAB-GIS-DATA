import math
import geopandas as gpd
from pyproj import CRS


def format_crs_friendly(crs_obj: CRS | str | None) -> str:
    if crs_obj is None:
        return "Tidak diketahui"
    try:
        crs = CRS.from_user_input(crs_obj)
        epsg = crs.to_epsg()
        name = crs.name or "Custom CRS"
        if epsg == 4326:
            return "WGS 84 (EPSG:4326)"
        if epsg == 3857:
            return "Web Mercator (EPSG:3857)"
        if epsg and 32701 <= epsg <= 32760:
            zone = epsg - 32700
            return f"WGS 84 / UTM Zona {zone}S (EPSG:{epsg})"
        if epsg and 32601 <= epsg <= 32660:
            zone = epsg - 32600
            return f"WGS 84 / UTM Zona {zone}N (EPSG:{epsg})"
        return f"{name} (EPSG:{epsg})" if epsg else name
    except Exception:
        return str(crs_obj)


def get_crs_code(crs_obj: CRS | str | None) -> str:
    if crs_obj is None:
        return "EPSG:4326"
    try:
        crs = CRS.from_user_input(crs_obj)
        epsg = crs.to_epsg()
        return f"EPSG:{epsg}" if epsg else crs.to_string()
    except Exception:
        return "EPSG:4326"


def estimate_metric_crs(gdf: gpd.GeoDataFrame) -> CRS:
    """Automatically selects the right local UTM zone for accurate meter/area calculations."""
    if gdf.empty:
        return CRS.from_epsg(32749)  # Default UTM 49S (East Java/Surabaya)
    try:
        if gdf.crs is None:
            gdf = gdf.set_crs("EPSG:4326")
        if not gdf.crs.is_geographic:
            # Already projected in meters
            unit = gdf.crs.axis_info[0].unit_name.lower() if gdf.crs.axis_info else ""
            if "metre" in unit or "meter" in unit:
                return gdf.crs
        return gdf.estimate_utm_crs()
    except Exception:
        # Fallback compute from centroid lon/lat
        bounds = gdf.total_bounds
        lon = (bounds[0] + bounds[2]) / 2.0
        lat = (bounds[1] + bounds[3]) / 2.0
        zone = int((math.floor((lon + 180) / 6) % 60) + 1)
        epsg = (32600 + zone) if lat >= 0 else (32700 + zone)
        return CRS.from_epsg(epsg)


def to_metric_crs(gdf: gpd.GeoDataFrame) -> tuple[gpd.GeoDataFrame, CRS]:
    orig_crs = gdf.crs or CRS.from_epsg(4326)
    if gdf.crs is None:
        gdf = gdf.set_crs(orig_crs)
    utm_crs = estimate_metric_crs(gdf)
    if gdf.crs == utm_crs:
        return gdf.copy(), orig_crs
    return gdf.to_crs(utm_crs), orig_crs


def from_metric_crs(gdf: gpd.GeoDataFrame, target_crs: CRS | str | None) -> gpd.GeoDataFrame:
    if target_crs is None:
        return gdf
    target = CRS.from_user_input(target_crs)
    if gdf.crs == target:
        return gdf
    return gdf.to_crs(target)
