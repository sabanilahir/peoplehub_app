# Flowable + BPMN.js Workflow Integration

## Overview

This module integrates **Flowable** workflow engine with **BPMN.js** editor for visual workflow design.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js App                              │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐     │
│  │ BPMN Editor │  │ Task Inbox  │  │ Process List │     │
│  │ (BPMN.js)   │  │             │  │              │     │
│  └─────────────┘  └─────────────┘  └──────────────┘     │
│                          │                                 │
│         ┌────────────────┼────────────────┐               │
│         │     API Routes (/api/flowable/*) │               │
│         └────────────────┼────────────────┘               │
└──────────────────────────┼────────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         ▼                                   ▼
┌─────────────────────┐          ┌─────────────────────┐
│  Flowable Engine    │          │  PostgreSQL         │
│  (localhost:8080)   │          │  (Workflow Tables)  │
└─────────────────────┘          └─────────────────────┘
```

## Prerequisites

### 1. Java JDK 11+

Download from: https://adoptium.net/

```bash
java -version
# Should show: openjdk version "11.x.x" or higher
```

### 2. Flowable Engine

Download from: https://flowable.com/open-source/

```bash
# Download flowable-all-in-one-7.x.x.zip
# Extract to a folder, e.g., C:\flowable\

# Run Flowable
cd C:\flowable
java -jar flowable-all-in-one.jar
```

### 3. PostgreSQL Database

```sql
CREATE DATABASE flowable;
CREATE USER flowable WITH PASSWORD 'flowable';
GRANT ALL PRIVILEGES ON DATABASE flowable TO flowable;
```

## Installation

### 1. Install NPM Dependencies

```bash
npm install bpmn-js bpmn-js-properties-panel camunda-bpmn-moddle axios
```

### 2. Update Database Schema

```bash
npx prisma db push
npx prisma generate
```

### 3. Configure Flowable

1. Start Flowable engine
2. Open http://localhost:8080/flowable-ui
3. Login with: admin / test
4. Go to Admin > Settings > Configure external API
5. Set the base URL to your Next.js app

## Usage

### Access Workflow Pages

- **Sysadmin Workflow**: `/sysadmin/workflow`
  - Workflow Designer (BPMN Editor)
  - Workflow Definitions List
  - Flowable Settings

- **User Workflow**: `/workflow`
  - Task Inbox (pending tasks)
  - My Requests
  - History

### Design a Workflow

1. Go to `/sysadmin/workflow/designer`
2. Use the BPMN.js palette to add elements:
   - Start Event
   - User Tasks (for human approval)
   - Exclusive Gateway (for branching)
   - End Event
3. Connect elements with sequence flows
4. Add conditions to gateway flows (e.g., `${approved == true}`)
5. Enter workflow name and click Save

### Import Sample BPMN

Sample Leave Request BPMN is available at: `/samples/leave-request.bpmn`

To import:
1. Open Flowable UI
2. Go to App Repository
3. Create new app or import BPMN file

## API Endpoints

### Flowable Integration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/flowable/process-definitions` | List process definitions |
| POST | `/api/flowable/processes` | Start a new process |
| GET | `/api/flowable/tasks` | Get tasks |
| GET | `/api/flowable/tasks/[id]` | Get single task |
| POST | `/api/flowable/tasks/[id]` | Complete or claim task |
| GET | `/api/flowable/settings` | Get Flowable settings |
| POST | `/api/flowable/settings` | Save Flowable settings |
| POST | `/api/flowable/test` | Test connection |

### Workflow Definitions (Local)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/workflow/definitions` | List all definitions |
| POST | `/api/workflow/definitions` | Create new definition |
| GET | `/api/workflow/definitions/[id]` | Get single definition |
| PUT | `/api/workflow/definitions/[id]` | Update definition |
| DELETE | `/api/workflow/definitions/[id]` | Delete definition |

## Database Schema

### FlowableSettings

```prisma
model FlowableSettings {
  id        String   @id @default(cuid())
  url       String   // REST API URL
  uiUrl     String   // UI URL
  username  String
  password  String
  enabled   Boolean
}
```

### WorkflowDefinition

```prisma
model WorkflowDefinition {
  id          Int      @id
  key         String   @unique
  name        String
  xml         String   // BPMN XML
  active      Boolean
  instances   ProcessInstance[]
}
```

### ProcessInstance

```prisma
model ProcessInstance {
  id            Int
  definitionId  Int
  flowableId    String?  // Flowable process ID
  status        String   // pending, active, completed
  initiatorId   Int
  variables     Json
}
```

## Sample Leave Request Flow

```
[Start] → [Submit Form] → [Supervisor Approve] → [HR Approve] → [End]
                 ↓               ↓                    ↓
              (Draft)      (Pending L1)         (Pending L2)
                           Approve/Reject        Approve/Reject
```

## Troubleshooting

### Cannot connect to Flowable

1. Make sure Flowable is running: `java -jar flowable-all-in-one.jar`
2. Check if port 8080 is available
3. Verify credentials: admin / test

### BPMN Editor not loading

1. Check browser console for errors
2. Make sure bpmn-js styles are imported
3. Try clearing browser cache

### Prisma generate fails

```bash
# Close any running dev servers
# Delete lock file
rm -rf node_modules/.prisma/client/*.lock

# Try again
npx prisma generate
```

## License

Open Source - Apache 2.0
