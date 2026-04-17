# Runbook — Authentication logout flow

This document describes the end-to-end logout flow used by the Next.js web app
and how to triage the "blank `/app` after logout" class of bugs.

## Flow

```
┌──────────────────────────┐
│ UI: Sign out button      │  <form action="/logout" method="post">
│  (clinic-topbar.tsx  and │
│   control-plane shell)   │
└────────────┬─────────────┘
             │ POST /logout (same-origin form submit)
             ▼
┌──────────────────────────┐
│ apps/web/app/logout/     │  1. Forward cookie header to
│  route.ts                │     POST /api/v1/auth/logout.
│                          │  2. Emit Set-Cookie that clears
│                          │     agentmou-session locally.
│                          │  3. 303 redirect to /login.
└────────────┬─────────────┘
             │ 303 Location: /login
             ▼
┌──────────────────────────┐
│ Browser loads /login     │  Cookie is gone. AuthLayout SSR
│                          │  sees no session → renders the
│                          │  login form.
└──────────────────────────┘
```

## Why a server route handler

Two earlier client-side implementations were in place:

1. `await logout(); router.push('/login')` in the clinic shell.
2. `await logout(); window.location.href = '/login'` in the control-plane shell.

Both were prone to a race condition: `router.push` is a soft navigation, so the
RSC fetch to `/login` travelled back through `proxy.ts` while the browser cookie
had not yet been cleared, which caused the proxy to bounce `/login → /app`. The
user landed on `/app`, saw `null` while the store hydrated, and perceived the
page as blank.

Delegating to a server route handler eliminates the race: the response that
drives navigation is the same response that carries the `Set-Cookie` header.

## Cookie attributes

The clearing cookie mirrors the attributes used by
`services/api/src/lib/auth-sessions.ts#setAuthSessionCookie` when the session
is created:

| Attribute | Production value | Local dev value |
| --- | --- | --- |
| Name | `agentmou-session` | `agentmou-session` |
| Path | `/` | `/` |
| SameSite | `Lax` | `Lax` |
| Secure | `true` | `false` |
| Domain | `.agentmou.io` | (unset) |
| Max-Age | `0` | `0` |

See `apps/web/lib/auth/cookie.ts#buildClearedAuthCookie`.

## Triage checklist

When someone reports "I logged out and got a blank page":

1. **Check the Set-Cookie**. In the browser DevTools Network panel, click the
   `/logout` request. The response must include `Set-Cookie:
   agentmou-session=; Max-Age=0; Domain=.agentmou.io; Path=/; Secure; HttpOnly;
   SameSite=Lax` (in prod).
2. **Check the redirect**. Status must be `303` and `Location: /login`.
3. **Check the subsequent `/login` request**. Cookie header must not contain
   `agentmou-session=<something>`. If it does, the clearing cookie didn't match
   the creation cookie (domain mismatch). Verify `APP_PUBLIC_BASE_URL` and
   `API_PUBLIC_BASE_URL` share the same parent domain in prod.
4. **Check the API `/api/v1/auth/logout` call** (server logs). The route
   handler forwards the cookie header to it. If it 401s, the session was
   already expired — that's fine; the cookie still gets cleared.
5. **Check `proxy.ts`**. `/logout` is in the matcher and the proxy returns
   early (`NextResponse.next()`) without reading the cookie. Regression test:
   `apps/web/proxy.test.ts` has a `passes /logout through` case.

## Known edge cases

- **Impersonation active**: the session cookie is the impersonation token. The
  server route handler forwards it to `/api/v1/auth/logout`, which revokes both
  the impersonation record and the actor's underlying session (if applicable).
  After redirect, the actor must sign in again. This is intentional — logging
  out during impersonation should fully unwind.
- **Multiple tabs**: logging out in one tab leaves the other tabs with a stale
  auth store. The next time they hit a protected route, `proxy.ts` intercepts
  the missing cookie and redirects to `/login`. This is the correct behaviour,
  but the UX of the stale tab is not pretty. Consider listening to the
  `cookiestore` API or a `BroadcastChannel` in a future PR if this becomes a
  common complaint.

## Related files

- `apps/web/app/logout/route.ts` — the server route handler.
- `apps/web/lib/auth/cookie.ts` — cookie attribute helpers.
- `apps/web/lib/auth/store.ts` — Zustand store; `clearSession()` wipes client state.
- `apps/web/proxy.ts` — middleware; passes `/logout` through verbatim.
- `apps/web/components/clinic/clinic-topbar.tsx` — clinic sign-out button.
- `apps/web/components/control-plane/app-shell.tsx` — admin sign-out button.
- `services/api/src/lib/auth-sessions.ts` — cookie creation (mirrored here).
- `services/api/src/modules/auth/auth.routes.ts` — `POST /api/v1/auth/logout`.
