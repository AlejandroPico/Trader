import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.desktop_sync import SyncBroker

class DesktopSyncTests(unittest.TestCase):
    def test_handoff_is_isolated_one_time_and_expires(self):
        broker=SyncBroker();workspace={"version":1,"tabs":[]}
        token=broker.begin(workspace)
        self.assertIsNone(broker.poll(token))
        copy=broker.read(token);copy["tabs"].append("changed")
        self.assertEqual(broker.read(token)["tabs"],[])
        broker.finish(token,workspace)
        self.assertEqual(broker.poll(token),workspace)
        with self.assertRaises(ValueError):broker.poll(token)
        token=broker.begin(workspace);broker.sessions[token]["expires"]=0
        with self.assertRaises(ValueError):broker.read(token)

    def test_handoff_requires_local_token_and_correct_origin(self):
        broker=SyncBroker();workspace={"version":1,"tabs":[]};token=broker.begin(workspace)
        with TestClient(app) as client:
            app.state.desktop_sync=broker
            endpoint='/api/desktop/sync';headers={"Authorization":"Bearer "+token,"Origin":broker.origin}
            self.assertEqual(client.get(endpoint).status_code,401)
            self.assertEqual(client.get(endpoint,headers={**headers,"Origin":"https://evil.example"}).status_code,403)
            self.assertEqual(client.get(endpoint,headers=headers).json(),workspace)
            self.assertEqual(client.post(endpoint,headers=headers,json=workspace).status_code,200)
            self.assertEqual(broker.poll(token),workspace)
            self.assertEqual(client.get(endpoint,headers=headers).status_code,410)
            del app.state.desktop_sync
