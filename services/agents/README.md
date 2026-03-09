# Agents Service (Python)

Lightweight FastAPI service that exposes AI agent endpoints. Called by n8n
workflows and the platform worker to run agent logic that requires LLM
inference.

## Endpoints

| Method | Path              | Auth               | Description                        |
| ------ | ----------------- | ------------------ | ---------------------------------- |
| GET    | `/health`         | None               | Shallow health check               |
| POST   | `/health/deep`    | `x-api-key` header | Deep check — verifies OpenAI conn  |
| GET    | `/hello`          | `x-api-key` header | Legacy protected hello             |
| POST   | `/analyze-email`  | `x-api-key` header | Classify email via GPT-4o-mini     |

## Authentication

All non-health endpoints require the `x-api-key` header matching the
`AGENTS_API_KEY` environment variable.

## Configuration

| Env var          | Required | Description                       |
| ---------------- | -------- | --------------------------------- |
| `AGENTS_API_KEY` | Yes      | Shared secret for service auth    |
| `OPENAI_API_KEY` | Yes      | OpenAI API key for LLM inference  |

## `/analyze-email`

Classifies an email using GPT-4o-mini with structured JSON output.

**Request:**

```json
{
  "subject": "Urgent: server down",
  "content": "Our production server has been unreachable for 30 minutes...",
  "sender": "ops@acme.com"
}
```

**Response:**

```json
{
  "priority": "high",
  "category": "support",
  "action": "flag",
  "suggested_labels": ["urgent", "infrastructure"],
  "confidence": 0.92,
  "summary": "Production server outage requiring immediate attention."
}
```

## Running locally

```bash
pip install -r requirements.txt
AGENTS_API_KEY=test OPENAI_API_KEY=sk-... uvicorn main:app --reload --port 8000
```

## Docker

```bash
docker build -t agentmou-agents .
docker run -e AGENTS_API_KEY=test -e OPENAI_API_KEY=sk-... -p 8000:8000 agentmou-agents
```

## Calling from n8n

Use an HTTP Request node with:

- **URL**: `http://agents:8000/analyze-email` (internal Docker network)
- **Method**: POST
- **Header**: `x-api-key: <AGENTS_API_KEY>`
- **Body**: JSON with `subject`, `content`, and optional `sender`
