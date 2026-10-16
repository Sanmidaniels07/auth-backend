# Deployment

Nestly's API runs in two environments. Each has its own Render service, database, secrets and Paystack mode, so testing on staging can never touch real users or real money.

| | Production | Staging |
| --- | --- | --- |
| Branch | `main` | `staging` |
| URL | https://api.nestlyapp.site | https://api-staging.nestlyapp.site |
| Render service | existing service | second web service, same repo |
| Database | production Supabase project | `nestly-staging` Supabase project |
| Paystack | **live** key (`sk_live_`) | **test** key (`sk_test_`) |
| Frontend allowed | www.nestlyapp.site | staging.nestlyapp.site |

## Release flow

1. Merge finished work into `staging`. Render deploys it to staging automatically.
2. Testers check it on https://staging.nestlyapp.site.
3. When it passes, merge `staging` into `main`. Render deploys it to production.

Database migrations follow the same path: they run on staging first, then on production. Never run `prisma migrate dev` against either database; create migrations locally (or with `prisma migrate diff`) and let deploys apply them.

## Build and start commands (both services)

- Build: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- Start: `npm start`

`prisma migrate deploy` applies only migrations that haven't run yet, so it is safe on every deploy.

## Environment variables

Staging copies production's variables exactly, except the ones below. Keep `NODE_ENV` the same as production.

| Variable | Production | Staging |
| --- | --- | --- |
| `APP_ENV` | not set | `staging` |
| `DATABASE_URL`, `DIRECT_URL` | production project | staging project |
| `JWT_SECRET`, `JWT_REFRESH_SECRET` | production secrets | **new** random values |
| `FRONTEND_URL` | https://www.nestlyapp.site | https://staging.nestlyapp.site |
| `PAYSTACK_SECRET_KEY` | `sk_live_...` | `sk_test_...` |
| `PUBLIC_API_URL` | not needed | https://api-staging.nestlyapp.site |
| `AUTO_CONFIRM_DAYS` | not set (5 days) | optional, e.g. `0.01` (~15 minutes) |
| `CLOUDINARY_*` | production account | separate account, or same account |

Generate a new JWT secret with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

What `APP_ENV=staging` changes:

- Email subjects start with `[Staging]`.
- CORS accepts only the staging frontend (plus `FRONTEND_URL` and `CORS_ORIGINS`), never the production site.
- The delivery auto-confirm job runs every 5 minutes instead of hourly.
- Swagger lists the staging URL.
- `npm run seed` is allowed.

## One-time staging setup

1. **Supabase**: create the `nestly-staging` project and copy its pooled and direct connection strings.
2. **Git**: `git checkout -b staging && git push -u origin staging`.
3. **Render**: New Web Service from this repo, branch `staging`, the commands above, and the staging variables. Add the custom domain `api-staging.nestlyapp.site`.
4. **DNS**: add a CNAME `api-staging` pointing to the target Render shows.
5. **Seed test data**: locally, put the staging `DATABASE_URL`/`DIRECT_URL` in `.env`, run `npx prisma migrate deploy`, then `APP_ENV=staging npm run seed`. Check the database host it prints before trusting the output, then put your normal `.env` back.
6. **Paystack (Test mode)**: Settings, API Keys & Webhooks, Test tab. Set the webhook URL to `https://api-staging.nestlyapp.site/api/checkout/webhook/paystack`.

## Test accounts (staging only)

`npm run seed` creates these, all with password `NestlyTest123!`:

| Email | Role |
| --- | --- |
| admin@staging.nestlyapp.site | Admin |
| buyer.a@staging.nestlyapp.site | Buyer A |
| buyer.b@staging.nestlyapp.site | Buyer B |
| seller@staging.nestlyapp.site | Approved seller with "Staging Test Store" |

These addresses have no inbox. For flows that need email (sign-up verification, order emails), testers register with their own addresses.

On staging, pay with [Paystack test cards](https://paystack.com/docs/payments/test-payments/) only. Set the seller's payout account with Paystack's test bank details.
