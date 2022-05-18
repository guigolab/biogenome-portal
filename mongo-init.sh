set -e

printenv
mongo <<EOF

use admin

db.auth('$MONGO_INITDB_ROOT_USERNAME','$MONGO_INITDB_ROOT_PASSWORD')

db.getSiblingDB('$DB_NAME')

db.createUser({
  user: '$DB_USER',
  pwd:  '$DB_PASS',
  roles: [{
    role: 'readWrite',
    db: '$DB_NAME'
  }]
})
EOF