# FX deployment

## Google AI Studio / local testing (no database)

Install dependencies with `npm install`, then start the API and Vite in separate
terminals:

```sh
npm run api
DISABLE_HMR=true npm run dev
```

The API uses in-memory ledger and audit repositories when `DATABASE_URL` is
unset. No PostgreSQL server or `pg` package is required for the API to start.
Ledger and audit data created without the API is kept in browser storage when
available, with an in-memory browser fallback if storage is blocked.

Use the demo accounts shown on the login screen (password `123456`). Configure
`FX_AUTH_SECRET` for any shared or persistent test environment.

## Moving to a PostgreSQL server

1. Provision PostgreSQL 16 and a database for FX.
2. Run `schema.sql` as a database owner. To enable the opt-in RLS policies,
   execute `SET fx.enable_rls = 'on';` in the same SQL session before running
   the schema. Review and enable the documented `FORCE ROW LEVEL SECURITY`
   statements only after configuring the application role.
3. Set `DATABASE_URL` and a unique random `FX_AUTH_SECRET` of at least 32
   characters on the server. Install optional dependencies (`npm install`) so
   the PostgreSQL driver is available.
4. Grant the non-owner `fx_app` role only required privileges, then create a
   dedicated login role as a member of `fx_app` and use that login in
   `DATABASE_URL`. For the ledger/audit API, for example:

   ```sql
   CREATE ROLE fx_app_login LOGIN PASSWORD 'use-a-secret-from-your-secret-store';
   GRANT fx_app TO fx_app_login;
   GRANT USAGE ON SCHEMA public TO fx_app;
   GRANT SELECT, INSERT ON financial_transactions, audit_logs TO fx_app;
   ```

   RLS context is set transaction-locally from the verified token claims.
5. Set `CORS_ORIGIN` when the UI and API use different origins; leave it unset
   for same-origin deployments. Tune `RATE_LIMIT_WINDOW_MS`,
   `RATE_LIMIT_MAX`, and `RATE_LIMIT_LOGIN_MAX` for the expected traffic.
6. Start `npm run api` behind the production reverse proxy and serve the output
   of `npm run build`. Never expose `FX_AUTH_SECRET` or database credentials to
   the frontend.
