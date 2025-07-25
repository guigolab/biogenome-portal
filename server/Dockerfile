# Use the official Python 3.8 base image with a supported Debian version
FROM python:3.8-slim

# Update package repositories and install necessary tools including build dependencies
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Download the datasets tool and make it executable
RUN curl -o datasets 'https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/LATEST/linux-amd64/datasets'
RUN chmod +x datasets
RUN mv datasets /usr/local/bin

# Copy requirements.txt and install Python dependencies
COPY ./requirements.txt /server/requirements.txt

WORKDIR /server

# Upgrade pip to the latest version
RUN python -m pip install --upgrade pip

# Install Python dependencies from requirements.txt
RUN pip install -r requirements.txt

# Copy the application code into the container
COPY . /server

# Expose the application port
EXPOSE ${API_PORT}

# Set the command to run the application
CMD ["uwsgi", "app.ini"]
