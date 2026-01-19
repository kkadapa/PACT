import os
import asyncio
from typing import List
from dotenv import load_dotenv

# Ensure we can find the src module
import sys
sys.path.append(os.path.dirname(os.path.abspath(__file__)) + "/..")

from src.agents.contract import ContractAgent
from src.core.schemas import GoalContract
try:
    import opik
    from opik import Opik, track
    from opik.evaluation import evaluate
    from opik.evaluation.metrics import Equals
except ImportError as e:
    import traceback
    traceback.print_exc()
    print(f"Opik import failed: {e}")
    print("Opik not installed. please run `pip install opik`")
    sys.exit(1)

load_dotenv()

# 1. Define the Dataset
GOALS_DATASET = [
    {"input": "💪 Do 100 pushups/day", "expected_type": "running"}, # Actually general, detecting if agent sees it as general
    {"input": "🏋️ Exercise 3x/week", "expected_type": "general"},
    {"input": "💰 Save $500 this month", "expected_type": "general"},
    {"input": "🧘 Meditate 10min daily", "expected_type": "general"},
    {"input": "🥗 Eat 5 servings of veg", "expected_type": "general"},
    {"input": "🛑 No work after 6 PM", "expected_type": "general"},
    {"input": "📚 Read 1 book/month", "expected_type": "general"},
    {"input": "💧 Drink 8 glasses of water/day", "expected_type": "general"},
    {"input": "🚶 Walk 10,000 steps/day", "expected_type": "running"}, # Could be running/walking
    {"input": "🧘 Meditate 20min/day", "expected_type": "general"},
    {"input": "👨👩👧👦 Weekly family dinner", "expected_type": "general"},
    {"input": "✈️ Plan a weekend trip", "expected_type": "general"},
    {"input": "🎸 Learn a new skill", "expected_type": "general"},
    {"input": "🚭 Quit smoking/vaping", "expected_type": "general"},
    {"input": "🛑 No work after 6 PM", "expected_type": "general"}, # Duplicate in list, keeping as is
    {"input": "📵 Screen time < 2h/day", "expected_type": "general"},
    {"input": "🤝 Attend 1 Networking Event/month", "expected_type": "general"}
]

def eval_contract_task(item):
    """
    The task function for Opik evaluation.
    Takes an item (dict) and returns the output to be scored.
    """
    agent = ContractAgent()
    user_goal = item["input"]
    
    print(f"Processing: {user_goal}...")
    try:
        contract = agent.negotiate(user_goal)
        
        # Return a dictionary that matches what metrics might expect, 
        # or simply the structured output for manual review.
        return {
            "goal_type": contract.goal_type,
            "description": contract.goal_description,
            "amount_usd": contract.penalty.amount_usd,
            "raw_contract": contract.model_dump(mode="json")
        }
    except Exception as e:
        return {
            "error": str(e)
        }

def run_evaluation():
    print("🚀 Starting PACT Evaluation Pipeline...")
    
    # Check for API Keys
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ GOOGLE_API_KEY not found. Skipping evaluation.")
        return

    # Initialize Opik Client (optional explicit check)
    client = Opik()
    
    # Create a Dataset in Opik (or get existing)
    dataset_name = "PACT_NewYear_Goals_v1"
    dataset = client.get_or_create_dataset(name=dataset_name)
    
    # Populate Dataset if empty
    # In a real run, we might want to upscaleert. For now, check if items exist.
    # Note: Opik SDK insert_items logic varies, specific implementation below:
    try:
        current_items = dataset.get_items()
        if len(current_items) == 0:
            print(f"📝 Populating dataset '{dataset_name}' with {len(GOALS_DATASET)} items...")
            dataset.insert(GOALS_DATASET)
        else:
            print(f"✅ Dataset '{dataset_name}' already has {len(current_items)} items.")
    except Exception as e:
        print(f"⚠️ Could not check/populate dataset: {e}")
        # Proceed with in-memory list if dataset management fails
    
    # Running the Evaluation
    # We use Opik's 'evaluate' function which automatically logs an Experiment
    print("\n🧪 Running Experiment...")
    
    # Simple metric: valid JSON (checked by virtue of passing)
    # real metrics would be more complex
    
    res = evaluate(
        experiment_name="Contract_Agent_Baseline",
        dataset=dataset,
        task=eval_contract_task,
        scoring_metrics=[], # Add custom metrics here if defined
        nb_samples=None # Run all
    )
    
    print("\n✅ Evaluation Wrapper Completed.")
    print(res)

if __name__ == "__main__":
    run_evaluation()
