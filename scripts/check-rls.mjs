import "dotenv/config";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const { rows } = await client.query(`
  SELECT c.relname AS table_name, c.relrowsecurity AS rls_enabled
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r'
  ORDER BY 1
`);

console.table(rows);
const unprotected = rows.filter((r) => !r.rls_enabled);
console.log(
  unprotected.length
    ? `UNPROTECTED: ${unprotected.map((r) => r.table_name).join(", ")}`
    : "UNPROTECTED: none — all public tables have RLS enabled",
);

await client.end();
