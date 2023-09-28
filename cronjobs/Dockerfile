FROM python:3.7.11


RUN apt-get update && apt-get -y install cron vim
WORKDIR /cronjobs
RUN pip3 install numpy

ADD ./crontab /etc/cron.d/crontab
RUN chmod 0644 /etc/cron.d/crontab
ADD . /cronjobs

ADD https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets /ncbi/datasets

RUN chmod +x /ncbi/datasets

RUN pip3 install -r requirements.txt


RUN printenv > /etc/environment

RUN /usr/bin/crontab /etc/cron.d/crontab

CMD ["/bin/bash", "-c", "printenv > /etc/environment && cron -f"]
