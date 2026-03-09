import os
from enum import Enum

from fastapi import FastAPI, Header, HTTPException
from openai import AsyncOpenAI, OpenAIError
from pydantic import BaseModel

app = FastAPI(title="AgentMou Agents", version="0.2.0")

# ---------------------------------------------------------------------------
# Auth helper
# ---------------------------------------------------------------------------

def _verify_api_key(x_api_key: str | None) -> None:
    agents_api_key = os.environ.get("AGENTS_API_KEY")
    if not agents_api_key:
        raise HTTPException(status_code=500, detail="AGENTS_API_KEY not set")
    if x_api_key != agents_api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")


def _get_openai_client() -> AsyncOpenAI:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not set")
    return AsyncOpenAI(api_key=api_key)


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"ok": True}


@app.post("/health/deep")
async def health_deep(x_api_key: str = Header(None)):
    """Test OpenAI connectivity with a minimal completion."""
    _verify_api_key(x_api_key)
    client = _get_openai_client()
    try:
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
        )
        return {"ok": True, "model": resp.model}
    except OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {exc}") from exc


# ---------------------------------------------------------------------------
# Legacy hello endpoint
# ---------------------------------------------------------------------------

@app.get("/hello")
def hello(x_api_key: str = Header(None)):
    _verify_api_key(x_api_key)
    return {"message": "hello from agents"}


# ---------------------------------------------------------------------------
# POST /analyze-email — Inbox Triage agent
# ---------------------------------------------------------------------------

class EmailPriority(str, Enum):
    high = "high"
    medium = "medium"
    low = "low"

class EmailCategory(str, Enum):
    support = "support"
    sales = "sales"
    general = "general"
    spam = "spam"

class EmailAction(str, Enum):
    reply = "reply"
    delegate = "delegate"
    archive = "archive"
    flag = "flag"

class AnalyzeEmailRequest(BaseModel):
    subject: str
    content: str
    sender: str | None = None

class AnalyzeEmailResponse(BaseModel):
    priority: EmailPriority
    category: EmailCategory
    action: EmailAction
    suggested_labels: list[str]
    confidence: float
    summary: str


SYSTEM_PROMPT = """\
You are an email triage assistant. Analyze the incoming email and return a JSON classification.

Rules:
- Never mark as spam unless you are very confident (>0.95).
- Prioritise emails that mention urgency, deadlines, or escalations.
- Always provide a one-sentence summary.

Respond ONLY with valid JSON matching this schema:
{
  "priority": "high" | "medium" | "low",
  "category": "support" | "sales" | "general" | "spam",
  "action": "reply" | "delegate" | "archive" | "flag",
  "suggested_labels": ["label1", "label2"],
  "confidence": 0.0-1.0,
  "summary": "One-sentence summary"
}
"""


@app.post("/analyze-email", response_model=AnalyzeEmailResponse)
async def analyze_email(
    body: AnalyzeEmailRequest,
    x_api_key: str = Header(None),
):
    """Classify an email using GPT-4o-mini structured output."""
    _verify_api_key(x_api_key)
    client = _get_openai_client()

    user_message = f"Subject: {body.subject}\n"
    if body.sender:
        user_message += f"From: {body.sender}\n"
    user_message += f"\n{body.content}"

    try:
        resp = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=256,
        )
    except OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"OpenAI error: {exc}") from exc

    import json
    raw = resp.choices[0].message.content or "{}"
    try:
        data = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Invalid JSON from model: {raw[:200]}",
        ) from exc

    return AnalyzeEmailResponse(
        priority=data.get("priority", "medium"),
        category=data.get("category", "general"),
        action=data.get("action", "flag"),
        suggested_labels=data.get("suggested_labels", []),
        confidence=data.get("confidence", 0.5),
        summary=data.get("summary", ""),
    )
