import unittest
from unittest.mock import AsyncMock
import httpx
from fastapi.testclient import TestClient
from backend.main import app, cache, normalize_chart

def fixture():
    return {"chart": {"result": [{"meta": {"currency": "EUR", "exchangeName": "MCE", "regularMarketTime": 200, "exchangeDataDelayedBy": 15}, "timestamp": [100, 200, 300], "indicators": {"quote": [{"open": [10, 11, None], "high": [12, 13, 14], "low": [9, 10, 11], "close": [11, 12, 13], "volume": [100, 120, 100]}]}}]}}

class MarketTests(unittest.TestCase):
    def test_normalization_preserves_market_timestamp_and_discards_missing_bars(self):
        data = normalize_chart(fixture())
        self.assertEqual(len(data["candles"]), 2)
        self.assertEqual(data["asOf"], 200000)
        self.assertEqual(data["delay"], 15)
        self.assertFalse(data["demo"])

    def test_validation_cache_and_provider_failure(self):
        cache.clear()
        with TestClient(app) as client:
            app.state.client.get = AsyncMock(return_value=httpx.Response(200, json=fixture(), request=httpx.Request("GET", "https://example.com")))
            self.assertEqual(client.get("/api/history", params={"symbol": "../../evil"}).status_code, 422)
            self.assertEqual(client.get("/api/history", params={"symbol": "AAPL", "interval": "1s"}).status_code, 422)
            for _ in range(2):
                response = client.get("/api/history", params={"symbol": "SAN.MC"})
                self.assertEqual(response.status_code, 200)
            self.assertEqual(app.state.client.get.await_count, 1)
            app.state.client.get = AsyncMock(side_effect=httpx.ConnectError("offline"))
            response = client.get("/api/history", params={"symbol": "AAPL"})
            self.assertEqual(response.status_code, 502)
            self.assertNotIn("candles", response.json())
            self.assertEqual(client.get("/api/health", headers={"Host": "evil.example"}).status_code, 400)

if __name__ == "__main__":
    unittest.main()
