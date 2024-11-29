# Using the Admin Area

The application includes a Content Management System (CMS) section that allows users to perform CRUD (Create, Read, Update, Delete) operations via the user interface.

## User Roles

There are two types of users in the system: **Admin** and **Data Manager**.

- **Admin**: 
  - Has full access to all sections of the CMS.
  - Can create and manage Data Manager users.
  - Can assign specific species to Data Managers for them to manage.

- **Data Manager**:
  - Has access to species assigned by the Admin.
  - Can import new species and assign them to themselves, only if the species are not present in the database.
  
## Spreadsheet Import

Local sample metadata can be imported from a spreadsheet. The only required fields are:
- A unique identifier for each row
- The NCBI taxonomic identifier

All other fields will be stored as metadata. The import function will also search for latitude and longitude fields containing the decimal coordinates of where the sample was collected.

## INSDC Data Import

BioSamples, Reads, and Assemblies can be directly imported using their respective accession numbers from the INSDC (International Nucleotide Sequence Database Collaboration).

## Organism Creation and Editing

Organisms can be created by providing a valid NCBI taxonomic identifier. Additional information can be added for each species via a form, including:
- Vernacular names
- Links to photos
- Custom attributes
- Publications
- `target_list_status`
- `goat_sequencing_status`

## GoaT Report Upload

A GoaT-compliant report file can be uploaded to the system for analysis and integration.

## Annotation Upload

Annotations can be linked to chromosome-level assemblies, allowing for more detailed genomic visualization.

## CRUD Tables

The admin area includes tables for managing all models within the database, enabling full Create, Read, Update, and Delete functionality for each entity.