import os
import opik
from opik.api_objects.opik_client import Opik
from typing import Dict, Any, Optional

# Global Opik client
_client = None

def get_opik_client() -> Opik:
    global _client
    if _client is None:
        # Assumes OPIK_API_KEY and OPIK_WORKSPACE (optional) are in env 
        # or configured via default mechanism
        _client = Opik()
    return _client

def log_agent_trace(
    agent_name: str, 
    input_data: Dict[str, Any], 
    output_data: Dict[str, Any], 
    tags: list[str] = None
):
    """
    Helper to log a simple trace for an agent execution to Opik.
    """
    try:
        client = get_opik_client()
        # In a real LangGraph setup, we'd use the automatic integration.
        # For manual logging or specific checkpoints:
        trace = client.trace(
            name=f"{agent_name}_execution",
            input=input_data,
            output=output_data,
            tags=tags or ["pact_agent"]
        )
        # Note: Opik SDK usage usually involves decorators or context managers, 
        # this is a simplified imperative log for MVP if needed.
        # Ideally, we verify with the @track decorator on agent functions.
        pass
    except Exception as e:
        print(f"[WARN] Failed to log to Opik: {e}")

def track_metric(name: str, value: float, tags: list[str] = None):
    try:
        # Opik might handle metrics differently, but for MVP we might just log them 
        # as part of traces or use a dedicated method if available in the SDK version.
        # For now, we will assume standard logging or print for demo if SDK isn't fully set up.
        print(f"[OPIK METRIC] {name}: {value}")
    except Exception as e:
        print(f"[WARN] Failed to track metric: {e}")
