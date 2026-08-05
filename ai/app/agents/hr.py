from agents.employee_base import BaseAgent
from prompts import HR_SYSTEM_PROMPT


class HRAgent(BaseAgent):
    def __init__(self):
        super().__init__(
            name="hr",
            system_prompt=HR_SYSTEM_PROMPT,
            tool_names=[],
        )
