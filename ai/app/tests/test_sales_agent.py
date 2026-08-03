"""
Quick manual test for the Sales agent.

Run:
    python tests/test_sales_agent.py

Requires OPENAI_API_KEY set in a .env file at the project root.
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents import AGENTS


def main():
    sales = AGENTS["sales"]

    print("Test 1: request that needs a CRM lookup")
    result = sales.handle("Does John have any open deals with us?")
    print("Response:", result["response"])
    print("Tool calls made:", result["tool_calls"])
    print()

    print("Test 2: general question, no tool needed")
    result = sales.handle("What kind of things can you help me with?")
    print("Response:", result["response"])
    print("Tool calls made:", result["tool_calls"])


if __name__ == "__main__":
    main()
