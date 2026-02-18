import sys
import os

# Add service directory to path to import logic
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../services/masker')))

from main import sanitize_input, mock_mask_logic

def test_sanitizer():
    print("--- 1. Testing Emoji Tokenization ---")
    input_text = "Sende 💸 an John Doe"
    expected = "Sende [MONEY_WITH_WINGS] an John Doe"
    sanitized = sanitize_input(input_text)
    
    print(f"Input:    {input_text}")
    print(f"Output:   {sanitized}")
    
    if "[MONEY_WITH_WINGS]" in sanitized:
        print("✅ Emoji successfully tokenized.")
    else:
        print("❌ FAILED: Emoji not tokenized.")

    print("\n--- 2. Testing Invisible Character Stripping (Zero Width Joiner) ---")
    # "Hidden" contains a Zero Width Joiner (\u200d) between H and i
    hidden_text = "H\u200didden Message" 
    clean = sanitize_input(hidden_text)
    print(f"Input:    H\\u200didden Message")
    print(f"Output:   {clean}")
    
    if "\u200d" not in clean and clean == "Hidden Message":
        print("✅ Invisible character stripped.")
    else:
        print(f"❌ FAILED: Invisible character remains. len: {len(clean)}")

    print("\n--- 3. Testing Full Pipeline (Masking + Sanitization) ---")
    pipeline_input = "Attack ⚔️ by John Doe\u200b" # Emoji + PII + ZWSP
    result = mock_mask_logic(pipeline_input, "GLOBAL")
    print(f"Input:    {pipeline_input}")
    print(f"Result:   {result}")
    
    # Expect: "Attack [CROSSED_SWORDS] by [PER_1]" (ZWSP removed)
    if "[CROSSED_SWORDS]" in result and "[PER_1]" in result and "\u200b" not in result:
        print("✅ Pipeline Secure.")
    else:
        print("❌ FAILED: Pipeline check.")

if __name__ == "__main__":
    test_sanitizer()
