from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class TelemetryEvent(BaseModel):
    event_type: str = Field(..., description="e.g., page_view, click, scroll")
    path: str
    timestamp: datetime
    data: Optional[Dict[str, Any]] = None

class TelemetryBatch(BaseModel):
    session_id: Optional[str] = None
    events: List[TelemetryEvent]
