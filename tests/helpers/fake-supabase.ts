// Minimal in-memory stand-in for the Supabase client calls used by
// lib/documents/service.ts. Rows are plain objects; filters are equality /
// gte only. RLS is NOT emulated here (that is tested in tests/db); the
// service's own patient_id filters are what these tests exercise.
type Row = Record<string, unknown>;

export class FakeSupabase {
  tables: Record<string, Row[]> = {
    documents: [],
    document_pages: [],
    document_extractions: [],
    audit_logs: [],
  };
  files = new Map<string, Uint8Array>();
  rpcCalls: { fn: string; args: Record<string, unknown> }[] = [];
  failNext: Partial<Record<"upload" | "insert:documents" | "download" | "rpc", { code?: string }>> = {};

  from(table: string) {
    return new Query(this, table);
  }

  async rpc(fn: string, args: Record<string, unknown>) {
    this.rpcCalls.push({ fn, args });
    if (this.failNext.rpc) {
      const error = this.failNext.rpc;
      delete this.failNext.rpc;
      return { data: null, error };
    }
    if (fn === "claim_document_for_processing") {
      const doc = this.tables.documents.find((d) => d.id === args.p_document_id);
      if (!doc || !["pending", "failed"].includes(doc.extraction_status as string) || (doc.processing_attempts as number) >= 3) {
        return { data: [], error: null };
      }
      Object.assign(doc, { extraction_status: "processing", processing_attempts: (doc.processing_attempts as number) + 1 });
      return { data: [{ ...doc }], error: null };
    }
    return { data: null, error: null };
  }

  storage = {
    from: () => ({
      upload: async (path: string, bytes: Uint8Array) => {
        if (this.failNext.upload) {
          delete this.failNext.upload;
          return { data: null, error: { message: "fail" } };
        }
        this.files.set(path, bytes);
        return { data: { path }, error: null };
      },
      download: async (path: string) => {
        const bytes = this.files.get(path);
        if (!bytes || this.failNext.download) return { data: null, error: { message: "missing" } };
        return { data: new Blob([new Uint8Array(bytes)]), error: null };
      },
      remove: async (paths: string[]) => {
        paths.forEach((p) => this.files.delete(p));
        return { data: null, error: null };
      },
    }),
  };
}

class Query {
  private filters: [string, "eq" | "gte", unknown][] = [];
  private op: "select" | "insert" | "update" | "delete" = "select";
  private payload: Row | Row[] | null = null;
  private countMode = false;
  private returning = false;

  constructor(
    private readonly db: FakeSupabase,
    private readonly table: string
  ) {}

  select(_cols?: string, options?: { count?: string; head?: boolean }) {
    if (this.op === "select") this.countMode = Boolean(options?.count);
    else this.returning = true;
    return this;
  }
  insert(payload: Row | Row[]) {
    this.op = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: Row) {
    this.op = "update";
    this.payload = payload;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push([column, "eq", value]);
    return this;
  }
  gte(column: string, value: unknown) {
    this.filters.push([column, "gte", value]);
    return this;
  }
  order() {
    return this;
  }
  limit() {
    return this;
  }

  private matches(row: Row) {
    return this.filters.every(([c, op, v]) => (op === "eq" ? row[c] === v : String(row[c]) >= String(v)));
  }

  private run(): { data: unknown; error: unknown; count?: number } {
    const rows = this.db.tables[this.table];
    if (this.op === "insert") {
      if (this.table === "documents" && this.db.failNext["insert:documents"]) {
        const error = this.db.failNext["insert:documents"];
        delete this.db.failNext["insert:documents"];
        return { data: null, error };
      }
      const list = (Array.isArray(this.payload) ? this.payload : [this.payload]) as Row[];
      const inserted = list.map((r) => ({
        id: r.id ?? crypto.randomUUID(),
        created_at: new Date().toISOString(),
        processing_attempts: 0,
        is_simulated: false,
        metadata: null,
        ...r,
      }));
      rows.push(...inserted);
      return { data: inserted, error: null };
    }
    const hit = rows.filter((r) => this.matches(r));
    if (this.op === "update") {
      hit.forEach((r) => Object.assign(r, this.payload));
      return { data: hit, error: null };
    }
    if (this.op === "delete") {
      this.db.tables[this.table] = rows.filter((r) => !this.matches(r));
      return { data: hit, error: null };
    }
    return { data: hit, error: null, count: hit.length };
  }

  async single() {
    const { data, error } = this.run();
    return { data: Array.isArray(data) ? (data[0] ?? null) : data, error };
  }
  async maybeSingle() {
    return this.single();
  }
  then<T>(resolve: (value: { data: unknown; error: unknown; count?: number }) => T) {
    return Promise.resolve(this.run()).then(resolve);
  }
}
