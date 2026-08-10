import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import Optional
from app.core.config import settings

def send_email_smtp(
    to_email: str,
    subject: str,
    body_html: str,
    pdf_bytes: Optional[bytes] = None,
    pdf_filename: Optional[str] = None
) -> dict:
    """Sends an HTML email with optional PDF attachment via SMTP (Gmail).

    If SMTP credentials are not configured in settings, runs in safe mock dispatch mode.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        # Mock/Development Dispatch Mode
        print(f"[MOCK EMAIL DISPATCH] To: {to_email} | Subject: {subject} | PDF Attachment: {pdf_filename or 'None'}")
        return {
            "status": "success",
            "mode": "mock",
            "message": f"Email successfully queued/mock dispatched to {to_email}"
        }

    try:
        msg = MIMEMultipart()
        msg["From"] = f"{settings.EMAILS_FROM_NAME} <{settings.EMAILS_FROM_EMAIL or settings.SMTP_USER}>"
        msg["To"] = to_email
        msg["Subject"] = subject

        # Attach HTML body
        msg.attach(MIMEText(body_html, "html"))

        # Attach PDF file if provided
        if pdf_bytes and pdf_filename:
            part = MIMEApplication(pdf_bytes, Name=pdf_filename)
            part['Content-Disposition'] = f'attachment; filename="{pdf_filename}"'
            msg.attach(part)

        # Send via TLS/SMTP
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
            server.starttls()
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
            server.sendmail(settings.SMTP_USER, [to_email], msg.as_string())

        return {
            "status": "success",
            "mode": "live",
            "message": f"Email sent successfully to {to_email}"
        }
    except Exception as e:
        return {
            "status": "error",
            "mode": "failed",
            "message": f"SMTP dispatch error: {str(e)}"
        }

def build_invoice_email_html(invoice, customer, company_name: str = "") -> str:
    c_name = company_name or "AI Employee OS"
    cust_name = customer.name if customer else "Valued Customer"
    due_str = invoice.due_date.strftime("%B %d, %Y") if hasattr(invoice, "due_date") and invoice.due_date else "Upon Receipt"

    return f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1f4e79; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">{c_name}</h2>
          <p style="margin: 5px 0 0 0;">Invoice #{invoice.invoice_number}</p>
        </div>
        <div style="border: 1px solid #dddddd; padding: 20px; border-radius: 0 0 8px 8px; background-color: #ffffff;">
          <p>Dear <strong>{cust_name}</strong>,</p>
          <p>Thank you for your business! Please find attached invoice <strong>#{invoice.invoice_number}</strong> for <strong>{invoice.total_amount:.2f} {invoice.currency}</strong>.</p>
          <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #1f4e79; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Invoice Summary:</strong></p>
            <p style="margin: 4px 0;">Invoice Number: {invoice.invoice_number}</p>
            <p style="margin: 4px 0;">Due Date: {due_str}</p>
            <p style="margin: 4px 0;">Total Amount: {invoice.total_amount:.2f} {invoice.currency}</p>
            <p style="margin: 4px 0;">Status: {invoice.status.value if hasattr(invoice.status, "value") else invoice.status}</p>
          </div>
          <p>The invoice PDF is attached directly to this email for your records.</p>
          <p>Best regards,<br/><strong>{c_name} Team</strong></p>
        </div>
      </body>
    </html>
    """

def build_quotation_email_html(quotation, customer, company_name: str = "") -> str:
    c_name = company_name or "AI Employee OS"
    cust_name = customer.name if customer else "Valued Customer"
    valid_str = quotation.valid_until.strftime("%B %d, %Y") if hasattr(quotation, "valid_until") and quotation.valid_until else "30 Days"

    return f"""
    <html>
      <body style="font-family: Arial, sans-serif; color: #333; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #2e7d32; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h2 style="margin: 0;">{c_name}</h2>
          <p style="margin: 5px 0 0 0;">Quotation #{quotation.quotation_number}</p>
        </div>
        <div style="border: 1px solid #dddddd; padding: 20px; border-radius: 0 0 8px 8px; background-color: #ffffff;">
          <p>Dear <strong>{cust_name}</strong>,</p>
          <p>We are pleased to present our official quotation <strong>#{quotation.quotation_number}</strong> for your review.</p>
          <div style="background-color: #f4f8f4; padding: 15px; border-left: 4px solid #2e7d32; margin: 20px 0;">
            <p style="margin: 0 0 8px 0;"><strong>Quotation Summary:</strong></p>
            <p style="margin: 4px 0;">Quotation Number: {quotation.quotation_number}</p>
            <p style="margin: 4px 0;">Valid Until: {valid_str}</p>
            <p style="margin: 4px 0;">Total Estimate: {quotation.total_amount:.2f} {quotation.currency}</p>
          </div>
          <p>The detailed quotation PDF is attached to this email. Please feel free to reply directly to approve or request changes.</p>
          <p>Best regards,<br/><strong>{c_name} Team</strong></p>
        </div>
      </body>
    </html>
    """
