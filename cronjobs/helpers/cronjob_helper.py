from db.models import CronJob
from db.enums import CronJobStatus


def create_cronjob(cron_name):
    return CronJob(**dict(cronjob_type=cron_name, status=CronJobStatus.PENDING)).save()

def set_job(cron_name):
    cronjob = CronJob.objects(cronjob_type=cron_name).first()

    if cronjob:
        if cronjob.status == CronJobStatus.PENDING:
            print('Another job is running')
            return False
        else:
            cronjob.modify(status=CronJobStatus.PENDING)
            return True
    else:
        CronJob(cronjob_type=cron_name, status=CronJobStatus.PENDING).save()
        return True

def terminate_job(cron_name):
    CronJob.objects(cronjob_type=cron_name).update(status=CronJobStatus.DONE)