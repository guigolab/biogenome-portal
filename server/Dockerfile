FROM python:3.7.11-stretch

WORKDIR /server

ADD ./requirements.txt /server/requirements.txt

ADD . /server

RUN python -m pip install --upgrade pip

RUN pip install -r requirements.txt

EXPOSE ${API_PORT}

CMD ["uwsgi", "app.ini"]





