import { Pool, PoolClient } from 'pg';
import { logError } from '../utils/errorLogger';

interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean | { rejectUnauthorized: boolean };
}

class DatabaseMonitor {
  private static instance: DatabaseMonitor;
  private pool: Pool | null = null;
  private client: PoolClient | null = null;
  private isMonitoring: boolean = false;
  private retryCount: number = 0;
  private readonly MAX_RETRIES = 5;
  private readonly HEALTH_CHECK_INTERVAL = 300000; // 5 minutes
  private healthCheckInterval: NodeJS.Timeout | null = null;

  private constructor() {}

  public static getInstance(): DatabaseMonitor {
    if (!DatabaseMonitor.instance) {
      DatabaseMonitor.instance = new DatabaseMonitor();
    }
    return DatabaseMonitor.instance;
  }

  private getConfig(): DatabaseConfig {
    return {
      user: 'skylabs',
      host: 'localhost',
      database: 'skylabs_dev',
      password: 'Fkhouch8',
      port: 5432,
      ssl: false
    };
  }

  private async connect(): Promise<PoolClient> {
    if (this.client) {
      return this.client;
    }

    const config = this.getConfig();
    this.pool = new Pool({
      ...config,
      max: 1, // Single connection for monitoring
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000
    });

    // Set up error handler for the pool
    this.pool.on('error', (err: Error) => {
      console.error('Unexpected error on idle client', err);
      this.handleError(err).catch((error: unknown) => {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error in pool error handler';
        console.error('❌ Error in pool error handler:', errorMessage);
      });
    });

    try {
      if (!this.pool) {
        throw new Error('Database pool is not initialized');
      }
      
      this.client = await this.pool.connect();
      console.log('✅ Database monitor connected');
      return this.client;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error connecting to database';
      console.error('❌ Failed to connect to database:', errorMessage);
      throw error;
    }
  }

  public async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      console.log('🔍 Database monitoring is already active');
      return;
    }

    try {
      await this.connect();
      this.isMonitoring = true;
      this.retryCount = 0;
      
      console.log('🚀 Starting database monitoring...');
      
      // Initial health check
      await this.checkHealth();
      
      // Schedule periodic health checks
      this.healthCheckInterval = setInterval(
        () => {
          this.checkHealth().catch(error => {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error in health check';
            console.error('❌ Error in scheduled health check:', errorMessage);
          });
        },
        this.HEALTH_CHECK_INTERVAL
      );
      
      console.log('✅ Database monitoring started');
    } catch (error: unknown) {
      this.isMonitoring = false;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error starting monitoring';
      console.error('❌ Failed to start database monitoring:', errorMessage);
      await this.handleError(error);
      throw error;
    }
  }

  private async checkHealth(): Promise<void> {
    try {
      const client = await this.connect();
      const result = await client.query<{ health_check: number }>('SELECT 1 as health_check');
      
      if (result.rows[0]?.health_check === 1) {
        this.retryCount = 0; // Reset retry count on success
        console.log('✅ Database health check passed');
        await this.updateTaskStatus('monitor_connection', '🟢 Healthy');
      } else {
        throw new Error('Unexpected health check result');
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error during health check';
      console.error('❌ Database health check failed:', errorMessage);
      await this.handleError(error);
    }
  }

  private async handleError(error: unknown): Promise<void> {
    this.retryCount++;
    
    // Log the error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorCode = error && typeof error === 'object' && 'code' in error 
      ? String(error.code) 
      : 'UNKNOWN';
      
    await logError(
      errorMessage,
      'Database Connection Error',
      'Database',
      '🔴 Critical',
      {
        retryCount: this.retryCount,
        maxRetries: this.MAX_RETRIES,
        errorCode,
        timestamp: new Date().toISOString()
      },
      'db_connection_error'
    );
    
    // Update task status
    await this.updateTaskStatus('monitor_connection', '🔴 Critical');
    
    if (this.retryCount > this.MAX_RETRIES) {
      console.error(`❌ Max retries (${this.MAX_RETRIES}) reached. Stopping monitoring.`);
      await this.stopMonitoring();
      return;
    }
    
    console.log(`🔄 Retrying connection (${this.retryCount}/${this.MAX_RETRIES})...`);
    
    // Wait before retrying (exponential backoff)
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // Try to reconnect
    try {
      await this.connect();
      this.retryCount = 0; // Reset on successful reconnect
      console.log('✅ Successfully reconnected to database');
      await this.updateTaskStatus('monitor_connection', '🟢 Healthy');
    } catch (err) {
      console.error('Failed to reconnect:', err);
    }
  }

  public async stopMonitoring(): Promise<void> {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
    
    this.isMonitoring = false;
    
    try {
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      
      console.log('✅ Database monitoring stopped');
      await this.updateTaskStatus('monitor_connection', '🟠 Paused');
    } catch (error) {
      console.error('Error stopping database monitoring:', error);
      throw error;
    }
  }

  public async getDatabaseStats(): Promise<{
    databaseSize: string;
    activeConnections: number;
    tables: Array<{ table_name: string; size: string; row_count: number }>;
  }> {
    const client = await this.connect();
    
    try {
      // Get database size
      interface SizeResult { size: string; }
      const sizeResult = await client.query<SizeResult>(
        'SELECT pg_size_pretty(pg_database_size(current_database())) as size'
      );
      
      // Get active connections
      interface ConnectionsResult { active_connections: string; }
      const connectionsResult = await client.query<ConnectionsResult>(
        'SELECT count(*) as active_connections FROM pg_stat_activity WHERE datname = current_database()'
      );
      
      // Get table statistics
      interface TableStats {
        table_name: string;
        size: string;
        row_count: number;
      }
      const tablesResult = await client.query<TableStats>(`
        SELECT 
          table_name,
          pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as size,
          pg_stat_get_live_tuples(table_name::regclass) as row_count
        FROM information_schema.tables
        WHERE table_schema = 'public'
        ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC
      `);
      
      if (!sizeResult.rows[0] || !connectionsResult.rows[0]) {
        throw new Error('Failed to retrieve database statistics');
      }
      
      return {
        databaseSize: sizeResult.rows[0].size,
        activeConnections: parseInt(connectionsResult.rows[0].active_connections, 10),
        tables: tablesResult.rows
      };
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error getting database stats';
      console.error('❌ Error getting database stats:', errorMessage);
      throw error;
    } finally {
      client.release();
    }
  }
  
  private async updateTaskStatus(taskId: string, status: string): Promise<void> {
    try {
      // This is a placeholder for updating a task in your TODO system
      // Replace with your actual implementation
      console.log(`[TODO] Would update task ${taskId} with status: ${status}`);
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  }
}

export const databaseMonitor = DatabaseMonitor.getInstance();
