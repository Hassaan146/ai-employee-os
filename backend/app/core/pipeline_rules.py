# app/core/pipeline_rules.py

# Valid stages
VALID_STAGES = ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"]

# Konsi stage se kaunsi next stages allowed hain
ALLOWED_TRANSITIONS = {
    "new": ["contacted", "lost"],
    "contacted": ["qualified", "lost"],
    "qualified": ["proposal", "lost"],
    "proposal": ["negotiation", "lost"],
    "negotiation": ["won", "lost"],
    "won": [],   # final stage, koi aage transition nahi
    "lost": [],  # final stage, koi aage transition nahi
}


def is_valid_transition(current_stage: str, new_stage: str) -> bool:
    if new_stage not in VALID_STAGES:
        return False
    if current_stage == new_stage:
        return True  # same stage rehna allowed (e.g. sirf notes update karna)
    return new_stage in ALLOWED_TRANSITIONS.get(current_stage, [])
  