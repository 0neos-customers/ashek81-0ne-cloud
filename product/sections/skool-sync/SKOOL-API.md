# Skool API Reference

> **Source:** Reverse-engineered from Skoot CRM Chrome Extension (v6.0.3)
> **Date:** 2026-02-05
> **Status:** Unofficial - no public API documentation exists

---

## Base URLs

| URL | Purpose |
|-----|---------|
| `https://api2.skool.com` | Backend API |
| `https://www.skool.com` | Frontend + Next.js data routes |
| `https://assets.skool.com` | Static assets (images, etc.) |

---

## Authentication

Skool uses **cookie-based authentication**. All requests require:

```javascript
{
  method: "GET", // or POST
  credentials: "include",
  headers: {
    "accept": "application/json",
    "content-type": "application/json",
    "origin": "https://www.skool.com",
    "referer": "https://www.skool.com/"
  }
}
```

**Key cookies (likely):**
- Session cookie set after login at `www.skool.com`
- May use Clerk for auth (seen in Skoot extension permissions)

---

## API Endpoints

### Self / Current User

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/self/chat-channels` | GET | List user's DM channels |
| `/self/groups` | GET | List user's groups |

**Chat Channels Parameters:**
```
?offset=0&limit=20&last=true&unread-only=false
```

---

### Channels (DMs)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/channels/${channelId}/messages` | GET | Get messages in a DM channel |
| `/channels/${channelId}/messages` | POST | Send message (likely) |

**Messages Parameters:**
```
?after=1  // Get messages after message ID 1 (i.e., all messages)
```

**Response shape (from extractName.js):**
```javascript
{
  channel: {
    user: {
      name: string,        // username/slug
      displayName: string, // display name
      image: string        // profile image URL
    }
  }
}
```

---

### Groups

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/groups/${groupId}/members` | GET | List group members |
| `/groups/${groupId}/analytics` | GET | Group analytics |
| `/groups/${groupId}/admin-metrics` | GET | Admin metrics |
| `/groups/${groupId}/auto-dm` | GET | Auto DM settings |
| `/groups/${groupId}/posts` | GET | Group posts (likely) |
| `/groups/${groupId}/discovery` | GET | Discovery settings (likely) |

---

### Posts

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/posts/${postId}/comments` | GET | Get post comments |
| `/posts/${postId}/vote-up` | POST | Upvote post (likely) |
| `/posts/reorder` | POST | Reorder posts |

---

### Members

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/members/${memberId}/pin` | POST | Pin member (likely) |

---

## Next.js Data Routes

Skool uses Next.js, so many data fetches go through `_next/data` routes.

**Pattern:**
```
https://www.skool.com/_next/data/${buildId}/${groupSlug}/-/${resource}.json
```

**Build ID:** Changes on each Skool deployment. Must be extracted from page HTML.

### Member List

```
GET /_next/data/${buildId}/${groupSlug}/-/members.json?t=active
GET /_next/data/${buildId}/${groupSlug}/-/members.json?page=${page}&pageSize=${size}&filter=${filter}
```

**Parameters:**
- `t=active` - Active members tab
- `page` - Page number
- `pageSize` - Results per page
- `filter` - Filter string

### Group About

```
GET /_next/data/${buildId}/${groupSlug}/about.json
```

### Member Detail

```
GET /_next/data/${buildId}/${groupSlug}/-/member-detail.json
GET /_next/data/${buildId}/${groupSlug}/-/member-tag.json
```

---

## User Profiles

**Profile URL pattern:**
```
https://www.skool.com/@${username}
https://www.skool.com/@${username}?g=${groupSlug}
```

**Image URL pattern:**
```
https://assets.skool.com/f/-/${userId}/...
https://assets.skool.com/${bucket}/${userId}.jpg
```

**Extract user ID from image URL:**
```javascript
// Pattern 1: assets.skool.com/f/-/${userId}/...
const match1 = src.match(/assets\.skool\.com\/f\/-\/([^/]+)/);

// Pattern 2: assets.skool.com/${bucket}/${userId}
const match2 = src.match(/assets\.skool\.com\/[^/]+\/([^/]+)/);
const userId = match2[1].split(".")[0];
```

---

## Commerce / Payments (Clerk-based)

These appear to be Clerk commerce endpoints, not Skool-specific:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/commerce/products` | GET | List products |
| `/me/commerce/subscriptions` | GET | User subscriptions |
| `/me/commerce/statements` | GET | Billing statements |
| `/me/commerce/payment_attempts` | GET | Payment attempts |
| `/me/commerce/checkouts` | POST | Create checkout |
| `/me/commerce/payment_sources` | GET/POST | Payment methods |
| `/organizations/${orgId}/commerce/*` | * | Org-level commerce |

---

## Implementation Notes

### Getting the Build ID

The Next.js build ID is required for `_next/data` routes. Extract from page HTML:

```javascript
// Look for: /_next/data/BUILD_ID/
const buildIdMatch = html.match(/_next\/data\/([^/]+)\//);
const buildId = buildIdMatch?.[1];
```

### Pagination

Chat channels use offset-based pagination:
```
?offset=0&limit=20
?offset=20&limit=20
```

Members may use page-based:
```
?page=1&pageSize=50
```

### Rate Limiting

Unknown - be conservative. Skoot extension makes requests on user action, not bulk.

---

## What We Need for Skool Sync

### Priority 1: Member Data
- `/groups/${groupId}/members` - Get all community members
- Member details: name, email (if available), join date, level

### Priority 2: DM Sync
- `/self/chat-channels` - List all DM conversations
- `/channels/${channelId}/messages` - Get conversation history

### Priority 3: Activity
- `/groups/${groupId}/analytics` - Engagement metrics
- Post/comment activity per member

---

## Confirmed Working (2026-02-05)

All endpoints tested and confirmed working with Jimmy's account.

### Chat Channels
```
GET https://api2.skool.com/self/chat-channels?offset=0&limit=20
```
Returns: DM list with user info, unread counts, last message timestamps

### Groups
```
GET https://api2.skool.com/self/groups
```
Returns: All groups user is member of, with metadata

### Members (via Next.js data route)
```
GET https://www.skool.com/_next/data/${buildId}/${groupSlug}/-/members.json?t=active
```
Returns: Full member list with:
- Name, bio, location
- Profile pictures (bubble, profile sizes)
- Social links (Facebook, Instagram, LinkedIn, Twitter, YouTube, Website)
- Join date (`createdAt`), last online (`lastOffline`)
- Attribution (`attrSrc` - how they found the group)
- Level/points (`spData`)
- Member status tabs: active, cancelling, churned, banned

**Note:** Build ID changes on each Skool deployment. Extract from page HTML:
```javascript
const match = html.match(/"buildId":"([^"]+)"/);
```

---

## Open Questions

1. **Email access** - Emails show as empty string in API (privacy protected)
2. **Webhook support** - Does Skool have webhooks for new members, messages?
3. **Rate limits** - Unknown, be conservative
4. **Cookie expiry** - auth_token expires ~1 year from login
5. **2FA handling** - Jimmy's account has no 2FA (simple headless login works)

---

## Revenue & MRR Endpoints (Documented 2026-02-06)

### Working Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/groups/{slug}/analytics?chart=mrr` | GET | Monthly MRR breakdown |
| `/groups/{slug}/analytics?chart=members` | GET | Monthly member growth |

### MRR Chart Response

```
GET https://api2.skool.com/groups/fruitful/analytics?chart=mrr
```

Returns monthly MRR data with breakdown:
```json
{
  "chart_data": {
    "items": [
      {
        "date": "2026-01-01",
        "churn": 0,
        "downgrade": 0,
        "existing": 0,
        "new": 0,
        "reactivation": 0,
        "upgrade": 0,
        "mrr": 0
      }
    ]
  }
}
```

**Fields:**
- `date`: First of month (YYYY-MM-DD)
- `churn`: MRR lost to churn
- `downgrade`: MRR lost to downgrades
- `existing`: MRR from existing subscribers
- `new`: MRR from new subscribers
- `reactivation`: MRR from reactivated members
- `upgrade`: MRR from upgrades
- `mrr`: Total MRR for the month

### Members Chart Response

```
GET https://api2.skool.com/groups/fruitful/analytics?chart=members
```

Returns monthly member growth:
```json
{
  "chart_data": {
    "items": [
      {
        "date": "2026-01-01",
        "new": 1244,
        "existing": 1326,
        "churned": -112,
        "total": 2458
      }
    ]
  }
}
```

### Non-Working Endpoints (Tested 2026-02-06)

These return 400 or 404:
- `admin-metrics?amt=revenue` - 400
- `admin-metrics?amt=mrr` - 400
- `admin-metrics?amt=billing` - 400
- `admin-metrics?amt=subscriptions` - 400
- `analytics?chart=revenue` - 400
- `analytics?chart=ltv` - 400
- `analytics?chart=retention` - 400
- `analytics?chart=churn` - 400
- `billing` - 404
- `billing-overview` - 404
- `commerce` - 404

### Important Note: Dashboard vs Analytics API

Fruitful Funding **DOES use Skool's native payment system** for Premium/VIP subscriptions. The dashboard clearly shows MRR data ($503 as of Feb 2026).

**Issue:** The `/analytics?chart=mrr` endpoint returns zeros, BUT the Settings > Dashboard shows real MRR data. This means:
- The dashboard uses a **different API endpoint** than `/analytics?chart=mrr`
- Need to capture network requests from Settings > Dashboard to find the correct endpoint
- The data exists in Skool - we just need to find the right API

**Next Step:** Open browser DevTools on Settings > Dashboard and capture the actual API endpoints being called.

**Dashboard Values (Screenshot 2026-02-06):**
- Members: 2,621
- MRR: $503
- Conversion: 28.8%
- Retention: 100.0%
- January 2026: New $396, Existing $8, MRR $404

---

## Related Files

- `SKOOL-AUTH.md` - Authentication setup and cookie management
- `spec.md` - Skool Sync feature specification
- `../../../apps/web/src/features/skool/` - Implementation (when built)
