-- Create migration tracking table
CREATE TABLE IF NOT EXISTS pg_migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create error log table
CREATE TABLE IF NOT EXISTS error_logs (
  id VARCHAR(50) PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  category VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  context VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  stack_trace TEXT,
  metadata JSONB,
  task_id VARCHAR(50)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_error_logs_timestamp ON error_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_error_logs_severity ON error_logs(severity);
CREATE INDEX IF NOT EXISTS idx_error_logs_task_id ON error_logs(task_id);

-- Create health check history
CREATE TABLE IF NOT EXISTS health_check_history (
  id SERIAL PRIMARY KEY,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status BOOLEAN NOT NULL,
  details JSONB
);

-- Create function to log errors
CREATE OR REPLACE FUNCTION log_error(
  p_id VARCHAR(50),
  p_category VARCHAR(50),
  p_severity VARCHAR(20),
  p_context VARCHAR(100),
  p_message TEXT,
  p_stack_trace TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL,
  p_task_id VARCHAR(50) DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO error_logs (
    id, category, severity, context, 
    message, stack_trace, metadata, task_id
  ) VALUES (
    p_id, p_category, p_severity, p_context,
    p_message, p_stack_trace, p_metadata, p_task_id
  );
END;
$$ LANGUAGE plpgsql;
