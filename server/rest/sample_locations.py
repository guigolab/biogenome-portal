from flask import Response, request
from flask_restful import Resource
from helpers.cache_key import cached_endpoint
from services import sample_locations
import json

_CACHE_TTL = 900


class SampleLocations(Resource):
    @cached_endpoint(timeout=_CACHE_TTL)
    def get(self):
        resp = sample_locations.get_sample_locations(request.args)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

    def post(self):
        data = request.json if request.is_json else request.form
        resp = sample_locations.post_sample_locations(data)
        return Response(json.dumps(resp), mimetype="application/json", status=200)


class UniqueLocations(Resource):
    @cached_endpoint(timeout=_CACHE_TTL)
    def get(self):
        resp = sample_locations.get_unique_sample_locations(request.args)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

    @cached_endpoint(timeout=_CACHE_TTL)
    def post(self):
        data = request.json if request.is_json else request.form
        resp = sample_locations.post_unique_sample_locations(data)
        return Response(json.dumps(resp), mimetype="application/json", status=200)


class OrganismsWithSampleLocations(Resource):
    """GET/POST same query params as GET /organisms plus polygon / has_sample_locations."""

    @cached_endpoint(timeout=_CACHE_TTL)
    def get(self):
        payload, mimetype = sample_locations.get_organisms_with_location_filters(
            request.args
        )
        return Response(payload, mimetype=mimetype, status=200)

    @cached_endpoint(timeout=_CACHE_TTL)
    def post(self):
        data = request.json if request.is_json else request.form
        payload, mimetype = sample_locations.get_organisms_with_location_filters(data)
        return Response(payload, mimetype=mimetype, status=200)


class LocationFromCoords(Resource):
    def get(self, coordinates):
        resp = sample_locations.get_locations_from_coordinates(coordinates)
        return Response(json.dumps(resp), mimetype="application/json", status=200)

class DownloadRelatedDataApi(Resource):
    def post(self):
        data = request.json if request.is_json else request.form
        resp, mimetype= sample_locations.get_related_data(data)
        return Response(resp, mimetype=mimetype, status=200)

class LookupRelatedData(Resource):
    def post(self):
        data = request.json if request.is_json else request.form
        resp = sample_locations.lookup_related_data(data)
        return Response(resp, mimetype="application/json", status=200)
    
class GetRelatedModelData(Resource):
    def post(self, model):
        data = request.json if request.is_json else request.form
        resp, mimetype = sample_locations.get_related_model_data(data, model)
        return Response(resp, mimetype=mimetype, status=200)
