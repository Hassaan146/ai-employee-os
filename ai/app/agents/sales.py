"""
Sales AI Employee
------------------
The first fully working agent. Copy this file's pattern for
Finance, Support, HR, and Executive:
  1. Import their prompt from prompts/
  2. List which tools they need
  3. That's it — BaseAgent handles the rest.
"""

from agents.employee_base import BaseAgent
from prompts import SALES_SYSTEM_PROMPT


class SalesAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="sales",
            system_prompt=SALES_SYSTEM_PROMPT,
            tool_names=["search_crm"],
        )
