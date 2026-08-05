"""
Quick manual test for the HR agent.

Run:
    python tests/test_hr_agent.py
"""

import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents import AGENTS


def main():
    hr = AGENTS["hr"]

    print("Test 1: general HR question")
    result = hr.handle("How many leave days do new employees get?")
    print("Response:", result["response"])
    print("Tool calls made:", result["tool_calls"])
    print()

    print("Test 2: general question, no tool needed")
    result = hr.handle("What can you help me with?")
    print("Response:", result["response"])
    print("Tool calls made:", result["tool_calls"])


if __name__ == "__main__":
    main()
