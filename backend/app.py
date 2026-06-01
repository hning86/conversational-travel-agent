from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import sys
import os
# Add the parent directory (project root) to the Python path to import the travel_agent module
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from agent_runner import run_booking_agent
from travel_agent.mock_tools import MockFirestore, GCPLogCollector
import uvicorn

app = FastAPI(title="Booking.com 2026 AI Vision Multi-Agent Backend")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    session_id: str
    message: str

class ResetRequest(BaseModel):
    session_id: str

@app.post("/api/chat")
@app.post("/chat") # Fallback
async def chat(request: ChatRequest):
    try:
        # Run ADK 2.0 Agent coordination logic
        result = await run_booking_agent(request.session_id, request.message)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset")
async def reset(request: ResetRequest):
    try:
        collector = GCPLogCollector()
        firestore = MockFirestore(collector)
        # Reset session in firestore
        firestore.save_session(request.session_id, {"current_turn": 0, "history": []})
        return {"status": "success", "message": f"Session {request.session_id} reset successfully."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
