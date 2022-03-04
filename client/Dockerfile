FROM node@sha256:8229a1f3580d32fa18b2304fa23df6e9e3d53fdb958fd8ffe812ca7a0a26bb69 as build-stage

WORKDIR /client

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM nginx:stable-alpine

#  copy the nginx.conf in our filesystem into the image filesystem
COPY default.conf.template /etc/nginx/templates/default.conf.template

COPY --from=build-stage /client/dist /usr/share/nginx/html

CMD ["nginx", "-g", "daemon off;"]
