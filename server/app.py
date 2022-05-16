from flask import Flask
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from config import BaseConfig
from db import initialize_db
from rest import initialize_api
from datetime import datetime,timedelta
from cronjobs.import_records import import_records
import os
from flask_jwt_extended import JWTManager

from flask_apscheduler import APScheduler

app = Flask(__name__)

CORS(app)
app.config.from_object(BaseConfig)

initialize_db(app)

initialize_api(app)

jwt = JWTManager(app)

TIME= os.getenv('EXEC_TIME')
if os.getenv('PROJECTS') or os.getenv('PROJECT_ACCESSION'):
    PROJECTS = os.getenv('PROJECTS').split(',')
    sched = BackgroundScheduler(daemon=True)
    sched.add_job(import_records, "interval", id="interval-job", start_date=datetime.now()+timedelta(seconds=20),seconds=int(TIME))
    sched.start()

# # if __name__ == '__main__':
#     app.run(debug=True,host='0.0.0.0')