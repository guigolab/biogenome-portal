FROM python:3.7.11-stretch

# Update package repositories to use buster release
RUN sed -i 's/stretch/buster/g' /etc/apt/sources.list

# Install curl
RUN apt-get update && apt-get install -y curl
# Download and make scripts executable
RUN curl -o datasets 'https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets'

RUN chmod +x datasets 

RUN mv datasets /usr/local/bin

COPY ./requirements.txt /server/requirements.txt

WORKDIR /server

RUN python -m pip install --upgrade pip

RUN pip install -r requirements.txt

COPY . /server

EXPOSE ${API_PORT}

CMD ["uwsgi", "app.ini"]





