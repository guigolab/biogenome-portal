from ..utils import ena_client,data_helper
from ..taxon import taxons_service
from flask import current_app as app
from mongoengine.queryset.visitor import Q
from db.models import Annotation, Assembly, BioProject, BioSample, CommonName, Experiment, GeoCoordinates, LocalSample, Organism, Publication,TaxonNode
import os 

ROOT_NODE=os.getenv('ROOT_NODE')
PROJECT_ACCESSION=os.getenv('PROJECT_ACCESSION')


def get_organisms(offset=0, limit=20, 
                sort_order=None, sort_column=None,
                filter=None, parent_taxid=None,
                filter_option='scientific_name', country=None, bioproject=None,
                goat_status=None, insdc_status=None, target_list_status=None):
    query=dict()
    filter_query = get_filter(filter, filter_option) if filter else None
    if parent_taxid:
        query['taxon_lineage'] = parent_taxid
    if bioproject:
        query['bioprojects'] = bioproject
    if goat_status:
        query['goat_status'] = goat_status
    if country:
        query['countries'] = country
    if insdc_status:
        query['insdc_status'] = insdc_status
    if target_list_status:
        query['target_list_status'] = target_list_status
    organisms = Organism.objects(filter_query, **query).exclude('id') if filter_query else Organism.objects.filter(**query).exclude('id')
    if sort_column:
        sort = '-'+sort_column if sort_order == 'desc' else sort_column
        organisms = organisms.order_by(sort)
    
    return organisms.count(), organisms[int(offset):int(offset)+int(limit)]

def get_organism_related_data(taxid, model):
    return model.objects(taxid=taxid)

def get_stats(organisms):
    stats = dict()
    biosamples_count = organisms.filter(biosamples__not__size=0).count()
    if biosamples_count > 0:
        stats['biosamples'] = biosamples_count
    local_samples_count = organisms.filter(local_samples__not__size=0).count()
    if local_samples_count > 0:
        stats['local_samples'] = local_samples_count
    assemblies_count = organisms.filter(assemblies__not__size=0).count()
    if assemblies_count > 0:
        stats['assemblies'] = assemblies_count
    experiments_count = organisms.filter(experiments__not__size=0).count()
    if experiments_count > 0:
        stats['experiments'] = experiments_count
    annotations_count = organisms.filter(annotations__not__size=0).count()
    if annotations_count > 0:
        stats['annotations'] = annotations_count
    return stats

def get_filter(filter, option):
    if option == 'taxid':
        return (Q(taxid__iexact=filter) | Q(taxid__icontains=filter))
    elif option == 'common_name':
        return (Q(insdc_common_name__iexact=filter) | Q(insdc_common_name__icontains=filter))
    elif option == 'tolid':
        return (Q(tolid_prefix__iexact=filter) | Q(tolid_prefix__icontains=filter))
    else:
        return (Q(scientific_name__iexact=filter) | Q(scientific_name__icontains=filter))

def get_or_create_organism(taxid):
    organism = Organism.objects(taxid=taxid).first()
    if not organism:
        taxon_xml = ena_client.get_taxon_from_ena(taxid)
        if not taxon_xml:
            ##TODO add call to NCBI

            print('TAXID NOT FOUND')
            print(taxid)
            return
        lineage = data_helper.parse_taxon_from_ena(taxon_xml)
        tax_organism = lineage[0]
        tolid = ena_client.get_tolid(taxid)
        taxon_lineage = taxons_service.create_taxons_from_lineage(lineage)
        taxon_list = [tax.taxid for tax in taxon_lineage]
        insdc_common_name = tax_organism['commonName'] if 'commonName' in tax_organism.keys() else ''
        organism = Organism(taxid = taxid, insdc_common_name=insdc_common_name, scientific_name= tax_organism['scientificName'], taxon_lineage = taxon_list, tolid_prefix=tolid).save()
        taxons_service.leaves_counter(taxon_lineage)
    return organism

def parse_organism_data(data,taxid=None):
    #organism creation
    if not taxid:
        if not 'scientific_name' in data.keys() or not 'taxid' in data.keys():
            return
        if Organism.objects(taxid=data['taxid']).first():
            return
        taxid = data['taxid']
    else:
        #organism update
        if not Organism.objects(taxid=taxid).first():
            return
    organism = get_or_create_organism(taxid)
    string_attrs = dict()
    for key in data.keys():
        if isinstance(data[key],str):
            string_attrs[key] = data[key]
    for key in string_attrs.keys():
        organism[key] = string_attrs[key]
    if 'metadata' in data.keys():
        organism.metadata = data['metadata']
    if 'common_names' in data.keys():
        c_name_list=list()
        for c_name in data['common_names']:
            if 'value' in c_name.keys():
                c_name_list.append(CommonName(**c_name))
        organism.common_names = c_name_list
    if 'image_urls' in data.keys():
        organism.image_urls = data['image_urls']
    if 'publications' in data.keys():
        pub_list = list()
        for pub in data['publications']:
            if 'id' in pub.keys():
                pub_list.append(Publication(**pub))
        organism.publications=pub_list
    organism.save()
    return organism

def delete_organism(taxid):
    ## delete everything related to the organism
    organism_to_delete = Organism.objects(taxid=taxid).first()
    lineage = organism_to_delete.taxon_lineage
    if not organism_to_delete:
        return
    Assembly.objects(taxid=taxid).delete()
    Annotation.objects(taxid=taxid).delete()
    Experiment.objects(taxid=taxid).delete()
    LocalSample.objects(taxid=taxid).delete()
    BioSample.objects(taxid=taxid).delete()
    GeoCoordinates.objects(Q(organisms__not__size=0) & Q(organisms=taxid)).delete()
    if organism_to_delete.bioprojects:
        for bioproject in organism_to_delete.bioprojects:
            organisms_in_bioprojects = Organism.objects(bioprojects=bioproject)
            if organisms_in_bioprojects.count() == 1 and organisms_in_bioprojects.first().taxid == taxid:
                bioproject_to_delete = BioProject.objects(accession=bioproject).delete()
    organism_to_delete.delete()
    taxons_service.delete_taxons(lineage)
    return taxid
