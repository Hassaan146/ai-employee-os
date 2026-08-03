"""
Email Tool
----------
send_email(to, subject, body) -> dict

Currently mocked — logs/prints the email instead of actually sending
it, so agents work immediately without needing real email credentials
(SMTP, Gmail API, etc). Swap the inside of the function for a real
email API call later — the function signature stays the same.
"""

EMAIL_TOOL_SCHEMA = {
    "type": "function",
    "function": {
        "name": "send_email",
        "description": "Send an email to a customer or contact.",
        "parameters": {
            "type": "object",
            "properties": {
                "to": {
                    "type": "string",
                    "description": "Recipient's email address.",
                },
                "subject": {
                    "type": "string",
                    "description": "Email subject line.",
                },
                "body": {
                    "type": "string",
                    "description": "Email body text.",
                },
            },
            "required": ["to", "subject", "body"],
        },
    },
}

# Keeps a record of "sent" emails during this run — useful for demos
# and for tests to confirm the tool was actually called correctly.
SENT_EMAILS_LOG = []


def send_email(to: str, subject: str, body: str) -> dict:
    """
    Mocked email send. Logs the email instead of actually sending it.

    Returns a dict confirming the (simulated) send.
    """
    record = {"to": to, "subject": subject, "body": body, "status": "sent"}
    SENT_EMAILS_LOG.append(record)

    print(f"[MOCK EMAIL] To: {to} | Subject: {subject}")
    print(f"[MOCK EMAIL] Body: {body}")

    return {
        "success": True,
        "message": f"Email sent to {to} with subject '{subject}'.",
    }
