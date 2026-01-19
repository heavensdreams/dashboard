#!/bin/bash
echo "=== Testing Electric SQL Setup ==="
echo ""

echo "1. Checking container status..."
docker-compose ps

echo ""
echo "2. Checking PostgreSQL tables..."
docker exec rental-postgres psql -U postgres -d rental -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;"

echo ""
echo "3. Checking replication slot..."
docker exec rental-postgres psql -U postgres -d rental -c "SELECT slot_name, active FROM pg_replication_slots;"

echo ""
echo "4. Checking Electric logs..."
docker-compose logs electric 2>&1 | tail -10

echo ""
echo "5. Testing data insertion..."
docker exec rental-postgres psql -U postgres -d rental -c "INSERT INTO users (email, password, role) VALUES ('electric-test@example.com', 'test123', 'normal') ON CONFLICT DO NOTHING RETURNING id, email;"

echo ""
echo "6. Verifying data..."
docker exec rental-postgres psql -U postgres -d rental -c "SELECT COUNT(*) as total_users FROM users;"

echo ""
echo "=== Test Complete ==="


