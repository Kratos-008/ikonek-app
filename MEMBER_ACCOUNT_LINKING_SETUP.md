# iKonek member-account linking (Phase 1)

This phase preserves existing `YouthProfile` and `Attendance` records and adds a secure path for a member's login account to claim the pre-existing member profile.

## Database migration

From the `backend` directory, run the project's normal Prisma migration deployment process after reviewing the migration:

`prisma/migrations/20261009180000_member_registration_linking/migration.sql`

Do not run this against production until a Neon backup has been taken and the migration has been tested against a staging database.

## Behavior added

- Creating a member through `POST /api/youth` generates a one-time code. The API returns the raw code once; only a SHA-256 hash is stored.
- Existing unlinked members can receive a replacement code via Admin-only `POST /api/youth/:id/registration-code`.
- Registration accepts an optional `linkingCode`. If supplied, the code and normalized full name must match an unlinked member record.
- Email verification performs the actual one-time link and assigns the approved `accountRole` (`YOUTH` or `LEADER`) to the account.
- Accounts that already existed before this feature can use authenticated `POST /api/auth/link-member` to claim an existing record with a code.
- The member's existing database ID and attendance history are not recreated or deleted.

## Phase 2 status

The Admin Dashboard wiring is described in `MEMBER_ACCOUNT_LINKING_PHASE2.md`. The workflow still needs end-to-end testing against a staging database before production deployment. Do not run the migration against production until a backup has been taken and the migration has been tested against staging.
