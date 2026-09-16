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

3. Initialize PostgreSQL:

```bash
psql "$DATABASE_URL" -f db/schema.sql
```

Optional demo products:

```bash
psql "$DATABASE_URL" -f db/seed.sql
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

The application includes session authentication, role-based authorization, PostgreSQL-backed users/products/sales/purchases/notifications/audit logs, transactional stock updates, reporting, live dashboard statistics, and secure first-admin setup.

### Connected UI

- Inventory: product create, edit, delete, stock snapshot and low-stock indicators
- Sales/POS: live products, cart quantities, payment method and completed sales
- Purchases: purchase submission, history and approval/stock updates
- Transactions: search/filter, live history and sale cancellation
- Users: admin creation, role changes and activation/deactivation
- Reports: live sales, profit, payment, top-item, staff and seven-day trend data
- Notifications: live notification list and read/mark-all-read actions
- Dashboards: live sales, transaction, product, stock, low-stock, transaction and activity data

### Roles

- `ADMIN`: full administration and user management
- `MANAGER`: inventory, purchases, reports and operations
- `EMPLOYEE`: selling, product browsing and transactions

## Production build

Before deployment, pull the latest `main`, install dependencies, and run:

```bash
npm install
npm run build
npm start
```

If the build succeeds, configure the same production environment variables on the hosting platform and initialize the production database with `db/schema.sql`.

Never commit `.env.local` or production credentials.
