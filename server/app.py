from flask import Flask
from flask_cors import CORS
from config import BaseConfig
from rest import initialize_api
from flask_jwt_extended import JWTManager,get_jwt, create_access_token, get_jwt_identity, set_access_cookies
from db.models import BioGenomeUser, CronJob,Roles, Organism, GenomeAnnotation, Assembly, Experiment, BioSample, LocalSample, Read, TaxonNode, ComputedTree, Chromosome
from tendo.singleton import SingleInstance
from flask_mongoengine import MongoEngine
from datetime import datetime
from datetime import timedelta
from datetime import timezone
import os
from extensions import cache
from jobs import celery_init_app

app = Flask(__name__)



app.config.from_object(BaseConfig)
app.config["JWT_TOKEN_LOCATION"] = ["cookies"]

app.config.from_mapping(
    CELERY=dict(
        broker_url=BaseConfig.CELERY_BROKER_URL,
        result_backend=BaseConfig.CELERY_RESULT_BACKEND,
        task_ignore_result=True,
    ),
)
app.config["JWT_COOKIE_SAMESITE"] = "None"
app.config["JWT_COOKIE_SECURE"] = True
app.config["CORS_SUPPORTS_CREDENTIALS"] = True

db = MongoEngine()
app.logger.info("Initializing MongoDB")
db.init_app(app)

celery_app = celery_init_app(app)

cache.cache.init_app(app, config={"CACHE_TYPE": "SimpleCache", "CACHE_DEFAULT_TIMEOUT": 300}) 
initialize_api(app)

CORS(app)

jwt = JWTManager(app)



def drop_all():
    Organism.drop_collection()
    LocalSample.drop_collection()
    TaxonNode.drop_collection()
    Assembly.drop_collection()
    LocalSample.drop_collection()
    BioSample.drop_collection()
    Experiment.drop_collection()
    Read.drop_collection()
    Chromosome.drop_collection()
    ComputedTree.drop_collection()
    GenomeAnnotation.drop_collection()

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
    drop_all()

    ##create root user if does not exist
    user = BioGenomeUser.objects(name = username).first()
    if not user:
        BioGenomeUser(name = username, password = password, role= Roles.DATA_ADMIN).save()

    cronjobs = CronJob.objects().count()
    if cronjobs:
        CronJob.drop_collection()

except:
    pass
