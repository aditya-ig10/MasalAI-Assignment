import pytest

from app.services import properties


@pytest.fixture()
def _tmp_cache(tmp_path, monkeypatch):
    monkeypatch.setattr(properties, "CACHE_PATH", tmp_path / "cache.json")


def _row(location="JP Nagar, Bangalore", requirement="2 BHK Residential Apartment"):
    return {
        "location": location,
        "property_requirement": requirement,
        "budget": 13_000_000.0,
        "buying_timeline": "flexible",
        "source": "live",
    }


def test_store_and_cache_first(_tmp_cache, monkeypatch):
    properties.store_rows([_row(), _row("Whitefield, Bangalore", "3 BHK Residential Apartment")])

    def _boom(*args, **kwargs):
        raise AssertionError("live Apify must not run on a cache hit")

    monkeypatch.setattr(properties, "apify_search", _boom)
    rows, source = properties.search_properties("Bangalore", 8)
    assert source == "stored"
    assert len(rows) == 2


def test_cache_miss_falls_back_to_empty_when_live_fails(_tmp_cache, monkeypatch):
    monkeypatch.setattr(properties, "apify_search", lambda *a, **k: (_ for _ in ()).throw(RuntimeError("down")))
    rows, source = properties.search_properties("Mumbai", 8)
    assert (rows, source) == ([], "stored")


def test_normalize_india_probe_shape():
    item = {
        "title": "2 BHK Flat in JP Nagar, Bangalore",
        "property_type": "Residential Apartment",
        "bhk": 2,
        "price_inr": 13000002,
        "locality": "JP Nagar, Bangalore",
        "city": "Bangalore South",
        "url": "https://www.99acres.com/flat-jp-nagar",
        "images": ["https://imagecdn.99acres.com/img1.jpg"],
    }
    row = properties._normalize_india(item)
    assert row is not None
    assert row["budget"] == 13_000_002.0
    assert "JP Nagar" in row["location"]
    assert row["property_requirement"].startswith("2 BHK")
    assert row["url"] == "https://www.99acres.com/flat-jp-nagar"
    assert row["image"] == "https://imagecdn.99acres.com/img1.jpg"


def test_region_and_city_detection():
    assert properties._detect_region("Mumbai") == "india"
    assert properties._detect_region("Whitefield") == "india"
    assert properties._detect_region("Austin TX") == "us"
    assert properties._india_params("Bengaluru", 8)["city"] == "Bangalore"
    assert properties._india_params("Whitefield", 8)["city"] == "Bangalore"
    assert properties._india_params("Powai", 8)["city"] == "Mumbai"


def test_inr_strings_parse():
    assert properties._to_number("₹2.5 Cr") == 25_000_000.0
    assert properties._to_number("Rs. 1.3 Crore") == 13_000_000.0
    assert properties._to_number("85 Lakh") == 8_500_000.0
