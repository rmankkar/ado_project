# ADO Feature & User Story Report

A web application for retrieving Azure DevOps Features and their child User Stories, Test Cases, and QA Assignments, with visual status reports and filtering capabilities.

## Features

- **Feature Search**: Enter comma-separated Feature IDs to fetch details from Azure DevOps
- **Feature Table**: View Features with ID (clickable link), Title, Status, Assigned To - sortable and selectable
- **Child User Stories**: Fetch and display child User Stories with full details including Board Column, Deploy Date, Target Date
  - **Date Highlighting**: Deploy Date and Target Date highlighted in red if past due
  - **Date Sorting**: Proper chronological sorting for date columns
  - **Feature Links**: Parent Feature ID linked to ADO work item
- **Test Case Review**: Search Test Cases in selected iteration with comprehensive filtering
  - Filter by Status, Assigned To, Automation Status, Priority, Complexity
  - Parent User Story links (comma-separated for multiple parents)
  - Tags column showing all tags on Test Cases
  - Created By column
  - Complexity field mapped from "1-Simple"/"2-Medium"/"3-Complex"/"Not Defined" to readable labels
- **QA Assignments**: Find User Stories assigned to QA team members or in "In Progress(QA)" board column
  - Iteration selector with date range display
  - Filter by Status, Assigned To, Board Column, Parent Feature, and search by Title
  - Expandable child Bug details (ID, Title, Status, Assigned To, Board Column)
  - Insights: Total QA User Stories, Unique Parent Features, Open Child Bugs
  - Visual charts: Child Bug Status Distribution, User Stories by Board Column, User Stories by Assignee
- **Visual Reports**: Pie charts for status distributions across all tabs
- **Secure**: PAT stored server-side only, never exposed to frontend

## Quick Start

### Prerequisites

- Node.js 18+
- Azure DevOps Personal Access Token (PAT) with **Work Items (Read)** scope

### Installation

```bash
# Clone and navigate to project
cd ado_project

# Install all dependencies (root, client, server)
npm install

# Copy environment template and configure
cp .env.example .env
# Edit .env with your ADO credentials
```

### Configuration

Edit `.env` with your Azure DevOps details:

```env
ADO_ORG_URL=https://dev.azure.com/your-organization
ADO_PROJECT=YourProjectName
ADO_PAT=your-personal-access-token

# QA Team Emails (comma-separated) - used for QA Assignments tab
QA_TEAM_EMAILS=qa1@example.com,qa2@example.com

# Custom field reference names (check your ADO Process)
ADO_FIELD_BOARD_COLUMN=System.BoardColumn
ADO_FIELD_DEPLOY_DATE=Custom.DeployDate
ADO_FIELD_TARGET_DATE=Microsoft.VSTS.Scheduling.TargetDate
```

### Finding Custom Field Reference Names

1. Go to **Organization Settings** → **Process**
2. Click your process (e.g., "Inherited Agile")
3. Search for the field name (e.g., "Deploy Date")
4. Copy the **Reference Name** (e.g., `Custom.DeployDate`)

Common fields:
- **Board Column**: `System.BoardColumn` (may require board API)
- **Deploy Date**: Often a custom field like `Custom.DeployDate`
- **Target Date**: Usually `Microsoft.VSTS.Scheduling.TargetDate`
- **Complexity**: `Custom.Complexity` (dropdown: 1-Simple, 2-Medium, 3-Complex, Not Defined)

### Running the Application

```bash
# Development mode (runs client on :5173, server on :3001)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

Open http://localhost:5173 in your browser.

## Usage

### Feature & Child Stories Tab
1. **Enter Feature IDs**: Type comma-separated Feature work item IDs (e.g., `12345, 12346, 12347`)
2. **Fetch Data**: Click "Fetch Data" to retrieve Feature details
3. **Select Features**: Check boxes to select Features for child story fetching
4. **Fetch Child Stories**: Click "Fetch Child User Stories" to retrieve User Stories
5. **Get Report**: Click "Get Report" to view visual status dashboards

### Test Case Review Tab
1. **Load Iterations**: Click "Load Iterations" to fetch available iterations
2. **Select Iteration**: Choose an iteration from the dropdown
3. **Get Test Cases**: Click "Get Test Cases" to retrieve Test Cases linked to User Stories in that iteration
4. **Filter & Sort**: Use filter dropdowns (Status, Assigned To, Automation Status, Priority, Complexity) and sort by clicking column headers
5. **View Parent US**: Click Parent User Story links to open in ADO (shows comma-separated links for multiple parents)

### QA Assignments Tab
1. **Load Iterations**: Click "Load Iterations" to fetch available iterations
2. **Select Iteration**: Choose an iteration from the dropdown
3. **Get QA US**: Click "Get QA US" to retrieve User Stories assigned to QA team members (from `QA_TEAM_EMAILS`) or in "In Progress(QA)" board column
4. **Filter & Sort**: Use filter controls (Status, Assigned To, Board Column, Parent Feature, Search Title) and sort by clicking column headers
5. **Expand Bugs**: Click chevron icon in Title column to expand/collapse child Bug details
6. **View Insights**: See total QA User Stories, unique Parent Features, and open child Bugs count

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/features` | Fetch Features by IDs |
| POST | `/api/child-stories` | Fetch child User Stories for Features |
| GET | `/api/field-mappings` | Get current custom field mappings |
| POST | `/api/test-cases` | Fetch Test Cases for iteration |
| POST | `/api/qa-assignments/qa-user-stories` | Fetch QA User Stories with child Bugs |

### Request Examples

```bash
# Fetch Features
curl -X POST http://localhost:3001/api/features \
  -H "Content-Type: application/json" \
  -d '{"ids": [12345, 12346]}'

# Fetch Child Stories
curl -X POST http://localhost:3001/api/child-stories \
  -H "Content-Type: application/json" \
  -d '{"featureIds": [12345]}'

# Fetch Test Cases
curl -X POST http://localhost:3001/api/test-cases \
  -H "Content-Type: application/json" \
  -d '{"iterationPath": "Project\\Iteration\\Sprint 1"}'

# Fetch QA User Stories
curl -X POST http://localhost:3001/api/qa-assignments/qa-user-stories \
  -H "Content-Type: application/json" \
  -d '{"iterationPath": "Project\\Iteration\\Sprint 1"}'
```

## Azure DevOps API Used

| Purpose | Endpoint | Version |
|---------|----------|---------|
| Get work items by IDs | `GET /{org}/{project}/_apis/wit/workitems` | 7.1 |
| Get work item relations | `GET /{org}/{project}/_apis/wit/workitems/{id}?$expand=relations` | 7.1 |
| WIQL query (hierarchy) | `POST /{org}/{project}/_apis/wit/wiql` | 7.1 |
| WIQL query (tested by) | `POST /{org}/{project}/_apis/wit/wiql` | 7.1 |
| WIQL query (QA assignments) | `POST /{org}/{project}/_apis/wit/wiql` | 7.1 |
| Get teams | `GET /{org}/{project}/_apis/projects/{project}/teams` | 7.1 |
| Get boards | `GET /{org}/{project}/{team}/_apis/work/boards` | 7.1 |
| Get board columns | `GET /{org}/{project}/{team}/_apis/work/boards/{board}/columns` | 7.1 |

## Project Structure

```
ado_project/
├── .env.example          # Configuration template
├── .gitignore
├── package.json          # Root workspace
├── README.md
├── client/               # React + Vite + TypeScript
│   ├── src/
│   │   ├── api/          # API client
│   │   ├── components/   # React components (FeatureTable, ChildStoryTable, TestCaseTable, QAAssignmentsTable, etc.)
│   │   ├── hooks/        # Custom React hooks (useFeatures, useChildStories, useTestCases, useQaUserStories, etc.)
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions (formatters, date helpers)
│   └── tests/            # Unit & component tests
└── server/               # Express + TypeScript
    ├── src/
    │   ├── config/       # Environment config (env.ts with QA_TEAM_EMAILS)
    │   ├── routes/       # API routes (features, child-stories, test-cases, qa-assignments)
    │   ├── services/     # Business logic (featureService, childStoryService, testCaseService, qaService)
    │   ├── middleware/   # Express middleware
    │   ├── types/        # TypeScript types (api.ts with QaUserStoryWithBugs, TestCase, etc.)
    │   └── utils/        # Utility functions (adoUrls, fieldMapping)
    └── tests/            # Unit & integration tests
```

## Testing

```bash
# Run all tests
npm run test

# Run server tests only
npm run test:server

# Run client tests only
npm run test:client

# Watch mode
npm run test:watch
```

## Security

- PAT is stored only in server-side `.env` file
- Never logged, never sent to frontend
- CORS restricted to configured origin
- Rate limiting enabled (100 req/15min)
- Helmet.js for security headers
- Input validation on all endpoints

## Troubleshooting

### "ADO API error: 401 Unauthorized"
- Check PAT is valid and has **Work Items (Read)** scope
- Ensure PAT hasn't expired

### "ADO API error: 403 Forbidden"
- PAT may not have access to the project
- Check project permissions

### "No child User Stories found"
- Features may not have child User Stories
- Children might be a different work item type
- Check the hierarchy link type in ADO

### QA Assignments not returning results
- Verify `QA_TEAM_EMAILS` in `.env` matches exact email addresses in ADO
- Check that "In Progress(QA)" board column name matches your ADO board
- Ensure iteration path is correct for your project area

### Custom fields showing "—"
- Verify field reference names in `.env`
- Check Organization Settings → Process for correct names
- Some fields (like Board Column) require board API access

### Test Case Complexity not loading
- Verify `ADO_FIELD_COMPLEXITY` or `Custom.Complexity` exists in your ADO process
- Field should have dropdown values: 1-Simple, 2-Medium, 3-Complex, Not Defined

## License

MIT