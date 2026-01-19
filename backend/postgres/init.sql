-- Run migrations
\i /docker-entrypoint-initdb.d/migrations/0001_initial.sql

-- Electrify tables (this will be done after Electric starts)
-- ALTER TABLE users ENABLE ELECTRIC;
-- ALTER TABLE groups ENABLE ELECTRIC;
-- ALTER TABLE user_groups ENABLE ELECTRIC;
-- ALTER TABLE properties ENABLE ELECTRIC;
-- ALTER TABLE property_groups ENABLE ELECTRIC;
-- ALTER TABLE bookings ENABLE ELECTRIC;
-- ALTER TABLE photos ENABLE ELECTRIC;
-- ALTER TABLE logs ENABLE ELECTRIC;


