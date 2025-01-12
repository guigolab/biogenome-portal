FROM node:17 as build-stage

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

# production stage
FROM nginx:stable-alpine

COPY --from=build-stage /app/dist /usr/share/nginx/html
