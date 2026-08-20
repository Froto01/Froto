export default function EnvCheckPage() {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  const exists = databaseUrl.length > 0;
  const startsWithPostgres =
    databaseUrl.startsWith("postgres://") ||
    databaseUrl.startsWith("postgresql://");
  const containsPooler = databaseUrl.includes("-pooler");

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-16">
      <div className="mx-auto max-w-xl rounded-2xl border bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold text-sky-600">FROTO</p>

        <h1 className="mt-2 text-3xl font-bold">
          Environment Check
        </h1>

        <p className="mt-3 text-slate-600">
          Safe diagnostic check for the deployed database configuration.
        </p>

        <div className="mt-8 space-y-4">
          <p>
            <strong>DATABASE_URL exists:</strong>{" "}
            {exists ? "YES" : "NO"}
          </p>

          <p>
            <strong>Starts with postgres:</strong>{" "}
            {startsWithPostgres ? "YES" : "NO"}
          </p>

          <p>
            <strong>Contains -pooler:</strong>{" "}
            {containsPooler ? "YES" : "NO"}
          </p>

          <p>
            <strong>Length:</strong> {databaseUrl.length}
          </p>
        </div>

        <p className="mt-8 text-xs text-slate-500">
          This page does not display the database URL or credentials.
        </p>
      </div>
    </main>
  );
}