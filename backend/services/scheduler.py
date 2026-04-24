from apscheduler.schedulers.background import BackgroundScheduler

_scheduler = BackgroundScheduler()

def get_scheduler() -> BackgroundScheduler:
    return _scheduler
