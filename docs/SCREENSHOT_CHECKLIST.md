# College Project Screenshot Checklist

Use a clean browser window and the local development app. Use a dedicated demo account and avoid exposing real personal information. Crop or blur addresses, phone numbers, email addresses, access tokens, reset tokens, and any unrelated browser tabs. Do not show `.env` contents or database files with personal records.

1. **Login page** — Open `/login`; show the email/password form and recovery link. Use only a demo account; never reveal its password.
2. **Registration page** — Open `/register`; show the account fields and inline validation. Do not capture a real user's information or a typed password.
3. **Successful registration/login** — Show the post-registration confirmation and/or authenticated navigation after signing in with a demo account. Hide credentials and tokens.
4. **Dashboard** — Open `/dashboard`; show summary cards and quick actions for the signed-in demo user.
5. **User Profile** — Open `/profile`; show the safe name, read-only email, and phone fields. Hide the demo account's contact details if required.
6. **Donor Registration** — Open the donor registration form; show its required donor details and availability controls. Do not submit repeatedly just to create a screenshot.
7. **My Donor Profile** — Open `/donor-profile`; show the donor's editable profile and availability, or document the not-registered message/link if using a non-donor account.
8. **Find Donors** — Open `/donors`; show blood group/location/availability filters and a result. Use synthetic/demo contact details.
9. **Donor Details** — Open a donor detail screen; show only approved donor information. Hide phone/address if the data is not synthetic.
10. **Create Blood Request** — Open `/requests/new`; show the request form before submission. Do not create duplicate requests for screenshots.
11. **My Blood Requests** — Open `/requests`; show the current demo user's requests and filters.
12. **Blood Request Details** — Open a demo-owned request; show the request details and status controls.
13. **Edit Blood Request** — Open an owned pending demo request in edit mode; show editable fields. Do not edit the protected project request #4.
14. **Search/Filter Blood Requests** — Open `/requests`; show selected filters and their resulting list.
15. **Matching Donors** — Open the matches section for an owned demo request; show compatible, available results and their location ordering.
16. **Request Status Management** — Show an owned demo request's pending-to-fulfilled or pending-to-cancelled control using a throwaway demo request. Never change request #4.
17. **Logout** — Show the logged-out navigation after logout. Ensure no credentials or developer tools are visible.
18. **Swagger/API documentation** — Open `http://127.0.0.1:8000/docs`; show the documented API groups. Do not display an active bearer token in the authorize dialog.
19. **GitHub repository** — If the project has been published, show its repository page with no secrets or database files. The current local workspace does not establish a GitHub URL, so do not invent one.
20. **Final project structure** — Show the project root in the editor or file explorer, including `backend`, `frontend`, `docs`, and this README. Hide `.env`, local databases, virtual environments, and dependency folders.

Capture each screen only after verifying that the displayed information is safe to share. These are instructions for screenshots; no screenshots are included or claimed here.
