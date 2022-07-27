FROM node:latest as build-stage

ARG ROOT_NODE

ARG PROJECT_ACCESSION

ARG CESIUM_TOKEN

WORKDIR /client

COPY package*.json ./

RUN npm install

COPY . .

ENV VITE_ROOT_NODE=${ROOT_NODE}
ENV VITE_PROJECT_ACCESSION=${PROJECT_ACCESSION}
ENV VITE_CESIUM_TOKEN=${CESIUM_TOKEN}

RUN npm run build

# production stage
FROM nginx:stable-alpine

#  copy the nginx.conf in our filesystem into the image filesystem
COPY default.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build-stage /client/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
