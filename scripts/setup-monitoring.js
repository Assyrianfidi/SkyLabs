// scripts/setup-monitoring.js
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'Fkhouch8',
  port: 5432,
  ssl: false
};

async function setupMonitoring() {
  const pool = new pg.Pool(config);
  const client = await pool.connect();

  try {
    console.log('🔍 Setting up database monitoring...');
    
    // Create monitoring schema if it doesn't exist
    await client.query(`
      CREATE SCHEMA IF NOT EXISTS monitoring;
      
      CREATE TABLE IF NOT EXISTS monitoring.query_metrics (
        id SERIAL PRIMARY KEY,
        query_text TEXT NOT NULL,
        execution_time_ms FLOAT NOT NULL,
        rows_returned INTEGER,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        application_name TEXT,
        parameters JSONB
      );
      
      CREATE INDEX IF NOT EXISTS idx_query_metrics_timestamp 
        ON monitoring.query_metrics(timestamp);
      
      CREATE TABLE IF NOT EXISTS monitoring.connection_metrics (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        active_connections INTEGER NOT NULL,
        max_connections INTEGER NOT NULL,
        connection_utilization FLOAT NOT NULL
      );
    `);

    // Create a function to log slow queries
    await client.query(`
      CREATE OR REPLACE FUNCTION monitoring.log_slow_query()
      RETURNS event_trigger AS $$
      DECLARE
        r RECORD;
      BEGIN
        FOR r IN SELECT * FROM pg_stat_statements 
                WHERE mean_exec_time > 1000  -- Log queries slower than 1 second
                ORDER BY mean_exec_time DESC 
                LIMIT 10
        LOOP
          INSERT INTO monitoring.query_metrics (
            query_text, 
            execution_time_ms, 
            rows_returned, 
            application_name
          ) VALUES (
            r.query,
            r.mean_exec_time,
            r.rows,
            r.application_name
          );
        END LOOP;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Enable pg_stat_statements extension if not enabled
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
    `);

    // Create a view for database stats
    await client.query(`
      CREATE OR REPLACE VIEW monitoring.database_stats AS
      SELECT 
        d.datname as database_name,
        pg_size_pretty(pg_database_size(d.datname)) as size,
        numbackends as active_connections,
        xact_commit as total_commits,
        xact_rollback as total_rollbacks,
        tup_returned as tuples_returned,
        tup_fetched as tuples_fetched,
        tup_inserted as tuples_inserted,
        tup_updated as tuples_updated,
        tup_deleted as tuples_deleted
      FROM pg_stat_database d
      JOIN pg_database db ON db.datname = d.datname
      WHERE d.datname = current_database();
    `);

    console.log('✅ Database monitoring setup completed');
    
    // Save monitoring configuration
    const monitoringConfig = {
      enabled: true,
      slow_query_threshold_ms: 1000,
      metrics_retention_days: 30,
      stats_collection_interval: '5 minutes',
      last_updated: new Date().toISOString()
    };
    
    const configPath = path.join(__dirname, '..', 'config', 'monitoring.json');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(monitoringConfig, null, 2));
    
    console.log('📝 Monitoring configuration saved to config/monitoring.json');
    
  } catch (error) {
    console.error('❌ Failed to setup monitoring:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setupMonitoring().catch(console.error);
