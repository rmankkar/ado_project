# ADO Work Item Reporting Dashboard - Replication Prompt

## Overview

Build a comprehensive **Azure DevOps Work Item Reporting Dashboard** as a full-stack TypeScript monorepo with React 18 + Vite frontend and Express.js backend. The dashboard provides multiple tabs for tracking Features, User Stories, Bugs, Test Cases, QA Assignments, and Iteration Bugs with rich filtering, sorting, and visualization capabilities.

---

## Tech Stack

### Monorepo Structure
```
ado-project/
├── client/                 # React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── api/           # API client functions
│   │   ├── components/    # React components
│   │   ├── hooks/         # TanStack Query hooks
│   │   ├── types/         # TypeScript interfaces
│   │   ├── utils/         # Formatters, helpers
│   │   └── App.tsx        # Main app with routing
│   └── package.json
├── server/                 # Express.js + TypeScript
│   ├── src/
│   │   ├── config/        # Environment config
│   │   ├── middleware/    # Error handlers
│   │   ├── routes/        # API route handlers
│   │   ├── services/      # Business logic services
│   │   ├── types/         # TypeScript interfaces
│   │   ├── utils/         # URL builders, batching
│   │   └── index.ts       # Express app entry
│   └── package.json
├── package.json            # Root workspace config
└── .env                    # Environment variables
```

### Key Dependencies
- **Frontend**: React 18, TypeScript, Vite, TanStack Query v5, Recharts, Tailwind CSS
- **Backend**: Express.js, TypeScript, node-fetch, dotenv, cors, helmet, express-rate-limit
- **ADO API**: Azure DevOps REST API v7.1 with WIQL (Work Item Query Language)

---

## Backend Implementation

### 1. Configuration (`server/src/config/env.ts`)
```typescript
// Environment variables with validation
- ADO_ORG_URL, ADO_PROJECT, ADO_PAT (required)
- ADO_FIELD_BOARD_COLUMN, ADO_FIELD_DEPLOY_DATE, ADO_FIELD_TARGET_DATE, ADO_FIELD_GO_LIVE
- ADO_LINK_TYPE (default: System.LinkTypes.Hierarchy-Forward)
- ADO_ITERATION_BASE_PATH
- PORT, NODE_ENV, CORS_ORIGIN
- QA_TEAM_EMAILS (comma-separated for QA Assignments tab)
```

### 2. ADO URL Builders (`server/src/utils/adoUrls.ts`)
```typescript
// REST API endpoint builders for ADO v7.1
- getWorkItemsUrl(ids, fields)           // Batch work item fetch
- getWorkItemRelationsUrl(id)            // Single item with relations
- getWiqlUrl()                           // WIQL query endpoint
- getTeamsUrl(), getBoardsUrl(), getBoardColumnsUrl()
- getIterationsUrl(depth)                // Classification nodes
- getWorkItemCommentsUrl(id)             // Comments endpoint
- getAuthHeader()                        // Basic auth with PAT
```

### 3. ADO Client (`server/src/services/adoClient.ts`)
```typescript
class AdoClient {
  // Core methods with retry logic (3 retries, exponential backoff)
  async getWorkItems(ids, fields): Promise<AdoWorkItem[]>
  async getWorkItemWithRelations(id): Promise<AdoWorkItem>
  async runWiql(query): Promise<AdoWiqlResponse>
  async getTeams(): Promise<AdoTeam[]>
  async getBoards(teamId): Promise<AdoBoard[]>
  async getBoardColumns(teamId, boardId): Promise<AdoBoardColumn[]>
  async getBoardColumnMapping(): Promise<Map<number, string>>
  async getIterations(depth): Promise<AdoIterationNode[]>
  async getWorkItemComments(id): Promise<AdoWorkItemComment[]>  // Returns response.comments
}
```

### 4. Services

#### Bug Service (`server/src/services/bugService.ts`)
- **WIQL Query**: Fetches non-closed/removed bugs under iteration path
- **Relation Parsing**: Uses `System.LinkTypes.Hierarchy-Forward` to find parent User Stories
- **Batch Fetching**: Gets bug details + parent US details in batches (200 max)
- **Fields**: ID, Title, State, AssignedTo, Severity, Priority, BoardColumn, GoLive, CreatedDate, ChangedDate

#### Feature Service (`server/src/services/featureService.ts`)
- Fetches Features by IDs with basic fields

#### Child Stories Service (`server/src/services/childStoriesService.ts`)
- Gets child User Stories for Features via WIQL
- Maps board column, deploy date, target date from custom fields

#### Test Case Service (`server/src/services/testCaseService.ts`)
- Fetches Test Cases in iteration (excluding Closed/Removed/Design)
- **Complexity Mapping**: "1-Simple"→"Simple", "2-Medium"→"Medium", "3-Complex"→"Complex", "Not Defined"
- **Parent US Resolution**: Uses workItemRelations (not System.Parent) to support multiple parents
- **Tags**: Returns System.Tags as comma-separated string

#### QA Assignments Service (`server/src/services/qaAssignmentsService.ts`)
- Gets User Stories assigned to QA team emails (from QA_TEAM_EMAILS env)
- OR in "In Progress(QA)" board column
- **Child Bugs**: Fetches active bugs (non-closed/removed) for each US via Hierarchy-Forward
- **Insights**: Counts open child bugs, bug status distribution

#### Comment Service (`server/src/services/commentService.ts`)
- Fetches comments for work item via ADO comments API
- Maps `AdoWorkItemComment` → `Comment` (id, text, createdBy, createdDate, modifiedBy, modifiedDate)

### 5. API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/features` | POST | Fetch features by IDs |
| `/api/child-stories` | POST | Fetch child stories for features |
| `/api/field-mappings` | GET | Get configured field reference names |
| `/api/iterations` | GET | Fetch iteration hierarchy |
| `/api/bugs` | POST | Fetch bugs for iteration |
| `/api/test-cases` | POST | Fetch test cases for iteration |
| `/api/qa-assignments/qa-user-stories` | POST | Fetch QA US with child bugs |
| `/api/comments/:workItemId` | GET | Fetch comments for work item |

### 6. Type Definitions (`server/src/types/`)
- `ado.ts`: ADO API response types (WorkItem, Relations, WIQL, Boards, Iterations, Comments)
- `api.ts`: Internal API types (Feature, Bug, ChildUserStory, TestCase, Comment, Fetch*Response, mapping functions)

---

## Frontend Implementation

### 1. Types (`client/src/types/ado.ts`)
```typescript
// Core interfaces matching backend
Feature, Bug, ChildUserStory, Iteration, TestCase, Comment
Fetch*Response, FetchError, SortField, SortDirection, SortState
```

### 2. API Client (`client/src/api/ado.ts`)
```typescript
adoApi = {
  checkHealth(),
  fetchFeatures(ids),
  fetchChildStories(featureIds),
  getFieldMappings(),
  fetchIterations(),
  fetchBugs(iterationPath),
  fetchTestCases(iterationPath),
  fetchQaUserStories(iterationPath),
  fetchComments(workItemId),  // New
}
```

### 3. Hooks (TanStack Query v5)

#### `useFeatures.ts`
- `useFeatures(featureIds)` - Fetches features
- `useChildStories(featureIds)` - Fetches child US for features

#### `useBugs.ts`
- `useBugs(iterationPath)` - Fetches bugs for iteration

#### `useTestCases.ts`
- `useTestCases(iterationPath)` - Fetches test cases

#### `useQaAssignments.ts`
- `useQaUserStories(iterationPath)` - Fetches QA US with bugs

#### `useIterations.ts`
- `useIterations()` - Fetches iteration hierarchy

#### `useComments.ts` (New)
- `useFetchComments()` - Mutation hook for on-demand comment fetching

### 4. Components

#### Shared Components
- `LoadingSpinner.tsx` - Reusable spinner with size variants
- `ErrorAlert.tsx` - Error/Info alert display
- `IterationSelector.tsx` - Dropdown with Load button (used by 3 tabs)
- `CommentModal.tsx` (New) - Modal with HTML-sanitized comments

#### FeatureTab (`FeatureTab.tsx`)
- Feature ID input (comma-separated)
- **Parent Features Table**: ID (ADO link), Title, Status, Assigned To
- **Child User Stories Table**: US ID (ADO link), Title, Status, Assigned To, Board Column, Deploy Date, Target Date, Parent Feature (ADO link)
- **Date Highlighting**: Deploy/Target dates in RED if past due
- **Sorting**: All columns sortable

#### TestCaseReviewTab (`TestCaseReviewTab.tsx`)
- Iteration selector
- **Filters**: Status, Assigned To, Complexity, Tags, Search Title
- **Table**: ID (ADO link), Title, Status, Assigned To, Complexity, Tags, Created By, Parent US (comma-separated ADO links)
- **Pie Charts**: 
  - Test Case Status Distribution
  - Complexity Distribution
  - Automation Status Distribution (if field exists)
- **Insights**: Total, Not Started, In Progress, Passed, Failed, Blocked counts

#### IterationBugsTab (`IterationBugsTab.tsx`)
- Iteration selector
- **BugTable** component (shared)
- **Bug Age Badges**: Yellow (8-12 days), Red (>12 days)
- **Filters**: Status, Severity, Assigned To, Go Live, Search Title
- **Go Live Column**: Custom ADO field support

#### BugTable (`BugTable.tsx`) - Shared Component
- **Columns**: ID (ADO link), Title, Status (badge), Severity, Priority, Assigned To, Go Live, Created Date + Age Badge, Parent US (ADO link), **Comments (💬 icon)**
- **Full filtering/sorting** on all columns
- **Comments Modal**: Click 💬 → fetches comments on-demand → displays in modal with author, date, sanitized text

#### QAAssignmentsTab (`QAAssignmentsTab.tsx`)
- Iteration selector
- **QA User Stories Table**: US ID (ADO link), Title, Status, Assigned To, Board Column, Deploy Date, Target Date, Parent Feature (ADO link)
- **Expandable Bug Rows**: Chevron in Title column → expands to show child bugs (ID, Title, Status, Assigned To, Go Live, Created, Parent US)
- **Alignment**: Bug rows align perfectly under US columns
- **Insights Box**: "Open Child Bugs Count" + **Bug Status Distribution Pie Chart** (replaces US status chart)
- **Date Highlighting**: Deploy/Target dates in RED if past due

### 5. Formatters (`client/src/utils/formatters.ts`)
```typescript
formatDate(dateString)           // "Oct 23, 2024"
formatDateTime(dateString)       // With time
isDateInPast(dateString)         // Boolean for red highlighting
getStatusBadgeClass(status)      // CSS class for status badges
truncate(text, maxLength)        // Text truncation
getDaysSince(dateString)         // Number of days since date
getBugAgeLabel(dateString)       // {text, className} for age badges
stripHtml(html)                  // NEW: Sanitizes HTML → plain text
```

### 6. Main App (`client/src/App.tsx`)
- Tab navigation: Features, Test Case Review, Iteration Bugs, QA Assignments
- Global iteration state (shared by 3 tabs)
- TanStack Query Provider
- Renders CommentModal portal

---

## Key Features & Behaviors

### 1. ADO Link Generation
All ID columns are hyperlinks to ADO work items:
```
${orgUrl}/${project}/_workitems/edit/${workItemId}
```

### 2. Date Handling
- **Comparison**: Normalized to midnight (setHours(0,0,0,0)) for accurate past-date detection
- **Red Highlighting**: Deploy Date / Target Date / Go Live shown in RED if past due
- **Age Calculation**: Bug age in days with colored badges

### 3. Relation Parsing
- **Hierarchy-Forward**: Parent → Child (Features→US, US→Bugs)
- **TestedBy-Forward**: Test Case → Tested Work Item
- **Multiple Parents**: Test Cases can have multiple parent US via workItemRelations

### 4. Complexity Field
- ADO Field: `Custom.Complexity`
- Values: "1-Simple", "2-Medium", "3-Complex", "Not Defined"
- Display: "Simple", "Medium", "Complex", "Not Defined"

### 5. QA Team Filtering
- Configured via `QA_TEAM_EMAILS` env variable (comma-separated)
- Matches `System.AssignedTo` email (uniqueName)
- OR board column = "In Progress(QA)"

### 6. Comment System (NEW)
- **Lazy Loading**: Comments fetched only when 💬 clicked
- **Modal Display**: Author, created date, "edited" badge, sanitized text
- **HTML Sanitization**: Strips all tags, decodes entities, normalizes whitespace
- **API Difference**: ADO Comments API returns `{comments: [...]}` not `{value: [...]}`

### 7. Visualizations (Recharts)
- **Pie Charts**: Responsive, with custom tooltips, legends
- **Color Schemes**: Consistent status colors across charts
- **Conditional Rendering**: Only show if data exists

### 8. Iteration Selector UX
- Dropdown + "Load Iteration" button side-by-side (gap-4)
- Shared state across Iteration Bugs, QA Assignments, Test Case Review tabs

---

## Environment Setup

### `.env` Required Variables
```bash
# Azure DevOps
ADO_ORG_URL=https://dev.azure.com/your-org
ADO_PROJECT=YourProjectName
ADO_PAT=your-personal-access-token

# Custom Field Reference Names (from ADO Process)
ADO_FIELD_BOARD_COLUMN=System.BoardColumn
ADO_FIELD_DEPLOY_DATE=Custom.DeployDate
ADO_FIELD_TARGET_DATE=Microsoft.VSTS.Scheduling.TargetDate
ADO_FIELD_GO_LIVE=Custom.GoLive

# Link Type
ADO_LINK_TYPE=System.LinkTypes.Hierarchy-Forward

# Iteration Base Path (e.g., ProjectName\Release\2024)
ADO_ITERATION_BASE_PATH=your-base-path

# Server
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# QA Team (for QA Assignments tab)
QA_TEAM_EMAILS=qa1@company.com,qa2@company.com
```

### PAT Permissions Required
- Work Items: Read
- Project & Team: Read
- Analytics: Read (for some queries)

---

## Build & Run

### Development
```bash
# Install dependencies
npm install

# Run both client & server
npm run dev

# Or separately:
# Terminal 1: cd server && npm run dev
# Terminal 2: cd client && npm run dev
```

### Production Build
```bash
npm run build  # Builds both workspaces
```

### Type Checking
```bash
cd server && npm run build  # tsc
cd client && npm run build  # tsc && vite build
```

---

## Common Pitfalls & Solutions

| Issue | Solution |
|-------|----------|
| Tailwind red not applying | Use inline styles: `style={{color: isPast ? 'red' : 'inherit'}}` |
| QA emails not loading | Restart server after .env changes (dotenv caches) |
| React Fragment key errors | Use array push pattern instead of flatMap with Fragment |
| Bug row column misalignment | Match exact column count in expandable rows |
| Comments API empty | ADO returns `comments` array, not `value` |
| HTML in comments | Use DOMParser.stripHtml() utility |
| Multiple parents per TC | Use workItemRelations, not System.Parent |
| Iteration dropdown layout | Use gap-4 with fixed-width dropdown container |

---

## Testing Checklist

- [ ] Server starts on port 3001
- [ ] Client starts on port 5173
- [ ] Health endpoint returns OK
- [ ] Iterations load in all 3 tabs
- [ ] Feature tab: enter IDs → see features + child US
- [ ] Test Case Review: select iteration → see TCs with filters/charts
- [ ] Iteration Bugs: select iteration → see bugs with age badges, filters, comments
- [ ] QA Assignments: select iteration → see QA US + expandable bugs + insights
- [ ] Comments modal opens on 💬 click, shows sanitized text
- [ ] Date highlighting works (red for past dates)
- [ ] Sorting works on all columns
- [ ] Filtering works on all filterable columns
- [ ] Build passes with no TypeScript errors

---

## Extensibility Points

1. **New Tabs**: Add route in App.tsx, create component, add to navigation
2. **New Fields**: Add to env config, adoUrls, service mapping, types, component columns
3. **New Charts**: Add Recharts component, compute data in component
4. **Authentication**: Add Azure AD / OAuth middleware
5. **Caching**: Add Redis for ADO API responses
6. **Export**: Add CSV/Excel export buttons to tables

---

This document captures the complete architecture and implementation details needed to replicate the ADO Work Item Reporting Dashboard. The codebase follows consistent patterns across backend services, API routes, frontend hooks, and components, making it maintainable and extensible.