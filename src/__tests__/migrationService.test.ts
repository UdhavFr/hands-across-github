import { describe, it, expect, vi, afterEach } from 'vitest';
import { MigrationService } from '../services/migrationService';
import { supabase } from '../lib/supabase';

// Mock supabase client methods used in MigrationService
vi.mock('../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn(),
        limit: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        rpc: vi.fn(),
      })),
    },
  };
});

describe('MigrationService', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should generate correct SQL for creating a table', () => {
    const schema = {
      tableName: 'test_table',
      columns: [
        { name: 'id', type: 'uuid', nullable: false, isPrimaryKey: true },
        { name: 'name', type: 'text', nullable: false },
        { name: 'description', type: 'text', nullable: true, defaultValue: "'default'" },
      ],
    };
    const sql = (MigrationService as any).generateCreateTableSql(schema);
    expect(sql).toContain('CREATE TABLE test_table');
    expect(sql).toContain('id uuid NOT NULL PRIMARY KEY');
    expect(sql).toContain("description text DEFAULT 'default'");
  });

  it('createMissingTable returns manual instructions without RPC call', async () => {
    // Mock verifyTableExists to return false (table does not exist)
    vi.spyOn(MigrationService, 'verifyTableExists').mockResolvedValue(false);

    // Spy on generateCreateTableSql to return a dummy SQL
    vi.spyOn(MigrationService as any, 'generateCreateTableSql').mockReturnValue('CREATE TABLE dummy;');

    const result = await MigrationService.createMissingTable('users');
    expect(result.success).toBe(false);
    expect(result.message).toContain('database admin privileges');
    expect(result.details.sql).toBe('CREATE TABLE dummy;');
  });

  it('verifyTableExists returns true if table exists', async () => {
    const mockFrom = supabase.from as unknown as vi.Mock;
    mockFrom.mockReturnValueOnce({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { table_name: 'users' }, error: null }),
    });

    const exists = await MigrationService.verifyTableExists('users');
    expect(exists).toBe(true);
  });

  it('validateDataIntegrity detects nulls in non-nullable columns', async () => {
    // Mock supabase.from().select() for count
    const mockFrom = supabase.from as unknown as vi.Mock;
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      count: null,
      head: null,
      is: vi.fn().mockReturnThis(),
    });

    // Mock count responses for null checks
    mockFrom.mockResolvedValueOnce({ count: 10, error: null }); // total count
    mockFrom.mockResolvedValueOnce({ count: 2, error: null }); // null count for first non-nullable column

    const result = await MigrationService.validateDataIntegrity('users');
    expect(result.isValid).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });
});
