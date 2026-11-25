# Performance ledger

Measured 2026-11-24. Backend: `next start`, local Postgres 14, 20,000 logs of 14 KB, SES stubbed, 3 rounds. Pages:
Lighthouse mobile, median of 3.

| Idea | Baseline → result | Verdict | Why |
|---|---|---|---|
| Remember a key that passed bcrypt | send p50 68 → 4 ms; 40 at once 15.6 → 875/s | kept | bcryptjs was 62 of 68 ms. The row is still read, so nothing goes stale. |
| Log list without bodies and attachments | 719 → 27 KB; with attachments 16,346 → 27 KB | kept | The list does not show them. |
| Sign-in form in the server HTML | `/login` LCP 2,583 → 1,382 ms | kept | It waited for hydration and the sign-in check. |
| No auth request without a token | `/` LCP 2,584 → 2,584 ms | reverted | No change. |
| Dashboard loaded on demand | `/` LCP 2,584 → 2,584 ms, JS 133 → 128 KB | reverted | No change in LCP. |
| Geist Mono not preloaded | LCP no change, 22 KB fewer | reverted | No change in LCP. |
| Index on `ses_message_id`, or `(domain_id, created_at)` | webhook lookup 17 ms, list under 8 ms | not done | Fast enough at 20,000 rows; a write cost on every send. |
| Longer `idleTimeoutMillis` | a send after 10 s idle is about 190 ms slower live (noisy) | not done | Holds database connections open; the limit was lowered on purpose, and the pool has no error handler for a dropped idle connection. |

Open: `/` (public page) LCP is 2,584 ms, 84 ms over target. Its HTML is a spinner until the sign-in check ends; rendering
the page there would flash it at a signed-in admin.
