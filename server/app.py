from flask import Flask
from flask_cors import CORS
from config import BaseConfig
from db import initialize_db
from rest import initialize_api
from flask_jwt_extended import JWTManager
from db.models import BioGenomeUser, CronJob,Roles
from services import bioproject_service
from tendo.singleton import SingleInstance

import os


app = Flask(__name__)

CORS(app)
app.config.from_object(BaseConfig)
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]

# If true this will only allow the cookies that contain your JWTs to be sent
# over https. In production, this should always be set to True
app.config["JWT_COOKIE_SECURE"] = True
initialize_db(app)

initialize_api(app)

jwt = JWTManager(app)

username = os.getenv('DB_USER')
password = os.getenv('DB_PASS')
bioproject_accession = os.getenv('PROJECT_ACCESSION')

##create root user if does not exist
try:
    FIRST_START = SingleInstance()
    user = BioGenomeUser.objects(name = username).first()
    if not user:
        BioGenomeUser(name = username, password = password, role= Roles.DATA_ADMIN).save()
    if bioproject_accession:
        bioproject_service.create_bioproject_from_ENA(bioproject_accession)
    cronjob = CronJob.drop_collection() ##remove all cronjobs at each start

except:
    pass

# # if __name__ == '__main__':
#     app.run(debug=True,host='0.0.0.0')