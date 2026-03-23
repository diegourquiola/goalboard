import time
from threading import Lock


class TTLCache:
    """Thread-safe in-memory cache with per-entry TTL."""

    def __init__(self):
        self._store: dict[str, tuple[any, float]] = {}
        self._lock = Lock()

    def get(self, key: str):
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            value, expires_at = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value, ttl: int = 300):
        with self._lock:
            self._store[key] = (value, time.monotonic() + ttl)

    def invalidate(self, key: str):
        with self._lock:
            self._store.pop(key, None)

    def clear(self):
        with self._lock:
            self._store.clear()

    def stats(self) -> dict:
        """Return a snapshot of cache size (does not evict expired entries)."""
        with self._lock:
            return {"entries": len(self._store)}
