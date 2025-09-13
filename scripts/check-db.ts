#!/usr/bin/env node
import { dbHealthCheck } from '../server/services/dbHealthCheck.js';
import { logError } from '../server/utils/errorLogger.js';

async function checkDatabase() {
  console.log('🔍 Starting database health check...');
  
  try {
    // Initialize health check
    await dbHealthCheck.initialize(process.env.DATABASE_URL || '');
    
    // Run full health check
    const health = await dbHealthCheck.runFullCheck();
    
    // Output results
    console.log('\n📊 Database Health Report');
    console.log('='.repeat(40));
    console.log(`✅ Connection: ${health.connection ? 'Healthy' : 'Unhealthy'}`);
    
    if (health.tables.length > 0) {
      console.log('\n📋 Tables:');
      console.log('-'.repeat(40));
      console.log('Table Name'.padEnd(30) + 'Rows'.padStart(10) + 'Size'.padStart(15));
      console.log('-'.repeat(55));
      
      for (const table of health.tables) {
        console.log(
          table.table_name.padEnd(30) + 
          table.row_count.toString().padStart(10) + 
          `${table.size_mb.toFixed(2)} MB`.padStart(15)
        );
      }
    }
    
    if (health.issues.length > 0) {
      console.log('\n⚠️  Issues Found:');
      console.log('-'.repeat(40));
      health.issues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue}`);
      });
    }
    
    console.log('\n' + '='.repeat(40));
    console.log(health.issues.length > 0 ? '❌ Issues detected' : '✅ All checks passed');
    
    process.exit(health.issues.length > 0 ? 1 : 0);
  } catch (error) {
    console.error('❌ Error during database check:', error);
    await logError(
      error as Error,
      'Database Check Script',
      'System',
      '🔴 Critical',
      { action: 'Database health check failed' },
      'health_checks'
    );
    process.exit(1);
  }
}

// Run the check
checkDatabase().catch(console.error);
