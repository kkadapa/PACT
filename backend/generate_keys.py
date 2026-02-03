import base64
import json
import os

def generate_base64_creds():
    filename = "serviceAccountKey.json"
    if not os.path.exists(filename):
        print(f"❌ Error: '{filename}' not found in the current directory.")
        print("Please place your Firebase service account JSON file here first.")
        return

    try:
        with open(filename, "r") as f:
            creds = f.read()
            # Verify it's valid JSON
            json.loads(creds)
            
            # Encode
            encoded = base64.b64encode(creds.encode('utf-8')).decode('utf-8')
            
            print("\n✅ Success! Verification passed.")
            print("\nAdd this value to Vercel Environment Variables as:")
            print("Key:   FIREBASE_SERVICE_ACCOUNT_BASE64")
            print("Value: (Copy the string below)")
            print("-" * 20)
            print(encoded)
            print("-" * 20)
            
    except json.JSONDecodeError:
        print(f"❌ Error: '{filename}' is not valid JSON.")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    generate_base64_creds()
