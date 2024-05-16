from flask import Flask
from flask_cors import CORS
from config import BaseConfig
from rest import initialize_api
from flask_jwt_extended import JWTManager,get_jwt, create_access_token, get_jwt_identity, set_access_cookies
from db.models import BioGenomeUser, CronJob,Roles
from tendo.singleton import SingleInstance
from flask_mongoengine import MongoEngine
from datetime import datetime
from datetime import timedelta
from datetime import timezone
import os
from rest.utils import extensions

app = Flask(__name__)



app.config.from_object(BaseConfig)
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]


app.config["JWT_COOKIE_SAMESITE"] = "None"
app.config["JWT_COOKIE_SECURE"] = True
app.config["CORS_SUPPORTS_CREDENTIALS"] = True

db = MongoEngine()
app.logger.info("Initializing MongoDB")
db.init_app(app)

extensions.cache.init_app(app, config={"CACHE_TYPE": "SimpleCache", "CACHE_DEFAULT_TIMEOUT": 300}) 
initialize_api(app)

CORS(app)

jwt = JWTManager(app)


@app.after_request
def refresh_expiring_jwts(response):
    try:
        claims = get_jwt()
        now = datetime.now(timezone.utc)
        target_timestamp = datetime.timestamp(now + timedelta(minutes=10))
        if target_timestamp > claims['exp']:
            username = claims.get('username')
            user_obj = BioGenomeUser.objects(name=username).first()
            if user_obj:
                access_token = create_access_token(identity=get_jwt_identity(),additional_claims={"role": user_obj.role.value, "username":user_obj.name})
                set_access_cookies(response, access_token)
        return response
    except (RuntimeError, KeyError):
        # Case where there is not a valid JWT. Just return the original response
        return response

username = os.getenv('DB_USER')
password = os.getenv('DB_PASS')

try:
    FIRST_START = SingleInstance()

    ##create root user if does not exist
    user = BioGenomeUser.objects(name = username).first()
    if not user:
        BioGenomeUser(name = username, password = password, role= Roles.DATA_ADMIN).save()

    cronjobs = CronJob.objects().count()
    if cronjobs:
        CronJob.drop_collection()

except:
    pass
