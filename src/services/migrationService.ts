/**
 * Database Schema Verification Service
 * 
 * Provides table existence checking, column verification for events table,
 * and schema health reporting functionality for database integrity.
 */

import { supabase } from '../lib/supabase';
import { ErrorService } from './errorService';

export interface TableSchema {
  tableName: string;
  columns: ColumnDefinition[];
  indexes?: IndexDefinition[];
  constraints?: ConstraintDefinition[];
}

export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue?: any;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
}

export interface ConstraintDefinition {
  name: string;
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
  definition: string;
}

export interface SchemaHealthReport {
  tables: {
    [tableName: string]: {
      exists: boolean;
      columns: string[];
      missingColumns: string[];
      extraColumns: string[];
      issues: string[];
    };
  };
  recommendations: string[];
  overallHealth: 'healthy' | 'warning' | 'critical';
  lastChecked: string;
}

export interface MigrationResult {
  success: boolean;
  message: string;
  details?: any;
  rollbackSql?: string;
}

/**
 * Database Migration and Schema Verification Service
 */
export class MigrationService {
  // Expected schema definitions
  private static readonly EXPECTED_SCHEMAS: Record<string, TableSchema> = {
    users: {
      tableName: 'users',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
        { name: 'full_name', type: 'text', nullable: false },
        { name: 'avatar_url', type: 'text', nullable: true },
        { name: 'user_type', type: 'text', nullable: false },
        { name: 'username', type: 'text', nullable: true },
        { name: 'status', type: 'text', nullable: true },
        { name: 'bio', type: 'text', nullable: true },
        { name: 'skills', type: 'text[]', nullable: true },
        { name: 'social_links', type: 'jsonb', nullable: true },
        { name: 'location', type: 'text', nullable: true },
        { name: 'website', type: 'text', nullable: true },
        { name: 'profile_completion_score', type: 'integer', nullable: true },
        { name: 'created_at', type: 'timestamptz', nullable: true },
        { name: 'updated_at', type: 'timestamptz', nullable: true },
      ],
    },
    ngo_profiles: {
      tableName: 'ngo_profiles',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
        { name: 'user_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'users', column: 'id' } },
        { name: 'name', type: 'text', nullable: false },
        { name: 'description', type: 'text', nullable: false },
        { name: 'logo_url', type: 'text', nullable: true },
        { name: 'website', type: 'text', nullable: true },
        { name: 'cause_areas', type: 'text[]', nullable: false },
        { name: 'address', type: 'text', nullable: true },
        { name: 'city', type: 'text', nullable: true },
        { name: 'state', type: 'text', nullable: true },
        { name: 'country', type: 'text', nullable: true },
        { name: 'postal_code', type: 'text', nullable: true },
        { name: 'latitude', type: 'double precision', nullable: true },
        { name: 'longitude', type: 'double precision', nullable: true },
        { name: 'service_radius_km', type: 'integer', nullable: true },
        { name: 'created_at', type: 'timestamptz', nullable: true },
        { name: 'updated_at', type: 'timestamptz', nullable: true },
      ],
    },
    events: {
      tableName: 'events',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
        { name: 'ngo_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'ngo_profiles', column: 'id' } },
        { name: 'title', type: 'text', nullable: false },
        { name: 'description', type: 'text', nullable: false },
        { name: 'date', type: 'timestamptz', nullable: false },
        { name: 'location', type: 'text', nullable: false },
        { name: 'address', type: 'text', nullable: true },
        { name: 'city', type: 'text', nullable: true },
        { name: 'state', type: 'text', nullable: true },
        { name: 'latitude', type: 'double precision', nullable: true },
        { name: 'longitude', type: 'double precision', nullable: true },
        { name: 'slots_available', type: 'integer', nullable: false },
        { name: 'image_url', type: 'text', nullable: true },
        { name: 'created_at', type: 'timestamptz', nullable: true },
        { name: 'updated_at', type: 'timestamptz', nullable: true },
      ],
    },
    event_registrations: {
      tableName: 'event_registrations',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
        { name: 'event_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'events', column: 'id' } },
        { name: 'user_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'users', column: 'id' } },
        { name: 'status', type: 'text', nullable: false },
        { name: 'created_at', type: 'timestamptz', nullable: true },
        { name: 'updated_at', type: 'timestamptz', nullable: true },
      ],
    },
    ngo_enrollments: {
      tableName: 'ngo_enrollments',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
        { name: 'ngo_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'ngo_profiles', column: 'id' } },
        { name: 'user_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'users', column: 'id' } },
        { name: 'status', type: 'text', nullable: false },
        { name: 'created_at', type: 'timestamptz', nullable: true },
        { name: 'updated_at', type: 'timestamptz', nullable: true },
      ],
    },
    user_preferences: {
      tableName: 'user_preferences',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
        { name: 'user_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'users', column: 'id' } },
        { name: 'preferences', type: 'jsonb', nullable: false },
        { name: 'created_at', type: 'timestamptz', nullable: true },
        { name: 'updated_at', type: 'timestamptz', nullable: true },
      ],
    },
    certificate_templates: {
      tableName: 'certificate_templates',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
        { name: 'ngo_id', type: 'uuid', nullable: false, isForeignKey: true, references: { table: 'ngo_profiles', column: 'id' } },
        { name: 'name', type: 'text', nullable: false },
        { name: 'template_data', type: 'jsonb', nullable: false },
        { name: 'backdrop_url', type: 'text', nullable: true },
        { name: 'is_default', type: 'boolean', nullable: false, defaultValue: false },
        { name: 'created_at', type: 'timestamptz', nullable: true },
        { name: 'updated_at', type: 'timestamptz', nullable: true },
      ],
    },
  };

  /**
   * Verifies if a table exists in the database
   */
  static async verifyTableExists(tableName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .maybeSingle();

      if (error) {
        // Fallback: try to query the table directly
        const { error: queryError } = await supabase
          .from(tableName)
          .select('*')
          .limit(1);

        return !queryError || !queryError.message.includes('does not exist');
      }

      return data !== null;
    } catch (error) {
      ErrorService.logError(
        error instanceof Error ? error : new Error(String(error)),
        'MigrationService.verifyTableExists',
        { tableName }
      );
      return false;
    }
  }

  /**
   * Verifies if a column exists in a table
   */
  static async verifyColumnExists(tableName: string, columnName: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .eq('column_name', columnName)
        .maybeSingle();

      if (error) {
        // Fallback: try to select the column
        const { error: queryError } = await supabase
          .from(tableName)
          .select(columnName)
          .limit(1);

        return !queryError || !queryError.message.includes('does not exist');
      }

      return data !== null;
    } catch (error) {
      ErrorService.logError(
        error instanceof Error ? error : new Error(String(error)),
        'MigrationService.verifyColumnExists',
        { tableName, columnName }
      );
      return false;
    }
  }

  /**
   * Gets the actual columns for a table
   */
  static async getTableColumns(tableName: string): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('information_schema.columns')
        .select('column_name')
        .eq('table_schema', 'public')
        .eq('table_name', tableName)
        .order('ordinal_position');

      if (error) {
        throw error;
      }

      return data?.map(row => row.column_name) || [];
    } catch (error) {
      ErrorService.logError(
        error instanceof Error ? error : new Error(String(error)),
        'MigrationService.getTableColumns',
        { tableName }
      );
      return [];
    }
  }

  /**
   * Gets comprehensive schema health report
   */
  static async getSchemaHealth(): Promise<SchemaHealthReport> {
    const report: SchemaHealthReport = {
      tables: {},
      recommendations: [],
      overallHealth: 'healthy',
      lastChecked: new Date().toISOString(),
    };

    let criticalIssues = 0;
    let warnings = 0;

    try {
      for (const [tableName, expectedSchema] of Object.entries(this.EXPECTED_SCHEMAS)) {
        const tableExists = await this.verifyTableExists(tableName);
        
        if (!tableExists) {
          report.tables[tableName] = {
            exists: false,
            columns: [],
            missingColumns: expectedSchema.columns.map(col => col.name),
            extraColumns: [],
            issues: ['Table does not exist'],
          };
          
          criticalIssues++;
          report.recommendations.push(`Create missing table: ${tableName}`);
          continue;
        }

        const actualColumns = await this.getTableColumns(tableName);
        const expectedColumns = expectedSchema.columns.map(col => col.name);
        
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        const extraColumns = actualColumns.filter(col => !expectedColumns.includes(col));
        
        const issues: string[] = [];
        
        if (missingColumns.length > 0) {
          issues.push(`Missing columns: ${missingColumns.join(', ')}`);
          warnings += missingColumns.length;
          report.recommendations.push(`Add missing columns to ${tableName}: ${missingColumns.join(', ')}`);
        }

        if (extraColumns.length > 0) {
          issues.push(`Extra columns found: ${extraColumns.join(', ')}`);
        }

        // Check for critical missing columns
        const criticalColumns = expectedSchema.columns
          .filter(col => col.isPrimaryKey || (col.isForeignKey && !col.nullable))
          .map(col => col.name);
        
        const missingCriticalColumns = criticalColumns.filter(col => missingColumns.includes(col));
        if (missingCriticalColumns.length > 0) {
          criticalIssues++;
          issues.push(`Missing critical columns: ${missingCriticalColumns.join(', ')}`);
        }

        report.tables[tableName] = {
          exists: true,
          columns: actualColumns,
          missingColumns,
          extraColumns,
          issues,
        };
      }

      // Determine overall health
      if (criticalIssues > 0) {
        report.overallHealth = 'critical';
      } else if (warnings > 0) {
        report.overallHealth = 'warning';
      }

      // Add general recommendations
      if (report.overallHealth !== 'healthy') {
        report.recommendations.push('Run database migrations to fix schema issues');
        report.recommendations.push('Backup database before making schema changes');
      }

    } catch (error) {
      ErrorService.logError(
        error instanceof Error ? error : new Error(String(error)),
        'MigrationService.getSchemaHealth'
      );
      
      report.overallHealth = 'critical';
      report.recommendations.push('Unable to verify schema health - check database connection');
    }

    return report;
  }

  /**
   * Creates missing tables with proper schema
   */
  static async createMissingTable(tableName: string): Promise<MigrationResult> {
    try {
      const schema = this.EXPECTED_SCHEMAS[tableName];
      if (!schema) {
        throw new Error(`No schema definition found for table: ${tableName}`);
      }

      const exists = await this.verifyTableExists(tableName);
      if (exists) {
        return {
          success: true,
          message: `Table ${tableName} already exists`,
        };
      }

      // Generate CREATE TABLE SQL
      const createSql = this.generateCreateTableSql(schema);

      // Provide manual migration instructions
      return {
        success: false,
        message: `Table creation requires database admin privileges. Please execute the following SQL in your Supabase SQL editor:`,
        details: {
          sql: createSql,
          instructions: [
            '1. Go to your Supabase project dashboard',
            '2. Navigate to the SQL Editor',
            '3. Execute the provided SQL statement',
            '4. Verify the table was created successfully'
          ]
        },
        rollbackSql: `DROP TABLE IF EXISTS ${tableName};`,
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ErrorService.logError(
        error instanceof Error ? error : new Error(errorMessage),
        'MigrationService.createMissingTable',
        { tableName }
      );

      return {
        success: false,
        message: `Failed to create table ${tableName}: ${errorMessage}`,
        details: {
          troubleshooting: [
            'Check your database connection',
            'Verify you have the necessary permissions',
            'Ensure the schema definition is correct',
            'Try running the SQL manually in Supabase SQL Editor'
          ]
        }
      };
    }
  }

  /**
   * Adds missing columns to existing table
   */
  static async addMissingColumns(tableName: string, columns: string[]): Promise<MigrationResult> {
    try {
      const schema = this.EXPECTED_SCHEMAS[tableName];
      if (!schema) {
        throw new Error(`No schema definition found for table: ${tableName}`);
      }

      const alterSqls: string[] = [];
      const rollbackSqls: string[] = [];

      for (const columnName of columns) {
        const columnDef = schema.columns.find(col => col.name === columnName);
        if (!columnDef) {
          continue;
        }

        const alterSql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef.type}${columnDef.nullable ? '' : ' NOT NULL'}${columnDef.defaultValue !== undefined ? ` DEFAULT ${columnDef.defaultValue}` : ''};`;
        const rollbackSql = `ALTER TABLE ${tableName} DROP COLUMN IF EXISTS ${columnName};`;

        alterSqls.push(alterSql);
        rollbackSqls.push(rollbackSql);
      }

      return {
        success: false,
        message: `Column addition requires database admin privileges. SQL: ${alterSqls.join(' ')}`,
        details: { sql: alterSqls },
        rollbackSql: rollbackSqls.join(' '),
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      ErrorService.logError(
        error instanceof Error ? error : new Error(errorMessage),
        'MigrationService.addMissingColumns',
        { tableName, columns }
      );

      return {
        success: false,
        message: `Failed to add columns to ${tableName}: ${errorMessage}`,
      };
    }
  }

  /**
   * Validates data integrity for a table
   */
  static async validateDataIntegrity(tableName: string): Promise<{
    isValid: boolean;
    issues: string[];
    recordCount: number;
  }> {
    try {
      const { count, error } = await supabase
        .from(tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw error;
      }

      const issues: string[] = [];
      
      // Basic validation - check for null values in non-nullable columns
      const schema = this.EXPECTED_SCHEMAS[tableName];
      if (schema) {
        const nonNullableColumns = schema.columns
          .filter(col => !col.nullable && col.name !== 'id')
          .map(col => col.name);

        for (const column of nonNullableColumns) {
          const { count: nullCount, error: nullError } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true })
            .is(column, null);

          if (!nullError && nullCount && nullCount > 0) {
            issues.push(`Found ${nullCount} null values in non-nullable column: ${column}`);
          }
        }
      }

      return {
        isValid: issues.length === 0,
        issues,
        recordCount: count || 0,
      };

    } catch (error) {
      ErrorService.logError(
        error instanceof Error ? error : new Error(String(error)),
        'MigrationService.validateDataIntegrity',
        { tableName }
      );

      return {
        isValid: false,
        issues: [`Failed to validate data integrity: ${error instanceof Error ? error.message : String(error)}`],
        recordCount: 0,
      };
    }
  }

  /**
   * Private helper methods
   */
  private static generateCreateTableSql(schema: TableSchema): string {
    const columns = schema.columns.map(col => {
      let sql = `${col.name} ${col.type}`;
      
      if (!col.nullable) {
        sql += ' NOT NULL';
      }
      
      if (col.defaultValue !== undefined) {
        sql += ` DEFAULT ${col.defaultValue}`;
      }
      
      if (col.isPrimaryKey) {
        sql += ' PRIMARY KEY';
      }
      
      return sql;
    });

    let createSql = `CREATE TABLE ${schema.tableName} (\n  ${columns.join(',\n  ')}\n);`;

    // Add foreign key constraints
    const foreignKeys = schema.columns.filter(col => col.isForeignKey && col.references);
    for (const fk of foreignKeys) {
      createSql += `\nALTER TABLE ${schema.tableName} ADD CONSTRAINT fk_${schema.tableName}_${fk.name} FOREIGN KEY (${fk.name}) REFERENCES ${fk.references!.table}(${fk.references!.column});`;
    }

    return createSql;
  }

  /**
   * Gets migration status for all tables
   */
  static async getMigrationStatus(): Promise<{
    tablesExist: number;
    totalTables: number;
    missingTables: string[];
    incompleteSchemas: string[];
  }> {
    const totalTables = Object.keys(this.EXPECTED_SCHEMAS).length;
    const missingTables: string[] = [];
    const incompleteSchemas: string[] = [];
    let tablesExist = 0;

    for (const tableName of Object.keys(this.EXPECTED_SCHEMAS)) {
      const exists = await this.verifyTableExists(tableName);
      
      if (!exists) {
        missingTables.push(tableName);
      } else {
        tablesExist++;
        
        // Check if schema is complete
        const actualColumns = await this.getTableColumns(tableName);
        const expectedColumns = this.EXPECTED_SCHEMAS[tableName].columns.map(col => col.name);
        const missingColumns = expectedColumns.filter(col => !actualColumns.includes(col));
        
        if (missingColumns.length > 0) {
          incompleteSchemas.push(tableName);
        }
      }
    }

    return {
      tablesExist,
      totalTables,
      missingTables,
      incompleteSchemas,
    };
  }
}