## Google Authentication Requirement (Sign In / Sign Up)

### UI

Display a single button:

```
Continue with Google
```

Do **not** create separate **Sign In with Google** and **Sign Up with Google** buttons.

The Google authentication flow should automatically handle both existing and new users.

### Backend Flow

1. Receive the Google ID Token from the frontend.
2. Verify the token using Google's official library.
3. Validate:
   - Token signature
   - Expiration
   - Issuer
   - Audience (`aud`) matches `GOOGLE_CLIENT_ID`
4. Extract the user's email and Google `sub`.
5. Look up the user by email.

### Existing User

If a user with the email already exists:

- Update `lastLogin`.
- Generate the application's JWT.
- Return the JWT and user information.

### New User

If no user exists:

- Automatically create a new account.
- Set `provider = "google"`.
- Store the Google `sub`.
- Generate the application's JWT.
- Return the JWT and user information.

The backend determines whether this is a sign-in or sign-up based on whether the user already exists. The frontend does not need to differentiate between the two flows.

### Important Rules

- Never use the Google ID Token for authorizing application APIs.
- Always issue the application's own JWT after successful verification.
- Use the MongoDB user `_id` as the JWT `sub`.
- Never trust user information received directly from the frontend; always extract it from the verified Google ID Token.