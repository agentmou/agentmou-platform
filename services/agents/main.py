import os

from fastapi import FastAPI, Header, HTTPException

app = FastAPI()


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/hello")
def hello(x_api_key: str = Header(None)):
    agents_api_key = os.environ.get("AGENTS_API_KEY")
    if not agents_api_key:
        raise HTTPException(status_code=500, detail="AGENTS_API_KEY not set")
    if x_api_key != agents_api_key:
        raise HTTPException(status_code=401, detail="Unauthorized")
    return {"message": "hello from agents"}
