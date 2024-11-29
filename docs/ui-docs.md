# Navigating the UI

This guide will help you navigate the User-Interface, filter data models, and generate insightful reports and visualizations.

The UI consists of 4 main pages:  **Data Model** (such as assemblies, experiments, biosamples etc..) **Taxonomy Explorer**, **Countries Map** and **Sample Map**.


## Data Model Page

This page shows the data table and charts of a specific data model. All the data models (assemblies, biosamples, experiments, annotations, local_samples and organisms) share the same features:

### 1. Data Filters

Data filters are configured for each model at build time, see [Filters](/front-end-config#filters-json-configuration) to check how their are configured. 


### 2. Data Export

Once the data has been filtered, it is possible to download the query results in TSV format, user can select which TSV columns they want in the generated TSV report

### 3. Charts

A list of charts can be configured at build time per each data model, see [Charts](/front-end-config#charts-json-configuration) to check how their are configured.

Users can also generate and download new charts, indeed it is possible to create a new chart targeting the value counts of a specific metadata field. For instance, a user can create a chart to represent the publication date distribution of genome assemblies at chromosome level. 

All the charts in the user current view are dinamycally updated to represent the results of the filtered query.

## Taxonomy Explorer

The taxonomy explorer allows users to further filter data by a selected taxon, indeed this page share the same features of the Data Model Page. User can either type a taxon in the search bar or click over a node in the tree. The selected taxon related data will be displayed at the left.


The BGP-UI Data Models shares the same API query logic. There are two main endpoints where this can be applied:

1. **/<data_model>**: This endpoint allows to retrieve all the related data model data in json or TSV format.

Example1: /api/organisms
Example2: /api/biosamples
Example3: /api/assemblies


2. **/stats/<data_model>/<field_to_query>**: Retrieve value counts of the related data model field.

Example1: /api/stats/organisms/insdc_status
Example2: /api/stats/biosamples/metadata.lifestage
Example3: /api/stats/assemblies/metadata.assembly_info.assembly_level

## Model Page

All the BGP data models (assemblies, biosamples, experiments, annotations, local_samples and organisms) share the same features.

**Filters**: Filter data by metadata
**TSV Export**: Export query results
**Chart Creation**: Visualize and download query results statistics


## Taxonomy Explorer Page

This page allows you to filter data by a selected taxon (by default the configured root taxon of the project is loaded, for instance Eukaryota or Cellular Organism).

All the data under the selected taxon will be displayed, for instance all the biosamples under Eukaryota or Mammalia. The related data can be further filtered, exported or analysed as per the Model Page

## Countries Page

