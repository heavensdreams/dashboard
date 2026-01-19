#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD=postgres psql -h postgres -U postgres -d rental -c '\q' 2>/dev/null; do
  sleep 1
done

echo "Waiting for tables to be created..."
sleep 5

echo "Electrifying tables..."
PGPASSWORD=postgres psql -h postgres -U postgres -d rental <<EOF
ALTER TABLE IF EXISTS users ENABLE ELECTRIC;
ALTER TABLE IF EXISTS groups ENABLE ELECTRIC;
ALTER TABLE IF EXISTS user_groups ENABLE ELECTRIC;
ALTER TABLE IF EXISTS properties ENABLE ELECTRIC;
ALTER TABLE IF EXISTS property_groups ENABLE ELECTRIC;
ALTER TABLE IF EXISTS bookings ENABLE ELECTRIC;
ALTER TABLE IF EXISTS photos ENABLE ELECTRIC;
ALTER TABLE IF EXISTS logs ENABLE ELECTRIC;
EOF

echo "Tables electrified!"


