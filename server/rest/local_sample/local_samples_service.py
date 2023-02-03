from db.models import LocalSample
from errors import NotFound
from ..organism import organisms_service
from flask import current_app as app
from datetime import datetime
from mongoengine.queryset.visitor import Q

def get_local_samples(offset=0,limit=20,
                        filter=None, filter_option="scientific_name",
                        sort_column=None,sort_order=None,
                        start_date=None, end_date=datetime.utcnow):
    if filter:
        filter_query= get_filter(filter,filter_option)
    else:
        filter_query = None
    if start_date:
        date_query = (Q(created__gte=start_date) & Q(created__lte=end_date))
    else:
        date_query = None
    if filter_query and date_query:
        local_samples = LocalSample.objects(filter_query,date_query)
    elif filter_query:
        local_samples = LocalSample.objects(filter_query)
    elif date_query:
        local_samples = LocalSample.objects(date_query)
    else:
        local_samples = LocalSample.objects()
    if sort_column:
        sort = '-'+sort_column if sort_order == 'desc' else sort_column
        local_samples = local_samples.order_by(sort)
    return local_samples.count(), local_samples[int(offset):int(offset)+int(limit)]

def get_filter(filter, option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    else:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))


def delete_local_sample(id):
    app.logger.info(LocalSample.objects().to_json())
    sample_to_delete = LocalSample.objects(local_id=id).first()
    if not sample_to_delete:
        raise NotFound
    organism_to_update = organisms_service.get_or_create_organism(sample_to_delete.taxid)
    if organism_to_update:
        organism_to_update.modify(pull__local_samples=id)
        organism_to_update.save()
    sample_to_delete.delete()
    return id
