This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Admin Orders

Run or re-run `supabase/schema.sql` in the Supabase SQL Editor. It creates the default Pearl & Pour shop, assigns existing products and orders to it, adds the shop enabled/disabled status column, and configures shop deletion to cascade to its products and orders.

Re-run `supabase/schema.sql` after deploying order tracking to add the private tracking-token hash column. Customers receive a separate private tracking link for each shop order; the token itself is never stored in the database.

Set `ADMIN_PASSWORD` in `.env.local` to a long private platform password. Keep the Supabase secret key and admin password server-side; do not use a `NEXT_PUBLIC_` prefix for either one. Restart the development server after changing environment variables.

Open [http://localhost:3000/admin/clients](http://localhost:3000/admin/clients) and sign in with the platform password, leaving the client email blank. Create client shops there with a login email and password of at least 12 characters. Shop owners use those credentials at `/admin/orders` and `/admin/products`; each sees only their own orders and catalog. The Credentials button shows the login email and lets you set a new temporary password; existing passwords cannot be revealed. Enable/Disable controls client access and storefront visibility without deleting data. Delete permanently removes a client shop, its products, orders, and order items. Available products from every enabled shop appear together on the customer storefront, and checkout creates a separate order for each shop in a mixed cart.

## Code Areas

- `customers/` contains the storefront, cart, checkout, product data, and customer-facing components.
- `client/` contains shop and platform admin dashboards, authentication, and APIs.
- `dev/` contains development-only helpers, including a SQL script for inserting a fake sample order.
- `shared/` contains infrastructure and helpers used by multiple areas.
- `app/` contains the Next.js route entry points. These stay here so URLs and API routes continue to work.

To add a fake order for dashboard testing, run `dev/seed-sample-order.sql` in the Supabase SQL Editor. It creates clearly labeled sample customer data.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
