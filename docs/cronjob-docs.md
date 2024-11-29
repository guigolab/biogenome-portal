# Cronjobs Documentation

The application uses **Flask-Celery** with **Redis** to manage and execute cronjobs. A separate **cronjob container** is responsible for scheduling these tasks, which are defined in a crontab file. The cronjobs communicate with the **Flask API** and can be triggered either on schedule or manually via API requests.

## Cronjob Setup

The cronjobs are managed by a dedicated container containing a crontab file that schedules API requests to the Flask app. The cronjobs can also be triggered manually by sending a request to the /cronjob API endpoint.

### Triggering Cronjobs

To trigger a cronjob via the API, send a request to the `cronjob` endpoint using the format:

```
parent_dict_key/nested_child_key
```

For example, to import biosamples, the endpoint would be:

```
/cronjob/biosamples/import
```

### Current Cronjobs

Below are the currently available cronjobs and their respective API keys:

1. **Biosamples**
   - **Import Biosamples**:  
     API Key: `biosamples/import`  
     Function: `biosamples.import_biosamples_from_project_names`
   - **Get Biosamples Derived From Parent**:  
     API Key: `biosamples/derived_from`  
     Function: `biosamples.get_biosamples_derived_from_parent`
   - **Get Biosample Parents**:  
     API Key: `biosamples/parents`  
     Function: `biosamples.get_biosample_parents`

2. **Experiments**
   - **Import Experiments**:  
     API Key: `experiments/import`  
     Function: `experiments.get_experiments_from_bioproject_accession`

3. **Assemblies**
   - **Import Assemblies by Bioproject**:  
     API Key: `assemblies/import`  
     Function: `assemblies.import_assemblies_by_bioproject`
   - **Add Blobtoolkit Link**:  
     API Key: `assemblies/blob_link`  
     Function: `assemblies.add_blob_link`

4. **Helpers**
   - **Handle Orphan Organisms**:  
     API Key: `helpers/handle_orphans`  
     Function: `taxonomy.handle_orphan_organisms`
   - **Add Lineage to Models**:  
     API Key: `helpers/add_lineage`  
     Function: `taxonomy.add_lineage`

5. **Geolocation**
   - **Create Coordinates from Local Samples**:  
     API Key: `geo_locations/create_from_local_samples`  
     Function: `geolocation.create_local_sample_coordinates`
   - **Create Coordinates from Biosamples**:  
     API Key: `geo_locations/create_from_biosamples`  
     Function: `geolocation.create_biosample_coordinates`
   - **Update All Countries**:  
     API Key: `geo_locations/create_countries`  
     Function: `geolocation.update_all_countries`