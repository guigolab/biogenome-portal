from flask_restful import Resource
from flask import Response, request
from services import track
import json



class TrackApi(Resource):

    def post(self, accession):
        data = request.json if request.is_json else request.form

        new_annotation = annotation.create_annotation(data)
        if new_annotation:
            return Response(new_annotation.to_json(), mimetype="application/json", status=201)
