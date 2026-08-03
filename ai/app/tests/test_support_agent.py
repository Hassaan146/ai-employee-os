import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from agents import AGENTS


def main():
    support = AGENTS["support"]

    print("Test 1: request that needs a CRM lookup")
    result = support.handle("I haven't received my invoice yet, my name is John, can you check?")
    print("Response:", result["response"])
    print("Tool calls made:", result["tool_calls"])
    print()

    print("Test 2: general question, no tool needed")
    result = support.handle("What can you help me with?")
    print("Response:", result["response"])
    print("Tool calls made:", result["tool_calls"])


if __name__ == "__main__":
    main()