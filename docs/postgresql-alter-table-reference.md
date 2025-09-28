# PostgreSQL ALTER TABLE Reference Documentation

## Official PostgreSQL ALTER TABLE Syntax

### Basic ALTER TABLE Forms

```sql
-- Add column
ALTER TABLE [ IF EXISTS ] [ ONLY ] name [ * ]
    ADD [ COLUMN ] [ IF NOT EXISTS ] column_name data_type 
    [ COLLATE collation ] [ column_constraint [ ... ] ]

-- Drop column  
ALTER TABLE [ IF EXISTS ] [ ONLY ] name [ * ]
    DROP [ COLUMN ] [ IF EXISTS ] column_name [ RESTRICT | CASCADE ]

-- Alter column type
ALTER TABLE [ IF EXISTS ] [ ONLY ] name [ * ]
    ALTER [ COLUMN ] column_name [ SET DATA ] TYPE data_type 
    [ COLLATE collation ] [ USING expression ]

-- Add constraint
ALTER TABLE [ IF EXISTS ] [ ONLY ] name [ * ]
    ADD table_constraint [ NOT VALID ]

-- Drop constraint
ALTER TABLE [ IF EXISTS ] [ ONLY ] name [ * ]
    DROP CONSTRAINT [ IF EXISTS ] constraint_name [ RESTRICT | CASCADE ]

-- Set/drop default
ALTER TABLE [ IF EXISTS ] [ ONLY ] name [ * ]
    ALTER [ COLUMN ] column_name SET DEFAULT expression
ALTER TABLE [ IF EXISTS ] [ ONLY ] name [ * ]
    ALTER [ COLUMN ] column_name DROP DEFAULT

-- Set/drop NOT NULL
ALTER TABLE [ IF EXISTS ] [ ONLY ] name [ * ]
    ALTER [ COLUMN ] column_name SET NOT NULL
ALTER TABLE [ IF EXISTS ] [ ONLY ] name [ * ]
    ALTER [ COLUMN ] column_name DROP NOT NULL

-- Enable/Disable RLS
ALTER TABLE [ IF EXISTS ] [ ONLY ] name [ * ]
    ENABLE ROW LEVEL SECURITY
ALTER TABLE [ IF EXISTS ] [ ONLY ] name [ * ]
    DISABLE ROW LEVEL SECURITY
```

### RLS Policy Management

```sql
-- Create policy
CREATE POLICY name ON table_name
    [ AS { PERMISSIVE | RESTRICTIVE } ]
    [ FOR { ALL | SELECT | INSERT | UPDATE | DELETE } ]
    [ TO { role_name | PUBLIC | CURRENT_USER | SESSION_USER } [, ...] ]
    [ USING ( using_expression ) ]
    [ WITH CHECK ( check_expression ) ]

-- Drop policy
DROP POLICY [ IF EXISTS ] name ON table_name [ CASCADE | RESTRICT ]

-- Query existing policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE schemaname = 'public' AND tablename = 'your_table';
```

## Best Practices for Column Type Changes with Policy Dependencies

### From PostgreSQL Documentation Section 5.7: "Modifying Tables"

**Official Guidance**: "treat RLS policies as dependent objects the same way you would treat constraints/views/etc. The recommended, supported approach is to remove or capture and recreate any policies that reference the column, perform the ALTER TABLE ... ALTER COLUMN ... TYPE (using a USING clause if needed), then recreate the policies."

### Recommended Procedure

1. **Identify policies that reference the column**
   ```sql
   SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products';
   -- Look at the qual and with_check columns
   ```

2. **Save policy definitions for recreation**
   ```sql
   SELECT
     'CREATE POLICY ' || quote_ident(policyname) || ' ON ' || quote_ident(schemaname) || '.' || quote_ident(tablename)
     || COALESCE(' USING (' || qual || ')', '')
     || COALESCE(' WITH CHECK (' || with_check || ')', '')
     || ';'
   FROM pg_policies
   WHERE schemaname = 'public' AND tablename = 'products';
   ```

3. **Drop policies that reference the column**
   ```sql
   DROP POLICY policy_name ON schema.table;
   ```

4. **Alter column type with USING clause**
   ```sql
   ALTER TABLE table ALTER COLUMN col TYPE new_type USING ( <expression to convert> );
   ```

5. **Recreate policies from saved definitions**
   ```sql
   -- Execute the CREATE POLICY statements saved in step 2
   ```

6. **Verify RLS and permissions**
   ```sql
   SELECT relrowsecurity, relforcerowsecurity 
   FROM pg_class WHERE oid = 'schema.products'::regclass;
   ```

### Alternative Zero-Downtime Pattern

```sql
-- Add new column
ALTER TABLE ADD COLUMN new_col new_type;

-- Backfill data
UPDATE table SET new_col = (conversion_expression FROM old_col);

-- Handle policies before final swap
DROP POLICY ... -- (policies referencing old_col)
ALTER TABLE DROP COLUMN old_col;
ALTER TABLE RENAME COLUMN new_col TO old_col;

-- Recreate policies
CREATE POLICY ... 
```

## String Functions and Operators

### Standard PostgreSQL String Functions

```sql
-- Concatenation (preferred)
string1 || string2 || string3

-- CONCAT function (PostgreSQL 9.1+)
CONCAT(string1, string2, string3)

-- Substring (SQL standard)
SUBSTRING(string FROM start FOR length)
SUBSTRING(string FROM start)

-- Alternative SUBSTR function
SUBSTR(string, start, length)
SUBSTR(string, start)

-- String splitting
SPLIT_PART(string, delimiter, field_number)

-- Case conversion
UPPER(string)
LOWER(string)

-- String replacement
REPLACE(string, from_string, to_string)
```

## Constraint Management

### Check Constraints

```sql
-- Add check constraint
ALTER TABLE table_name 
ADD CONSTRAINT constraint_name CHECK (condition);

-- Drop check constraint
ALTER TABLE table_name 
DROP CONSTRAINT constraint_name [ CASCADE | RESTRICT ];

-- Add with NOT VALID (skip existing data validation)
ALTER TABLE table_name 
ADD CONSTRAINT constraint_name CHECK (condition) NOT VALID;

-- Validate constraint later
ALTER TABLE table_name VALIDATE CONSTRAINT constraint_name;
```

### Unique Constraints

```sql
-- Add unique constraint
ALTER TABLE table_name 
ADD CONSTRAINT constraint_name UNIQUE (column_name);

-- Drop unique constraint  
ALTER TABLE table_name 
DROP CONSTRAINT constraint_name;
```

## Version Compatibility Notes

- **IF EXISTS/IF NOT EXISTS**: Available in PostgreSQL 9.0+
- **DROP CONSTRAINT IF EXISTS**: Available in PostgreSQL 9.0+
- **ADD COLUMN IF NOT EXISTS**: Available in PostgreSQL 9.6+
- **CONCAT function**: Available in PostgreSQL 9.1+
- **String operators (||)**: Available in all PostgreSQL versions

## Locking and Performance Considerations

### Lock Levels
- **ACCESS EXCLUSIVE**: Required for most ALTER TABLE operations
- **SHARE UPDATE EXCLUSIVE**: Required for SET STATISTICS
- **SHARE ROW EXCLUSIVE**: Required for ADD FOREIGN KEY

### Table Rewrites
Operations that may require table rewrite:
- Changing column type (unless proven compatible)
- Adding column with volatile default
- Some storage parameter changes

Operations that don't require rewrite:
- Adding column without default
- Adding constraints (unless they require validation)
- Renaming columns/tables

## Error Handling Patterns

### Common Errors

1. **"cannot alter type of a column used in a policy definition"**
   - **Cause**: RLS policies reference the column
   - **Solution**: Drop policies → alter column → recreate policies

2. **"column must be added to child tables too"**
   - **Cause**: Partitioned table inheritance
   - **Solution**: Use ONLY keyword or add to all partitions

3. **"cannot alter inherited column"**
   - **Cause**: Column inherited from parent table
   - **Solution**: Alter parent table instead

### Safe Migration Pattern

```sql
-- Transaction wrapper for safety
BEGIN;

-- Save dependent objects
CREATE TEMP TABLE temp_policies AS SELECT ...;

-- Drop dependencies
DROP POLICY ...;
DROP CONSTRAINT ...;

-- Perform alteration
ALTER TABLE ... ALTER COLUMN ... TYPE ... USING ...;

-- Recreate dependencies  
CREATE CONSTRAINT ...;
CREATE POLICY ...;

-- Verify results
SELECT ... -- verification queries

COMMIT; -- or ROLLBACK if issues
```