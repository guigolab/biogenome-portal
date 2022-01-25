FROM python:3.6-stretch

WORKDIR /server

ADD ./server /server


RUN python -m pip install --upgrade pip

RUN pip install -r requirements.txt

CMD ["uwsgi", "app.ini"]





