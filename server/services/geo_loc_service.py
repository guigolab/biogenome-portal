
from db.models import GeoCoordinates,Geometry,SecondaryOrganism
from flask import current_app as app
from utils.pipelines import GeoCoordinatesPipeline
import os
import json
PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')
FEATURE_COLLECTION_OBJECT={
    'type': 'FeatureCollection',
    'crs': {
        'type': 'name',
        'properties': {
            'name': 'EPSG:3857'
        }
    },
    'features' : []
}   
#TODO use post to ids retrieval
def get_geoloc_by_ids(ids):
    geo_objs = list(GeoCoordinates.objects(biosamples__in=ids).aggregate(*GeoCoordinatesPipeline))
    FEATURE_COLLECTION_OBJECT['features'] = geo_objs
    return FEATURE_COLLECTION_OBJECT

def geoloc_samples(bioproject=None):
    if not bioproject or bioproject == PROJECT_ACCESSION:
        geo_objs = list(GeoCoordinates.objects.aggregate(*GeoCoordinatesPipeline))
    else:
        sample_ids = SecondaryOrganism.objects(bioprojects=bioproject,sample_derived_from=None).scalar('id')
        geo_objs = list(GeoCoordinates.objects(biosamples__in=sample_ids).aggregate(*GeoCoordinatesPipeline))
    if geo_objs:
        FEATURE_COLLECTION_OBJECT['features'] = geo_objs
        return FEATURE_COLLECTION_OBJECT

def get_or_create_coordinates(sample):
    if not sample.geographic_location_latitude or not sample.geographic_location_longitude:
        return
    lat = sample['geographic_location_latitude']
    long = sample['geographic_location_longitude']
    if any(c.isdigit() for c in lat) and any(c.isdigit() for c in long):
        geo_loc = lat+long
        geo_object = GeoCoordinates.objects(geo_loc=geo_loc).first() if GeoCoordinates.objects(geo_loc=geo_loc).first() else GeoCoordinates(geo_loc=geo_loc)
        if sample.id in geo_object.biosamples:
            return
        geo_object.biosamples.append(sample)
        if not geo_object.geometry:
            geometry = Geometry(coordinates=[long,lat])
            geo_object.geometry = geometry
        geo_object.save()