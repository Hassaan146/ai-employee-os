from agents.employee_base import BaseAgent
from prompts import SALES_SYSTEM_PROMPT


class SalesAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="sales",
            system_prompt=SALES_SYSTEM_PROMPT,
            tool_names=["search_crm", "generate_quotation"],
        )
