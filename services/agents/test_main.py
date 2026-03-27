import asyncio
import os
import sys
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

SERVICE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SERVICE_DIR))

import main as agents_main


class AgentsServiceTests(unittest.TestCase):
    def test_health_returns_ok(self):
        self.assertEqual(agents_main.health(), {"ok": True})

    def test_verify_api_key_requires_env(self):
        with patch.dict(os.environ, {}, clear=True):
            with self.assertRaises(agents_main.HTTPException) as context:
                agents_main._verify_api_key("test")

        self.assertEqual(context.exception.status_code, 500)

    def test_verify_api_key_rejects_wrong_key(self):
        with patch.dict(os.environ, {"AGENTS_API_KEY": "expected"}, clear=False):
            with self.assertRaises(agents_main.HTTPException) as context:
                agents_main._verify_api_key("wrong")

        self.assertEqual(context.exception.status_code, 401)

    def test_verify_api_key_accepts_matching_key(self):
        with patch.dict(os.environ, {"AGENTS_API_KEY": "expected"}, clear=False):
            agents_main._verify_api_key("expected")

    def test_analyze_email_returns_structured_response(self):
        fake_response = SimpleNamespace(
            choices=[
                SimpleNamespace(
                    message=SimpleNamespace(
                        content='{"priority":"high","category":"support","action":"flag","suggested_labels":["urgent"],"confidence":0.92,"summary":"Escalated support request."}'
                    )
                )
            ]
        )
        fake_client = SimpleNamespace(
            chat=SimpleNamespace(
                completions=SimpleNamespace(create=self._async_return(fake_response))
            )
        )

        with patch.dict(
            os.environ,
            {"AGENTS_API_KEY": "expected", "OPENAI_API_KEY": "sk-test"},
            clear=False,
        ):
            with patch.object(agents_main, "_get_openai_client", return_value=fake_client):
                result = asyncio.run(
                    agents_main.analyze_email(
                        agents_main.AnalyzeEmailRequest(
                            subject="Urgent: server down",
                            content="Our production server is unreachable.",
                            sender="ops@acme.com",
                        ),
                        x_api_key="expected",
                    )
                )

        self.assertEqual(result.priority, agents_main.EmailPriority.high)
        self.assertEqual(result.category, agents_main.EmailCategory.support)
        self.assertEqual(result.action, agents_main.EmailAction.flag)
        self.assertEqual(result.suggested_labels, ["urgent"])

    @staticmethod
    def _async_return(value):
        async def _inner(*args, **kwargs):
            return value

        return _inner
