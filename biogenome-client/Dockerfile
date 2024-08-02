FROM node:17 as build-stage

ARG ROOT_NODE

ARG CESIUM_TOKEN

ARG BASE_PATH

WORKDIR /client

COPY package*.json ./

RUN npm install --legacy-peer-deps

COPY . .

COPY ./ducd node_modules/ducd 

ENV VITE_ROOT_NODE=${ROOT_NODE}
ENV VITE_CESIUM_TOKEN=${CESIUM_TOKEN}
ENV VITE_BASE_PATH=${BASE_PATH}


RUN npm run build

# production stage
FROM nginx:stable-alpine

ARG BASE_PATH

# Copy the nginx templates
COPY root.template /etc/nginx/templates/root.template
COPY subpath.template /etc/nginx/templates/subpath.template

# Copy the script
COPY select-template.sh /usr/local/bin/select-template.sh

RUN chmod +x /usr/local/bin/select-template.sh

# Set the config file based on the build argument
RUN /usr/local/bin/select-template.sh

COPY --from=build-stage /client/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
