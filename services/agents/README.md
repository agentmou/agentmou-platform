# Agents Service (Python)

Lightweight FastAPI service that exposes AI agent endpoints. Currently a
hello-world scaffold; future endpoints will be called by n8n workflows and
the platform worker.

## Endpoints

| Method | Path      | Auth              | Description          |
| ------ | --------- | ----------------- | -------------------- |
| GET    | `/health` | None              | Health check         |
| GET    | `/hello`  | `x-api-key` header | Protected hello test |

## Authentication

`/hello` requires the `x-api-key` header to match the `AGENTS_API_KEY`
environment variable. If the variable is not set the service returns 500.

## Configuration

| Env var          | Required | Description             |
| ---------------- | -------- | ----------------------- |
| `AGENTS_API_KEY` | Yes      | Shared secret for auth  |

## Running locally

```bash
pip install -r requirements.txt
AGENTS_API_KEY=test uvicorn main:app --reload --port 8000
```

## Docker

```bash
docker build -t agentmou-agents .
docker run -e AGENTS_API_KEY=test -p 8000:8000 agentmou-agents
```

## Calling from n8n

Use an HTTP Request node with:

- **URL**: `http://agents:8000/hello` (internal Docker network)
- **Header**: `x-api-key: <AGENTS_API_KEY>`
