new requirement 

---
name: mindfulspend-auth
description: Use ONLY when modifying authentication, JWT, Google OAuth, login, signup, auth middleware, or User model.
---
# Purpose
This skill governs all authentication code.
If the request is unrelated to authentication,
STOP.
Do not read the remainder of this skill.
---
# Scope
Applies ONLY when editing:
- auth.controller
- auth.service
- auth.repository
- authenticate middleware
- User model
- Google OAuth
- JWT
- Login
- Signup
- Forgot Password
- Profile APIs
Otherwise STOP.
---
# Architecture
Always follow
Controller
↓
Service
↓
Repository
↓
MongoDB
Never bypass the service.
Never access MongoDB from controllers.
---
# Authentication Providers
Supported providers
LOCAL
GOOGLE
Future providers
APPLE
GITHUB
Never hardcode provider-specific logic inside controllers.
Use provider implementations.
---
# User Model
Required fields
- email (unique)
- providers[]
- passwordHash
- googleId
- firstName
- lastName
- avatar
- emailVerified
Never create duplicate users.
Users are identified by email.
---
# Signup
LOCAL
Validate
↓
Hash password
↓
Create user
↓
providers=["LOCAL"]
↓
Generate JWT
↓
Return
-----------------------------------
GOOGLE
Verify Google Token
↓
Extract identity
↓
Find email
↓
Create or Link account
↓
Add GOOGLE provider
↓
Generate JWT
↓
Return
---
# Login
LOCAL
Find user
↓
Compare bcrypt
↓
Generate JWT
GOOGLE
Verify Google Token
↓
Find user
↓
Link if required
↓
Generate JWT
---
# JWT
Generate only inside jwt.service.
Never generate JWT in controllers.
JWT payload
sub
email
Expiry
7 days
---
# Security Loop
For every authentication change verify:
□ Passwords are hashed.
□ JWT expires.
□ Protected APIs use authenticate middleware.
□ Controllers contain no business logic.
□ Repository performs all Mongo operations.
□ Password hash is never returned.
□ Google ID token is verified.
If any answer is NO
Fix before continuing.
---
# Modification Harness
When modifying authentication:
Step 1
Determine request type
LOCAL
or
GOOGLE
↓
Step 2
Determine layer
Controller
Service
Repository
Middleware
↓
Modify ONLY that layer.
↓
Do not modify unrelated files.
↓
Run through Security Loop.
↓
Stop.
---
# Development Rules
Never duplicate authentication logic.
Never duplicate JWT generation.
Never duplicate password hashing.
Never duplicate Google verification.
Never bypass auth.service.
Never create multiple users for the same email.
Link providers instead.
---
# Stop Conditions
If the task does not involve authentication
STOP.
Do not consume more context.
Do not read unrelated skills.