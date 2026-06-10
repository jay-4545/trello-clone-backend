-- postgres/init.sql
-- Runs once on first container start.

-- Enable useful extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";       -- trigram indexes for ILIKE search
CREATE EXTENSION IF NOT EXISTS "btree_gin";     -- GIN on regular columns

-- Tune for concurrent connections (override in postgresql.conf for production)
ALTER SYSTEM SET max_connections            = '200';
ALTER SYSTEM SET shared_buffers             = '256MB';
ALTER SYSTEM SET effective_cache_size       = '768MB';
ALTER SYSTEM SET maintenance_work_mem       = '64MB';
ALTER SYSTEM SET checkpoint_completion_target = '0.9';
ALTER SYSTEM SET wal_buffers                = '16MB';
ALTER SYSTEM SET default_statistics_target  = '100';
ALTER SYSTEM SET random_page_cost           = '1.1';
ALTER SYSTEM SET effective_io_concurrency   = '200';
ALTER SYSTEM SET work_mem                   = '4MB';
ALTER SYSTEM SET min_wal_size               = '1GB';
ALTER SYSTEM SET max_wal_size               = '4GB';
SELECT pg_reload_conf();