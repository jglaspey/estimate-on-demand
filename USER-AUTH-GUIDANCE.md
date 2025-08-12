### User management and authentication plan

- **Approach**: Auth.js v5 (NextAuth) + Prisma on Railway Postgres
- **Providers**: Google SSO (Workspace) and Email Magic Link (passwordless)
- **Model**: Organizations → Members (roles) → Users
- **Behavior**: Invite-only onboarding; role-based dashboards; no passwords to store or reset

### Versions and deps
- **Node**: 22 LTS
- **Next.js**: 15 (App Router)
- **TypeScript**: 5.9
- **Prisma**: 5.x
- **Packages**:
  - `next-auth@^5` (Auth.js v5)
  - `@auth/prisma-adapter`
  - `prisma`, `@prisma/client`
  - `zod`
  - email provider SDK: `resend` or `postmark` (choose one)

### Environment
- **Database**: `DATABASE_URL=postgresql://...` (Railway)
- **Auth.js**: `AUTH_SECRET=...` (32+ chars), `AUTH_TRUST_HOST=true`
- **Google**: `GOOGLE_CLIENT_ID=...`, `GOOGLE_CLIENT_SECRET=...`
- **Email**: `EMAIL_FROM=noreply@yourdomain.com`, `RESEND_API_KEY=...` (or Postmark equivalents)
- Optional: `ALLOWED_GOOGLE_DOMAIN=client.com`

### Prisma schema (auth + org + invite)
```prisma
model User {
  id            String   @id @default(cuid())
  name          String?
  email         String?  @unique
  emailVerified DateTime?
  image         String?

  accounts  Account[]
  sessions  Session[]
  members   Membership[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  access_token      String?
  token_type        String?
  id_token          String?
  scope             String?
  expires_at        Int?
  refresh_token     String?

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  userId       String
  sessionToken String   @unique
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime
  @@unique([identifier, token])
}

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  members   Membership[]
  invites   Invite[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Membership {
  id        String   @id @default(cuid())
  orgId     String
  userId    String
  role      Role     @default(MEMBER)
  createdAt DateTime @default(now())

  org   Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user  User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([orgId, userId])
}

enum Role {
  OWNER
  ADMIN
  MEMBER
  VIEWER
}

model Invite {
  id         String   @id @default(cuid())
  orgId      String
  email      String
  tokenHash  String   @unique
  expiresAt  DateTime
  invitedBy  String
  acceptedAt DateTime?

  org Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  @@index([email])
}
```

### Auth configuration (v5) outline
- Google provider (optionally gate by domain after callback)
- Email provider with custom `sendVerificationRequest` using Resend/Postmark
- Prisma adapter
- Database sessions for easy invalidation
- Session cookie maxAge: 30 days

```ts
// auth.config.ts
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Email from "next-auth/providers/email";
import { prisma } from "@/lib/prisma";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({ allowDangerousEmailAccountLinking: false }),
    Email({
      sendVerificationRequest: async ({ identifier, url, provider }) => {
        // send with Resend/Postmark; template includes url
      }
    })
  ],
  session: { strategy: "database", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/sign-in", verifyRequest: "/verify" }
};
```

### Route handlers and middleware
- `app/api/auth/[...nextauth]/route.ts`: export Auth.js handler using `authConfig`
- `middleware.ts`: protect `/(app)` routes; inject org context; allow `/(auth)` public routes

```ts
// middleware.ts
import { auth } from "next-auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl, auth } = req;
  const isApp = nextUrl.pathname.startsWith("/app");
  if (isApp && !auth?.user) return NextResponse.redirect(new URL("/sign-in", nextUrl));
  return NextResponse.next();
});
export const config = { matcher: ["/app/:path*"] };
```

### Invite-only onboarding
- Admin creates invite: `POST /api/orgs/:orgId/invites` with email(s)
  - Hash token with `crypto.subtle.digest('SHA-256', rawToken)`, store `tokenHash`, `expiresAt`
  - Email link: `https://app/invite/${rawToken}`
- Accept invite: `GET /invite/[token]`
  - Verify token by hash lookup and expiry
  - On first sign-in (Google or Magic Link), attach `Membership` with default role (e.g., MEMBER), mark invite accepted
- Optional domain allowlist: after Google callback, if `ALLOWED_GOOGLE_DOMAIN` set, reject other domains unless a valid invite exists

### RBAC and dashboards
- Roles: `OWNER`, `ADMIN`, `MEMBER`, `VIEWER`
- Access control helpers:
  - `getMembership(userId, orgId)` → membership + role
  - `assertRole(orgId, ["ADMIN","OWNER"])` in server actions/route handlers
- Routing pattern:
  - `app/(auth)/sign-in`, `app/(auth)/verify`, `app/(auth)/invite/[token]`
  - `app/(app)/org/[orgId]/dashboard` (route group)
  - Middleware ensures active org/member; redirect to org selection if multiple

### Emails
- Templates: verification (magic link), invitation
- Rate-limit: 5 verification emails per 60 minutes per identifier
- From: `EMAIL_FROM` domain with DKIM set up

### Security
- No passwords stored; magic link + Google SSO only
- Database sessions (revocable), secure cookies, HTTPS-only
- Invite tokens hashed and short-lived (e.g., 7 days)
- Audit fields via Prisma middleware if needed (createdBy, ip, ua)

### Implementation steps
1. Install deps; init Prisma; apply schema; seed an `Organization` and an `OWNER` membership for your account.
2. Configure `auth.config.ts`, Google provider, email sender, and route handler.
3. Add `middleware.ts` for route protection; create `sign-in`, `verify`, `invite/[token]` pages.
4. Build invite API (`POST /api/orgs/:id/invites`, `GET /invite/[token]`) and attach membership on first sign-in.
5. Add RBAC helpers and wrap route handlers/server actions with role checks.
6. Wire dashboards by role and org context.
7. Configure env in Railway; set secrets; deploy; test flows:
   - Invite → Accept → First sign-in (Google) → Member created
   - Magic link sign-in
   - Role-gated routes and dashboards
   - Session revocation

### Hand-off notes
- This is invite-only, SSO + magic-link, DB-backed sessions, org RBAC. No password resets; “reset” = new magic link sign-in.
- Keep `jobs`, `documents`, etc., keyed by `orgId` to enforce tenancy at query layer.

- Implement on Railway with separate `web` and `worker` if you use queues later; the auth stack above lives in `web`.

- Env/config values and schema above are final; proceed to implementation.