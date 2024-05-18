from db.models import Organism, BioSample, SampleCoordinates, LocalSample
from shapely.geometry import shape, Point
import os
import json


PROJECTS = os.getenv('PROJECTS')
COUNTRIES_PATH = './countries.json'
ROOT_NODE = os.getenv('ROOT_NODE')

def update_countries():
    ##update from biosample
    # Collect information for all biosamples
    accession_country_map = {}
    biosamples = BioSample.objects()
    for biosample in biosamples:
        geo_loc = biosample.metadata.get('geo_loc_name')
        if not geo_loc:
            geo_loc = biosample.metadata.get('geographic location (country and/or sea)')
        
        if geo_loc:
            if ':' in geo_loc or '|' in geo_loc:
                country_name = geo_loc.split(':')[0]
            else:
                country_name = geo_loc
            accession_country_map[biosample.accession] = country_name

    # Load country polygons from JSON
    with open(COUNTRIES_PATH) as f:
        countries = json.load(f)['features']

    # Create a spatial index for country polygons
    country_polygons = [(shape(country['geometry']), country['id'], country['properties']['name']) for country in countries]

    # Iterate through saved biosamples
    for biosample in biosamples:
        accession = biosample.accession
        taxid = biosample.taxid
        country_to_add = None

        # Check if the biosample has a country name
        if accession in accession_country_map:
            country_name_to_check = accession_country_map[accession]

            # Find matching countries by name or ID
            for country_poligon in country_polygons:
                polygon, country_id, country_name = country_poligon
                if country_name_to_check == country_name:
                    country_to_add = country_id

        # If no country names found, use spatial check
        if not country_to_add:
            sample_coords = SampleCoordinates.objects(sample_accession=accession).first()

            if sample_coords:
                lng, lat = sample_coords.coordinates['coordinates']
                point = Point(lng, lat)
                for polygon in country_polygons:
                    polygon, country_id, country_name = country_poligon
                    if polygon.contains(point):
                        country_to_add = country_id

        # Perform batch update for countries
        if country_to_add:
            print(f'Adding country {country_to_add} to organism {taxid}')
            Organism.objects(taxid=taxid).modify(add_to_set__countries=country_to_add)

def create_biosample_coordinates():
    biosamples = BioSample.objects()
    existing_coordinates = SampleCoordinates.objects().scalar('sample_accession')
    for biosample in biosamples:
        if biosample.accession in existing_coordinates:
            continue
        save_coordinates(biosample)

def create_local_sample_coordinates():
    local_samples = LocalSample.objects()
    existing_coordinates = SampleCoordinates.objects().scalar('sample_accession')
    for local_sample in local_samples:
        if local_sample.local_id in existing_coordinates:
            continue
        save_coordinates(local_sample,id_field='local_id')

def convert_coordinates(lat, lat_value, long, long_value):
    lat = '-' + lat if lat_value == 'S' else lat
    long = '-' + long if long_value == 'W' else long
    return lat, long

def save_coordinates(saved_sample, id_field='accession'):
    print(f'SETTING LOCATION OF {saved_sample[id_field]} of {saved_sample.scientific_name}')
    sample_metadata = saved_sample.metadata
    lowered_keys_dict = {key.lower(): value for key, value in sample_metadata.items()}
    
    latitude, longitude = None, None
    
    if 'lat_lon' in sample_metadata:
        values = sample_metadata['lat_lon'].split(' ')
        if len(values) == 4:
            lat, lat_value, long, long_value = values
            latitude, longitude = convert_coordinates(lat, lat_value, long, long_value)
    elif 'lat lon' in sample_metadata:
        values = sample_metadata['lat lon'].split(' ')
        if len(values) == 4:
            lat, lat_value, long, long_value = values
            latitude, longitude = convert_coordinates(lat, lat_value, long, long_value)
    elif 'geographic location (latitude)' in sample_metadata and 'geographic location (longitude)' in sample_metadata:
        latitude = str(sample_metadata['geographic location (latitude)'])
        longitude = str(sample_metadata['geographic location (longitude)'])
    elif 'latitude' in lowered_keys_dict and 'longitude' in lowered_keys_dict:
        latitude = str(lowered_keys_dict['latitude'])
        longitude = str(lowered_keys_dict['longitude'])
    elif 'decimal_latitude' in lowered_keys_dict and 'decimal_longitude' in lowered_keys_dict:
        latitude = str(lowered_keys_dict['decimal_latitude'])
        longitude = str(lowered_keys_dict['decimal_longitude'])
    
    if latitude and longitude:
        try:
            latitude = latitude.replace(',', '.').replace("'", ".")
            longitude = longitude.replace(',', '.').replace("'", ".")            
            lat, long = float(latitude), float(longitude)
           
            if -90.0 <= lat <= 90.0 and -180.0 <= long <= 180.0:
                # Replace ',' and "'" with '.' for better compatibility

                existing_coordinates = SampleCoordinates.objects(sample_accession=saved_sample[id_field]).first()
                if existing_coordinates:
                    existing_coordinates.coordinates = [long,lat]
                    existing_coordinates.save()
                else:
                    sample_coordinates_to_save = {
                        'sample_accession': saved_sample[id_field],
                        'taxid': saved_sample.taxid,
                        'scientific_name':saved_sample.scientific_name,
                        'coordinates': [long, lat]
                    }
                    if id_field == 'local_id':
                        sample_coordinates_to_save['is_local_sample'] = True

                    SampleCoordinates(**sample_coordinates_to_save).save()
        except ValueError:
            print(f'Invalid latitude: {latitude} or longitude: {longitude} for sample: {saved_sample[id_field]}')

