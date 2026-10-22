# ADO Feature & User Story Report — Implementation Plan

## 1. Project Overview

Build a full-stack web application to retrieve Azure DevOps Features and their child User Stories, then generate visual status reports.

**Tech Stack:**
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Node.js + Express + TypeScript
- **Charts:** Recharts (React-native, lightweight)
- **Styling:** Tailwind CSS (utility-first, responsive)
- **API Integration:** Azure DevOps REST APIs (backend-only)
- **Testing:** Vitest (unit/integration) + React Testing Library

---

## 2. Architecture

```
ado_project/
├── .env.example          # Configuration template
├── .gitignore
├── package.json          # Root workspace (npm workspaces)
├── README.md
├── client/               # Frontend (Vite + React + TS)
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── App.css
│   │   ├── api/
│   │   │   └── ado.ts           # Frontend API client
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── FeatureInput.tsx
│   │   │   ├── FeatureTable.tsx
│   │   │   ├── ChildStoryTable.tsx
│   │   │   ├── ReportDashboard.tsx
│   │   │   ├── StatusPieChart.tsx
│   │   │   ├── LoadingSpinner.tsx
│   │   │   ├── ErrorAlert.tsx
│   │   │   └── index.ts
│   │   ├── hooks/
│   │   │   ├── useFeatures.ts
│   │   │   ├── useChildStories.ts
│   │   │   └── useReport.ts
│   │   ├── types/
│   │   │   └── ado.ts           # Shared TypeScript types
│   │   └── utils/
│   │       ├── formatters.ts
│   │       └── validation.ts
│   └── tests/
│       ├── components/
│       └── hooks/
└── server/               # Backend (Express + TS)
    ├── package.json
    ├── tsconfig.json
    ├── src/
    │   ├── index.ts
    │   ├── config/
    │   │   └── env.ts           # Environment validation
    │   ├── routes/
    │   │   ├── features.ts
    │   │   ├── childStories.ts
    │   │   └── report.ts
    │   ├── services/
    │   │   ├── adoClient.ts       # ADO REST API client
    │   │   ├── featureService.ts
    │   │   ├── childStoryService.ts
    │   │   └── fieldMapping.ts    # Custom field resolution
    │   ├── middleware/
    │   │   ├── errorHandler.ts
    │   │   └── validation.ts
    │   ├── types/
    │   │   └── ado.ts
    │   └── utils/
    │       ├── adoUrls.ts
    │       └── batching.ts
    └── tests/
        ├── services/
        └── routes/
```

---

## 3. Azure DevOps API Integration

### Endpoints Used

| Purpose | Endpoint | API Version |
|---------|----------|-------------|
| Get work items by IDs | `GET /{organization}/{project}/_apis/wit/workitems?ids={ids}&fields={fields}` | 7.1 |
| Get work item relations | `GET /{organization}/{project}/_apis/wit/workitems/{id}?$expand=relations` | 7.1 |
| WIQL query (children) | `POST /{organization}/{project}/_apis/wit/wiql` | 7.1 |
| Get boards/columns | `GET /{organization}/{project}/{team}/_apis/work/boards` | 7.1 |
| Get board columns | `GET /{organization}/{project}/{team}/_apis/work/boards/{board}/columns` | 7.1 |

### Authentication

- PAT passed via `Authorization: Basic <base64(":PAT")>` header
- PAT stored **only** in server-side `.env` (never in frontend)

### Custom Field Mapping (Configurable)

```typescript
// server/src/config/fieldMapping.ts
interface FieldMapping {
  boardColumn: string;      // e.g., "System.BoardColumn" or custom
  deployDate: string;       // e.g., "Custom.DeployDate"
  targetDate: string;       // e.g., "Microsoft.VSTS.Scheduling.TargetDate"
}
```

Default mappings provided; user overrides via environment variables.

---

## 4. Backend API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/features` | Fetch Features by IDs (body: `{ ids: number[] }`) |
| POST | `/api/child-stories` | Fetch child User Stories for selected Feature IDs |
| GET | `/api/field-mappings` | Return current custom field mappings |
| GET | `/api/health` | Health check |

### Request/Response Examples

**POST /api/features**
```json
// Request
{ "ids": [12345, 12346] }

// Response
{
  "features": [
    { "id": 12345, "title": "Auth Refactor", "status": "Active", "assignedTo": "John Doe", "project": "MyProject" }
  ],
  "errors": [{ "id": 12346, "message": "Not found" }]
}
```

**POST /api/child-stories**
```json
// Request
{ "featureIds": [12345] }

// Response
{
  "childStories": [
    { "id": 12350, "title": "Login API", "status": "Active", "assignedTo": "Jane", "boardColumn": "In Progress", "deployDate": "2024-03-15", "targetDate": "2024-03-10", "parentFeature": { "id": 12345, "title": "Auth Refactor" } }
  ],
  "errors": []
}
```

---

## 5. Frontend Components

### 5.1 Component Hierarchy

```
App
├── Header
├── FeatureInput
│   └── (textarea + Fetch Data / Get Report buttons)
├── FeatureTable
│   ├── Select All checkbox
│   ├── Sortable headers
│   ├── Row: checkbox, ID (link), Title, Status, Assigned To
│   └── Empty/Error states
├── ChildStoryTable (conditionally rendered)
│   ├── Fetch Child Stories button
│   ├── Sortable headers
│   ├── Row: ID (link), Title, Status, Assigned To, Board Column, Deploy Date, Target Date, Parent Feature
│   └── Empty/Error states
└── ReportDashboard (modal or separate view)
    ├── Feature Status Pie Chart
    ├── Child Story Status Pie Charts (one per Feature)
    ├── Report metadata (generated at, totals)
    └── Back to tables button
```

### 5.2 State Management

- React Query (TanStack Query) for server state
- Local React state for UI (selection, sorting, view mode)
- No global store needed (simple enough)

---

## 6. Key Features Implementation Details

### Feature Fetching
- Input validation: trim, deduplicate, numeric-only
- Batch fetch (max 200 IDs per ADO batch limit)
- Preserve partial results on failure
- Map ADO work item → Feature type (filter by `System.WorkItemType == 'Feature'`)

### Child User Story Fetching
- For each selected Feature, query relations (`System.LinkTypes.Hierarchy-Forward`)
- Filter children by `System.WorkItemType == 'User Story'`
- Deduplicate by ID but preserve all parent associations
- Resolve board column via board/column API (team-specific)
- Resolve custom fields via configurable mapping

### Report Generation
- Feature Status Pie: aggregate from Feature table data
- Child Story Status Pies: one per Feature, aggregate from Child table
- Use Recharts `<PieChart>` with `<Pie>`, `<Cell>`, `<Tooltip>`, `<Legend>`
- Responsive: `ResponsiveContainer`
- Empty state: show message "No child stories for this Feature"

---

## 7. Error Handling & Security

### Security
- PAT only in server `.env` (never logged, never sent to client)
- CORS restricted to frontend origin
- Input validation on all endpoints
- Rate limiting (express-rate-limit)
- Helmet.js for security headers

### Error Handling
- ADO API errors → structured error responses
- Network timeouts → retry with backoff (max 3)
- Missing custom fields → graceful degradation (show `—`, log warning)
- Authentication failures → clear "Check PAT configuration" message

---

## 8. Testing Strategy

### Unit Tests (Vitest)
- `fieldMapping.ts` — custom field resolution
- `batching.ts` — batch splitting logic
- `adoUrls.ts` — URL construction
- `validation.ts` — ID parsing/validation
- `formatters.ts` — date/name formatting

### Integration Tests (Vitest + MSW)
- `/api/features` — valid IDs, invalid IDs, mixed, empty
- `/api/child-stories` — with children, without, multiple parents
- Error scenarios: 401, 403, 404, 429, 500

### Component Tests (React Testing Library)
- FeatureInput — validation, button states
- FeatureTable — sorting, selection, rendering
- ChildStoryTable — column display, parent association
- StatusPieChart — data binding, empty state

### E2E Tests (Playwright) — Optional, if time permits
- Full flow: input → fetch → select → fetch children → report

### Mock ADO Responses
- Pre-recorded JSON fixtures in `tests/fixtures/`
- MSW handlers for API mocking

---

## 9. Configuration Files

### `.env.example`
```env
# Azure DevOps Configuration
ADO_ORG_URL=https://dev.azure.com/your-org
ADO_PROJECT=YourProject
ADO_PAT=your-personal-access-token

# Custom Field Mappings (reference names from your ADO process)
ADO_FIELD_BOARD_COLUMN=System.BoardColumn
ADO_FIELD_DEPLOY_DATE=Custom.DeployDate
ADO_FIELD_TARGET_DATE=Microsoft.VSTS.Scheduling.TargetDate

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

### `.gitignore`
```
node_modules/
dist/
build/
.env
.env.local
*.log
.DS_Store
coverage/
*.tsbuildinfo
```

---

## 10. Development Workflow

```bash
# Install all dependencies
npm install

# Development (concurrent)
npm run dev        # Starts client (5173) + server (3001)

# Build
npm run build

# Test
npm run test       # All tests
npm run test:watch

# Lint
npm run lint
```

---

## 11. Known Limitations & Open Questions

1. **Board Column Resolution**: Requires knowing the team name. Default to first team in project, or make configurable.
2. **Custom Fields**: User must provide correct reference names. App will warn if fields not found.
3. **Pagination**: Child story fetching uses WIQL with pagination; large hierarchies may need multiple requests.
4. **Cross-project Features**: If a Feature belongs to a different project, its link uses that project's URL.
5. **Real-time Updates**: Not implemented; manual refresh only.

---

## 12. Definition of Done Checklist

- [ ] Project scaffolded with npm workspaces
- [ ] Backend: Express + TS + ADO client + routes + field mapping
- [ ] Frontend: React + Vite + TS + Tailwind + components
- [ ] Feature fetch + table with sorting/selection
- [ ] Child story fetch + table with all columns
- [ ] Report dashboard with pie charts (Recharts)
- [ ] Error handling + loading states + empty states
- [ ] `.env.example` + `.gitignore` + README
- [ ] Unit tests (services, utils) — passing
- [ ] Integration tests (API routes) — passing
- [ ] Component tests — passing
- [ ] Manual QA: all 16 test scenarios from requirements
- [ ] Application runs locally with `npm run dev`

---

## 13. Next Steps

**Awaiting your approval.** Once approved, I will:

1. Scaffold the monorepo structure
2. Implement backend (config, ADO client, services, routes)
3. Implement frontend (components, hooks, API client)
4. Wire up charts with Recharts
5. Write tests and run them
6. Document everything in README
7. Verify the complete flow works end-to-end