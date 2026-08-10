"""Day9 Audit Logs test (Member 3: Enterprise Audit Log endpoints).

Exercises /api/v1/audit-logs end-to-end against an isolated in-memory DB:
register -> login (success + failure) -> AI tool execution -> then verifies
list / filters / stats / detail / tenant isolation.

Run from backend/:
    venv/Scripts/python.exe test_day9_audit.py
"""
import uuid

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
import app.models  # noqa

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
S = sessionmaker(bind=engine)
Base.metadata.create_all(bind=engine)


def ov():
    db = S()
    try:
        yield db
    finally:
        db.close()


from app.main import app  # noqa
app.dependency_overrides[get_db] = ov
client = TestClient(app)
P, F = 0, 0


def check(label, cond, detail=""):
    global P, F
    cond = bool(cond)
    P += int(cond); F += int(not cond)
    print(f"  [{'PASS' if cond else 'FAIL'}] {label}" + (f" -> {detail}" if not cond else ""))


def section(t):
    print(f"\n=== {t} ===")


def reg(prefix):
    e = f"{prefix}_{uuid.uuid4().hex[:8]}@c.com"
    r = client.post("/api/v1/auth/register", json={"email": e, "password": "Secret123!", "full_name": "A", "company_name": "ACo"})
    return {"Authorization": f"Bearer {r.json()['access_token']}"}, e


def login(email, password):
    return client.post("/api/v1/auth/login", data={"username": email, "password": password})


section("AUTH AUDIT (register + login)")
h, email = reg("u1")
check("register returns token", bool(h.get("Authorization")))

r = login(email, "Secret123!")
check("login success", r.status_code == 200)

r = login(email, "WrongPass!")
check("failed login rejected", r.status_code == 401)

r = client.get("/api/v1/audit-logs", headers=h)
logs = r.json()
check("list returns entries", r.status_code == 200 and len(logs) >= 3, f"{r.status_code} {logs}")
actions = [l["action"] for l in logs]
check("register action logged", "register" in actions, f"{actions}")
login_logs = [l for l in logs if l["action"] == "login"]
check("login success logged", any(l.get("status") == "success" for l in login_logs), f"{login_logs}")
check("login failure logged", any(l.get("status") == "failure" for l in login_logs), f"{login_logs}")
check("failure has reason", any((l.get("details") or {}).get("reason") == "invalid_credentials" for l in logs), f"{logs}")
check("entries have actor_name", all(l.get("actor_name") == email for l in logs), f"{logs}")

section("FILTERS")
r = client.get("/api/v1/audit-logs", headers=h, params={"action": "login"})
check("filter action=login -> 2", len(r.json()) == 2 and all(l["action"] == "login" for l in r.json()), f"{r.json()}")

r = client.get("/api/v1/audit-logs", headers=h, params={"status": "failure"})
check("filter status=failure -> 1", len(r.json()) == 1 and r.json()[0]["status"] == "failure", f"{r.json()}")

r = client.get("/api/v1/audit-logs", headers=h, params={"actor_type": "user"})
check("filter actor_type=user", all(l["actor_type"] == "user" for l in r.json()) and len(r.json()) == 3, f"{r.json()}")

r = client.get("/api/v1/audit-logs", headers=h, params={"search": "register"})
check("search 'register' -> 1", len(r.json()) == 1 and r.json()[0]["action"] == "register", f"{r.json()}")

section("STATS")
r = client.get("/api/v1/audit-logs/stats", headers=h)
st = r.json()
check("stats total == 3", st.get("total") == 3, f"{st}")
check("stats success == 2", st.get("success_count") == 2, f"{st}")
check("stats failure == 1", st.get("failure_count") == 1, f"{st}")
check("stats success_rate == 0.6667", st.get("success_rate") == 0.6667, f"{st}")
check("stats by_action.login == 2", st.get("by_action", {}).get("login") == 2, f"{st.get('by_action')}")
check("stats by_actor_type.user == 3", st.get("by_actor_type", {}).get("user") == 3, f"{st.get('by_actor_type')}")

section("AI TOOL AUDIT")
r = client.post("/api/v1/ai-tools-test/create_customer", headers=h, json={"name": "Acme", "email": "acme@biz.com"})
res = r.json()
check("create_customer success", res.get("success") is True, f"{res}")
cid = res.get("result", {}).get("id")

r = client.get("/api/v1/audit-logs", headers=h, params={"action": "execute_tool"})
tool_logs = r.json()
check("AI tool logged", len(tool_logs) >= 1, f"{tool_logs}")
tl = tool_logs[0]
check("AI actor_type=ai", tl.get("actor_type") == "ai", f"{tl}")
check("AI actor_name=tool", tl.get("actor_name") == "create_customer", f"{tl}")
check("AI resource_id -> created record", tl.get("resource_id") == cid and cid is not None, f"{tl}")
check("AI details has params + requester", tl.get("details", {}).get("params", {}).get("name") == "Acme"
      and tl.get("details", {}).get("requested_by"), f"{tl.get('details')}")

r = client.post("/api/v1/ai-tools-test/nope", headers=h, json={})
check("unknown tool -> failure", r.json().get("success") is False)
r = client.get("/api/v1/audit-logs", headers=h, params={"action": "execute_tool", "status": "failure"})
check("unknown tool audited as failure", any(l["resource_id"] == "nope" for l in r.json()), f"{r.json()}")

r = client.get("/api/v1/audit-logs", headers=h, params={"actor_type": "ai"})
check("filter actor_type=ai", all(l["actor_type"] == "ai" for l in r.json()) and len(r.json()) == 2, f"{r.json()}")

section("DETAIL + 404")
first_id = client.get("/api/v1/audit-logs", headers=h).json()[0]["id"]
r = client.get(f"/api/v1/audit-logs/{first_id}", headers=h)
check("detail returns entry", r.status_code == 200 and r.json()["id"] == first_id, f"{r.status_code}")
r = client.get("/api/v1/audit-logs/00000000-0000-0000-0000-000000000000", headers=h)
check("unknown id -> 404", r.status_code == 404)
r = client.get("/api/v1/audit-logs/not-a-uuid", headers=h)
check("malformed id -> 404", r.status_code == 404)

section("TENANT ISOLATION")
h2, _ = reg("u2")
r = client.get("/api/v1/audit-logs", headers=h2)
j = r.json()
check("company2 sees only its own register log", len(j) == 1 and j[0]["action"] == "register", f"{j}")

app.dependency_overrides.clear()
print(f"\nTOTAL: {P} passed, {F} failed")
raise SystemExit(1 if F else 0)
