FROM node:17 as build-stage

ARG ROOT_NODE

ARG PROJECT_ACCESSION

ARG CESIUM_TOKEN

ARG BASE_PATH

WORKDIR /client

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

COPY ./ducd node_modules/ducd 

ENV VITE_ROOT_NODE=${ROOT_NODE}
ENV VITE_PROJECT_ACCESSION=${PROJECT_ACCESSION}
ENV VITE_CESIUM_TOKEN=${CESIUM_TOKEN}
ENV VITE_BASE_PATH=${BASE_PATH}


RUN npm run build

# production stage
FROM nginx:stable-alpine

#  copy the nginx.conf in our filesystem into the image filesystem
COPY default.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build-stage /client/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
