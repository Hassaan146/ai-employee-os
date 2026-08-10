from celery import Celery
from celery.schedules import crontab
from app.core.config import settings

celery_app = Celery(
    "ai_employee_os",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    beat_schedule={
        "process-due-date-reminders-daily": {
            "task": "process_due_date_reminders_task",
            "schedule": crontab(hour=0, minute=0),  # Runs daily at midnight
        },
        "generate-recurring-invoices-daily": {
            "task": "generate_recurring_invoices_task",
            "schedule": crontab(hour=1, minute=0),  # Runs daily at 1 AM
        },
    }
)

celery_app.autodiscover_tasks(['app.tasks'])

@celery_app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')