# Schema Maintenance Guide

This document provides guidelines for maintaining schema integrity between the database and the TypeScript schema definition.

## The Problem of Schema Drift

Schema drift occurs when the actual database structure diverges from the TypeScript schema definition in `shared/schema.ts`. This can happen due to:

1. Manual SQL migrations that modify the database structure without updating the TypeScript schema
2. Schema changes made directly in the database without corresponding changes in code
3. Code changes that don't align with the database structure

Schema drift causes several issues:
- Type safety problems
- Runtime errors
- Data integrity issues
- Inconsistent application behavior

## How to Maintain Schema Integrity

### 1. Always Use Proper Migrations

When changing the database structure:
- Update the TypeScript schema in `shared/schema.ts` first
- Create a proper migration SQL file
- Test the migration in a staging environment
- Apply the migration to production

### 2. Format for Date/Time Fields

All date/time fields must be stored as text strings in South African Standard Time (SAST) format, not as UTC Date objects. This ensures correct time representation for South African users.

Example:
```typescript
// In schema.ts
createdAt: text("created_at").default(String(new Date().toISOString())).notNull(),
```

When working with dates:
- Convert JavaScript Date objects to strings before storing in the database
- Use proper timezone conversion (Africa/Johannesburg)
- Store dates in ISO format

### 3. JSON Fields

For JSON fields in the database:
- Use the `jsonb` type in PostgreSQL 
- Define appropriate default values (empty array or empty object)
- Use proper TypeScript types for JSON data

Example:
```typescript
selectedAttributes: jsonb("selected_attributes").default('[]'),
```

### 4. Regular Schema Verification

Run the schema verification tool regularly to detect and fix schema drift:

```bash
npx tsx scripts/verify-schema.ts
```

If discrepancies are found, run the schema migration script:

```bash
npx tsx scripts/run-schema-migration.ts
```

### 5. Development Workflow

1. **When adding a new field:**
   - Add the field to the appropriate table in `shared/schema.ts`
   - Create a migration SQL file for the field addition
   - Update the insert schema and type definitions
   - Run the migration

2. **When modifying an existing field:**
   - Update the field in `shared/schema.ts`
   - Create a migration SQL file for the field modification
   - Update any affected insert schemas
   - Run the migration

3. **When removing a field:**
   - Create a migration SQL file first (consider soft deprecation)
   - Only then remove the field from `shared/schema.ts`
   - Update any affected insert schemas
   - Run the migration

## Important Schema Files

- `shared/schema.ts`: Main TypeScript schema definition
- `scripts/verify-schema.ts`: Tool to verify schema integrity
- `scripts/run-schema-migration.ts`: Tool to run schema migrations
- `migration-schema-sync.sql`: Latest schema synchronization migration

## Tips for Avoiding Schema Drift

1. Never use direct SQL commands to modify the database structure without updating the TypeScript schema
2. Document all schema changes thoroughly
3. Create comprehensive test cases for schema changes
4. Run schema verification regularly as part of CI/CD pipeline
5. Review all schema changes during code reviews
6. Maintain a changelog of schema changes
7. Use database versioning

By following these guidelines, you can maintain schema integrity and avoid the problems associated with schema drift.