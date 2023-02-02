FROM python:latest

WORKDIR /server

ADD . /server

RUN python -m pip install --upgrade pip

RUN pip install -r requirements.txt

EXPOSE ${API_PORT}

CMD ["uwsgi", "app.ini"]





