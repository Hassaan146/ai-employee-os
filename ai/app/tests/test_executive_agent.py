"""
Quick manual test for the Executive agent.

Run:
    python tests/test_executive_agent.py
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents import AGENTS


def main():
    executive = AGENTS["executive"]

    print("Test 1: multi-step style request")
    result = executive.handle("Send a quotation to John for 25 laptops and schedule a meeting Friday at 3 PM.")
    print("Response:", result["response"])
    print("Tool calls made:", result["tool_calls"])
    print()

    print("Test 2: general question, no tool needed")
    result = executive.handle("What can you help me with?")
    print("Response:", result["response"])
    print("Tool calls made:", result["tool_calls"])


if __name__ == "__main__":
    main()
