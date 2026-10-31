import unittest
from unittest.mock import AsyncMock
import httpx
from fastapi.testclient import TestClient
from backend.main import app,cache

class ResearchTests(unittest.TestCase):
    def test_news_filters_unsafe_links_and_search_preserves_asset_identity(self):
        cache.clear()
        raw={'news':[{'uuid':'ok','title':'Resultados publicados','publisher':'Fuente','link':'https://example.com/article','providerPublishTime':100},{'title':'Enlace rechazado','link':'javascript:alert(1)'}],'quotes':[{'symbol':'7203.T','quoteType':'EQUITY','shortname':'Toyota','exchange':'JPX','currency':'JPY'}]}
        with TestClient(app) as client:
            app.state.client.get=AsyncMock(return_value=httpx.Response(200,json=raw,request=httpx.Request('GET','https://example.com')))
            news=client.get('/api/news',params={'symbol':'AAPL'}).json()
            self.assertEqual(len(news['items']),1)
            self.assertEqual(news['items'][0]['time'],100000)
            search=client.get('/api/search',params={'q':'Toyota'}).json()
            self.assertEqual(search[0]['currency'],'JPY')
            self.assertEqual(search[0]['country'],'Japón')
            self.assertEqual(client.get('/api/news',params={'symbol':'../../'}).status_code,422)

    def test_macro_uses_latest_non_null_year_and_rejects_unknown_indicators(self):
        cache.clear()
        raw=[{'lastupdated':'2026-10-08'},[{'countryiso3code':'ESP','date':'2025','value':None},{'countryiso3code':'ESP','date':'2024','value':3.2},{'countryiso3code':'ESP','date':'2023','value':2.5}]]
        with TestClient(app) as client:
            app.state.client.get=AsyncMock(return_value=httpx.Response(200,json=raw,request=httpx.Request('GET','https://example.com')))
            data=client.get('/api/macro',params={'indicator':'gdp'}).json()
            spain=next(c for c in data['countries'] if c['code']=='ESP')
            self.assertEqual((spain['year'],spain['value']),(2024,3.2))
            self.assertEqual(client.get('/api/macro',params={'indicator':'other'}).status_code,422)
            empty=next(c for c in data['countries'] if c['code']=='USA')
            self.assertIsNone(empty['value'])

    def test_yields_keep_missing_maturities_empty(self):
        cache.clear()
        with TestClient(app) as client:
            app.state.client.get=AsyncMock(side_effect=httpx.ConnectError('offline'))
            response=client.get('/api/yields')
            self.assertEqual(response.status_code,502)
            self.assertNotIn('points',response.json())
