# Launching The BGP

This guide provides instructions for launching the BioGenome Portal and configuring all the necessary environment variables. The app uses **Docker Compose** to manage multiple services, including the database, server, cronjobs, and Celery worker.

## Launching the Application

To launch the application, ensure you have **Docker** and **Docker Compose** installed on your machine. Then, follow these steps:

1. **Clone the Repository**: 
   If you haven’t already, clone the repository that contains the app code:
   ```bash
   git clone <your-repo-url>
   cd <repo-directory>
   ```

2. **Set Up Environment Variables**: 
   Before launching the app, ensure that the environment variables in your `.env` file are correctly configured. The app requires various settings for database access, API configuration, and external integrations.

3. **Build and Run the Containers**: 
   Use the following command to build and start the application:
   ```bash
   docker-compose up --build
   ```

   This will start the following services:
   - **MongoDB** for database management
   - **Flask API** for the back-end server
   - **Cronjob container** for scheduled tasks
   - **Nginx** for front-end serving
   - **Celery worker** for background tasks
   - **Redis** as a message broker for Celery

4. **Access the App**: 
   Once the app is running, you can access it via the port defined for Nginx (default: `http://localhost:91`).

## Environment Variables

The following environment variables are required to properly configure the application:

### Database Variables

- **`DB_NAME`**: The name of the MongoDB database.
- **`DB_USER`**: Username for the MongoDB instance, it will also correspond to the **first** admin username.
- **`DB_PASS`**: Password for the MongoDB instance, it will also correspond to the **first** admin password.
- **`DB_HOST`**: The host for the MongoDB instance.
- **`DB_PORT`**: Port used to connect to the MongoDB instance (default: `27017`).
- **`MONGO_INITDB_ROOT_USERNAME`**: MongoDB root username.
- **`MONGO_INITDB_ROOT_PASSWORD`**: MongoDB root password.
- **`MONGO_INITDB_DATABASE`**: Default database created on initialization.
- **`MONGODB_DATA_DIR`**: Directory to store MongoDB data.
- **`MONDODB_LOG_DIR`**: Directory for MongoDB logs (default: `/dev/null`).

### Celery and Redis Variables

- **`CELERY_BROKER_URL`**: URL of the Redis broker used by Celery (default: `redis://redis/0`).
- **`CELERY_RESULT_BACKEND`**: Redis URL for storing task results (default: `redis://redis/0`).

### API Variables

- **`APP_NAME`**: Name of the application (default: `BioGenomePortal`).
- **`API_PORT`**: Port used by the Flask API (default: `80`).
- **`API_HOST`**: Hostname for the Flask API (default: `biogenome_server`).
- **`PROXY_HOST`**: Hostname for the Nginx proxy (default: `biogenome_nginx`).
- **`PROCESSES`**: Number of processes for the Flask app (default: `4`).
- **`THREADS`**: Number of threads per process for the Flask app (default: `2`).

### Authentication Variables

- **`JWT_SECRET_KEY`**: Secret key used for JWT authentication in the Flask API.

### Project Variables

- **`PROJECT_ACCESSION`**: INSDC Accession number for the project (ex: `PRJNA489243`).
- **`PROJECTS`**: List of projects acronyms (ex: `DTOL`, `VGP`, `CBP`), used to import biosamples containing the acronym in the project_name attribute
- **`ANNOTATIONS_PATH`**: Path to the directory containing annotation data, uploaded gffs files will be stored in the mounted volume.
- **`ROOT_NODE`**: Root Taxonomic ID (default: `2759` for Eukaryots).

### External Service Variables

- **`CESIUM_TOKEN`**: Cesium API token for accessing external services.

### GoaT Project Variables

- **`GOAT_PROJECT_NAME`**: Name of the GoaT project (default: `CBP`).
- **`GOAT_PRIMARY_CONTACT`**: Primary contact for the GoaT project (e.g., `Montserrat Corominas`).
- **`GOAT_PRIMARY_CONTACT_EMAIL`**: Contact email for the GoaT project.
- **`GOAT_PRIMARY_CONTACT_INSTITUTION`**: Institution of the primary contact (default: `UB, 08028, Spain`).
- **`GOAT_SCHEMA_VERSION`**: GoaT schema version (default: `ebp_species_goat_2.6`).

### Nginx Variables

- **`BASE_PATH`**: Base path for the application (default: `/ebp`), use it to deploy in the app in subpaths

## Docker Compose Services

The application is structured into multiple services that work together:

- **`biogenome_db`**: MongoDB database container.
- **`biogenome_server`**: Flask back-end server.
- **`biogenome_cron`**: Container handling scheduled cronjobs.
- **`biogenome_nginx`**: Nginx container for serving the front-end.
- **`celery`**: Celery worker for handling background tasks.
- **`redis`**: Redis container for Celery message brokering.

### Example `docker-compose.yml`

```yaml
version: '3'

services:

  biogenome_db:
    image: mongo:6.0
    container_name: "${DB_HOST}"
    env_file:
      - .env
    volumes:
     - ./mongo-init.sh:/docker-entrypoint-initdb.d/mongo-init.sh
     - /home/emilior/ebp-data:/data/db
    ports:
      - "27010:27017"

  biogenome_server:
    build: ./server
    container_name: "biogenome_server"
    restart: always
    volumes:
      - ./server:/server
      - ${ANNOTATIONS_PATH}:/server/annotations_data
    env_file:
      - .env
    depends_on:
      - redis

  biogenome_cron:
    build: ./cronjobs
    container_name: biogenome_cron
    env_file:
      - .env

  biogenome_nginx:
    build:
      context: ./biogenome-client
      dockerfile: Dockerfile
      args:
        - ROOT_NODE=$ROOT_NODE
        - CESIUM_TOKEN=$CESIUM_TOKEN
        - BASE_PATH=$BASE_PATH
    container_name: "biogenome_nginx"
    restart: always
    volumes:
      - node_modules:/biogenome-client/node_modules
    environment:
      - API_PORT=${API_PORT}
      - API_HOST=${API_HOST}
      - BASE_PATH=${BASE_PATH}
    ports:
      - "91:${API_PORT}"

  celery:
    build: ./server
    command: celery --app app.celery_app worker --loglevel=info --autoscale=1,1 --max-tasks-per-child=1
    restart: always
    volumes:
      - ${ANNOTATIONS_PATH}:/annotations_data
    env_file:
      - .env
    depends_on:
      - biogenome_server
      - biogenome_db
      - redis

  redis:
    image: "redis:alpine"

volumes:
  app:
  mongodb-data:
  node_modules:
```