from lxml import etree
import requests
import json
from shapely.geometry import Point
from shapely.geometry import shape

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

def coordinates_in_country(coordinates):
    countries = get_countries_json()['features']
    point = Point(*coordinates)
    for country in countries:
        geometry = country['geometry']
        polygon = shape(geometry)
        if geometry['type'] == 'MultiPolygon':
            print(polygon)
        # print(point.within(polygon))
        # if polygon.contains(point):
        #     print('YES')
        #     print(country)



def create_coordinates(sample, organism):
    ##parse coordinates
    coords = coordinate_parser(sample.metadata)

    if not coords:
        return
    point = coords
    sample.update(coordinates=point)
    # sample.latitude = coords[0]
    # sample.longitude = coords[1]
    # sample.save()
    organism.modify(add_to_set__coords=point)


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
        return [latitude,longitude]
    else:
        return    