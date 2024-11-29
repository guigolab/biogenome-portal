# Using the API

The API provides two primary endpoints for discovering, accessing and analyzing data, they share the same query logic, thus the same query object can be used to retrieve results and statistics.

## Building a Query

The API allows users to build custom queries using the Mongoengine logic:

### Fields:

Nested fields can be accessed by using a `.`

`metadata.assembly_info.assembly_level` --> assembly level field of the **assemblies data model**

### Queries:
- `__exists`: whether a field exists in some object of a data model
- `__gt, __lt, __gte, __lte`: retrieve a list of objects within a range of values, useful with dates and numbers:

`/api/assemblies?metadata.assembly_info.release_date__lte=2024/12/01&metadata.assembly_info.release_date__gte=2022/12/01&metadata.assembly_stats.contig_N50__exists&metadata.assembly_info.assembly_level=Chromosome`

This query will retrieve all the assemblies released between the **2024/12/01** and **2022/12/01** that **have a contig_N50 field** in the nested field assembly_stats and **with assembly_level Chromosome**

## Endpoints

### `/<data_model>`
This endpoint retrieves all data related to the specified [data model](/#available-data-models) in either JSON or TSV format:

- `/api/organisms`
- `/api/biosamples`
- `/api/assemblies`
- `/api/local_samples`
- `/api/annotations`
- `/api/experiments`

### `/stats/<data_model>/<field_to_query>`
This endpoint returns value counts for a specified field within the given [data model](/#available-data-models):

- `/api/stats/organisms/insdc_status`
- `/api/stats/biosamples/metadata.lifestage`
- `/api/stats/assemblies/metadata.assembly_info.assembly_level`


## Query parameters

### Valid for all data models

- **`taxon_lineage`**: filter data under a NCBI taxonomic identifier
- **`format`**: retrieve resulst in tsv or json format (used only in `/<data_model>` endopoint)
- **`fields[]`**: list of selected columns for the tsv (used only in` /<data_model>` endopoint)

For data model specific fields check the [API schema](/api-schema) Docs

## Examples

Here some examples on how to explore and analyse data.

### Example 1

Filter all the biosamples under Mammalia with collection_date field between 2020-12-31&2023-12-31 and with sex field equal to male:

JSON:

[`https://genome.crg.es/ebp/api/biosamples?metadata.collection_date__gte=2020-12-31&metadata.collection_date__lte=2023-12-31&metadata.sex=male&offset=0&limit=10&taxon_lineage=40674`](https://genome.crg.es/ebp/api/biosamples?metadata.collection_date__gte=2020-12-31&metadata.collection_date__lte=2023-12-31&metadata.sex=male&offset=0&limit=10&taxon_lineage=40674)

TSV:

[`https://genome.crg.es/ebp/api/biosamples?metadata.collection_date__gte=2020-12-31&metadata.collection_date__lte=2023-12-31&metadata.sex=male&filter=&sort_order=&sort_column=&format=tsv&fields[]=accession&fields[]=scientific_name&fields[]=metadata.collection_date&fields[]=metadata.sex&fields[]=metadata.lifestage&fields[]=metadata.tissue&taxon_lineage=40674`](https://genome.crg.es/ebp/api/biosamples?metadata.collection_date__gte=2020-12-31&metadata.collection_date__lte=2023-12-31&metadata.sex=male&filter=&sort_order=&sort_column=&format=tsv&fields[]=accession&fields[]=scientific_name&fields[]=metadata.collection_date&fields[]=metadata.sex&fields[]=metadata.lifestage&fields[]=metadata.tissue&taxon_lineage=40674)



Now we want to retrieve statistics of the ENA-FIRST-PUBLIC metadata field with the query above:

[`https://genome.crg.es/ebp/api/stats/biosamples/metadata.ENA-FIRST-PUBLIC?metadata.collection_date__gte=2020-12-31&metadata.collection_date__lte=2023-12-31&metadata.sex=male&taxon_lineage=40674`](https://genome.crg.es/ebp/api/stats/biosamples/metadata.ENA-FIRST-PUBLIC?metadata.collection_date__gte=2020-12-31&metadata.collection_date__lte=2023-12-31&metadata.sex=male&taxon_lineage=40674)


### Example 2

Working with metadata can be harsh and many times metadata of the same data model can differ, for instance a biosample submitted to NCBI will have a different set of metadata then one submitted to ENA.

The API allows users to check for this differences via the `__exists` query. For instance we want to take all the biosamples that have the metadata field **ENA-CHECKLIST**:

[`https://genome.crg.es/ebp/api/biosamples?metadata.ENA-CHECKLIST__exists=true`](https://genome.crg.es/ebp/api/biosamples?metadata.ENA-CHECKLIST__exists=true)

and then those that lack of the **ENA-CHECKLIST** metadata field, we can assume that the lack of this field correspond to biosamples submitted to NCBI:

[`https://genome.crg.es/ebp/api/biosamples?metadata.ENA-CHECKLIST__exists=false`](https://genome.crg.es/ebp/api/biosamples?metadata.ENA-CHECKLIST__exists=false)


Now we can retrieve cleaner statistics, for instance we may want to retrieve of the geographical locations of the biosamples submitted to the ENA: 

[`https://genome.crg.es/ebp/api/stats/biosamples/metadata.geo_loc_name?metadata.ENA-CHECKLIST__exists=true`](https://genome.crg.es/ebp/api/stats/biosamples/metadata.geo_loc_name?metadata.ENA-CHECKLIST__exists=true)
