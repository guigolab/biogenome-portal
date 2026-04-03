FROM nginx:stable-alpine

# Some nginx image variants omit this dir; 05-select copies default.conf.template here before envsubst.
RUN mkdir -p /etc/nginx/templates

COPY nginx-available/ /etc/nginx/available/
COPY docker-entrypoint.d/05-select-nginx-template.sh /docker-entrypoint.d/05-select-nginx-template.sh
RUN chmod +x /docker-entrypoint.d/05-select-nginx-template.sh
