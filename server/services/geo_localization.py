
from db.models import GeoCoordinates,Geometry,BioProject,Organism
from flask import current_app as app
from utils.pipelines import GeoCoordinatesPipeline
import os
import json

# PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')
FEATURE_COLLECTION_OBJECT={
    'type': 'FeatureCollection',
    'crs': { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    'features' : []
}   

def geo_localization_coordinates(bioproject=None, taxid=None):
    coordinates = list()
    if bioproject:
        coord_model = json.loads(GeoCoordinates.objects(bioprojects = bioproject).to_json())
    else:
        coord_model = json.loads(GeoCoordinates.objects().to_json())
    for coord in coord_model:
        organisms = json.loads(Organism.objects(taxid__in=coord['organisms']).to_json())                
        species = [dict(taxid=org['taxid'], scientific_name=org['scientific_name']) for org in organisms]
        props = dict(organisms=species,name=coord['geo_location'])
        coord['properties'] = props
        coordinates.append(coord)
    FEATURE_COLLECTION_OBJECT['features'] = coordinates
    return FEATURE_COLLECTION_OBJECT

def geo_localization_object(coordinates):
    ##expects lat:long format
    geo_loc_obj = json.loads(GeoCoordinates.objects(geo_location=coordinates).first().to_json())
    ##get full organism objects
    geo_loc_obj['organisms'] = json.loads(Organism.objects(taxid__in=geo_loc_obj['organisms']).to_json())
    return geo_loc_obj

def get_or_create_coordinates(sample,organism):
    ##parse coordinates
    if 'lat_lon' in sample.metadata.keys():
        values = sample.metadata['lat_lon'].split(' ')
        if len(values) == 4:
            lat,lat_value,long,long_value = values
            sample.latitude = '-'+lat if lat_value == 'S' else lat
            sample.longitude = '-'+long if long_value == 'W' else long 
            sample.save()
    elif 'geographic location (latitude)' in sample.metadata.keys():
        sample.latitude = sample.metadata['geographic location (latitude)']
        sample.longitude = sample.metadata['geographic location (longitude)']
        sample.save()
    if not sample.latitude or not sample.longitude:
        return
    if any(c.isdigit() for c in sample.latitude) and any(c.isdigit() for c in sample.longitude):
        geo_loc = sample.latitude+':'+sample.longitude
        geo_obj = GeoCoordinates.objects(geo_location=geo_loc).first()
        if not geo_obj:
            geo_obj = GeoCoordinates(geo_location=geo_loc).save()
        geo_obj.modify(add_to_set__organisms=organism.taxid)
        organism.modify(add_to_set__coordinates=geo_obj.geo_location)
        for project in sample.bioprojects:
            geo_obj.modify(add_to_set__bioprojects=project)
        if not geo_obj.geometry:
            geometry = Geometry(coordinates=[sample.longitude,sample.latitude])
            geo_obj.geometry = geometry
        geo_obj.save()