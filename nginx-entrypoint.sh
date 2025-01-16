#!/bin/sh

# Print the value of BASE_PATH for debugging
echo "BASE_PATH is: $BASE_PATH"

# Step 1: Select the appropriate template based on BASE_PATH
if [ -z "$BASE_PATH" ]; then
    echo "BASE_PATH is empty or not set. Using root.template."
    cp /etc/nginx/templates/root.template /etc/nginx/templates/default.conf.template
else
    echo "BASE_PATH is set to: $BASE_PATH. Using subpath.template."
    cp /etc/nginx/templates/subpath.template /etc/nginx/templates/default.conf.template
fi

# Step 2: Initialize configuration variables
CMS_CONFIG=""
GENOME_BROWSER_CONFIG=""
PORTAL_CONFIG=""

# Step 3: Dynamically include modules
if [ -d "/usr/share/nginx/html/cms" ]; then
    CMS_CONFIG="location ${BASE_PATH}/cms/ {
        root /usr/share/nginx/html;
        index index.html;
        try_files \$uri /index.html;
        client_max_body_size 1000M;

    }"
fi

if [ -d "/usr/share/nginx/html/genome-browser" ]; then
    GENOME_BROWSER_CONFIG="location ${BASE_PATH}/genome-browser/ {
        root /usr/share/nginx/html;
        index index.html;
        try_files \$uri /index.html;
    }"
fi

if [ -d "/usr/share/nginx/html/portal" ]; then
    PORTAL_CONFIG="location ${BASE_PATH}/portal/ {
        root /usr/share/nginx/html;
        index index.html;
        try_files \$uri /index.html;
    }"
fi

# Step 4: Replace placeholders in the selected template
envsubst '${CMS_CONFIG} ${GENOME_BROWSER_CONFIG} ${PORTAL_CONFIG} ${BASE_PATH} ${API_PORT} ${API_HOST}' \
  < /etc/nginx/templates/default.conf.template > /etc/nginx/nginx.conf

# Step 5: Start Nginx
exec "$@"
