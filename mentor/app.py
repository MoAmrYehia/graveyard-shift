"""Optional same-origin Bedrock explanations for the three synthetic exhibits."""
import os
from functools import lru_cache
from typing import Literal

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, ConfigDict

app = FastAPI(title="Graveyard Shift mentor", docs_url=None, redoc_url=None)
EVIDENCE = {
    "source": ("E-01", "The source manifest has eight distinct transaction IDs totalling AED 10,000,000. The warehouse reports AED 12,000,000."),
    "dispatch": ("E-02", "B-019 committed three rows at 02:14 UTC. Its acknowledgement timed out. The same batch was delivered again at 02:17 UTC."),
    "warehouse": ("E-03", "TX-1106, TX-1107 and TX-1108 appear on both deliveries of B-019. Distinct transactions TX-1104 and TX-1106 both carry AED 1,000,000."),
}


class HintRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    exhibit: Literal["source", "dispatch", "warehouse"]


@lru_cache(maxsize=1)
def bedrock_client():
    import boto3
    from botocore.config import Config

    config = Config(connect_timeout=2, read_timeout=8, retries={"total_max_attempts": 1})
    return boto3.client("bedrock-runtime", region_name=os.getenv("AWS_REGION"), config=config)


@app.post("/api/mentor")
def explain(payload: HintRequest):
    model = os.getenv("GRAVEYARD_BEDROCK_MODEL_ID")
    if not model:
        raise HTTPException(503, "Live mentor is not configured.")
    exhibit, facts = EVIDENCE[payload.exhibit]
    try:
        response = bedrock_client().converse(
            modelId=model,
            system=[{"text": "You coach a junior data engineer through a fictional incident. Use only the supplied exhibit. Name its ID. Explain one diagnostic question they can answer with it in under 75 words. Leave the SQL repair to the learner."}],
            messages=[{"role": "user", "content": [{"text": f"{exhibit}. {facts}"}]}],
            inferenceConfig={"maxTokens": 140, "temperature": 0.2},
        )
        answer = " ".join(block["text"].strip() for block in response["output"]["message"]["content"] if block.get("text"))
        if not answer:
            raise ValueError("Empty model response")
    except Exception:
        raise HTTPException(503, "The live mentor is unavailable. Use the local field guide.") from None
    return {"exhibit": exhibit, "answer": answer}
