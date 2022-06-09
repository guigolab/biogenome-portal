
from db.models import GeoCoordinates,Geometry
from flask import current_app as app
from utils.pipelines import GeoCoordinatesPipeline
import os
import json

# PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')
# FEATURE_COLLECTION_OBJECT={
#     'type': 'FeatureCollection',
#     'crs': {
#         'type': 'name',
#         'properties': {
#             'name': 'EPSG:3857'
#         }
#     },
#     'features' : []
# }   
# #TODO use post to ids retrieval
# def get_geoloc_by_ids(ids):
#     geo_objs = list(GeoCoordinates.objects(biosamples__in=ids).aggregate(*GeoCoordinatesPipeline))
#     FEATURE_COLLECTION_OBJECT['features'] = geo_objs
#     return FEATURE_COLLECTION_OBJECT

# def geoloc_samples(bioproject=None):
#     if not bioproject or bioproject == PROJECT_ACCESSION:
#         geo_objs = list(GeoCoordinates.objects.aggregate(*GeoCoordinatesPipeline))
#     else:
#         sample_ids = SecondaryOrganism.objects(bioprojects=bioproject,sample_derived_from=None).scalar('id')
#         geo_objs = list(GeoCoordinates.objects(biosamples__in=sample_ids).aggregate(*GeoCoordinatesPipeline))
#     if geo_objs:
#         FEATURE_COLLECTION_OBJECT['features'] = geo_objs
#         return FEATURE_COLLECTION_OBJECT

def get_or_create_coordinates(sample):
    ##parse coordinates
    if 'lat_lon' in sample.metadata.keys():
        values = sample.metadata['lat_lon'].split(' ')
        if len(values) == 4:
            lat,lat_value,long,long_value = values
            sample.latitude = '-'+lat if lat_value == 'S' else lat
            sample.longitude = '-'+long if long_value == 'W' else long 
            sample.save()
    elif 'geographic_location_latitude' in sample.metadata.keys():
        sample.latitude = sample.metadata['geographic_location_latitude']
        sample.longitude = sample.metadata['geographic_location_longitude']
        sample.save()
    if not sample.latitude or not sample.longitude:
        return
    if any(c.isdigit() for c in sample.latitude) and any(c.isdigit() for c in sample.longitude):
        geo_loc = lat+' '+long
        geo_obj = GeoCoordinates.objects(geo_location=geo_loc).first()
        if not geo_obj:
            geo_obj = GeoCoordinates(geo_location=geo_loc).save()
        geo_obj.modify(add_to_set__species=sample.scientific_name)
        for project in sample.bioprojects:
            geo_obj.modify(add_to_set__bioprojects=project)
        if not geo_obj.geometry:
            geometry = Geometry(coordinates=[sample.longitude,sample.latitude])
            geo_obj.geometry = geometry
        geo_obj.save()