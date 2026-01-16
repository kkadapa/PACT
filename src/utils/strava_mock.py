from datetime import datetime, timedelta, timezone
from typing import Dict, Any, List

class StravaMockClient:
    """
    Mocks Strava API interaction for demo purposes.
    Returns plausible activity data based on requested scenario.
    """
    
    def __init__(self):
        pass

    def get_activity(self, activity_id: str) -> Dict[str, Any]:
        """
        Simulates fetching an activity from Strava.
        Supported Mock IDs:
        - "run_valid_outdoor": Standard success case.
        - "run_short": Distance too short.
        - "run_late": Start time after deadline.
        - "treadmill_valid": Treadmill with good HR.
        - "treadmill_cheat": Treadmill with flat/low HR.
        - "treadmill_too_fast": Superhuman pace.
        """
        
        now = datetime.now(timezone.utc)
        
        base_activity = {
            "id": activity_id,
            "type": "Run",
            "start_date": (now - timedelta(hours=2)).isoformat(), # Default 2 hours ago
            "distance": 5000.0, # 5km
            "elapsed_time": 1500, # 25 mins (5:00/km)
            "has_heartrate": True,
            "average_heartrate": 145.0,
            "max_heartrate": 165.0,
            "manual": False,
        }

        if activity_id == "run_valid_outdoor":
            return base_activity
            
        if activity_id == "run_short":
            base_activity["distance"] = 4000.0 # 4km
            return base_activity

        if activity_id == "run_late":
            # This requires the Verifier to check against a deadline. 
            # We'll set the start_date to "tomorrow" effectively relative to when it was ostensibly due,
            # but for this mock function, we just return a time. 
            # The caller usually sets the deadline. Here we'll just set it to *now* + 1 hour to ensure it fails checks against "now".
            base_activity["start_date"] = (now + timedelta(hours=1)).isoformat()
            return base_activity
            
        if activity_id == "treadmill_valid":
            base_activity["type"] = "Run" # Strava often labels treadmill as Run + treadmill flag, keeping simple
            base_activity["trainer"] = True # Treadmill flag
            base_activity["average_heartrate"] = 150.0
            # Simulating heart rate stream variability in a real app would strictly require stream data,
            # but for MVP we might just rely on the summary stats or mock a stream check if we go deep.
            return base_activity

        if activity_id == "treadmill_cheat":
            base_activity["trainer"] = True
            base_activity["average_heartrate"] = 80.0 # Resting HR, suspicious
            # Or invalid stream
            return base_activity
            
        if activity_id == "treadmill_no_hr":
             base_activity["trainer"] = True
             base_activity["has_heartrate"] = False
             return base_activity

        if activity_id == "run_superhuman":
             # 5km in 10 mins (2:00/km)
             base_activity["elapsed_time"] = 600 
             return base_activity

        return base_activity

    def get_activity_streams(self, activity_id: str) -> List[Dict[str, Any]]:
        """
        Mock Heart Rate Stream.
        Returns list of points {time, heartrate}
        """
        if activity_id == "treadmill_cheat":
            # Flat line
            return [{"heartrate": 80, "time": i} for i in range(0, 1500, 10)]
        elif activity_id == "treadmill_valid":
            # Normal variance
            import random
            return [{"heartrate": 140 + random.randint(-10, 20), "time": i} for i in range(0, 1500, 10)]
        return []
