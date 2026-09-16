# TX RetailOS

Retail operations and point-of-sale management application built with Next.js, React, Tailwind CSS and PostgreSQL.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL`
- `AUTH_SECRET`
- `SETUP_KEY`
- `DATABASE_SSL` (`true` by default)

3. Run the SQL schema against the PostgreSQL database:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

4. Start the app:

```bash
npm run dev
```

5. Create the first admin exactly once by POSTing JSON to `/api/setup` with the setup key, username, full name and password. After the first user exists, the endpoint refuses further initialization.

Example body:

```json
{
  "setupKey": "your-setup-key",
  "username": "john_admin",
  "fullName": "John Admin",
  "password": "a-strong-password"
}
```

## Backend

The application includes session authentication, role-based authorization, PostgreSQL-backed users/products/sales/purchases/notifications/audit logs, transactional stock updates, reporting, and secure first-admin setup.

### Roles

- `ADMIN`: full administration and user management
- `MANAGER`: inventory, purchases, reports and operations
- `EMPLOYEE`: selling, product browsing and transactions

### Production build

```bash
npm run build
npm start
```

Never commit `.env.local` or production credentials.
