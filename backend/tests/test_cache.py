import time
import pytest
from services.cache import TTLCache


def test_set_and_get():
    cache = TTLCache()
    cache.set("key", "value", ttl=10)
    assert cache.get("key") == "value"


def test_miss_returns_none():
    cache = TTLCache()
    assert cache.get("missing") is None


def test_expiry():
    cache = TTLCache()
    cache.set("key", "value", ttl=1)
    time.sleep(1.1)
    assert cache.get("key") is None


def test_invalidate():
    cache = TTLCache()
    cache.set("key", "value", ttl=60)
    cache.invalidate("key")
    assert cache.get("key") is None


def test_clear():
    cache = TTLCache()
    cache.set("a", 1, ttl=60)
    cache.set("b", 2, ttl=60)
    cache.clear()
    assert cache.get("a") is None
    assert cache.get("b") is None
