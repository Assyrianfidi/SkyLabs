import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

async function generateTypes() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const connectionString = process.env.DATABASE_URL;
  const sql = postgres(connectionString, { max: 1 });
  const db = drizzle(sql);

  try {
    // Generate TypeScript types from the database
    const result = await sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable,
        column_default,
        character_maximum_length,
        udt_name
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = 'public'
      ORDER BY 
        table_name, 
        ordinal_position;
    `;

    // Process the result to generate TypeScript interfaces
    const tables: Record<string, any> = {};
    
    result.forEach(row => {
      const tableName = row.table_name;
      if (!tables[tableName]) {
        tables[tableName] = [];
      }
      
      tables[tableName].push({
        name: row.column_name,
        type: mapPgTypeToTs(row.udt_name, row.is_nullable === 'YES'),
        nullable: row.is_nullable === 'YES',
        default: row.column_default,
        maxLength: row.character_maximum_length
      });
    });

    // Generate TypeScript interfaces
    let typesContent = '// Auto-generated TypeScript types from database schema\n\n';
    
    Object.entries(tables).forEach(([tableName, columns]) => {
      const interfaceName = toPascalCase(tableName);
      
      typesContent += `export interface ${interfaceName} {\n`;
      
      columns.forEach((column: any) => {
        const optional = column.nullable ? '?' : '';
        typesContent += `  ${column.name}${optional}: ${column.type};\n`;
      });
      
      typesContent += '}\n\n';
    });

    // Ensure the shared directory exists
    const sharedDir = join(process.cwd(), 'shared');
    if (!existsSync(sharedDir)) {
      mkdirSync(sharedDir, { recursive: true });
    }

    // Write the generated types to a file
    const outputPath = join(sharedDir, 'db-types.ts');
    writeFileSync(outputPath, typesContent);
    
    console.log(`✅ Successfully generated types in ${outputPath}`);
  } catch (error) {
    console.error('Error generating types:', error);
    process.exit(1);
  } finally {
    await sql.end();
    process.exit(0);
  }
}

function mapPgTypeToTs(pgType: string, nullable: boolean): string {
  const typeMap: Record<string, string> = {
    'int4': 'number',
    'int8': 'bigint',
    'float4': 'number',
    'float8': 'number',
    'numeric': 'number',
    'bool': 'boolean',
    'json': 'Record<string, any>',
    'jsonb': 'Record<string, any>',
    'text': 'string',
    'varchar': 'string',
    'uuid': 'string',
    'timestamp': 'Date',
    'timestamptz': 'Date',
    'date': 'Date',
    'time': 'string',
    'timetz': 'string',
    'bpchar': 'string',
    'bytea': 'Buffer',
  };

  const tsType = typeMap[pgType] || 'unknown';
  return nullable ? `${tsType} | null` : tsType;
}

function toPascalCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join('');
}

generateTypes().catch(console.error);
