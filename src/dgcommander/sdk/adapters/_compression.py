"""Utility helpers for computing compression analytics."""

from __future__ import annotations

from ..models import ObjectListing


def compute_compression_stats(listing: ObjectListing) -> dict[str, object]:
    """Return aggregate compression statistics for a listing."""

    stats = {
        "total_objects": len(listing.objects),
        "compressed_objects": sum(1 for obj in listing.objects if obj.compressed),
        "total_original_bytes": sum(obj.original_bytes for obj in listing.objects),
        "total_stored_bytes": sum(obj.stored_bytes for obj in listing.objects),
        "total_savings_bytes": 0,
        "compression_rate": 0.0,
        "top_compressions": [],
    }

    stats["total_savings_bytes"] = stats["total_original_bytes"] - stats["total_stored_bytes"]

    if stats["total_original_bytes"] > 0:
        stats["compression_rate"] = stats["total_savings_bytes"] / stats["total_original_bytes"]

    compressions = []
    for obj in listing.objects:
        if obj.compressed and obj.original_bytes > 0:
            savings = obj.original_bytes - obj.stored_bytes
            rate = savings / obj.original_bytes
            compressions.append(
                {
                    "key": obj.key,
                    "original_bytes": obj.original_bytes,
                    "stored_bytes": obj.stored_bytes,
                    "savings_bytes": savings,
                    "compression_rate": rate * 100,
                }
            )

    stats["top_compressions"] = sorted(compressions, key=lambda x: x["savings_bytes"], reverse=True)[:10]

    return stats


__all__ = ["compute_compression_stats"]
