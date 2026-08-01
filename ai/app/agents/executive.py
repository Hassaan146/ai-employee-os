from agents.base import BaseAgent
from prompts import EXECUTIVE_SYSTEM_PROMPT


class ExecutiveAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="executive",
            system_prompt=EXECUTIVE_SYSTEM_PROMPT,
            tool_names=["search_crm"],
        )
