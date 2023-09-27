FROM python:3.7.11-alpine3.13

WORKDIR /cronjobs

ADD . /cronjobs

ADD https://ftp.ncbi.nlm.nih.gov/pub/datasets/command-line/v2/linux-amd64/datasets /ncbi/datasets

RUN chmod +x /ncbi/datasets

RUN pip install -r requirements.txt

RUN crontab crontab

CMD ["crond", "-f"]