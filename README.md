# ADO Feature & User Story Report

A web application for retrieving Azure DevOps Features and their child User Stories, and generating visual status reports.

## Features

- **Feature Search**: Enter comma-separated Feature IDs to fetch details from Azure DevOps
- **Feature Table**: View Features with ID (clickable link), Title, Status, Assigned To - sortable and selectable
- **Child User Stories**: Fetch and display child User Stories with full details including Board Column, Deploy Date, Target Date
- **Visual Reports**: Pie charts showing Feature status distribution and per-Feature child User Story status breakdown
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

1. **Enter Feature IDs**: Type comma-separated Feature work item IDs (e.g., `12345, 12346, 12347`)
2. **Fetch Data**: Click "Fetch Data" to retrieve Feature details
3. **Select Features**: Check boxes to select Features for child story fetching
4. **Fetch Child Stories**: Click "Fetch Child User Stories" to retrieve User Stories
5. **Get Report**: Click "Get Report" to view visual status dashboards

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/features` | Fetch Features by IDs |
| POST | `/api/child-stories` | Fetch child User Stories for Features |
| GET | `/api/field-mappings` | Get current custom field mappings |

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
```

## Azure DevOps API Used

| Purpose | Endpoint | Version |
|---------|----------|---------|
| Get work items by IDs | `GET /{org}/{project}/_apis/wit/workitems` | 7.1 |
| Get work item relations | `GET /{org}/{project}/_apis/wit/workitems/{id}?$expand=relations` | 7.1 |
| WIQL query (hierarchy) | `POST /{org}/{project}/_apis/wit/wiql` | 7.1 |
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
│   │   ├── components/   # React components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Utility functions
│   └── tests/            # Unit & component tests
└── server/               # Express + TypeScript
    ├── src/
    │   ├── config/       # Environment config
    │   ├── routes/       # API routes
    │   ├── services/     # Business logic
    │   ├── middleware/   # Express middleware
    │   ├── types/        # TypeScript types
    │   └── utils/        # Utility functions
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

### Custom fields showing "—"
- Verify field reference names in `.env`
- Check Organization Settings → Process for correct names
- Some fields (like Board Column) require board API access

## License

MIT