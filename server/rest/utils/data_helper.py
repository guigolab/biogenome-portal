from lxml import etree
import requests
import json
from db.models import Organism

def get_annotations(org_name):
    response = requests.get(f'https://genome.crg.cat/geneid-predictions/api/organisms/{org_name}')
    if response.status_code != 200:
        return
    return response.json()    

def parse_taxon_from_ena(xml):
    root = etree.fromstring(xml)
    organism = root[0].attrib
    lineage = []
    for taxon in root[0]:
        if taxon.tag == 'lineage':
            for node in taxon:
                lineage.append(node.attrib)
    lineage.insert(0,organism)
    return lineage

## expect biosample model from ebi biosamples
def parse_sample_metadata(metadata):
    sample_metadata = dict()
    for k in metadata.keys():
        sample_metadata[k] = metadata[k][0]['text']
    return sample_metadata

#open countries geojson
def get_countries_json():
    with open('./countries.json') as f:
        data = json.load(f)
    f.close()
    return data

def coordinates_in_country(model):
    countries = get_countries_json()['features']
    for country in countries:
        geometry = country['geometry']
        biosamples = model.objects(coordinates__geo_within=geometry).scalar('taxid')
        if biosamples:
            Organism.objects(taxid__in=biosamples).update(add_to_set__countries=country['id'])

def update_organism_coordinates(organisms):
    for organism in organisms:
        organism.coords=list()
        organism.countries=list()
        coords = []
        for coordinate in organism.coordinates:
            lat,lng = [float(coord.replace(',','.')) for coord in coordinate.split(':')]
            if coordinates_in_range(lat,lng):
                coords.append([lng,lat])
        if coords:
            organism.locations = coords
        organism.save()

def coordinates_in_range(lat,lng):
    return lat > -90.0 and lat < 90.0 and lng > -180.0 and lng < 180.0

def update_samples_coordinates(samples):
    for sample in samples:
        # if sample.location:
        #     continue
        if sample.longitude and sample.latitude:
            lng,lat = [float(sample.longitude.replace(',','.')), float(sample.latitude.replace(',','.'))]
            if coordinates_in_range(lat,lng):
                sample.location=[lng,lat]
                sample.save()

def create_coordinates(sample, organism):
    ##parse coordinates
    coords = coordinate_parser(sample.metadata)

    if not coords:
        return
    point = coords
    sample.coordinates=point
    sample.save()
    sample_lng, sample_lat = coords
    for loc in organism.locations:
        lng,lat = loc
        if not lng == sample_lng and not lat == sample_lat:
            organism.locations.append([sample_lng,sample_lat])
    organism.save()


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
    elif 'decimal_latitude' in lowered_keys_dict and 'decimal_longitude' in lowered_keys_dict:
        latitude = str(lowered_keys_dict['decimal_latitude'])
        longitude  = str(lowered_keys_dict['decimal_longitude'])
    else:
        return
    if any(c.isdigit() for c in str(latitude)) and any(c.isdigit() for c in str(longitude)):
        lng = float(longitude)
        lat = float(latitude)
        if coordinates_in_range(lat,lng):
            return [lng,lat]
    return    