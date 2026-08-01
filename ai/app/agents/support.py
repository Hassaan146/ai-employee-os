from agents.employee_base import BaseAgent
from prompts import SUPPORT_SYSTEM_PROMPT


class SupportAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="support",
            system_prompt=SUPPORT_SYSTEM_PROMPT,
            tool_names=["search_crm"],
        )