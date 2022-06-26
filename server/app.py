from flask import Flask
from flask_cors import CORS
from config import BaseConfig
from db import initialize_db
from rest import initialize_api
from cronjobs.import_records import handle_tasks
from flask_jwt_extended import JWTManager


app = Flask(__name__)

CORS(app)
app.config.from_object(BaseConfig)

initialize_db(app)

initialize_api(app)

jwt = JWTManager(app)



handle_tasks()


# # if __name__ == '__main__':
#     app.run(debug=True,host='0.0.0.0')