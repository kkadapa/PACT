import os
import functools
from typing import Dict, Any, Optional

# Global Opik client
_client = None

# Try to import Opik, else mock it
try:
    import opik
    from opik.api_objects.opik_client import Opik as OpikClient
    from opik import track as opik_track
    from opik import opik_context as opik_context_real
    OPIK_AVAILABLE = True
except ImportError:
    OPIK_AVAILABLE = False
    OpikClient = None
    opik_track = None
    opik_context_real = None

def get_opik_client():
    global _client
    if OPIK_AVAILABLE and _client is None:
        try:
            # Assumes OPIK_API_KEY and OPIK_WORKSPACE (optional) are in env 
            # or configured via default mechanism
            _client = OpikClient()
        except Exception as e:
            print(f"[WARN] Could not initialize Opik client: {e}")
            return None
    return _client

def track(name: Optional[str] = None, tags: Optional[list] = None, **kwargs):
    """
    Wrapper for opik.track that works even if opik is not installed.
    """
    if OPIK_AVAILABLE and opik_track:
        return opik_track(name=name, tags=tags, **kwargs)
    
    # Mock decorator
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return decorator

class MockOpikContext:
    @staticmethod
    def get_current_trace_data():
        return None

opik_context = opik_context_real if OPIK_AVAILABLE else MockOpikContext

def log_agent_trace(
    agent_name: str, 
    input_data: Dict[str, Any], 
    output_data: Dict[str, Any], 
    tags: list[str] = None
):
    """
    Helper to log a simple trace for an agent execution to Opik.
    """
    if not OPIK_AVAILABLE:
        return

    try:
        client = get_opik_client()
        if not client:
            return

        # In a real LangGraph setup, we'd use the automatic integration.
        # For manual logging or specific checkpoints:
        client.trace(
            name=f"{agent_name}_execution",
            input=input_data,
            output=output_data,
            tags=tags or ["pact_agent"]
        )
    except Exception as e:
        print(f"[WARN] Failed to log to Opik: {e}")

def track_metric(name: str, value: float, tags: list[str] = None):
    try:
        # Opik might handle metrics differently, but for MVP we might just log them 
        # as part of traces or use a dedicated method if available in the SDK version.
        # For now, we will assume standard logging or print for demo if SDK isn't fully set up.
        # print(f"[OPIK METRIC] {name}: {value}")
        pass
    except Exception as e:
        print(f"[WARN] Failed to track metric: {e}")
