# iKonek Member-to-Account Linking — Phase 2

## Admin Dashboard wiring

Phase 2 connects the Admin Dashboard's member workflow to the existing authenticated `/api/youth` endpoints from Phase 1.

- The Youth Directory loads member profiles from the backend instead of relying on an in-memory list.
- Add Youth creates a `YouthProfile` in the backend and requests a one-time linking code.
- Admin can choose the approved account role (`YOUTH` or `LEADER`) before the member registers.
- Add Youth Leaders creates a member record with the approved role set to `LEADER`.
- Existing unlinked members can receive a replacement one-time code.
- Admin can change a member's approved role; for already-linked members, the existing backend endpoint also updates the linked login role.
- The one-time code is shown when issued. The native share sheet can be used to share it or copy it if the device offers a Copy action.

## Safety and deployment notes

- The raw linking code is returned by the API once; only its hash is stored in the database.
- Give the code directly to the intended member and verify their identity. Do not post codes publicly.
- Existing member IDs and attendance rows are not recreated by these UI changes.
- This phase has not been tested against the live Neon database and does not include a production deployment.
- Before production use, review the Phase 1 migration, test it against a staging database, and test the complete registration + email verification + one-time linking flow.

## Verification performed for this package

- JavaScript syntax checks for backend controllers/routes.
- JSX/JavaScript transpile parse check for `src/screens/AdminDashboard.js`.
- ZIP integrity check.

These checks do not replace an Expo Android build or end-to-end testing against a staging database.
