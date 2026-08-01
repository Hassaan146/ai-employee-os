"""
AGENTS registry — the interface Member 1 imports and calls.

All 5 AI employees are registered here.
"""

from agents.sales import SalesAgent
from agents.support import SupportAgent
from agents.finance import FinanceAgent
from agents.hr import HRAgent
from agents.executive import ExecutiveAgent

AGENTS = {
    "sales": SalesAgent(),
    "support": SupportAgent(),
    "finance": FinanceAgent(),
    "hr": HRAgent(),
    "executive": ExecutiveAgent(),
}

__all__ = ["AGENTS"]
