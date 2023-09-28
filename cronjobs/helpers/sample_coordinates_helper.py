from db.models import SampleCoordinates,Organism
from . import utils 
from shapely.geometry import shape, Point
import json

# Helper function to convert coordinates with different formats
def convert_coordinates(lat, lat_value, long, long_value):
    lat = '-' + lat if lat_value == 'S' else lat
    long = '-' + long if long_value == 'W' else long
    return lat, long

def parse_coordinates(saved_sample):
    print(f'SETTING LOCATION OF {saved_sample.accession} of {saved_sample.scientific_name}')
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
            # Check if latitude and longitude are valid numbers
            lat, long = float(latitude), float(longitude)
            if -90.0 <= lat <= 90.0 and -180.0 <= long <= 180.0:
                # Replace ',' and "'" with '.' for better compatibility
                latitude = latitude.replace(',', '.').replace("'", ".")
                longitude = longitude.replace(',', '.').replace("'", ".")
                
                sample_coordinates_to_save = {
                    'sample_accession': saved_sample.accession,
                    'scientific_name':saved_sample.scientific_name,
                    'taxid': saved_sample.taxid,
                    'coordinates': [long, lat]
                }
                
                return SampleCoordinates(**sample_coordinates_to_save)
        except ValueError:
            print(f'Invalid latitude: {latitude} or longitude: {longitude} for sample: {saved_sample.accession}')
    print(f'No coordinates for sample {saved_sample.accession}')
    return None

def create_coordinates_from_saved_biosamples(new_biosamples):
    coordinates_to_save=[]
    for new_biosample in new_biosamples:
        new_coordinates_object = parse_coordinates(new_biosample)
        if not new_coordinates_object:
            continue
        coordinates_to_save.append(new_coordinates_object)
    if not coordinates_to_save:
        print('No coordinates to save')
    print(f'Saving a total of {len(coordinates_to_save)} coordinates')
    utils.insert_data(SampleCoordinates,coordinates_to_save)
    

def update_countries_from_biosamples(saved_biosamples):
    # Collect information for all biosamples
    accession_country_map = {}
    for saved_biosample in saved_biosamples:
        geo_loc = saved_biosample.metadata.get('geo_loc_name')
        if not geo_loc:
            geo_loc = saved_biosample.metadata.get('geographic location (country and/or sea)')
        
        if geo_loc:
            if ':' in geo_loc or '|' in geo_loc:
                country_name = geo_loc.split(':')[0]
            else:
                country_name = geo_loc
            accession_country_map[saved_biosample.accession] = country_name

    # Load country polygons from JSON
    with open('./countries.json') as f:
        countries = json.load(f)['features']

    # Create a spatial index for country polygons
    country_polygons = [(shape(country['geometry']), country['property']['id']) for country in countries]

    # Iterate through saved biosamples
    for saved_biosample in saved_biosamples:
        accession = saved_biosample.accession
        taxid = saved_biosample.taxid
        country_to_add = None

        # Check if the biosample has a country name
        if accession in accession_country_map:
            country_names = accession_country_map[accession]

            # Find matching countries by name or ID
            for country_name in country_names:
                for polygon, country_id in country_polygons:
                    if country_name == country_id:
                        country_to_add = country_id

        # If no country names found, use spatial check
        if not country_to_add:
            coordinates = SampleCoordinates.objects(sample_accession=accession).first()

            if coordinates:
                point = Point(coordinates['coordinates'])
                for polygon, country_id in country_polygons:
                    if polygon.contains(point):
                        country_to_add = country_id

        # Perform batch update for countries
        if country_to_add:
            print(f'Adding country {country_to_add} to organism {taxid}')
            Organism.objects(taxid=taxid).modify(add_to_set__countries=country_to_add)
