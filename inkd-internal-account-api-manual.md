# InkD Internal Account APIs (Admin Auth) - Integration Manual

## 1. Scope

This document covers every admin-authenticated InkD API:

1. `POST /internal/inkd-internal-agents`
2. `GET /internal/inkd-internal-agents`
3. `GET /internal/inkd-internal-agents/name/:name/availability`
4. `GET /internal/inkd-internal-agents/:inkdInternalAgentId`
5. `PATCH /internal/inkd-internal-agents/:inkdInternalAgentId`
6. `POST /internal/inkd-internal-agents/status`
7. `DELETE /internal/inkd-internal-agents/:inkdInternalAgentId`
8. `POST /internal/inkd-internal-agents/chat`
9. `GET /internal/inkd-internal-agents/chat`
10. `GET /internal/inkd-internal-agents/chat/:chatId`
11. `GET /internal/inkd-internal-agents/chat/:chatId/history`
12. `PATCH /internal/inkd-internal-agents/chat/:chatId/config`
13. `PATCH /internal/inkd-internal-agents/chat/:chatId/metadata`
14. `POST /internal/inkd-internal-agents/blogs`
15. `GET /internal/inkd-internal-agents/blogs`
16. `GET /internal/inkd-internal-agents/blogs/:inkdBlogId`
17. `PATCH /internal/inkd-internal-agents/blogs/:inkdBlogId`
18. `DELETE /internal/inkd-internal-agents/blogs/:inkdBlogId`
19. `PATCH /internal/inkd-internal-agents/blogs/:inkdBlogId/review-vote`
20. `POST /internal/inkd-internal-agents/blogs/:inkdBlogId/trials`
21. `GET /internal/inkd-internal-agents/blogs/:inkdBlogId/trials`
22. `PATCH /internal/inkd-internal-agents/blogs/:inkdBlogId/trials/sequence`
23. `GET /internal/inkd-internal-agents/blogs/trials`
24. `GET /internal/inkd-internal-agents/blogs/trials/:inkdTrialId`
25. `POST /internal/inkd-internal-agents/ai-server-auth/rotate-token`

Base URL example:

`http://localhost:4000`

## 2. Authentication

These APIs require an authenticated admin cookie.

Minimal Python setup:

```python
import requests

BASE = "http://localhost:4000"
session = requests.Session()

login_resp = session.post(
    f"{BASE}/public/admin/login",
    json={"email": "admin@example.com", "password": "your-password"},
    timeout=30,
)
login_resp.raise_for_status()
```

## 3. Shared Input Constraints

### 3.1 Primitive Constraints

1. `MongoObjectId`
   Required string.
   Constraint: exactly 24 hexadecimal characters.

2. `Pagination.page`
   Optional query param.
   Constraint: integer-like value greater than or equal to `1`.
   Default: `1`.

3. `Pagination.pageSize`
   Optional query param.
   Constraint: integer-like value between `1` and `100`.
   Default: `100`.

4. `Search.q`
   Optional query param.
   Constraint: trimmed string.
   No max length validator is enforced here.

5. `LooseCsvMongoIds`
   Optional query param.
   Constraint: comma-separated Mongo ids.
   Malformed ids are ignored, duplicates are removed, empty items are ignored.

6. `BooleanLikeQuery`
   Optional query param.
   Recommended values: `true`, `false`, `1`, `0`.
   Omitted value behaves as `false`.

7. `InkDName`
   Required string when used.
   Constraint: trimmed string with min length `3` and max length `64`.

8. `ImageUrl`
   Required string when used.
   Constraint: valid absolute URL ending in `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.avif`, or `.svg`.

9. `VideoUrl`
   Required string when used.
   Constraint: valid absolute URL ending in `.mp4`, `.webm`, `.ogg`, `.mov`, `.avi`, `.mkv`, or `.m4v`.

10. `YouTubeVideoId`
    Required string when used.
    Constraint: exactly 11 characters matching `[A-Za-z0-9_-]{11}`.

11. `ExternalLinkUrl`
    Required string when used.
    Constraint: trimmed valid absolute URL with max length `2048`.

12. `PositiveIntegerAmount`
    Required when used.
    Constraint: positive integer only.
    Accepted by validator as a digit-string, bigint, or safe integer number.
    Recommendation: send as a digit-string in JSON.

### 3.2 Shared Objects

1. `TargetGeo`
   Strict object. No extra keys allowed.
   Fields:
   `countries`: required array when object is present. Each item must be a 2-character country code.
   `states`: required array when object is present. Each item must be a string with minimum length `3`.
   `cities`: required array when object is present. Each item must be a `MongoObjectId`.

2. `ResourceAsset`
   Strict discriminated object. No extra keys allowed.
   Fields:
   `type`: required. Must be one of `youtube`, `image`, `video`.
   `value`: required.
   Constraint depends on `type`:
   `youtube` -> `YouTubeVideoId`
   `image` -> `ImageUrl`
   `video` -> `VideoUrl`

3. `RewardInput`
   Strict object. No extra keys allowed.
   Fields:
   `assetId`: required. Must be one of the backend coin asset ids such as `xPoll`.
   `amount`: required. Constraint: `PositiveIntegerAmount`.
   `rewardAmountCap`: required. Constraint: `PositiveIntegerAmount` and must be greater than or equal to `amount`.
   `rewardType`: optional. Must be `min` or `max`. Default is `max`.

4. `PrioritySources`
   Array field.
   Constraint: max `5` items.
   Each item must be a trimmed non-empty string with min length `1`.

5. `IndustryIds`
   Array field.
   Constraint: max `5` items.
   Each item must be a `MongoObjectId`.

6. `InkDConfigFieldsForAgent`
   Shared create/update constraints:
   `foundationalInformation`: trimmed string, min `100`, max `15000`.
   `brandLanguage`: trimmed string, min `100`, max `15000`.
   `minBlogTitleLength`: integer between `1` and `2000`.
   `maxBlogTitleLength`: integer between `1` and `2000`.
   `minBlogDescriptionLength`: integer between `1` and `15000`.
   `maxBlogDescriptionLength`: integer between `1` and `15000`.
   `maxLinkedTrial`: integer between `1` and `10`.
   `maxLinkedPoll`: integer between `1` and `10`.
   `prioritySources`: `PrioritySources`.
   `targetGeo`: `TargetGeo | null`.
   `fallbackImageUrl` for agent create/update: `ImageUrl | null`.
   `fallbackImageUrl` for chat config patch: `ImageUrl` only, not `null`.
   `rewards`: array of `RewardInput`, min `1` item if present, duplicate `assetId` values rejected.
   Cross-field rule: when min and max title or description bounds are both evaluated, min must be less than or equal to max.

7. `SendInkDChatMessageBody`
   Strict object. No extra keys allowed.
   Fields:
   `chatId`: optional. `MongoObjectId`.
   `inkdAgentId`: optional. `MongoObjectId`.
   `mode`: required. Must be `build` or `plan`.
   `prompt`: required. Trimmed string with min length `1` and max length `50000`.
   Cross-field rule: `inkdAgentId` is required if `chatId` is omitted.

8. `MetadataPatch`
   Required when used.
   Constraint: any JSON object is accepted.
   No fixed field schema, no extra restrictions.

9. `InkDBlogContentForAdminCreate`
   Strict object. No extra keys allowed.
   Fields:
   `createdByInkdInternalAgentId`: required. `MongoObjectId`.
   `title`: required. Trimmed string. Min `1`, max `2000`.
   `description`: required. Trimmed string. Min `100`, max `15000`.
   `uploadedImageLinks`: optional. Array of `ImageUrl`. Max `50` items. Default `[]`.
   `uploadedVideoLinks`: optional. Array of `VideoUrl`. Max `50` items. Default `[]`.
   `ytVideoLinks`: optional. Array of `YouTubeVideoId`. Max `50` items. Default `[]`.
   `externalLinks`: optional. Array of `ExternalLinkUrl`. Max `50` items. Default `[]`.
   `targetGeo`: optional. `TargetGeo | null`. Default `null`.
   `trialSequence`: optional. Array of `MongoObjectId`. Max `10` items. Duplicate ids rejected. Default `[]`.
   `industryIds`: optional. Constraint: `IndustryIds`.

10. `InkDBlogContentForAdminPatch`
    Strict object. No extra keys allowed.
    At least one field is required.
    Editable fields:
    `title`: optional. Trimmed string. Min `1`, max `2000`.
    `description`: optional. Trimmed string. Min `100`, max `15000`.
    `uploadedImageLinks`: optional. Array of `ImageUrl`. Max `50` items.
    `uploadedVideoLinks`: optional. Array of `VideoUrl`. Max `50` items.
    `ytVideoLinks`: optional. Array of `YouTubeVideoId`. Max `50` items.
    `externalLinks`: optional. Array of `ExternalLinkUrl`. Max `50` items.
    `targetGeo`: optional. `TargetGeo | null`.
    `industryIds`: optional. Constraint: `IndustryIds`.
    Rejected field: `trialSequence`.

11. `ReviewVotePatch`
    Strict object. No extra keys allowed.
    Field:
    `reviewVote`: required. Must be `upvote`, `downvote`, or `null`.

12. `TrialSequencePatch`
    Strict object. No extra keys allowed.
    Field:
    `trialIds`: required. Array of `MongoObjectId`. Max `10` items. Duplicate ids rejected.

13. `PollOptionInput`
    Fields:
    `text`: required. Trimmed string. Min `1`, max `500`.
    `_id`: optional. `MongoObjectId`.
    `archivedAt`: optional. Valid date or `null`.

14. `TrialSubPollInput`
    Strict object. No extra keys allowed.
    Fields:
    `resourceAssets`: required. Array of `ResourceAsset`. Max `20` items.
    `title`: required. Trimmed string. Min `3`, max `1000`.
    `description`: required. Trimmed string. Min `3`, max `2000`.
    `options`: required. Array of `PollOptionInput`. Min `2`, max `4`.
    Rejected field: `targetGeo`.

15. `InkDTrialCreateForAdmin`
    Strict object. No extra keys allowed.
    Fields:
    `trial.title`: required. Trimmed string. Min `3`.
    `trial.description`: required. Trimmed string. Min `3`.
    `trial.rewards`: optional. Array of `RewardInput`. Min `1` item if present.
    `trial.expireRewardAt`: optional. Valid date string or date-time string.
    `trial.targetGeo`: optional. `TargetGeo`.
    `trial.resourceAssets`: required. Array of `ResourceAsset` with exact length `1`.
    `polls`: required. Array of `TrialSubPollInput`. Min `1`, max `50`.
    Runtime note: service-level limits can be stricter based on the owning InkD agent's `maxLinkedTrial` and `maxLinkedPoll`.

16. `ChangeInkDAgentStatusBody`
    Strict object. No extra keys allowed.
    Fields:
    `inkDInternalAgentId`: required. `MongoObjectId`.
    `status`: required. Must be `active` or `idle`.

## 4. Response Notes

1. Agent list and agent detail always include `fallbackImageUrl`, and unset values are returned as `null`.
2. Admin blog list and admin blog detail intentionally do not expose `trialSequence`.
3. Admin blog list and admin blog detail include:
   `inkDInternalAgentFallbackImage: string | null`
   `rewardsAlignment.nonActiveTrialsIncluded`
   `rewardsAlignment.activeTrialsOnly`
4. Admin blog create, update, review-vote, and trial-sequence update responses still return the full `InkDBlog` shape, which includes `trialSequence`.

Shared response shapes:

```ts
type ApiResponse<T> = {
  statusCode: number
  data: T
  message: string
  success: boolean
}

type ListingMeta = {
  total: number
  page: number
  pageSize: number
  totalPages: number
}

type RewardResponse = {
  assetId: string
  amount: string
  rewardAmountCap: string
  currentDistribution: string
  rewardType: "min" | "max"
}

type LinkedIndustry = {
  _id: string
  name: string
  description: string | null
}

type InkDInternalAgentDetail = {
  _id: string
  internalAgentId: string
  name: string
  status: "active" | "idle"
  createdByInternalAccountId: string
  foundationalInformation: string
  brandLanguage: string
  minBlogTitleLength: number
  maxBlogTitleLength: number
  minBlogDescriptionLength: number
  maxBlogDescriptionLength: number
  maxLinkedTrial: number
  maxLinkedPoll: number
  prioritySources: string[]
  targetGeo: TargetGeo | null
  uniqueTargetLocations: number
  linkedIndustries: LinkedIndustry[]
  fallbackImageUrl: string | null
  rewards?: RewardResponse[]
  createdAt: string | null
  updatedAt: string | null
  archivedAt: string | null
}

type InkDInternalAgentListEntry = {
  _id: string
  internalAgentId: string
  name: string
  status: "active" | "idle"
  createdByInternalAccountId: string
  targetGeo: TargetGeo | null
  uniqueTargetLocations: number
  linkedIndustries: LinkedIndustry[]
  fallbackImageUrl: string | null
  totalInkBlogsCreated: {
    archivedIncluded: number
    archivedExcluded: number
  }
  createdAt: string | null
  updatedAt: string | null
  archivedAt: string | null
}

type InkDChatConfig = {
  foundationalInformation: string
  brandLanguage: string
  minBlogTitleLength: number
  maxBlogTitleLength: number
  minBlogDescriptionLength: number
  maxBlogDescriptionLength: number
  maxLinkedTrial: number
  maxLinkedPoll: number
  prioritySources: string[]
  targetGeo: TargetGeo | null
  fallbackImageUrl?: string
  rewards?: RewardResponse[]
}

type InkDChat = {
  _id: string
  inkdAgentId: string
  title: string | null
  config: InkDChatConfig
  metadata: Record<string, unknown>
  createdAt: string | null
  updatedAt: string | null
  archivedAt: string | null
}

type InkDChatListEntry = InkDChat & {
  createdByInternalAccountId: string | null
}

type InkDChatAuthor =
  | {
      role: "inkd internal agent"
      inkdAgentId: string
    }
  | {
      role: "internalAccount"
      internalAccountId: string
    }

type InkDChatMessageStatus = {
  status: "pending" | "success" | "failure"
} | null

type InkDChatMessagePart =
  | { type: "text"; text: string }
  | { type: "rich_text"; format: "markdown" | "html" | "json"; content: string }
  | { type: "image"; url: string; alt?: string; width?: number; height?: number }
  | { type: "file"; url: string; fileName: string; mimeType: string; size?: number }
  | { type: "code"; language?: string; code: string }
  | { type: "audio"; url: string; mimeType?: string; durationSec?: number }

type InkDChatMessage = {
  _id: string
  chatId: string
  author: InkDChatAuthor
  replyTo: string | null
  parts: InkDChatMessagePart[]
  messageStatus: InkDChatMessageStatus
  createdAt: string | null
  updatedAt: string | null
}

type InkDBlogOriginalSnapshot = {
  title: string
  description: string
  uploadedImageLinks: string[]
  uploadedVideoLinks: string[]
  ytVideoLinks: string[]
  externalLinks: string[]
  targetGeo: TargetGeo | null
}

type InkDBlog = {
  _id: string
  createdByInkdInternalAgentId: string
  createdByInternalAccountId: string | null
  title: string
  description: string
  uploadedImageLinks: string[]
  uploadedVideoLinks: string[]
  ytVideoLinks: string[]
  externalLinks: string[]
  targetGeo: TargetGeo | null
  uniqueTargetLocations: number
  linkedIndustries: LinkedIndustry[]
  trialSequence: string[]
  reviewVote: "upvote" | "downvote" | null
  originalSnapshot: InkDBlogOriginalSnapshot | null
  createdAt: string | null
  updatedAt: string | null
  archivedAt: string | null
}

type InkDBlogRewardAlignmentEntry = {
  assetId: string
  rewardAmountCap: string
  currentDistribution: string
  rewardLeft: string
}

type InkDBlogRewardsAlignment = {
  nonActiveTrialsIncluded: InkDBlogRewardAlignmentEntry[]
  activeTrialsOnly: InkDBlogRewardAlignmentEntry[]
}

type InternalAdminReadInkDBlog = Omit<InkDBlog, "trialSequence"> & {
  inkDInternalAgentFallbackImage: string | null
  rewardsAlignment: InkDBlogRewardsAlignment
}

type InkDTrial = {
  _id: string
  internalAuthor: string | null
  externalAuthor: string | null
  businessAuthor: string | null
  belongsToCampaignId: string | null
  belongsToInkDBlogId: string | null
  title: string
  description: string
  resourceAssets: ResourceAsset[]
  rewards: RewardResponse[]
  expireRewardAt: string | null
  targetGeo: TargetGeo | null
  uniqueTargetLocations: number
  createdAt: string | null
  updatedAt: string | null
  archivedAt: string | null
}

type InkDTrialPollOption = {
  _id: string
  text: string
  archivedAt: string | null
  numVotes: number
}

type InkDTrialPoll = {
  _id: string
  trialId: string
  internalAuthor: string | null
  externalAuthor: string | null
  businessAuthor: string | null
  title: string
  description: string
  resourceAssets: ResourceAsset[]
  options: InkDTrialPollOption[]
  createdAt: string | null
  updatedAt: string | null
  archivedAt: string | null
}

type ArchiveInkDInternalAgentResponseData = {
  _id: string
  internalAgentId: string
  archivedAt: string
  status: "idle"
}

type ArchiveTrialResult = {
  trialId: string
  pollIds: string[]
  trialArchived: boolean
  pollsArchived: number
}

type ArchiveInkDBlogResponseData = {
  _id: string
  archivedAt: string | null
  archivedTrialCount: number
  archivedTrials: ArchiveTrialResult[]
}

type SendInkDChatMessageDelivery = {
  status: "success" | "endpoint_missing" | "ai_server_error"
  reason: string
  error?: string
}

type RotateAIAgentServerTokenResponseData = {
  _id: string
  rotatedAt: string | null
  bearerToken: string
}
```

## 5. APIs

## 5.1 Internal Agents

### Create InkD Internal Agent

`POST /internal/inkd-internal-agents`

Input constraints:

1. Request body
   Required.
   Constraint: strict object. No extra keys allowed.
   Fields:
   `name`: required. Constraints: `InkDName`.
   All other fields follow `InkDConfigFieldsForAgent`.
   `industryIds`: optional. Constraints: `IndustryIds`.

Example body:

```json
{
  "name": "inkd-agent-01",
  "foundationalInformation": "This is foundational information with more than one hundred characters. It defines operating scope, constraints, safety boundaries, domain context, quality expectations, and the type of outputs the InkD internal agent is allowed to produce.",
  "brandLanguage": "This is brand language with more than one hundred characters. Keep writing direct, useful, factual, and on-brand while avoiding hype, ambiguity, unverifiable claims, and unnecessary filler in generated content.",
  "minBlogTitleLength": 12,
  "maxBlogTitleLength": 120,
  "minBlogDescriptionLength": 150,
  "maxBlogDescriptionLength": 1500,
  "maxLinkedTrial": 5,
  "maxLinkedPoll": 4,
  "prioritySources": [
    "https://example.com/source-1",
    "https://example.com/source-2",
    "https://example.com/source-3"
  ],
  "targetGeo": {
    "countries": [
      "US"
    ],
    "states": [
      "US-CA"
    ],
    "cities": [
      "67cf10aa1d2a9b0012346abc"
    ]
  },
  "fallbackImageUrl": "https://example.com/assets/inkd/fallback.png",
  "rewards": [
    {
      "assetId": "xPoll",
      "amount": "10",
      "rewardAmountCap": "100",
      "rewardType": "max"
    }
  ],
  "industryIds": [
    "67cf10aa1d2a9b0012347001",
    "67cf10aa1d2a9b0012347002"
  ]
}
```

Expected response:

```ts
type CreateInkDInternalAgentResponse = ApiResponse<InkDInternalAgentDetail>
```

### List InkD Internal Agents

`GET /internal/inkd-internal-agents`

Input constraints:

1. Query param `page`
   Optional.
   Constraints: `Pagination.page`.

2. Query param `pageSize`
   Optional.
   Constraints: `Pagination.pageSize`.

3. Query param `name`
   Optional.
   Constraint: trimmed string.
   No min/max validator is enforced on this filter.

4. Query param `internalAccountIds`
   Optional.
   Constraints: `LooseCsvMongoIds`.

5. Query param `industryIds`
   Optional.
   Constraints: `LooseCsvMongoIds`.

6. Query param `includeArchived`
   Optional.
   Constraints: `BooleanLikeQuery`.

Expected response:

```ts
type ListInkDInternalAgentsResponse = ApiResponse<{
  entries: InkDInternalAgentListEntry[]
  meta: ListingMeta
}>
```

### Check InkD Internal Agent Name Availability

`GET /internal/inkd-internal-agents/name/:name/availability`

Input constraints:

1. Path param `name`
   Required.
   Constraints: `InkDName`.

Expected response:

```ts
type CheckInkDInternalAgentNameAvailabilityResponse = ApiResponse<{
  available: boolean
}>
```

### Get InkD Internal Agent By Id

`GET /internal/inkd-internal-agents/:inkdInternalAgentId`

Input constraints:

1. Path param `inkdInternalAgentId`
   Required.
   Constraints: `MongoObjectId`.

Expected response:

```ts
type GetInkDInternalAgentByIdResponse = ApiResponse<InkDInternalAgentDetail>
```

### Update InkD Internal Agent

`PATCH /internal/inkd-internal-agents/:inkdInternalAgentId`

Input constraints:

1. Path param `inkdInternalAgentId`
   Required.
   Constraints: `MongoObjectId`.

2. Request body
   Required.
   Constraint: strict object. At least one editable field is required.
   All supplied fields follow `InkDConfigFieldsForAgent`.
   `fallbackImageUrl` here accepts `ImageUrl | null`.
   `industryIds`: optional. Constraints: `IndustryIds`.

Example body:

```json
{
  "foundationalInformation": "This updated foundational information still stays above one hundred characters and revises operational boundaries, quality requirements, editorial context, and safe generation rules for the InkD agent.",
  "brandLanguage": "This updated brand language stays above one hundred characters and refines style, tone, brevity, factuality, and the preferred format for generated outputs.",
  "minBlogTitleLength": 15,
  "maxBlogTitleLength": 110,
  "minBlogDescriptionLength": 200,
  "maxBlogDescriptionLength": 1400,
  "maxLinkedTrial": 6,
  "maxLinkedPoll": 5,
  "prioritySources": [
    "https://example.com/updated-source-1",
    "https://example.com/updated-source-2"
  ],
  "targetGeo": {
    "countries": [
      "US",
      "CA"
    ],
    "states": [
      "US-NY"
    ],
    "cities": []
  },
  "fallbackImageUrl": null,
  "rewards": [
    {
      "assetId": "xPoll",
      "amount": "15",
      "rewardAmountCap": "150",
      "rewardType": "max"
    }
  ],
  "industryIds": [
    "67cf10aa1d2a9b0012347003"
  ]
}
```

Expected response:

```ts
type UpdateInkDInternalAgentResponse = ApiResponse<InkDInternalAgentDetail>
```

### Change InkD Internal Agent Status

`POST /internal/inkd-internal-agents/status`

Input constraints:

1. Request body
   Required.
   Constraints: `ChangeInkDAgentStatusBody`.

Example body:

```json
{
  "inkDInternalAgentId": "67cf10aa1d2a9b0012347aaa",
  "status": "idle"
}
```

Notes:

1. If this sets an InkD internal agent to `idle`, later non-`GET` calls made through `/internal-agent/inkd/*` for that agent return `204 No Content`.
2. Those idle no-op responses include:
   `x-inkd-agent-status: idle`
   `x-inkd-write-skipped: true`
   `x-inkd-write-skip-reason: agent-idle`

Expected response:

```ts
type ChangeInkDInternalAgentStatusResponse = ApiResponse<InkDInternalAgentDetail>
```

### Archive InkD Internal Agent

`DELETE /internal/inkd-internal-agents/:inkdInternalAgentId`

Input constraints:

1. Path param `inkdInternalAgentId`
   Required.
   Constraints: `MongoObjectId`.

2. Request body
   Not required.
   Constraint: no request body is accepted.

Expected response:

```ts
type ArchiveInkDInternalAgentResponse = ApiResponse<ArchiveInkDInternalAgentResponseData>
```

## 5.2 Chat

### Send InkD Chat Message

`POST /internal/inkd-internal-agents/chat`

Input constraints:

1. Request body
   Required.
   Constraints: `SendInkDChatMessageBody`.

Example body for a new chat:

```json
{
  "inkdAgentId": "67cf10aa1d2a9b0012347aaa",
  "mode": "build",
  "prompt": "Draft a high-quality InkD blog about EV fleet maintenance trends in California and keep the tone direct and factual."
}
```

Example body for an existing chat:

```json
{
  "chatId": "67cf10aa1d2a9b0012347bbb",
  "mode": "plan",
  "prompt": "Revise the previous draft by tightening the headline, shortening the intro, and adding a stronger closing CTA."
}
```

Expected response:

```ts
type SendInkDChatMessageResponse = ApiResponse<{
  delivery: SendInkDChatMessageDelivery
  chat: InkDChat
  userMessage: InkDChatMessage
  assistantMessage: InkDChatMessage | null
}>
```

### List Chats

`GET /internal/inkd-internal-agents/chat`

Input constraints:

1. Query param `page`
   Optional.
   Constraints: `Pagination.page`.

2. Query param `pageSize`
   Optional.
   Constraints: `Pagination.pageSize`.

3. Query param `internalAccountIds`
   Optional.
   Constraints: `LooseCsvMongoIds`.

4. Query param `inkDInternalagentIds`
   Optional.
   Constraints: `LooseCsvMongoIds`.

5. Query param `inkDInternalAgentIds`
   Optional.
   Constraints: `LooseCsvMongoIds`.

6. Query param `includeArchived`
   Optional.
   Constraints: `BooleanLikeQuery`.

Expected response:

```ts
type ListInkDChatsForInternalAccountResponse = ApiResponse<{
  entries: InkDChatListEntry[]
  meta: ListingMeta
}>
```

### Get Chat

`GET /internal/inkd-internal-agents/chat/:chatId`

Input constraints:

1. Path param `chatId`
   Required.
   Constraints: `MongoObjectId`.

Expected response:

```ts
type GetInkDChatForInternalAccountResponse = ApiResponse<{
  chat: InkDChat
}>
```

### Get Chat History

`GET /internal/inkd-internal-agents/chat/:chatId/history`

Input constraints:

1. Path param `chatId`
   Required.
   Constraints: `MongoObjectId`.

2. Query param `page`
   Optional.
   Constraints: `Pagination.page`.

3. Query param `pageSize`
   Optional.
   Constraints: `Pagination.pageSize`.

Expected response:

```ts
type GetInkDChatHistoryForInternalAccountResponse = ApiResponse<{
  chat: InkDChat
  entries: InkDChatMessage[]
  meta: ListingMeta
}>
```

### Update Chat Config

`PATCH /internal/inkd-internal-agents/chat/:chatId/config`

Input constraints:

1. Path param `chatId`
   Required.
   Constraints: `MongoObjectId`.

2. Request body
   Required.
   Constraint: strict object. At least one config field is required.
   Each supplied field follows `InkDConfigFieldsForAgent`.
   `fallbackImageUrl` on this endpoint must be `ImageUrl` if supplied and cannot be `null`.

Example body:

```json
{
  "foundationalInformation": "This is updated chat config foundational information with more than one hundred characters. It adjusts the operating context, generation boundaries, output expectations, and review priorities for the current chat.",
  "brandLanguage": "This is updated chat config brand language with more than one hundred characters. Keep the tone direct, useful, factual, calm, and concise while staying clear of hype and unsupported assertions.",
  "minBlogTitleLength": 14,
  "maxBlogTitleLength": 100,
  "minBlogDescriptionLength": 180,
  "maxBlogDescriptionLength": 1000,
  "maxLinkedTrial": 4,
  "maxLinkedPoll": 4,
  "prioritySources": [
    "https://example.com/chat-source-1",
    "https://example.com/chat-source-2"
  ],
  "targetGeo": {
    "countries": [
      "US"
    ],
    "states": [
      "US-TX"
    ],
    "cities": []
  },
  "fallbackImageUrl": "https://example.com/assets/inkd/chat-fallback.png",
  "rewards": [
    {
      "assetId": "xPoll",
      "amount": "20",
      "rewardAmountCap": "200",
      "rewardType": "max"
    }
  ]
}
```

Expected response:

```ts
type UpdateInkDChatConfigForInternalAccountResponse = ApiResponse<{
  chat: InkDChat
}>
```

### Update Chat Metadata

`PATCH /internal/inkd-internal-agents/chat/:chatId/metadata`

Input constraints:

1. Path param `chatId`
   Required.
   Constraints: `MongoObjectId`.

2. Request body
   Required.
   Constraints: `MetadataPatch`.

Example body:

```json
{
  "workflow": "review-loop",
  "step": 3,
  "flags": {
    "needsHumanApproval": true,
    "containsPricing": false
  },
  "labels": [
    "inkd",
    "seo",
    "revision"
  ]
}
```

Expected response:

```ts
type UpdateInkDChatMetadataForInternalAccountResponse = ApiResponse<{
  chat: InkDChat
}>
```

## 5.3 Blogs

### Create InkD Blog

`POST /internal/inkd-internal-agents/blogs`

Input constraints:

1. Request body
   Required.
   Constraints: `InkDBlogContentForAdminCreate`.

Example body:

```json
{
  "createdByInkdInternalAgentId": "67cf10aa1d2a9b0012347aaa",
  "title": "Internal account created InkD blog",
  "description": "This is a sufficiently long InkD blog description created by an internal account. It includes context, intent, references, and reviewable detail while staying above the validator minimum length.",
  "uploadedImageLinks": [
    "https://example.com/assets/inkd/blog-cover.png"
  ],
  "uploadedVideoLinks": [
    "https://example.com/assets/inkd/blog-overview.mp4"
  ],
  "ytVideoLinks": [
    "dQw4w9WgXcQ"
  ],
  "externalLinks": [
    "https://example.com/source/article-1",
    "https://example.com/source/article-2"
  ],
  "targetGeo": {
    "countries": [
      "US"
    ],
    "states": [
      "US-CA"
    ],
    "cities": [
      "67cf10aa1d2a9b0012346abc"
    ]
  },
  "trialSequence": [
    "67cf10aa1d2a9b0012347101",
    "67cf10aa1d2a9b0012347102"
  ],
  "industryIds": [
    "67cf10aa1d2a9b0012347001",
    "67cf10aa1d2a9b0012347002"
  ]
}
```

Expected response:

```ts
type CreateInkDBlogForInternalAccountResponse = ApiResponse<InkDBlog>
```

### List InkD Blogs

`GET /internal/inkd-internal-agents/blogs`

Input constraints:

1. Query param `page`
   Optional.
   Constraints: `Pagination.page`.

2. Query param `pageSize`
   Optional.
   Constraints: `Pagination.pageSize`.

3. Query param `q`
   Optional.
   Constraints: `Search.q`.

4. Query param `createdByInternalAccountIds`
   Optional.
   Constraints: `LooseCsvMongoIds`.

5. Query param `createdByInkdInternalAgentId`
   Optional.
   Constraints: `LooseCsvMongoIds`.
   Note: despite the singular name, this filter accepts CSV ids.

6. Query param `createdByInkdInternalAgentIds`
   Optional.
   Constraints: `LooseCsvMongoIds`.

7. Query param `industryIds`
   Optional.
   Constraints: `LooseCsvMongoIds`.

8. Query param `includeArchived`
   Optional.
   Constraints: `BooleanLikeQuery`.

Expected response:

```ts
type ListInkDBlogsForInternalAccountResponse = ApiResponse<{
  entries: InternalAdminReadInkDBlog[]
  meta: ListingMeta
}>
```

### Get InkD Blog By Id

`GET /internal/inkd-internal-agents/blogs/:inkdBlogId`

Input constraints:

1. Path param `inkdBlogId`
   Required.
   Constraints: `MongoObjectId`.

Expected response:

```ts
type GetInkDBlogByIdForInternalAccountResponse = ApiResponse<InternalAdminReadInkDBlog>
```

### Update InkD Blog

`PATCH /internal/inkd-internal-agents/blogs/:inkdBlogId`

Input constraints:

1. Path param `inkdBlogId`
   Required.
   Constraints: `MongoObjectId`.

2. Request body
   Required.
   Constraints: `InkDBlogContentForAdminPatch`.

Example body:

```json
{
  "title": "Updated InkD blog title",
  "description": "This updated InkD blog description remains long enough for validation and revises the framing, supporting detail, and editorial direction of the blog.",
  "uploadedImageLinks": [
    "https://example.com/assets/inkd/updated-cover.png"
  ],
  "uploadedVideoLinks": [
    "https://example.com/assets/inkd/updated-overview.mp4"
  ],
  "ytVideoLinks": [
    "dQw4w9WgXcQ"
  ],
  "externalLinks": [
    "https://example.com/updated-source"
  ],
  "targetGeo": {
    "countries": [
      "US",
      "CA"
    ],
    "states": [],
    "cities": []
  },
  "industryIds": [
    "67cf10aa1d2a9b0012347003"
  ]
}
```

Expected response:

```ts
type UpdateInkDBlogForInternalAccountResponse = ApiResponse<InkDBlog>
```

### Archive InkD Blog

`DELETE /internal/inkd-internal-agents/blogs/:inkdBlogId`

Input constraints:

1. Path param `inkdBlogId`
   Required.
   Constraints: `MongoObjectId`.

2. Request body
   Not required.
   Constraint: no request body is accepted.

Expected response:

```ts
type ArchiveInkDBlogResponse = ApiResponse<ArchiveInkDBlogResponseData>
```

### Update InkD Blog Review Vote

`PATCH /internal/inkd-internal-agents/blogs/:inkdBlogId/review-vote`

Input constraints:

1. Path param `inkdBlogId`
   Required.
   Constraints: `MongoObjectId`.

2. Request body
   Required.
   Constraints: `ReviewVotePatch`.

Example body:

```json
{
  "reviewVote": "upvote"
}
```

Expected response:

```ts
type UpdateInkDBlogReviewVoteResponse = ApiResponse<InkDBlog>
```

### Create InkD Trial Under Blog

`POST /internal/inkd-internal-agents/blogs/:inkdBlogId/trials`

Input constraints:

1. Path param `inkdBlogId`
   Required.
   Constraints: `MongoObjectId`.

2. Request body
   Required.
   Constraints: `InkDTrialCreateForAdmin`.

Example body:

```json
{
  "trial": {
    "title": "InkD trial title",
    "description": "InkD trial description with sufficient detail for validation and review.",
    "rewards": [
      {
        "assetId": "xPoll",
        "amount": "10",
        "rewardAmountCap": "100",
        "rewardType": "max"
      }
    ],
    "expireRewardAt": "2026-12-31T23:59:59.000Z",
    "targetGeo": {
      "countries": [
        "US"
      ],
      "states": [
        "US-CA"
      ],
      "cities": []
    },
    "resourceAssets": [
      {
        "type": "image",
        "value": "https://example.com/assets/inkd/trial-cover.png"
      }
    ]
  },
  "polls": [
    {
      "resourceAssets": [
        {
          "type": "image",
          "value": "https://example.com/assets/inkd/poll-1.png"
        }
      ],
      "title": "Poll 1 title",
      "description": "Poll 1 description",
      "options": [
        {
          "text": "Option A"
        },
        {
          "text": "Option B"
        }
      ]
    },
    {
      "resourceAssets": [],
      "title": "Poll 2 title",
      "description": "Poll 2 description",
      "options": [
        {
          "text": "Yes"
        },
        {
          "text": "No"
        }
      ]
    }
  ]
}
```

Expected response:

```ts
type CreateInkDTrialForInternalAccountResponse = ApiResponse<{
  trial: InkDTrial
  polls: InkDTrialPoll[]
}>
```

### List Active Trials For One InkD Blog

`GET /internal/inkd-internal-agents/blogs/:inkdBlogId/trials`

Input constraints:

1. Path param `inkdBlogId`
   Required.
   Constraints: `MongoObjectId`.

Expected response:

```ts
type ListActiveTrialsForInkDBlogForInternalAccountResponse = ApiResponse<{
  activeTrials: InkDTrial[]
}>
```

### Update InkD Blog Trial Sequence

`PATCH /internal/inkd-internal-agents/blogs/:inkdBlogId/trials/sequence`

Input constraints:

1. Path param `inkdBlogId`
   Required.
   Constraints: `MongoObjectId`.

2. Request body
   Required.
   Constraints: `TrialSequencePatch`.

Example body:

```json
{
  "trialIds": [
    "67cf10aa1d2a9b0012347101",
    "67cf10aa1d2a9b0012347102",
    "67cf10aa1d2a9b0012347103"
  ]
}
```

Expected response:

```ts
type UpdateInkDBlogTrialSequenceResponse = ApiResponse<InkDBlog>
```

## 5.4 Trials

### List InkD Trials

`GET /internal/inkd-internal-agents/blogs/trials`

Input constraints:

1. Query param `page`
   Optional.
   Constraints: `Pagination.page`.

2. Query param `pageSize`
   Optional.
   Constraints: `Pagination.pageSize`.

3. Query param `q`
   Optional.
   Constraints: `Search.q`.

4. Query param `inkdBlogCsv`
   Optional.
   Constraints: `LooseCsvMongoIds`.

5. Query param `includeArchived`
   Optional.
   Constraints: `BooleanLikeQuery`.

Expected response:

```ts
type ListInkDTrialsForInternalAccountResponse = ApiResponse<{
  entries: InkDTrial[]
  meta: ListingMeta
}>
```

### Get InkD Trial By Id

`GET /internal/inkd-internal-agents/blogs/trials/:inkdTrialId`

Input constraints:

1. Path param `inkdTrialId`
   Required.
   Constraints: `MongoObjectId`.

Expected response:

```ts
type GetInkDTrialByIdForInternalAccountResponse = ApiResponse<{
  trial: InkDTrial
  polls: InkDTrialPoll[]
}>
```

## 5.5 AI Server Auth

### Rotate Shared AI Server Token

`POST /internal/inkd-internal-agents/ai-server-auth/rotate-token`

Input constraints:

1. Request body
   Not required.
   Constraint: no request body is accepted.

Expected response:

```ts
type RotateAIAgentServerTokenResponse = ApiResponse<RotateAIAgentServerTokenResponseData>
```
