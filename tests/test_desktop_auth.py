import unittest
from fastapi.testclient import TestClient
from backend.main import app
from backend.desktop_auth import LoginBroker

class DesktopLoginTests(unittest.TestCase):
    def test_credentials_are_one_use_isolated_and_expire(self):
        broker = LoginBroker(); token = broker.begin(); other = broker.begin()
        credential = {'idToken': 'test-google-id-token', 'accessToken': 'test-access-token'}
        self.assertIsNone(broker.poll(token))
        broker.finish(token, credential); credential['idToken'] = 'changed'
        self.assertIsNone(broker.poll(other))
        with self.assertRaises(ValueError): broker.finish(token, credential)
        self.assertEqual(broker.poll(token)['idToken'], 'test-google-id-token')
        with self.assertRaises(ValueError): broker.poll(token)
        broker.sessions[other]['expires'] = 0
        with self.assertRaises(ValueError): broker.poll(other)

    def test_return_requires_same_origin_nonce_and_valid_credentials(self):
        broker = LoginBroker(); token = broker.begin()
        headers = {'Authorization': 'Bearer ' + token, 'Origin': broker.origin}
        credential = {'idToken': 'test-google-id-token'}
        with TestClient(app) as client:
            app.state.desktop_auth = broker
            endpoint = '/api/desktop/auth'
            self.assertEqual(client.post(endpoint, json=credential).status_code, 403)
            self.assertEqual(client.post(endpoint, headers={**headers, 'Origin': 'https://other.example'}, json=credential).status_code, 403)
            self.assertEqual(client.post(endpoint, headers={'Origin': broker.origin}, json=credential).status_code, 401)
            self.assertEqual(client.post(endpoint, headers=headers, json={'version':1,'tabs':[]}).status_code, 400)
            self.assertEqual(client.post(endpoint, headers=headers, json={'idToken': 'x' * 64001}).status_code, 413)
            self.assertEqual(client.post(endpoint, headers=headers, json=credential).status_code, 200)
            self.assertEqual(broker.poll(token), credential)
            self.assertEqual(client.post(endpoint, headers=headers, json=credential).status_code, 400)
            del app.state.desktop_auth
