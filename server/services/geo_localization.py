
from db.models import GeoCoordinates,Geometry,BioProject,Organism
from flask import current_app as app
from utils.pipelines import GeoCoordinatesPipeline
import json
import os
# PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')
FEATURE_COLLECTION_OBJECT={
    'type': 'FeatureCollection',
    'crs': { "type": "name", "properties": { "name": "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    'features' : []
}   

def geo_localization_coordinates(bioproject=None, taxid=None):
    coordinates = list()
    if bioproject and bioproject != os.getenv('PROJECT_ACCESSION'):
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

def create_coordinates(sample,organism):
    ##parse coordinates
    coords = coordinate_parser(sample.metadata)

    if not coords:
        return
    sample.latitude = coords[0]
    sample.longitude = coords[1]
    sample.save()
    geo_loc = sample.latitude+':'+sample.longitude
    geo_obj = GeoCoordinates.objects(geo_location=geo_loc).first()
    if not geo_obj:
        geo_obj = GeoCoordinates(geo_location=geo_loc).save()
    geo_obj.modify(add_to_set__organisms=organism.taxid)
    organism.modify(add_to_set__coordinates=geo_obj.geo_location)
    sample_dict = json.loads(sample.to_json())
    if 'bioprojects' in sample_dict.keys():
        for project in sample.bioprojects:
            geo_obj.modify(add_to_set__bioprojects=project)
    if not geo_obj.geometry:
        geometry = Geometry(coordinates=[sample.longitude,sample.latitude])
        geo_obj.geometry = geometry
    geo_obj.save()

def coordinate_parser(sample_metadata):
    lowered_keys_dict = dict()
    for key in sample_metadata.keys():
        low_key = key.lower()
        lowered_keys_dict[low_key] = sample_metadata[key]

    if 'lat_lon' in sample_metadata.keys():
        values = sample_metadata['lat_lon'].split(' ')
        if len(values) == 4:
            lat,lat_value,long,long_value = values
            latitude = '-'+lat if lat_value == 'S' else lat
            longitude = '-'+long if long_value == 'W' else long
        else:
            return
    elif 'lat lon' in sample_metadata.keys():
        values = sample_metadata['lat lon'].split(' ')
        if len(values) == 4:
            lat,lat_value,long,long_value = values
            latitude = '-'+lat if lat_value == 'S' else lat
            longitude = '-'+long if long_value == 'W' else long
        else:
            return
    elif 'geographic location (latitude)' in sample_metadata.keys() and 'geographic location (longitude)' in sample_metadata.keys():
        latitude = str(sample_metadata['geographic location (latitude)'])
        longitude = str(sample_metadata['geographic location (longitude)'])
    elif 'latitude' in lowered_keys_dict and 'longitude' in lowered_keys_dict:
        latitude = str(lowered_keys_dict['latitude'])
        longitude  = str(lowered_keys_dict['longitude'])
    else:
        return
    if any(c.isdigit() for c in str(latitude)) and any(c.isdigit() for c in str(longitude)):
        return [latitude,longitude]
    else:
        return
