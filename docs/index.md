# Introduction to the BioGenome Portal

Welcome to the **BioGenome Portal**, a powerful platform designed for managing, visualizing, and analyzing biodiversity genomics data. This portal combines data from various sources, enabling researchers to integrate, link, and explore information across multiple models with ease. Here, we'll provide an overview of the portal's logic, available models, and its unique data linking capabilities.

## Core Concept: Organism-Centric Data Integration

![Image showing the organism-centered model](/organism-centered.png "Schema depicting the organism-centered model")


At the heart of the portal is the concept of an **organism**. In this context, an **organism** represents a taxonomic entity that can include any taxon—ranging from a virus to a mammal, a subspecies, or even a metagenomic taxon. Organisms serve as the primary linkage for data imported from external sources and user-provided metadata.

### What Defines an Organism?
- **Taxonomic Information**: A set of taxonomic details, including `taxid` and `scientific_name`.
- **Metadata Placeholder**: Organisms can store additional metadata, such as:
  - Images and links to publications.
  - Vernacular names.
  - Custom metadata fields.
  - [GoaT](https://goat.genomehubs.org/) status related fields: target_list_status and sequencing status.
  - INSDC status (Assemblies submitted, Reads submitted and Biosample submitted)

## Available Data Models

The portal supports the following data models, each with its own source and purpose:

### 1. **Assemblies**
- **Imported From**: NCBI Datasets V2.
- Represent genomic assembly data linked to organisms.

### 2. **Experiments**
- **Imported From**: ENA (European Nucleotide Archive).
- Represent experimental datasets and methodologies.

### 3. **BioSamples**
- **Imported From**: ENA and EBI BioSamples.
- Represent biological samples, often linked to assemblies and experiments.

### 4. **Local Samples**
- **Imported From**: Metadata spreadsheets provided by users.
- Represent user-specific sample collections with geographical and metadata annotations.

### 5. **Annotations**
- **Created By**:
  - Uploading **GFF files** (BGZipped with corresponding `.tbi` index files).
  - Linking to annotation file URLs.
- Represent genomic annotations for assemblies.

### 6. **Organisms**
- **Created By**:
  - Automatically, when data (assemblies, experiments, etc.) is imported into the database.
  - Manually, using:
    - An NCBI taxonomic identifier.
    - A GoaT-compliant TSV report upload.
- Serve as the central node connecting all other models.


## Taxonomic and Geographic Filtering

### Taxonomic Lineage Filtering
All models are linked to the **taxonomic hierarchy**, allowing users to filter and retrieve data under any taxonomic identifier. For example:
- View all data linked to *Mammalia* or *Aves*.
- Filter samples, assemblies, and experiments by any taxon or rank in the hierarchy.

### Geographic Filtering
- Users can filter **organisms by country**:
  - The portal automatically verifies if any sample coordinate linked to an organism falls within the geographic boundaries of a selected country.
- View **geographical coordinates** of samples and local samples on a map for visual exploration.

## Data Import Workflows

### Automated Imports
1. **NCBI Assemblies**: Imported directly from NCBI Datasets V2.
2. **BioSamples**: Pulled from ENA or EBI BioSamples repositories.
3. **Experiments**: Retrieved from ENA.

### User-Driven Imports
1. **Local Samples**: Uploaded via metadata spreadsheets.
2. **Annotations**: Uploaded as compressed GFF files or linked via URLs.
3. **Organisms**:
   - Created manually using an NCBI taxonomic identifier.
   - Generated from GoaT-compliant TSV reports.


## Linking Data Across Models

The portal excels at linking data models to **organisms**:
- When data such as assemblies, experiments, or local samples are imported, their associated taxonomic identifiers automatically create or link to corresponding organism entries.
- Additional metadata and contextual information can be added to organisms to enrich their profiles.


## Key Functionalities

- **Interactive Filtering**:
  - By taxonomic lineage: Retrieve data across models under a taxon.
  - By country: Filter organisms based on geographic metadata.
- **Data Visualization**:
  - Explore geographical coordinates of samples and local samples on an interactive map.
- **Comprehensive Metadata Management**:
  - Attach publications, vernacular names, images, and custom metadata to organisms.


The **BioGenome Portal** simplifies the integration and exploration of complex genomics data.