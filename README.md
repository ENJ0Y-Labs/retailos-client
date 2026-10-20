# RetailOS Client

Next.js frontend for the RetailOS Flask API.

## Architecture

```
Browser
  │
  │ HTTPS + credentialed REST requests
  ▼
retailos-client (Next.js)
  │
  │ REST
  ▼
retailos-server (Flask)
  │
  ▼
PostgreSQL
```

The client no longer owns authentication, database access, inventory logic, sales transactions, reports, or server-side API routes. The Flask server is the source of truth.

## Run locally

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5000
```

Then:

```bash
npm install
npm run dev
```

The server must be running separately and must allow the frontend origin with:

```env
FRONTEND_URL=http://localhost:3000
SESSION_COOKIE_SECURE=false
SESSION_COOKIE_SAMESITE=Lax
```

For a production frontend hosted on another domain, set `FRONTEND_URL` to the exact frontend origin and use HTTPS. The server's cross-origin session cookie should use `SameSite=None` and `Secure=true`.

## Supported server-backed UI

- Authentication
- Store dashboard
- Products
- Inventory and stock adjustments
- Sales/POS
- Transactions
- Customers
- Low-stock alerts
- Settings

Purchases, reports, employee roles, and notification APIs were removed from the client because they are not currently exposed by the Flask server contract.

## API contract

The browser uses one same-origin request strategy: it calls `/api/*` on the Next.js origin, and the Next.js rewrite forwards requests to the Flask API. The browser therefore does not depend on third-party-cookie behavior.

Examples:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /product/list?store_id=...`
- `POST /product/create`
- `PATCH /product/update`
- `DELETE /product/delete`
- `POST /product/adjust`
- `POST /sales`
- `GET /sales?store_id=...`
- `GET /dashboard?store_id=...`
- `GET /customers?store_id=...`
- `POST /customers`
- `GET /alerts?store_id=...`
- `POST /alerts/generate-low-stock?store_id=...`
- `POST /alerts/resolve?store_id=...&id=...`

## Production API and session cookies

Set `RETAILOS_API_ORIGIN` to the upstream Flask origin in `.env.local` for development and in the Vercel runtime environment for production. For example, local development can use `http://127.0.0.1:5000` and production can use the deployed HTTPS API origin. Browser requests always use `/api`; do not set `NEXT_PUBLIC_API_URL`. The rewrite keeps the browser request on the frontend origin. A protected API `401` redirects to `/login?reason=session-expired`, where the user sees an explanation. Server/network failures during initial session verification show a retry screen rather than silently treating the user as logged out.
