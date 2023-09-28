from db.models import SampleCoordinates,Organism
import json
from shapely.geometry import shape, Point

def save_coordinates(saved_sample, id_field='accession'):
    print(f'SETTING LOCATION OF {saved_sample[id_field]} of {saved_sample.scientific_name}')
    
    sample_metadata = saved_sample.metadata
    lowered_keys_dict = {key.lower(): value for key, value in sample_metadata.items()}
    
    latitude, longitude = None, None
    
    # Helper function to convert coordinates with different formats
    def convert_coordinates(lat, lat_value, long, long_value):
        lat = '-' + lat if lat_value == 'S' else lat
        long = '-' + long if long_value == 'W' else long
        return lat, long
    
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
                    existing_coordinates.coordinates = [longitude,latitude]
                    existing_coordinates.save()
                else:
                    sample_coordinates_to_save = {
                        'sample_accession': saved_sample[id_field],
                        'taxid': saved_sample.taxid,
                        'coordinates': [longitude, latitude]
                    }
                    if id_field == 'local_id':
                        sample_coordinates_to_save['is_local_sample'] = True

                    SampleCoordinates(**sample_coordinates_to_save).save()
        except ValueError:
            print(f'Invalid latitude: {latitude} or longitude: {longitude} for sample: {saved_sample[id_field]}')


def update_countries_from_biosample(saved_biosample):
    # Collect information for all biosamples
    accession_country_map = {}
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
    country_polygons = [(shape(country['geometry']), country['id'], country['properties']['name']) for country in countries]

# Iterate through saved biosamples
    accession = saved_biosample.accession
    taxid = saved_biosample.taxid
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
        coordinates = SampleCoordinates.objects(sample_accession=accession).first()

        if coordinates:
            point = Point(coordinates.coordinates['coordinates'])
            for polygon, country_id in country_polygons:
                if polygon.contains(point):
                    country_to_add = country_id

    # Perform batch update for countries
    if country_to_add:
        Organism.objects(taxid=taxid).modify(add_to_set__countries=country_to_add)
