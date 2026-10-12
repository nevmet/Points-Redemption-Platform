# Open-source building blocks

This project keeps the existing TailAdmin React dashboard as its presentation layer and adds Bags Star reward workflows on top of it.

## Already in use

- **TailAdmin React** — React 19, TypeScript, Tailwind CSS v4, and dashboard UI primitives.
  Source: https://github.com/TailAdmin/free-react-tailwind-admin-dashboard
  License: MIT. Keep `LICENSE.md` with the project when distributing the application.

## Candidates we can reuse

### Stampee

Source: https://github.com/danlim26/stampee

Stampee is a single-business loyalty application built with React, Vite, Tailwind, Supabase Auth, Postgres, Storage, and RPC functions. It is MIT licensed.

The useful parts for this project are the boundaries between authentication, profile loading, database access, and customer-facing reward actions. Its stamp-card schema is not a drop-in match for Bags Star, so we should adapt the patterns into our own tables instead of copying its whole application.

### Loyalty Patterns

Source: https://github.com/mrcl-st/loyalty-patterns

This is an MIT-licensed collection of React loyalty components, including a points counter and reward catalog. It is designed to be copied into an existing Vite project without adding a package dependency. We can use the accessible interaction patterns when the customer portal needs richer reward interactions.

### Supabase

Source: https://github.com/supabase/supabase

Supabase provides the authentication and Postgres data layer needed for real customers, points ledgers, products, and redemption requests. The main repository is Apache-2.0 licensed. The project still needs a Bags Star Supabase project, RLS policies, and environment variables before this becomes live functionality.

## Not selected for the current phase

- **Bagisto Reward Points** is MIT, but it is a Laravel/Bagisto 2.4 extension. Using it would require replacing the current Vite/React app with a Laravel commerce backend.
- **Medusa** provides a powerful Node commerce backend, but it is much larger than the current manual redemption workflow and uses an open-core model.
- **Vendure** is a TypeScript commerce backend, but its core is GPLv3 unless a commercial license is used.
- **Refine** and **React Admin** are strong admin frameworks, but adopting either would replace the TailAdmin UI we already have instead of adding one focused capability.

## Planned integration order

1. Add Supabase Auth and a `profiles` table for customer and admin identity.
2. Replace mock reward data with a published `reward_products` catalog and admin CRUD.
3. Add a server-authoritative `points_ledger` instead of changing balances in the browser.
4. Add `redemption_requests` with status changes and a sales contact field.
5. Keep shipping and customer service as manual follow-up until usage justifies more automation.

When copying code from a third-party repository, preserve its license and attribution where required. Never copy demo credentials, seed passwords, or service-role keys into this repository.
