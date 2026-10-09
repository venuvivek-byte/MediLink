import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite, type Transaction } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const ROOT = join(__dirname, "..", "..");
const MIGRATIONS_DIR = join(ROOT, "supabase", "migrations");

/** Migration files in apply order (same ordering the Supabase CLI uses). */
export function migrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

export type Tx = Transaction;

export class TestDatabase {
  private constructor(readonly db: PGlite) {}

  /**
   * Fresh in-memory Postgres with the Supabase shim, then migrations applied
   * up to and including `upTo` (default: all). `beforeEach` runs as the
   * migration owner after the shim, e.g. to seed legacy rows.
   */
  static async create(options: { upTo?: string; afterShim?: (db: PGlite) => Promise<void> } = {}) {
    const db = new PGlite({ extensions: { pgcrypto } });
    await db.exec(readFileSync(join(__dirname, "supabase-shim.sql"), "utf8"));
    const instance = new TestDatabase(db);
    await instance.applyMigrations({ upTo: options.upTo });
    return instance;
  }

  async applyMigrations({ from, upTo }: { from?: string; upTo?: string } = {}) {
    for (const file of migrationFiles()) {
      if (from && file < from) continue;
      if (upTo && file > upTo) break;
      try {
        await this.db.exec(readFileSync(join(MIGRATIONS_DIR, file), "utf8"));
      } catch (error) {
        throw new Error(`Migration ${file} failed: ${(error as Error).message}`);
      }
    }
  }

  /** Creates an auth user the way GoTrue would (fires auth.users triggers). */
  async createUser(email: string, meta: Record<string, unknown> = {}): Promise<string> {
    const result = await this.db.query<{ id: string }>(
      "INSERT INTO auth.users (email, raw_user_meta_data) VALUES ($1, $2) RETURNING id",
      [email, JSON.stringify(meta)]
    );
    return result.rows[0].id;
  }

  /** Runs `fn` as a signed-in user: role `authenticated` with that user's JWT claims. */
  asUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.query("SELECT set_config('request.jwt.claims', $1, true)", [
        JSON.stringify({ sub: userId, role: "authenticated" }),
      ]);
      await tx.exec("SET LOCAL ROLE authenticated");
      return fn(tx);
    });
  }

  asAnon<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE anon");
      return fn(tx);
    });
  }

  asService<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      await tx.exec("SET LOCAL ROLE service_role");
      return fn(tx);
    });
  }

  /** As the migration owner (superuser), bypassing everything. For fixtures only. */
  async asOwner<T>(fn: (db: PGlite) => Promise<T>): Promise<T> {
    return fn(this.db);
  }

  async close() {
    await this.db.close();
  }
}

/** Resolves to the Postgres error message, or fails the test if `promise` succeeds. */
export async function expectDbError(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    return (error as Error).message;
  }
  throw new Error("Expected the database to reject this statement, but it succeeded");
}
