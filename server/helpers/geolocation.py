from db.models import Organism,SampleCoordinates, BioSample
import json
from shapely.geometry import shape, Point
from mongoengine.queryset.visitor import Q

    # Helper function to convert coordinates with different formats
def convert_coordinates(lat, lat_value, long, long_value):
    lat = '-' + lat if lat_value == 'S' else lat
    long = '-' + long if long_value == 'W' else long
    return lat, long

# Reusable translation table for normalizing decimal separators in coordinate strings
_COORD_NORMALIZE = str.maketrans(",'", "..")

def save_coordinates(saved_sample, id_field='accession'):
    sample_metadata = saved_sample.metadata
    lowered = {k.lower(): v for k, v in sample_metadata.items()}

    latitude, longitude = None, None
    for k, v in lowered.items():
        if k in ("lat_lon", "lat lon"):
            parts = v.split()
            if len(parts) == 4:
                latitude, longitude = convert_coordinates(*parts)
        elif "latitude" in k:
            latitude = v
        elif "longitude" in k:
            longitude = v
        elif k == "lat":
            latitude = v
        elif k in ("lon", "long"):
            longitude = v

    if not latitude or not longitude:
        return

    try:
        lat = float(str(latitude).translate(_COORD_NORMALIZE))
        lng = float(str(longitude).translate(_COORD_NORMALIZE))
    except ValueError:
        print(f"Invalid latitude: {latitude} or longitude: {longitude} for sample: {saved_sample[id_field]}")
        return

    if not (-90.0 <= lat <= 90.0 and -180.0 <= lng <= 180.0):
        return

    sample_accession = saved_sample[id_field]
    coords = [lng, lat]

    existing = SampleCoordinates.objects(sample_accession=sample_accession).first()
    if existing:
        existing.coordinates = coords
        existing.save()
    else:
        doc = {
            "sample_accession": sample_accession,
            "taxid": saved_sample.taxid,
            "scientific_name": saved_sample.scientific_name,
            "coordinates": coords,
            "lineage": Organism.objects(taxid=saved_sample.taxid).only("taxon_lineage").first().taxon_lineage,
        }
        if id_field == "local_id":
            doc["is_local_sample"] = True
        SampleCoordinates(**doc).save()


# Cached country polygons and name->id map (loaded once from countries.json)
_country_polygons_cache = None
_country_name_to_id_cache = None


def _get_country_polygons():
    global _country_polygons_cache, _country_name_to_id_cache
    if _country_polygons_cache is None:
        with open("./countries.json") as f:
            features = json.load(f)["features"]
        _country_polygons_cache = [
            (shape(c["geometry"]), c["id"], c["properties"]["name"]) for c in features
        ]
        _country_name_to_id_cache = {name: cid for _, cid, name in _country_polygons_cache}
    return _country_polygons_cache, _country_name_to_id_cache


def update_countries_from_biosample(saved_biosample, sample_id):
    metadata = saved_biosample.metadata
    geo_loc = None
    for attr in metadata:
        low = attr.lower()
        if low == "geo_loc_name" or low == "country" or "country" in low:
            geo_loc = metadata.get(attr)

    country_name = None
    if geo_loc:
        country_name = geo_loc.split(":")[0].strip() if (":" in geo_loc or "|" in geo_loc) else geo_loc.strip()

    country_polygons, name_to_id = _get_country_polygons()
    country_to_add = None

    if country_name:
        country_to_add = name_to_id.get(country_name)

    if not country_to_add:
        coords_doc = SampleCoordinates.objects(sample_accession=sample_id).only("coordinates").first()
        if coords_doc and coords_doc.coordinates:
            point = Point(coords_doc.coordinates["coordinates"])
            for polygon, cid, _ in country_polygons:
                if polygon.contains(point):
                    country_to_add = cid
                    break

    if country_to_add:
        Organism.objects(taxid=saved_biosample.taxid).modify(add_to_set__countries=country_to_add)


def add_image(taxid, image):
    coordinates = SampleCoordinates.objects(taxid=taxid)
    if len(coordinates) > 0:
        SampleCoordinates.objects(taxid=taxid).update(image=image)


def create_query(data):
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



def update_geolocations(saved_biosample_accessions):
    biosamples = BioSample.objects(accession__in=saved_biosample_accessions)
    for biosample in biosamples:
        save_coordinates(biosample)
        update_countries_from_biosample(biosample, biosample.accession)