from agents.employee_base import BaseAgent
from prompts import FINANCE_SYSTEM_PROMPT


class FinanceAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="finance",
            system_prompt=FINANCE_SYSTEM_PROMPT,
            tool_names=["search_crm"],
        )
