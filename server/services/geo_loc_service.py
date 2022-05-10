from db.models import GeoCoordinates

def geoloc_samples(ids=None):
    if ids:
        geo_objs = GeoCoordinates.objects(biosamples__in=ids)
    else:
        geo_objs = GeoCoordinates.objects()
    geoJson=dict()
    if len(geo_objs):
        geoJson = {
            'type': 'FeatureCollection',
            'crs': {
                'type': 'name',
                'properties': {
                    'name': 'EPSG:3857'
                }
            },
            'features' : []
        }   
        for geo_ob in geo_objs:
            feature = {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [geo_ob.geographic_location_longitude, geo_ob.geographic_location_latitude]
                },
                'properties': {'biosamples': geo_ob.biosamples}
            }
            geoJson['features'].append(feature)
    return geoJson

def get_or_create_coordinates(sample):
    if not 'geographic_location_latitude' in sample.keys():
        return
    sample_accession = sample['accession'] if 'accession' in sample.keys() else sample['tube_or_well_id']
    lat = sample['geographic_location_latitude']
    long = sample['geographic_location_longitude']
    if any(c.isdigit() for c in lat) and any(c.isdigit() for c in long):
        lat = str(round(float(lat),2))
        long = str(round(float(long),2))
        print(lat,long)
        geo_loc = lat+'-'+long
        geo_object = GeoCoordinates.objects(geo_loc=geo_loc).first() if GeoCoordinates.objects(geo_loc=geo_loc).first() else GeoCoordinates(geo_loc=geo_loc, geographic_location_latitude=sample['geographic_location_latitude'],geographic_location_longitude=sample['geographic_location_longitude'])
        if not sample_accession in geo_object.biosamples:
            geo_object.biosamples.append(sample_accession)
            geo_object.save()


# def get_coordinates(ids):
#     geo_objs = 
