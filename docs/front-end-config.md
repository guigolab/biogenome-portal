# Configuring the BioGenome Portal Front-End

This guide explains how to configure the front-end of the BioGenome Portal using JSON files. These files control various aspects of the interface, including project titles, navigation, language support, and integrations with external tools.

One of the key configuration files is `general.json`, which manages global settings for the application. This page provides a detailed explanation of the `general.json` file, covering its structure and how each key impacts the behavior of the front-end.

## `general.json` File Overview

The `general.json` file plays a critical role in defining key settings for the front-end of the BioGenome Portal. It allows for customization of the project title, navigation bar, language options, and more.

Below is the content of the file followed by detailed explanations of each key:

```json
{
  "title": "My Biodiversity Genomic Project",
  "nav": {
    "logo": "Logo.png",
    "url": "https://my-biodiversity-blog.com"
  },
  "cms": true,
  "goat": true,
  "ebp_related": true,
  "tracker": "my-tracker.js",
  "languages": [
    {
      "code": "gb",
      "name": "english"
    },
    {
      "code": "es-ct",
      "name": "catalan"
    }
  ],
  "wiki": {
    "gb": "https://en.m.wikipedia.org/wiki",
    "es-ct": "https://ca.m.wikipedia.org/wiki"
  },
  "maps": [
    "samples-map",
    "countries"
  ]
}
```

Now, let’s break down each section of the `general.json` file.

### Key Definitions

1. **`title`**  
   Defines the main title of the project or initiative. This is displayed in the Browser tab.

2. **`nav`**  
   Configures the navigation settings, including the logo and the URL for the project's homepage.
   - **`logo`**: The file name of the logo image. It should be stored in the /src/assets.
     - **Example:** `"Logo.png"`
   - **`url`**: The URL for the project's homepage.

3. **`cms`**  
   Enables or disables the CMS (Content Management System) for authenticated users.
   - **`true`**: CMS is enabled.
   - **`false`**: CMS is disabled.

4. **`goat`**  
   Determines whether GoaT (Genome on a Tree) functionality is enabled. This adds a Link to download the GoaT report on the sidebar
   - **`true`**: GoaT is enabled.
   - **`false`**: GoaT is disabled.

5. **`ebp_related`**  
   Indicates whether the project is related to the Earth BioGenome Project (EBP). This add EBP's genome quality stadard filters to the assembly table.
   - **`true`**: The project is related to EBP.
   - **`false`**: The project is not related to EBP.

6. **`tracker`**  
   Specifies the file name of the JavaScript file responsible for tracking user interactions. This file should be located in /public/tracker
   - **Example:** `"tracking.js"`

7. **`languages`**  
   Defines the languages supported by the front-end interface. Each language entry includes:
   - **`code`**: The language code, following standard ISO codes or custom ones, that correspond to the folder name located in /src/i118n/locales
     - **Example:** `"gb"` for English, `"es-ct"` for Catalan.
   - **`name`**: The human-readable name of the language.
     - **Example:** `"english"`, `"catalan"`

8. **`wiki`**  
   Provides links to relevant Wikipedia pages based on the selected language. Use in the taxonomy Explorer page to link taxons with their wikipedia description
   - **`gb`**: English Wikipedia URL.
     - **Example:** `"https://en.m.wikipedia.org/wiki"`
   - **`es-ct`**: Catalan Wikipedia URL.
     - **Example:** `"https://ca.m.wikipedia.org/wiki"`

9. **`maps`**  
   Lists the maps available in the app. These may include sample distribution maps or country-level representations.
   - **Examples:** `"samples-map"`, `"countries"`

Here’s a description for the `pages.json` file that you can use in your GitHub Wiki:

---

## `pages.json` Configuration

The `pages.json` file is responsible for configuring the titles and descriptions displayed across various pages in the BioGenome Portal. It supports multilingual content, allowing different titles and descriptions to be shown based on the selected language. Each page listed in this file represents a different section of the portal, with specific content that aligns with the goals of the Catalan Initiative for the Earth BioGenome Project (CBP).

### File Structure

The `pages.json` file follows a consistent structure, where each key corresponds to a specific page in the application. Each page configuration contains the following properties:

1. **`title`**: Defines the page title. Titles can be provided in different languages.
2. **`description`**: Provides a brief description of the page content, also localized for languages.

```json
    "dashboard": {
        "title": {
            "gb": "Catalan Initiative for the Earth BioGenome Project",
            "es-ct": "Iniciativa Catalana per a l’Earth BioGenome Project"
        },
        "description": {
            "gb": "The Catalan Initiative for the Earth BioGenome Project (CBP) aims to produce a detailed catalogue of the genome of eukaryotic species in the Catalan territories",
            "es-ct": "La Iniciativa Catalana per a l’Earth BioGenome Project (CBP) té per objectiu la producció d’un catàleg detallat del genoma de les espècies eucariotes dels territoris de parla catalana."
        }
    },
    "biosamples": {
        "title": {
            "gb": "BioSamples",
            "es-ct": "BioSamples"
        },
        "description": {
            "gb": "These BioSamples include those associated with the CBP project, as well as those retrieved from assemblies and experiments metadata, all imported via a cronjob.",
            "es-ct": "Aquestes BioSamples inclouen les associades amb el projecte CBP, així com les recuperades de les metadades d'assemblatges i experiments, totes importades mitjançant un cronjob."
        }
    }
```


### Page Breakdown

Valid pages values: 

1. **`dashboard`**: Landing page, it is **mandatory**
2. **`assemblies`**: Show a page displaying all the assemblies contained in the app
3. **`biosamples`**:Show a page displaying all the biosamples contained in the app
4. **`experiments`**:Show a page displaying all the experiments contained in the app
5. **`organisms`**:Show a page displaying all the organisms contained in the app
6. **`annotations`**:Show a page displaying all the annotations contained in the app
7. **`local_samples`**:Show a page displaying all the local_samples contained in the app
 
---
## `columns.json` Configuration

The provided JSON file is used to configure which columns are displayed in the data tables for each type of entity (e.g., biosamples, experiments, assemblies) within the BioGenome Portal. This file allows the front-end to define the exact fields shown in the table views, improving the user experience by making the most relevant information easily accessible.

### File Structure

Each key in the JSON file represents a type of entity (e.g., `biosamples`, `local_samples`, `experiments`, `assemblies`, `annotations`, `organisms`), and the value associated with each key is a list of fields to be displayed as columns in the corresponding data table.

#### Nested Fields

The configuration also supports nested fields within a parent object. These can be specified using dot notation, where each level of nesting is separated by a period (e.g., `metadata.collection_date`). This allows for flexible access to deeply nested information within an entity's metadata.

```json
    "biosamples": [
        "accession",
        "scientific_name",
        "metadata.collection_date",
        "metadata.sex",
        "metadata.lifestage",
        "metadata.tissue"
    ],
    "local_samples": [
        "local_id",
        "scientific_name",
        "taxid"
    ]
```

---

## `filters.json` Configuration

This JSON file is used to define the filters available for querying data in the BioGenome Portal's data tables. Each entity (e.g., `biosamples`, `experiments`, `assemblies`, `organisms`) has a set of fields that can be filtered, and each field is associated with a specific type of filter (e.g., date, dropdown select, or checkbox).

### File Structure

Each entity in the JSON file has a list of filter configurations. Each filter configuration includes:
- **`key`**: The field in the dataset that can be filtered. Nested fields are supported using dot notation (e.g., `metadata.collection_date`).
- **`type`**: The type of filter input that will be rendered. Available types include:
  - `date`: Allows filtering by date with a date picker.
  - `select`: Allows filtering by selecting from a dropdown list.
  - `checkbox`: Allows filtering with a checkbox for boolean fields.

```json
    "biosamples": [
        {
            "key": "metadata.collection_date",
            "type": "date"
        },
        {
            "key": "metadata.lifestage",
            "type": "select"
        },
        {
            "key": "metadata.sex",
            "type": "select"
        }
    ],
    "experiments": [
        {
            "key": "metadata.first_public",
            "type": "date"
        },
        {
            "key": "metadata.library_selection",
            "type": "select"
        },
        {
            "key": "metadata.library_strategy",
            "type": "select"
        }
    ]
```

---

## `charts.json` Configuration

This JSON file is used to configure the charts displayed in the dashboard and in each entity's view in the BioGenome Portal. Each entity (e.g., `biosamples`, `experiments`, `assemblies`, `organisms`) can have various charts to visually represent key data fields. The file defines the type of chart, the field to be charted, and how the chart should be displayed in the layout.

### File Structure

Each entity in the JSON file has an array of chart configurations. Each chart configuration contains:
- **`model`**: The entity (e.g., `biosamples`, `organisms`, `experiments`, `assemblies`) for which the chart is displayed.
- **`field`**: The specific data field to be visualized.
- **`class`**: CSS classes that define the layout and size of the chart in the display grid.
- **`type`**: The type of chart to be rendered. Common types include:
  - `pie`: Pie chart to represent categorical data.
  - `bar`: Bar chart to display distributions.
  - `dateline`: Timeline or date-based chart to display trends over time.


```json
    "dashboard": [
        {
            "model": "organisms",
            "field": "insdc_status",
            "class": "flex lg6 md6 sm12 xs12",
            "type": "pie"
        },
        {
            "model": "organisms",
            "field": "goat_status",
            "class": "flex lg6 md6 sm12 xs12",
            "type": "pie"
        }
    ],
    "biosamples": [
        {
            "model": "biosamples",
            "field": "metadata.sex",
            "class": "flex lg12 md12 sm12 xs12",
            "type": "bar"
        },
        {
            "model": "biosamples",
            "field": "metadata.lifestage",
            "class": "flex lg12 md12 sm12 xs12",
            "type": "bar"
        }
    ]
```

## `ui.json` Configuration

This file is used to configure the UI, for more information follow [this link](https://ui.vuestic.dev/compiler/vuestic-config)

