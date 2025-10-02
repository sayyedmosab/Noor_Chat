# PostgreSQL v17 – SQL Dialect Differences & Field Guide
**Prepared:** 2025-09-30 03:36:59 UTC+03:00 (Asia/Riyadh)

This document is a practical guide for an SQL-fluent engineer joining a PostgreSQL project. It focuses on *Postgres-specific* SQL features, behaviors, and “gotchas” that differ from other engines (MySQL/MariaDB, SQL Server, Oracle). It also includes operational notes a developer should know to avoid performance and correctness pitfalls.

---

## Table of Contents
- [TL;DR – What changes in your muscle memory](#tldr--what-changes-in-your-muscle-memory)
- [1. Query semantics & SELECT-level features](#1-query-semantics--select-level-features)
  - [1.1 DISTINCT ON (Postgres-only)](#11-distinct-on-postgres-only)
  - [1.2 LATERAL joins](#12-lateral-joins)
  - [1.3 Set-returning functions + WITH ORDINALITY](#13-set-returning-functions--with-ordinality)
  - [1.4 ORDER BY and NULLS FIRST/LAST](#14-order-by-and-nulls-firstlast)
  - [1.5 Aggregates: ORDER BY inside aggregates, FILTER](#15-aggregates-order-by-inside-aggregates-filter)
  - [1.6 CTE materialization control](#16-cte-materialization-control)
  - [1.7 TABLESAMPLE](#17-tablesample)
  - [1.8 FETCH ... WITH TIES](#18-fetch--with-ties)
- [2. Data modification (INSERT/UPDATE/DELETE)](#2-data-modification-insertupdatedelete)
  - [2.1 RETURNING on all DML](#21-returning-on-all-dml)
  - [2.2 UPDATE ... FROM (join-updates)](#22-update--from-join-updates)
  - [2.3 UPSERT: INSERT ... ON CONFLICT](#23-upsert-insert--on-conflict)
  - [2.4 Identity columns, serial, and OVERRIDING SYSTEM VALUE](#24-identity-columns-serial-and-overriding-system-value)
  - [2.5 CREATE TABLE AS vs SELECT INTO](#25-create-table-as-vs-select-into)
- [3. Postgres-first types & literals](#3-postgres-first-types--literals)
  - [3.1 Arrays](#31-arrays)
  - [3.2 JSON / JSONB and JSONPath](#32-json--jsonb-and-jsonpath)
  - [3.3 Range types](#33-range-types)
  - [3.4 Domains, enums, composites; true booleans](#34-domains-enums-composites-true-booleans)
  - [3.5 Casting with :: and dollar-quoting](#35-casting-with--and-dollar-quoting)
- [4. Indexing & constraints](#4-indexing--constraints)
  - [4.1 Index methods: B-Tree, Hash, GIN, GiST, SP-GiST, BRIN](#41-index-methods-b-tree-hash-gin-gist-sp-gist-brin)
  - [4.2 Expression indexes & partial indexes](#42-expression-indexes--partial-indexes)
  - [4.3 JSONB indexing: opclasses](#43-jsonb-indexing-opclasses)
  - [4.4 Unique with NULLS NOT DISTINCT](#44-unique-with-nulls-not-distinct)
  - [4.5 Exclusion constraints (no-overlap, custom rules)](#45-exclusion-constraints-no-overlap-custom-rules)
  - [4.6 Built-in full-text search](#46-built-in-full-text-search)
- [5. Partitioning (declarative)](#5-partitioning-declarative)
- [6. Security, durability & extensibility](#6-security-durability--extensibility)
  - [6.1 Row-Level Security (RLS)](#61-row-level-security-rls)
  - [6.2 UNLOGGED tables](#62-unlogged-tables)
  - [6.3 Extensions](#63-extensions)
  - [6.4 Collations (ICU), deterministic vs nondeterministic](#64-collations-icu-deterministic-vs-nondeterministic)
- [7. Concurrency & performance basics for developers](#7-concurrency--performance-basics-for-developers)
  - [7.1 MVCC & autovacuum](#71-mvcc--autovacuum)
  - [7.2 Row locks and worker-queue patterns](#72-row-locks-and-worker-queue-patterns)
  - [7.3 CTEs and optimization](#73-ctes-and-optimization)
  - [7.4 Planner & EXPLAIN essentials](#74-planner--explain-essentials)
- [8. Bulk I/O: COPY and staging](#8-bulk-io-copy-and-staging)
- [9. Ops & tuning add-on (for devs who also wear the SRE hat)](#9-ops--tuning-add-on-for-devs-who-also-wear-the-sre-hat)
- [10. Dialect differences quick-compare](#10-dialect-differences-quick-compare)
- [11. Snippet library (copy–paste)](#11-snippet-library-copy–paste)
- [12. Checklists](#12-checklists)
- [Appendix A. JSONB operators cheat-sheet](#appendix-a-jsonb-operators-cheat-sheet)
- [Appendix B. Row lock strengths](#appendix-b-row-lock-strengths)

---

## TL;DR – What changes in your muscle memory
- Prefer `CREATE TABLE AS` over `SELECT INTO`.  
- Use `RETURNING` on INSERT/UPDATE/DELETE instead of a follow-up `SELECT`.  
- Use `INSERT ... ON CONFLICT` for upserts (requires a unique or exclusion constraint).  
- Use `UPDATE ... FROM` for join-updates (ensure 1:1 join).  
- Reach for `DISTINCT ON` for “one row per key with tiebreaker ORDER BY”.  
- Be explicit with `NULLS FIRST/LAST` in `ORDER BY`; defaults may differ from other DBs.  
- Embrace arrays, JSONB (+ JSONPath), and range types—plus the right index method (GIN/GiST/BRIN).  
- Prefer identity columns (`GENERATED ... AS IDENTITY`) over legacy `serial`; know `OVERRIDING SYSTEM VALUE`.  
- Understand CTE inlining; use `MATERIALIZED` if you really need a barrier.  
- For worker queues: `FOR UPDATE SKIP LOCKED`.  

---

## 1. Query semantics & SELECT-level features

### 1.1 DISTINCT ON (Postgres-only)
Select a single row per key, choosing which to keep via ORDER BY:
```sql
SELECT DISTINCT ON (customer_id) customer_id, order_id, created_at
FROM orders
ORDER BY customer_id, created_at DESC;  -- keep latest per customer
```
**Gotcha:** Non-standard. Portable alternative is window functions and filtering on `row_number() = 1`.

### 1.2 LATERAL joins
Allow the right side of a join to reference left-side columns—ideal for “top-N per parent”, JSON/array expansion:
```sql
SELECT u.id, p.*
FROM users u
LEFT JOIN LATERAL (
  SELECT *
  FROM posts p
  WHERE p.user_id = u.id
  ORDER BY created_at DESC
  LIMIT 1
) p ON true;
```

### 1.3 Set-returning functions + WITH ORDINALITY
Use functions that return result sets in `FROM` (e.g., `unnest`, `generate_series`, JSON expanders). Add positions with `WITH ORDINALITY`:
```sql
SELECT val, n
FROM unnest(ARRAY['a','b','c']) WITH ORDINALITY AS t(val, n);
```

### 1.4 ORDER BY and NULLS FIRST/LAST
Postgres lets you control NULL placement explicitly:
```sql
ORDER BY score DESC NULLS LAST
```
Also applicable to index order.

### 1.5 Aggregates: ORDER BY inside aggregates, FILTER
```sql
SELECT
  string_agg(name, ', ' ORDER BY name) AS names_alpha,
  count(*) FILTER (WHERE paid)          AS paid_count
FROM invoices;
```

### 1.6 CTE materialization control
CTEs are not always optimization fences. You can force or avoid materialization:
```sql
WITH t AS MATERIALIZED (SELECT ...)
SELECT ... FROM t;

WITH t AS NOT MATERIALIZED (SELECT ...)
SELECT ... FROM t;
```

### 1.7 TABLESAMPLE
Sample without scanning the entire table:
```sql
SELECT * FROM big_table TABLESAMPLE SYSTEM (1);  -- roughly 1%
```

### 1.8 FETCH ... WITH TIES
Keep peers at the boundary:
```sql
SELECT * FROM scores
ORDER BY score DESC
FETCH FIRST 10 ROWS WITH TIES;
```

---

## 2. Data modification (INSERT/UPDATE/DELETE)

### 2.1 RETURNING on all DML
```sql
INSERT INTO tasks (title) VALUES ('x') RETURNING id;
UPDATE tasks SET done = true WHERE id = 42 RETURNING *;
DELETE FROM tasks WHERE done RETURNING id;
```

### 2.2 UPDATE ... FROM (join-updates)
```sql
UPDATE orders o
SET total = s.sum_total
FROM order_summaries s
WHERE s.order_id = o.id;      -- ensure s.order_id is unique per o.id
```

### 2.3 UPSERT: INSERT ... ON CONFLICT
```sql
INSERT INTO users(id, email)
VALUES (1, 'a@example.com')
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
```
**Note:** Target must match a unique or exclusion constraint/index.

### 2.4 Identity columns, serial, and OVERRIDING SYSTEM VALUE
Prefer SQL-standard identity:
```sql
CREATE TABLE t(
  id int GENERATED BY DEFAULT AS IDENTITY,
  name text NOT NULL
);
-- If you must supply an explicit id even when ALWAYS:
INSERT INTO t(id, name) OVERRIDING SYSTEM VALUE VALUES (123, 'x');
```

### 2.5 CREATE TABLE AS vs SELECT INTO
`CREATE TABLE AS` is recommended and more explicit:
```sql
CREATE TABLE new AS SELECT * FROM old WHERE active;
```

---

## 3. Postgres-first types & literals

### 3.1 Arrays
First-class arrays with rich operators:
```sql
SELECT 2 = ANY('(1, 2, 3)'::int[]);           -- true
SELECT ARRAY[1,2] <@ ARRAY[1,2,3];          -- contained-by
SELECT ARRAY[1,2,3] @> ARRAY[2];            -- contains
```
Index with GIN for membership tests on large sets.

### 3.2 JSON / JSONB and JSONPath
Binary JSON (`jsonb`) with operators and path queries:
```sql
-- Field access
SELECT data->>'status' AS status FROM events;

-- Containment
SELECT * FROM events WHERE data @> '{"kind":"click"}'::jsonb;

-- JSONPath
SELECT * FROM events WHERE data @@ '$.items[*] ? (@.qty > 5)';
```

### 3.3 Range types
Intervals with operators; pair with exclusion constraints for no-overlap rules:
```sql
CREATE TABLE rooms(
  id int PRIMARY KEY,
  during tstzrange NOT NULL,
  EXCLUDE USING gist (during WITH &&)
);
```

### 3.4 Domains, enums, composites; true booleans
- **Domains**: reusable constrained types.  
- **Enums**: compact categorical values.  
- **Composite types**: structured fields.  
- **Booleans**: `true/false` (not `1/0`).

### 3.5 Casting with `::` and dollar-quoting
- Casts: `value::type` or `CAST(value AS type)`  
- Dollar-quoting: `$$text with 'quotes'$$`

---

## 4. Indexing & constraints

### 4.1 Index methods: B-Tree, Hash, GIN, GiST, SP-GiST, BRIN
Pick the method that fits:
- **B-Tree**: equality/range on scalar types.
- **Hash**: equality-only (rarely used; B-Tree preferred).
- **GIN**: arrays, JSONB, full-text (inverted index).
- **GiST**: ranges, geometries, KNN-like queries.
- **SP-GiST**: partitioned search trees (e.g., tries).
- **BRIN**: huge append-only tables; very small indexes.

### 4.2 Expression indexes & partial indexes
```sql
CREATE INDEX users_email_lower_idx ON users (lower(email));
CREATE INDEX orders_paid_created_idx ON orders (created_at) WHERE paid;
```

### 4.3 JSONB indexing: opclasses
```sql
-- General-purpose containment
CREATE INDEX events_data_gin ON events USING gin (data);

-- Faster for path containment workloads
CREATE INDEX events_data_path_gin ON events USING gin (data jsonb_path_ops);
```

### 4.4 Unique with NULLS NOT DISTINCT
Default UNIQUE allows multiple NULLs. Enforce “NULLs equal”:
```sql
CREATE UNIQUE INDEX ux ON t(col) NULLS NOT DISTINCT;
```

### 4.5 Exclusion constraints (no-overlap, custom rules)
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE booking(
  room int,
  during tstzrange,
  EXCLUDE USING gist (room WITH =, during WITH &&)
);
```

### 4.6 Built-in full-text search
```sql
CREATE INDEX docs_tsv_idx ON docs USING gin (to_tsvector('english', body));

SELECT id, ts_rank_cd(to_tsvector('english', body), plainto_tsquery('english', 'cat')) AS rank
FROM docs
WHERE to_tsvector('english', body) @@ plainto_tsquery('english', 'cat')
ORDER BY rank DESC;
```

---

## 5. Partitioning (declarative)
```sql
CREATE TABLE meas (ts date, v int) PARTITION BY RANGE (ts);
CREATE TABLE meas_2025_09 PARTITION OF meas FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
-- Create partitioned indexes as needed; constraints are per partition.
```

---

## 6. Security, durability & extensibility

### 6.1 Row-Level Security (RLS)
```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON invoices FOR SELECT USING (owner_id = current_setting('app.user_id')::uuid);
-- Test with SET ROLE / SET LOCAL
```

### 6.2 UNLOGGED tables
Write-optimized, not crash-safe, not replicated by physical replication. Use for caches/ephemeral data.

### 6.3 Extensions
Load modular features:
```sql
CREATE EXTENSION IF NOT EXISTS citext;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;
```

### 6.4 Collations (ICU), deterministic vs nondeterministic
Define case/diacritic-insensitive collations (affects indexability and comparisons). Use carefully and consistently across DB and app layers.

---

## 7. Concurrency & performance basics for developers

### 7.1 MVCC & autovacuum
- Readers don’t block writers; writers don’t block readers (on the same rows) thanks to MVCC.
- Dead tuples are cleaned by autovacuum; heavy UPDATE/DELETE workloads need tuned thresholds.
- Know when to `VACUUM (FULL)` (rare) vs `REINDEX` (index bloat).

### 7.2 Row locks and worker-queue patterns
```sql
-- Dequeue jobs without blocking on busy rows
WITH cte AS (
  SELECT id FROM jobs
  WHERE status = 'ready'
  FOR UPDATE SKIP LOCKED
  LIMIT 100
)
UPDATE jobs j
SET status = 'processing'
FROM cte
WHERE j.id = cte.id
RETURNING j.*;
```

### 7.3 CTEs and optimization
- Default behavior allows inlining; use `MATERIALIZED` if a barrier is necessary.
- Avoid unnecessary CTEs in hot paths; prefer subqueries when appropriate.

### 7.4 Planner & EXPLAIN essentials
- Use `EXPLAIN (ANALYZE, BUFFERS)` to see actual timing and I/O.
- Consider extended statistics (`CREATE STATISTICS`) for correlated predicates.
- Don’t “fix” plans by setting `enable_*join` GUCs in app code—only for diagnosis.

---

## 8. Bulk I/O: COPY and staging
- `COPY table FROM STDIN WITH (FORMAT csv, HEADER true)` for fast loads.
- Use staging tables, validate, then `INSERT ... SELECT` into targets.
- For error isolation, load in batches; consider `ON CONFLICT DO NOTHING` for idempotency.

---

## 9. Ops & tuning add-on (for devs who also wear the SRE hat)
- **Connection pooling**: pgBouncer (transaction pooling for chatty apps).
- **Backups**: `pg_dump`/`pg_restore` for logical; note pros/cons vs physical backups.
- **Monitoring**: `pg_stat_statements`, slow query logs, autovacuum logs.
- **GUCs to know** (coarse guidance; size to your box/workload):
  - `shared_buffers` (25% of RAM is a classic starting point),
  - `work_mem` (per sort/hash; set conservatively),
  - `maintenance_work_mem` (index builds, VACUUM),
  - `effective_cache_size` (estimate of OS cache to guide planner),
  - autovacuum knobs: `autovacuum_vacuum_cost_limit`, table-level storage params.
- **Logical replication**: publications/subscriptions; understand what can/can’t be published.
- **Version 17 notes**: expanded SQL/JSON conformance (e.g., `JSON_TABLE`), partitioning/constraint improvements, general performance work.

---

## 10. Dialect differences quick-compare
**Coming from MySQL/MariaDB**
- Replace `INSERT ... ON DUPLICATE KEY UPDATE` with `INSERT ... ON CONFLICT ... DO UPDATE`.
- Case-insensitive lookups: `ILIKE` or `citext` + expression indexes.
- Foreign key/transaction semantics differ; rely on MVCC, not gap locks.

**Coming from SQL Server**
- Use `RETURNING` (not `OUTPUT`) and `ON CONFLICT` (no `MERGE`).
- No clustered index concept; pick GIN/GiST/BRIN when appropriate.
- `TOP(n)` → `FETCH FIRST n ROWS ONLY`.

**Coming from Oracle**
- Arrays and ranges are unique to Postgres; use exclusion constraints for scheduling.
- Partitioning rules differ; indexes are per-partition (no global indexes).
- RLS is built-in; extensions replicate many Oracle add-ons.

---

## 11. Snippet library (copy–paste)

**One-per-key (latest record)**
```sql
SELECT DISTINCT ON (account_id) *
FROM ledger
ORDER BY account_id, posted_at DESC;
```

**Upsert**
```sql
INSERT INTO users(id, email)
VALUES ($1, $2)
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email
RETURNING *;
```

**Join-update**
```sql
UPDATE o
SET total = s.sum_total
FROM order_summaries s
WHERE s.order_id = o.id;
```

**JSONB filter + index**
```sql
CREATE INDEX ev_data_gin ON events USING gin (data jsonb_path_ops);
SELECT * FROM events WHERE data @> '{"kind":"click"}'::jsonb;
```

**Range + exclusion (no overlap)**
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE TABLE booking(
  room int,
  during tstzrange NOT NULL,
  EXCLUDE USING gist (room WITH =, during WITH &&)
);
```

**RLS template**
```sql
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_rows ON invoices FOR SELECT
USING (owner_id = current_setting('app.user_id')::uuid);
```

**Worker queue pattern**
```sql
WITH c AS (
  SELECT id FROM jobs WHERE status = 'ready' FOR UPDATE SKIP LOCKED LIMIT 50
)
UPDATE jobs j SET status = 'processing' FROM c WHERE j.id = c.id RETURNING j.id;
```

---

## 12. Checklists

**Before migrating SQL to Postgres**
- Replace vendor upserts with `ON CONFLICT`.
- Audit `SELECT INTO` → use `CREATE TABLE AS`.
- Decide on case-insensitivity: `ILIKE` vs `citext` + expression indexes.
- Revisit unique constraints that rely on “one NULL only” semantics.
- For JSON-heavy data, design GIN indexes deliberately (ops vs path ops).
- For schedules, model with range types + exclusion constraints.

**Before go-live**
- Verify autovacuum settings for high-churn tables.
- Add necessary partial/expression/GIN indexes.
- Load via `COPY`; establish staging flow.
- Add RLS policies if multi-tenant.
- Add pgBouncer in front of Postgres.
- Turn on `pg_stat_statements` and slow query logging.

---

## Appendix A. JSONB operators cheat-sheet
- `->`  get JSON object/array field (as JSON)  
- `->>` get field text value  
- `@>`  left contains right (containment)  
- `?`   object has key / array has string element  
- `?|`  array has *any* of these keys  
- `?&`  array has *all* of these keys  
- `@?`  JSONPath predicate matches  
- `@@`  JSONPath returns boolean

## Appendix B. Row lock strengths
- `FOR UPDATE` – exclusive lock on selected rows.  
- `FOR NO KEY UPDATE` – like UPDATE but allows key updates elsewhere.  
- `FOR SHARE` – shared lock; blocks other writers.  
- `FOR KEY SHARE` – protects foreign-key referenced keys.

---

**Notes**
- This guide targets PostgreSQL v17+ semantics. Always confirm edge-case behavior against your running version.
- Use this as a developer handbook; DBAs can extend with org-specific standards (naming, GUC baselines, backup/restore runbooks).
