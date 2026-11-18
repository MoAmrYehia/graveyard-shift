import os
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from mentor.app import app


class MentorTests(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    @patch.dict(os.environ, {"GRAVEYARD_BEDROCK_MODEL_ID": ""})
    def test_unconfigured_mentor_keeps_the_offline_path(self):
        self.assertEqual(self.client.post("/api/mentor", json={"exhibit": "dispatch"}).status_code, 503)

    @patch.dict(os.environ, {"GRAVEYARD_BEDROCK_MODEL_ID": "test-model"})
    @patch("mentor.app.bedrock_client")
    def test_explanation_only_receives_the_selected_exhibit(self, client):
        client.return_value.converse.return_value = {"output": {"message": {"content": [{"text": "Compare the two B-019 attempts in E-02."}]}}}
        response = self.client.post("/api/mentor", json={"exhibit": "dispatch"})
        self.assertEqual(response.json()["exhibit"], "E-02")
        request = client.return_value.converse.call_args.kwargs["messages"][0]["content"][0]["text"]
        self.assertIn("02:14 UTC", request)
        self.assertNotIn("TX-1106", request)
        self.assertEqual(self.client.post("/api/mentor", json={"exhibit": "other"}).status_code, 422)
