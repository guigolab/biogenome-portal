FROM python:3.7.11


RUN apt-get update && apt-get -y install cron vim

COPY ./requirements.txt /cronjobs/requirements.txt

COPY ./crontab /etc/cron.d/crontab

RUN chmod 0644 /etc/cron.d/crontab

WORKDIR /cronjobs

RUN pip3 install -r requirements.txt

COPY . /cronjobs

COPY ./datasets /ncbi/datasets

COPY ./countries.json /countries/countries.json

RUN chmod +x /ncbi/datasets

RUN /usr/bin/crontab /etc/cron.d/crontab

CMD ["/bin/bash", "-c", "printenv > /etc/environment && cron -f"]
