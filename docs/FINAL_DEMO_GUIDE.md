# Final Project Demo Guide

Suggested duration: 5–10 minutes. Use a dedicated demo account and synthetic data. Do not modify or demonstrate state changes on protected real records, especially blood request #4. If the demo requires creating a donor or request, create it once in an isolated demo database or use a throwaway demo account.

## Demo flow

1. **Introduction (30 seconds)**  
   **Click/show:** Open the app landing page.  
   **Explain:** “Blood Donor Finder helps users locate compatible donors and manage blood requests through one web application.”

2. **Problem and objectives (30 seconds)**  
   **Click/show:** Point to the donor-search and blood-request entry points.  
   **Explain:** “During an urgent need, people need a simple way to find compatible, available donors and keep request details organized.”

3. **User registration (45 seconds)**  
   **Click/show:** Open Register, show the name, email, phone, password, and confirmation fields and client validation.  
   **Explain:** “Registration validates the input, checks duplicate email addresses, and stores only a password hash.” Use a new demo email only in an isolated database.

4. **Login and authentication (30 seconds)**  
   **Click/show:** Sign in to the demo account.  
   **Explain:** “The backend validates the credentials and returns a signed JWT. The frontend sends it with protected API requests.”

5. **Dashboard (30 seconds)**  
   **Click/show:** Open Dashboard.  
   **Explain:** “These request counts and donor status are scoped to the authenticated user.”

6. **User profile (45 seconds)**  
   **Click/show:** Open Profile; click Edit, then Cancel; optionally edit a safe demo value and Save.  
   **Explain:** “Email is read-only. Edit only opens the form; Cancel restores the saved values; Save sends the update and confirms only when it succeeds.”

7. **Donor registration and profile (60 seconds)**  
   **Click/show:** Open donor registration, then My Donor Profile for a registered demo donor. Show availability and the Save/Cancel flow. If the account is not a donor, show the registration call to action instead.  
   **Explain:** “A donor profile belongs to the signed-in user; clients cannot choose another user's ID.”

8. **Donor search and details (45 seconds)**  
   **Click/show:** Filter by blood group and location, show a result, and open its details.  
   **Explain:** “Search filters can be combined, and the API returns only approved donor fields.”

9. **Create a blood request (45 seconds)**  
   **Click/show:** Open Create Blood Request and review the fields. Submit only once if using isolated demo data.  
   **Explain:** “The request stores blood group, units, hospital, location, required date, urgency, and optional notes.”

10. **My Blood Requests and request details (45 seconds)**  
    **Click/show:** Open My Blood Requests, apply a filter, and open an owned demo request.  
    **Explain:** “Request lists and details enforce ownership. Owners can edit valid requests or cancel without deleting the record.”

11. **Donor matching (45 seconds)**  
    **Click/show:** Open matches for an owned demo request.  
    **Explain:** “The backend applies blood-group compatibility, excludes unavailable donors, and prioritizes same-city, then same-state donors.”

12. **Request status (30 seconds)**  
    **Click/show:** For a throwaway pending demo request, demonstrate an allowed transition to fulfilled or cancelled.  
    **Explain:** “A pending request can be fulfilled or cancelled. These are explicit status transitions, and terminal requests cannot transition again.” Never change request #4.

13. **Logout and protection (30 seconds)**  
    **Click/show:** Log out, then try opening `/dashboard` or `/profile`; show redirect to Login.  
    **Explain:** “Logout clears the client session, and protected pages require authentication.”

14. **Technologies and security (45 seconds)**  
    **Click/show:** Briefly show the frontend/backend folders and `/docs` Swagger page.  
    **Explain:** “React and Vite provide the UI; FastAPI and Pydantic provide validated APIs; SQLAlchemy accesses SQLite; JWT authenticates requests; bcrypt hashes passwords. CORS permits the configured frontend origins.”

15. **Conclusion (15 seconds)**  
    **Click/show:** Return to the landing page.  
    **Explain:** “The project combines account management, donor discovery, compatible matching, and owner-scoped blood request workflows.”

## Likely viva questions

| Question | Short answer |
| --- | --- |
| Why FastAPI? | It is a Python framework for building APIs and provides validation and OpenAPI documentation integration. |
| Why React? | React builds the interface from reusable components and updates the page as application state changes. |
| Why SQLite? | It is lightweight and file-based, making it suitable for a local college project without a separate database server. |
| What is JWT? | A signed token the client sends to prove authentication; the backend verifies it before serving protected endpoints. |
| How does authentication work? | Login verifies the password against its stored hash, issues a JWT, and protected requests include that token in the Authorization header. |
| How does donor matching work? | The backend compares compatible blood groups, includes available donors, and sorts by city/state relevance. |
| How is ownership enforced? | The backend gets the current user from the verified JWT and compares that identity to the record owner; it does not trust an owner ID from the client. |
| How is blood-group compatibility handled? | A compatibility mapping determines which donor groups can match each requested group; the backend tests cover the mapping. |
| Why hash passwords? | Hashing avoids storing plaintext passwords; bcrypt also uses a salt and is designed for password storage. |
| Why is cancellation soft deletion? | Changing status preserves the request record and its history instead of physically deleting it. |
| What does SQLAlchemy do? | It maps Python model classes to database tables and provides database query and persistence tools. |
| What is an API endpoint? | A URL and HTTP method through which a client requests or changes server-side data. |
| What is CORS? | A browser security policy controlling which web origins may make cross-origin requests to the API. |
| What could be improved in the future? | Add verified email delivery, email verification, operational monitoring, rate limiting, and broader browser automation. |

## Demo safety reminders

- Do not display passwords, JWTs, password hashes, reset tokens, or `.env` contents.
- Use synthetic contact details for screenshots or presentations.
- Do not use the real database for test registration or request creation.
- Keep request #4 as A+, 2 units, Manipal Hospital, Bengaluru, PENDING.
- Verify live browser flows separately; this guide itself does not claim a browser test was performed.
