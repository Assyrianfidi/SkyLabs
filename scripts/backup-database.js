// scripts/backup-database.js
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = {
  user: 'skylabs',
  host: 'localhost',
  database: 'skylabs_dev',
  password: 'Fkhouch8',
  port: 5432,
  backupDir: path.join(__dirname, '..', 'backups'),
  // Keep last 7 days of backups
  retentionDays: 7
};

async function createBackup() {
  try {
    // Create backup directory if it doesn't exist
    if (!fs.existsSync(config.backupDir)) {
      fs.mkdirSync(config.backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(config.backupDir, `backup-${timestamp}.sql`);
    
    // Build the pg_dump command
    const cmd = [
      `"C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe"`,
      `-U ${config.user}`,
      `-h ${config.host}`,
      `-p ${config.port}`,
      `-d ${config.database}`,
      `-f "${backupFile}"`,
      '--format=plain',
      '--no-owner',
      '--no-privileges',
      '--no-tablespaces',
      '--clean',
      '--if-exists',
      '--quote-all-identifiers',
      '--exclude-schema=pg_*',
      '--exclude-schema=information_schema'
    ].join(' ');

    // Set PGPASSWORD as an environment variable for the command
    const env = { ...process.env, PGPASSWORD: config.password };

    console.log(`💾 Creating backup: ${backupFile}`);
    const { stdout, stderr } = await execAsync(cmd, { env });
    
    if (stderr) {
      console.warn('⚠️ Warning during backup:', stderr);
    }
    
    console.log('✅ Backup completed successfully');
    
    // Clean up old backups
    await cleanOldBackups();
    
    return backupFile;
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

async function cleanOldBackups() {
  try {
    const files = fs.readdirSync(config.backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(config.backupDir, file),
        time: fs.statSync(path.join(config.backupDir, file)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Keep only the most recent N backups
    const toDelete = files.slice(config.retentionDays);
    
    for (const file of toDelete) {
      console.log(`🗑️  Removing old backup: ${file.name}`);
      fs.unlinkSync(file.path);
    }
    
    if (toDelete.length > 0) {
      console.log(`✅ Removed ${toDelete.length} old backup(s)`);
    }
  } catch (error) {
    console.warn('⚠️ Could not clean up old backups:', error.message);
  }
}

// Run the backup
createBackup().catch(process.exit);
