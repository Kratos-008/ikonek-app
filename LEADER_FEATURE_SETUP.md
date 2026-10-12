# iKonek Leader Member Management — Setup Notes

## What changed
- Added the `LEADER` database role while keeping `YOUTH` and `ADMIN`.
- API authentication now reloads the current role and account name from Neon for each authenticated request.
- Leaders can list, add, edit, and delete youth profiles assigned to their account name via `cellLeader`.
- Leader-created youth profiles are automatically assigned to that Leader; Leaders cannot transfer their members to another leader by editing `cellLeader`.
- Leaders can mark assigned members present and undo an attendance record only for their assigned members.
- Attendance remains restricted to an event's exact date in Philippine time; clearing all attendance remains Admin-only.
- Admin permissions are preserved.

## Deploy
1. Commit and deploy the updated backend and mobile app.
2. Ensure the backend build runs `prisma generate` as it already does in `backend/package.json`.
3. Apply the new migration in `backend/prisma/migrations/20261009100000_add_leader_role/migration.sql` to the existing Neon database. It only adds the `LEADER` enum value; it does not delete or rewrite member records.
4. Assign the `LEADER` role to the intended existing account using the Admin-only `PUT /api/users/:id` endpoint with `{ "role": "LEADER" }`.
5. The account's `name` must match the existing `YouthProfile.cellLeader` assignment value for its members (case-insensitive). If the leader's account name differs from the assigned cell-leader name, update the assignments as Admin before testing.
6. Have the Leader sign out and back in, then open Attendance. The API filters the Leader's member list and attendance history server-side.

## Important
- The app bundle intentionally does not include the original `.env` file. Keep your existing environment variables and secrets in your deployment environment; do not commit them to source control.
- This update keeps the current `cellLeader` name-based assignment design for compatibility. A future improvement would be a dedicated `cellLeaderUserId` foreign key, which would avoid ownership depending on names.
