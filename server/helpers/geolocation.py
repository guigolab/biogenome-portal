from db.models import Organism,SampleCoordinates
import json
from shapely.geometry import shape, Point
from mongoengine.queryset.visitor import Q

    # Helper function to convert coordinates with different formats
def convert_coordinates(lat, lat_value, long, long_value):
    lat = '-' + lat if lat_value == 'S' else lat
    long = '-' + long if long_value == 'W' else long
    return lat, long

def save_coordinates(saved_sample, id_field='accession'):
    sample_metadata = saved_sample.metadata
    lowered_keys_dict = {key.lower(): value for key, value in sample_metadata.items()}
    
    latitude, longitude = None, None
    
    for k,v in lowered_keys_dict.items():

        if k == 'lat_lon' or k == 'lat lon':
            values = v.split(' ')

            if len(values) == 4:
                lat, lat_value, long, long_value = values
                latitude, longitude = convert_coordinates(lat, lat_value, long, long_value)

        elif 'latitude' in k:
            latitude = v
        elif 'longitude' in k:
            longitude = v
        elif k == 'lat':
            latitude = v
        elif k == 'lon' or k == 'long':
            longitude = v
            
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
                    organism = Organism.objects(taxid=saved_sample.taxid).first()
                    sample_coordinates_to_save['lineage'] = organism.taxon_lineage
                    SampleCoordinates(**sample_coordinates_to_save).save()
        except ValueError:
            print(f'Invalid latitude: {latitude} or longitude: {longitude} for sample: {saved_sample[id_field]}')


def update_countries_from_biosample(saved_biosample, sample_id):
    # Collect information for all biosamples
    accession_country_map = {}

    geo_loc = None
    for attr in saved_biosample.metadata:
        if attr.lower() == 'geo_loc_name' or 'country' == attr.lower() or 'country' in attr.lower():
            geo_loc = saved_biosample.metadata.get(attr)

    if geo_loc:
        if ':' in geo_loc or '|' in geo_loc:
            country_name = geo_loc.split(':')[0]
        else:
            country_name = geo_loc
        accession_country_map[sample_id] = country_name.strip()

    # Load country polygons from JSON
    with open('./countries.json') as f:
        countries = json.load(f)['features']

    # Create a spatial index for country polygons
    country_polygons = [(shape(country['geometry']), country['id'], country['properties']['name']) for country in countries]

# Iterate through saved biosamples
    taxid = saved_biosample.taxid
    country_to_add = None


    # Check if the biosample has a country name
    if sample_id in accession_country_map:
        country_name_to_check = accession_country_map[sample_id]

        # Find matching countries by name or ID
        for country_poligon in country_polygons:
            polygon, country_id, country_name = country_poligon
            if country_name_to_check == country_name:
                country_to_add = country_id

    # If no country names found, use spatial check
    if not country_to_add:
        coordinates = SampleCoordinates.objects(sample_accession=sample_id).first()

        if coordinates:
            point = Point(coordinates.coordinates['coordinates'])
            for country_poligon in country_polygons:
                polygon, country_id, country_name = country_poligon
                if polygon.contains(point):
                    country_to_add = country_id

    # Perform batch update for countries
    if country_to_add:
        Organism.objects(taxid=taxid).modify(add_to_set__countries=country_to_add)


def add_image(taxid, image):
    coordinates = SampleCoordinates.objects(taxid=taxid)
    if len(coordinates) > 0:
        SampleCoordinates.objects(taxid=taxid).update(image=image)


def create_query(data):
    print(data)
    query = Q()
    polygon = data.get('polygon')
    if polygon:
        query&=Q(coordinates__geo_within=polygon)

    sample_type = data.get('sample_type')
    if sample_type and sample_type in ['local_sample', 'biosample']:
        query &= Q(is_local_sample=(sample_type == 'local_sample'))

    sample_accession = data.get('sample_accession')
    if sample_accession:
        query &= Q(sample_accession=sample_accession)
    
    taxid = data.get('taxid') 
    if taxid:
        query &= Q(lineage=str(taxid))

    filter = data.get('filter')
    if filter:
        filter_query = Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter) | Q(sample_accession__iexact=filter) | Q(sample_accession__icontains=filter)
        query &= filter_query

    return query