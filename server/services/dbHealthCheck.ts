import { logError } from '../utils/errorLogger.js';
import postgres from 'postgres';

interface TableInfo {
  table_name: string;
  row_count: number;
  size_mb: number;
}

export class DBHealthCheck {
  private static instance: DBHealthCheck;
  private connection: any;
  private isChecking: boolean = false;

  private constructor() {}

  public static getInstance(): DBHealthCheck {
    if (!DBHealthCheck.instance) {
      DBHealthCheck.instance = new DBHealthCheck();
    }
    return DBHealthCheck.instance;
  }

  public async initialize(connectionString: string): Promise<void> {
    this.connection = postgres(connectionString);
  }

  public async checkConnection(): Promise<boolean> {
    try {
      await this.connection`SELECT 1`;
      return true;
    } catch (error) {
      await logError(
        error as Error,
        'Database Connection Check',
        'Database',
        '🔴 Critical',
        { action: 'Connection test failed' },
        'health_checks'
      );
      return false;
    }
  }

  public async getTableInfo(): Promise<TableInfo[]> {
    try {
      // First get all tables
      const tables = await this.connection`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public';
      `;
      
      // Then get info for each table
      const result = [];
      for (const { table_name } of tables) {
        const [info] = await this.connection`
          SELECT 
            ${table_name} as table_name,
            pg_size_pretty(pg_total_relation_size(${table_name}::regclass)) as size,
            (SELECT count(*) FROM ${this.connection.unsafe.raw(table_name)}) as row_count
        `;
        if (info) result.push(info);
      }
      
      return result.map((row: any) => ({
        table_name: row.table_name,
        row_count: parseInt(row.row_count, 10),
        size_mb: parseFloat(row.size.replace(/[^0-9.]/g, '')) * 
                 (row.size.includes('GB') ? 1024 : row.size.includes('MB') ? 1 : 0.001)
      }));
    } catch (error) {
      await logError(
        error as Error,
        'Database Table Check',
        'Database',
        '🟠 Major',
        { action: 'Failed to get table info' },
        'health_checks'
      );
      return [];
    }
  }

  public async checkForOrphanedRecords(): Promise<{table: string, count: number}[]> {
    // Implement specific checks for your data model
    // This is a placeholder that should be customized
    return [];
  }

  public async runFullCheck(): Promise<{
    connection: boolean;
    tables: TableInfo[];
    issues: string[];
  }> {
    if (this.isChecking) {
      throw new Error('Health check already in progress');
    }

    this.isChecking = true;
    const issues: string[] = [];

    try {
      // Check connection
      const isConnected = await this.checkConnection();
      if (!isConnected) {
        issues.push('Database connection failed');
        return { connection: false, tables: [], issues };
      }

      // Get table info
      const tables = await this.getTableInfo();
      
      // Check for empty tables that shouldn't be empty
      const emptyTables = tables.filter(t => t.row_count === 0);
      if (emptyTables.length > 0) {
        issues.push(`Warning: Found ${emptyTables.length} empty tables`);
      }

      // Check for large tables that might need optimization
      const largeTables = tables.filter(t => t.size_mb > 100); // 100MB threshold
      if (largeTables.length > 0) {
        issues.push(`Warning: ${largeTables.length} tables exceed 100MB in size`);
      }

      // Check for orphaned records
      const orphanedRecords = await this.checkForOrphanedRecords();
      if (orphanedRecords.length > 0) {
        issues.push(`Found ${orphanedRecords.length} tables with orphaned records`);
      }

      return { connection: true, tables, issues };
    } catch (error) {
      await logError(
        error as Error,
        'Database Health Check',
        'Database',
        '🔴 Critical',
        { action: 'Full health check failed' },
        'health_checks'
      );
      throw error;
    } finally {
      this.isChecking = false;
    }
  }

  public async close(): Promise<void> {
    if (this.connection) {
      await this.connection.end();
    }
  }
}

export const dbHealthCheck = DBHealthCheck.getInstance();
