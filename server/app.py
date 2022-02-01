from lib2to3.pytree import Base
from flask import Flask
from flask_cors import CORS
from apscheduler.schedulers.background import BackgroundScheduler
from config import BaseConfig
from db import initialize_db
from rest import initialize_api
from cronjobs.import_from_biosample import import_records
import os

app = Flask(__name__)
CORS(app)
app.config.from_object(BaseConfig)

initialize_db(app)

initialize_api(app)

PROJECTS=os.getenv('PROJECTS')
TIME= os.getenv('EXEC_TIME')
sched = BackgroundScheduler(daemon=True)
sched.add_job(import_records,"interval", [PROJECTS.split(',')], seconds=int(TIME))

sched.start()

if __name__ == '__main__':
    app.run(debug=True,host='0.0.0.0')