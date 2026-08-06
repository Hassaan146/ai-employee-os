from celery import Celery
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
)

celery_app.autodiscover_tasks(['app.tasks'])

@celery_app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')