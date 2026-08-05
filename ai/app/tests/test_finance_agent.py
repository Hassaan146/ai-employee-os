"""
Quick manual test for the Finance agent.

Run:
    python tests/test_finance_agent.py
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents import AGENTS


def main():
    finance = AGENTS["finance"]

    print("Test 1: request that needs a CRM lookup")
    result = finance.handle("Can you check if John's invoice for the 25 laptops has been paid?")
    print("Response:", result["response"])
    print("Tool calls made:", result["tool_calls"])
    print()

    print("Test 2: general question, no tool needed")
    result = finance.handle("What can you help me with?")
    print("Response:", result["response"])
    print("Tool calls made:", result["tool_calls"])


if __name__ == "__main__":
    main()
