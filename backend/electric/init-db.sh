#!/bin/bash
set -e

echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD=postgres psql -h postgres -U postgres -d rental -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "PostgreSQL is ready!"

echo "Running migrations..."
PGPASSWORD=postgres psql -h postgres -U postgres -d rental -f /migrations/0001_initial.sql

echo "Electrifying tables..."
PGPASSWORD=postgres psql -h postgres -U postgres -d rental <<EOF
ALTER TABLE users ENABLE ELECTRIC;
ALTER TABLE groups ENABLE ELECTRIC;
ALTER TABLE user_groups ENABLE ELECTRIC;
ALTER TABLE properties ENABLE ELECTRIC;
ALTER TABLE property_groups ENABLE ELECTRIC;
ALTER TABLE bookings ENABLE ELECTRIC;
ALTER TABLE photos ENABLE ELECTRIC;
ALTER TABLE logs ENABLE ELECTRIC;
EOF

echo "Database initialization complete!"


