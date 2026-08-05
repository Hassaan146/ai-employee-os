"""
Calendar Tool
--------------
create_meeting(title, attendee_email, date, time) -> dict

Currently mocked — logs the meeting instead of actually creating a
real calendar event (Google Calendar / Outlook API etc). Swap the
inside of the function later — the signature stays the same.
"""

CALENDAR_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "create_meeting",
        "description": "Schedule a meeting with a customer or contact.",
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "Meeting title/subject.",
                },
                "attendee_email": {
                    "type": "string",
                    "description": "Email address of the person to invite.",
                },
                "date": {
                    "type": "string",
                    "description": "Meeting date, e.g. '2026-08-07' or 'Friday'.",
                },
                "time": {
                    "type": "string",
                    "description": "Meeting time, e.g. '3:00 PM'.",
                },
            },
            "required": ["title", "attendee_email", "date", "time"],
        },
    },
}

SCHEDULED_MEETINGS_LOG = []


def create_meeting(title: str, attendee_email: str, date: str, time: str) -> dict:
    """
    Mocked meeting creation. Logs the meeting instead of creating a
    real calendar event.

    Returns a dict confirming the (simulated) booking, or an error
    if the email looks invalid/placeholder.
    """
    if "@" not in attendee_email or "." not in attendee_email or "[" in attendee_email:
        return {
            "success": False,
            "error": f"'{attendee_email}' is not a valid email address. "
                     "Use the actual email value from a previous search_crm result, "
                     "not a placeholder or description.",
        }

    record = {
        "title": title,
        "attendee_email": attendee_email,
        "date": date,
        "time": time,
        "status": "scheduled",
    }
    SCHEDULED_MEETINGS_LOG.append(record)

    print(f"[MOCK CALENDAR] '{title}' with {attendee_email} on {date} at {time}")

    return {
        "success": True,
        "message": f"Meeting '{title}' scheduled with {attendee_email} on {date} at {time}.",
    }