import argparse
import sys
import json
from src.core.orchestrator import PACTOrchestrator

def main():
    parser = argparse.ArgumentParser(description="PACT⁰ Demo CLI")
    parser.add_argument("--scenario", type=str, default="happy", 
                        choices=["happy", "late", "short", "cheat_treadmill", "superhuman"],
                        help="Choose a demo scenario")
    parser.add_argument("--goal", type=str, default="Run 5km by tomorrow night on treadmill or outside",
                        help="Natural language goal")
    
    args = parser.parse_args()

    # Map scenario to mock ID
    scenario_map = {
        "happy": "run_valid_outdoor",
        "late": "run_late",
        "short": "run_short",
        "cheat_treadmill": "treadmill_cheat",
        "superhuman": "run_superhuman"
    }
    
    mock_id = scenario_map.get(args.scenario, "run_valid_outdoor")

    print("="*60)
    print(f" PACT⁰ MVP DEMO | Scenario: {args.scenario.upper()}")
    print("="*60)
    
    orchestrator = PACTOrchestrator()
    results = orchestrator.run_pipeline(args.goal, mock_activity_id=mock_id)
    
    print("\n" + "="*60)
    print(" FINAL SYSTEM OUTPUT DUMP")
    print("="*60)
    print(json.dumps(results, indent=2, default=str))

if __name__ == "__main__":
    main()
