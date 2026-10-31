import unittest
from unittest.mock import AsyncMock
from unittest.mock import patch
import httpx
from fastapi.testclient import TestClient
from backend.main import app, cache, normalize_chart

def fixture():
    return {"chart": {"result": [{"meta": {"currency": "EUR", "exchangeName": "MCE", "regularMarketTime": 200, "exchangeDataDelayedBy": 15}, "timestamp": [100, 200, 300], "indicators": {"quote": [{"open": [10, 11, None], "high": [12, 13, 14], "low": [9, 10, 11], "close": [11, 12, 13], "volume": [100, 120, 100]}]}}]}}

class MarketTests(unittest.TestCase):
    def test_missing_volume_is_not_replaced_with_zero(self):
        raw=fixture();raw['chart']['result'][0]['indicators']['quote'][0]['volume']=[None,120,None]
        data=normalize_chart(raw)
        self.assertIsNone(data['candles'][0]['volume'])
        self.assertEqual(data['candles'][1]['volume'],120)

    def test_quote_endpoint_uses_short_history_and_preserves_provenance(self):
        cache.clear()
        with TestClient(app) as client:
            app.state.client.get=AsyncMock(return_value=httpx.Response(200,json=fixture(),request=httpx.Request('GET','https://example.com')))
            data=client.get('/api/quote',params={'symbol':'SAN.MC'}).json()
            self.assertEqual(data['currency'],'EUR');self.assertEqual(data['asOf'],200000)
            self.assertEqual(app.state.client.get.call_args.kwargs['params']['range'],'5d')
            self.assertEqual(client.get('/api/quote',params={'symbol':'../x'}).status_code,422)
            self.assertEqual(client.get('/api/quote',params={'symbol':'SAN.MC'}).status_code,200)
            self.assertEqual(app.state.client.get.await_count,1)

    def test_runtime_configuration_never_exposes_private_keys(self):
        with patch.dict('os.environ',{'TRADER_FIREBASE_CONFIG':'{"apiKey":"public","authDomain":"project.firebaseapp.com","projectId":"project","appId":"app","private_key":"never-publish"}'}), TestClient(app) as client:
            data=client.get('/app-config.json').json()
            self.assertTrue(data['sameOriginMarketApi']);self.assertNotIn('private_key',data['firebase'])

    def test_classification_matches_exact_symbol_and_preserves_missing_fields(self):
        cache.clear()
        with TestClient(app) as client:
            raw={'quotes':[{'symbol':'AAPL','sector':'Technology','industry':'Consumer Electronics'}]}
            app.state.client.get=AsyncMock(return_value=httpx.Response(200,json=raw,request=httpx.Request('GET','https://example.com')))
            self.assertEqual(client.get('/api/classification',params={'symbol':'AAPL'}).json()['industry'],'Consumer Electronics')
            self.assertEqual(client.get('/api/classification',params={'symbol':'OTHER'}).status_code,404)
            raw['quotes']=[{'symbol':'MISSING'}]
            app.state.client.get=AsyncMock(return_value=httpx.Response(200,json=raw,request=httpx.Request('GET','https://example.com')))
            self.assertIsNone(client.get('/api/classification',params={'symbol':'MISSING'}).json()['industry'])

    def test_normalization_preserves_market_timestamp_and_discards_missing_bars(self):
        data = normalize_chart(fixture())
        self.assertEqual(len(data["candles"]), 2)
        self.assertEqual(data["asOf"], 200000)
        self.assertEqual(data["delay"], 15)
        self.assertNotIn("demo", data)

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
