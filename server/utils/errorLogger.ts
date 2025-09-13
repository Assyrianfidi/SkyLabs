import { writeFile, access, constants } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { format } from 'date-fns';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ErrorDetails {
  timestamp: string;
  message: string;
  stack?: string;
  status?: number;
  code?: string;
  category?: string;
  severity?: '🔴 Critical' | '🟠 Major' | '🟡 Minor' | '🟢 Info' | '🔵 Debug';
  cause?: string;
  suggestion?: string;
  metadata?: Record<string, any>;
  taskId?: string;
  [key: string]: any;
}

export async function logError(
  error: Error | string,
  context: string = 'Application',
  category: string = 'General',
  severity: '🔴 Critical' | '🟠 Major' | '🟡 Minor' | '🟢 Info' | '🔵 Debug' = '🔴 Critical',
  metadata: Record<string, any> = {},
  taskId?: string
): Promise<string> {
  try {
    const timestamp = new Date();
    const errorId = `err-${timestamp.getTime()}-${Math.random().toString(36).substr(2, 5)}`;
    
    const errorObj: ErrorDetails = {
      id: errorId,
      timestamp: timestamp.toISOString(),
      category,
      severity,
      context,
      message: typeof error === 'string' ? error : error.message,
      ...(typeof error !== 'string' && error.stack ? { stack: error.stack } : {}),
      ...(taskId ? { taskId } : {}),
      ...(metadata ? { metadata } : {})
    };

    // Format markdown entry
    const logEntry = `\n## ${severity} ${category} Error (${format(timestamp, 'yyyy-MM-dd HH:mm:ss')})
**ID:** \`${errorId}\`  
**Context:** ${context}  
**Task:** ${taskId ? `[#${taskId}](./TODO.md#${taskId})` : 'N/A'}

### Details
\`\`\`json\n${JSON.stringify({
      message: errorObj.message,
      ...(errorObj.metadata ? { metadata: errorObj.metadata } : {})
    }, null, 2)}\n\`\`\`

${errorObj.stack ? `### Stack Trace\n\`\`\`\n${errorObj.stack}\n\`\`\`\n` : ''}
---\n`;

    // Append to error log
    await writeFile(
      join(__dirname, '..', '..', 'ERROR_LOG.md'),
      logEntry,
      { flag: 'a' }
    );

    // Update TODO.md if taskId is provided
    if (taskId) {
      await updateTodoTask(taskId, errorObj);
    }

    return errorId;
  } catch (logError) {
    console.error('Failed to write to error log:', logError);
    return 'error-log-failed';
  }
}

async function updateTodoTask(taskId: string, errorDetails: ErrorDetails): Promise<void> {
  try {
    const todoPath = join(process.cwd(), 'TODO.md');
    
    // Just log that we would update the TODO file
    console.log(`[TODO] Would update task ${taskId} with status: ${errorDetails.severity || 'info'}`);
    
    // For now, we'll just create a TODO file if it doesn't exist
    try {
      await access(todoPath, constants.F_OK);
    } catch {
      await writeFile(todoPath, '# SkyLabs Project\n\n## [ ] monitor_connection\n- Monitor database connection status\n- Alert on connection issues\n\n## [ ] database_schema\n- Monitor database schema changes\n- Apply migrations when needed', 'utf-8');
    }
  } catch (error) {
    console.error('Failed to update TODO.md:', error);
  }
}

export function createError(
  message: string, 
  statusCode: number = 500, 
  details?: any
): Error & { statusCode: number; details?: any } {
  const error = new Error(message) as Error & { statusCode: number; details?: any };
  error.statusCode = statusCode;
  if (details) {
    error.details = details;
  }
  return error;
}
