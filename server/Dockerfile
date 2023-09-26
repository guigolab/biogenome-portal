FROM python:3.7.11-stretch

WORKDIR /server

ADD . /server
# RUN curl -O https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets

ADD https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets /server

RUN chmod +x datasets

RUN python -m pip install --upgrade pip

RUN pip install -r requirements.txt

EXPOSE ${API_PORT}

CMD ["uwsgi", "app.ini"]





