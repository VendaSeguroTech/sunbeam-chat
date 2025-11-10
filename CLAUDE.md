# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Development server (runs on port 8080)
npm run dev

# Production build
npm run build

# Development build (with dev mode enabled)
npm run build:dev

# Linting
npm run lint

# Preview production build
npm run preview
```

## Core Architecture

This is a React + TypeScript chat application built on a **three-tier architecture**:

1. **Frontend (React/Vite)** - The UI layer with real-time chat interface
2. **N8N Orchestration Layer** - Workflow automation that processes chat messages, calls AI models, and implements RAG
3. **Supabase Backend** - Authentication, PostgreSQL database, vector storage for RAG, and realtime subscriptions

### Critical Webhook Integration

All chat messages flow through a single N8N webhook endpoint defined in `src/components/chat/ChatInterface.tsx:63`:

```typescript
const WEBHOOK_URL = "https://n8n.vendaseguro.tech/webhook-test/0fc3496c-5dfa-4772-8661-da71da6353c7";
```

**Payload structure for text messages:**
```typescript
{
  message: string,
  timestamp: string (ISO),
  messageId: string,
  sessionId: string,
  userId: string,
  type: 'text',
  model: string  // Model selector value (e.g., 'basic', 'advanced')
}
```

**Payload structure for file uploads:**
```typescript
FormData {
  file: File,
  sessionId: string,
  userId: string,
  type: string (mime type),
  message: string,
  model: string
}
```

The N8N workflow handles all AI orchestration, RAG lookups in the vector database, and persistence to `n8n_chat_histories` table.

## Chat Message Flow

1. User sends message via `ChatInterface.tsx`
2. Frontend POSTs to N8N webhook with `sessionId`, `userId`, `message`, and optional `model`
3. N8N workflow:
   - Performs RAG lookup in Supabase `documents` table (vector similarity search)
   - Calls LLM with context from RAG results
   - Saves both user message and AI response to `n8n_chat_histories` table
   - Returns AI response in webhook response body
4. Frontend receives response, streams it character-by-character with typing effect (`streamResponseAsSeparateMessages`)
5. Messages auto-save to local Supabase history (`conversation_history` table) on second message

## Dual History System

The app maintains **two separate conversation history systems**:

### 1. N8N-persisted history (`n8n_chat_histories` table)
- **Source**: Written by N8N workflow after each exchange
- **Structure**: Each row is one message (user or assistant)
- **Hook**: `useN8nChatHistory` - fetches and groups by `session_id`
- **Purpose**: Source of truth for conversations managed by N8N
- **Display**: Shows in sidebar as conversation sessions

### 2. Frontend-persisted history (`conversation_history` table)
- **Source**: Written by frontend (`useConversationHistory` hook)
- **Structure**: Each row is a full conversation with messages as JSON array
- **Purpose**: Backup/alternative history system for frontend-only persistence
- **Note**: Less actively used, N8N history is primary

When loading a conversation from sidebar, the app uses `fetchSessionMessages` to pull all messages for that `session_id` from `n8n_chat_histories`.

## Session ID Generation

Session IDs are generated client-side on component mount:

```typescript
// ChatInterface.tsx:71
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
```

This ID is used throughout the conversation lifecycle to group messages in the N8N workflow and database.

## Authentication & Authorization

- **Auth Provider**: Supabase Auth
- **User Profiles**: Stored in `profiles` table with `role` field (`admin` | `default`)
- **Route Protection**:
  - `RouteGuard.tsx` - Checks maintenance mode and redirects if active
  - `AdminRoute.tsx` - Verifies user has `role = 'admin'` via `useUserRole` hook
  - `ProtectedRoute` component - Checks for authenticated session

### Admin Features
- Access to `/admin` route
- Can toggle maintenance mode via `MaintenanceContext`
- View online users via `usePresence` system

## Key Contexts & Hooks

### MaintenanceContext
- Manages global maintenance mode state
- Reads from `maintenance` table (single row with `is_active` boolean)
- Uses Supabase realtime subscription to sync state across all clients
- When active, `RouteGuard` redirects non-admin users to `/maintenance` page

### PresenceContext
- Tracks online users via `usePresence` hook
- Updates `profiles.last_seen` timestamp every 30 seconds
- Used in admin panel to show active users

### useN8nChatHistory
- Primary hook for chat history
- Groups messages by `session_id` from `n8n_chat_histories` table
- `fetchSessionMessages(sessionId)` returns all messages for a conversation
- `deleteSession(sessionId)` removes all messages for that session

### useConversationHistory
- Alternative history system (less actively used)
- Stores conversations as JSON arrays in `conversation_history` table
- Auto-generates conversation titles from first message

## Important Implementation Details

### Message Limits
- Hard limit: 50 messages per conversation (`MESSAGE_LIMIT = 50`)
- Warning threshold: 45 messages (`MESSAGE_WARNING_THRESHOLD = 45`)
- When limit reached, user must start new conversation

### Typing Effect
Messages from AI are split by `\n\n` and streamed character-by-character:
- Each `\n\n` separated chunk becomes a separate message bubble
- Typing speed: 20ms per character, capped at 3000ms total per chunk
- See `streamResponseAsSeparateMessages()` in `ChatInterface.tsx:321`

### Model Selection
- User can select AI model via `ModelSelector` component
- Selected model is passed to N8N webhook in `model` field
- N8N workflow uses this to route to appropriate LLM

### Feedback System
- Users can thumbs up/down AI responses
- Feedback sent to same webhook with payload containing question, answer, rating
- Used for monitoring and improving AI responses

### Loading States
- Dynamic loading messages rotate every 3s while waiting for AI response
- Phrases: "pensando...", "realizando busca", "Já sei", "hmmm", "Estruturando a resposta..."
- Special phrase "o que a Thabata responderia?" shown once per loading cycle

### File Upload Support
- Accepts: PNG, JPEG, GIF, PDF
- Max size: 10MB
- Files sent as FormData to webhook
- N8N extracts content, generates embeddings, performs RAG lookup

## Database Schema (Key Tables)

### `profiles`
- `id` (FK to auth.users)
- `email`, `name`
- `role` ('admin' | 'default')
- `last_seen` (for presence tracking)
- `tokens` (integer - token count for non-admin users)
- `unlimited_tokens` (boolean - unlimited tokens flag)

### `models`
- `id` (UUID, primary key)
- `name` (TEXT, unique - technical identifier sent to N8N)
- `display_name` (TEXT - user-facing name)
- `description` (TEXT, nullable - model description)
- `is_public` (BOOLEAN - visibility control)
- `created_at`, `updated_at` (TIMESTAMPTZ)
- **RLS enabled**: Public models visible to all, private models only to admins

### `n8n_chat_histories`
- `id`, `session_id`
- `message` (JSONB - can be string or object with content/type)
- `user_id`
- `created_at`

### `documents`
- `content` (text)
- `metadata` (JSONB)
- `embedding` (vector - for RAG similarity search)

### `maintenance`
- `id`, `is_active` (boolean)

## Supabase Configuration

The Supabase client is initialized in `src/supabase/client.ts` with environment variables:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

**NOTE**: The current `client.ts` contains hardcoded credentials. For production deployments, these should be moved to environment variables.

## Path Alias

The project uses `@` as an alias for `src/`:
```typescript
import { Component } from "@/components/Component"
```

Configured in `vite.config.ts` and `tsconfig.json`.

## Model Selection System

### Overview
The application uses a **dynamic model management system** where each model represents a **knowledge base** (base de conhecimento). Models are stored in the database and can be managed through the admin panel with visibility controls based on user roles.

**Important Concept**: Each model in the system corresponds to a specific set of documents/content stored in the database. When a user selects a model and asks a question, the system performs RAG (Retrieval Augmented Generation) lookup ONLY in that model's knowledge base. This allows you to segregate company information by context, product, department, or any other criteria.

### Database Structure

#### `models` Table
```sql
- id: UUID (primary key)
- name: TEXT (unique, technical identifier used in N8N)
- display_name: TEXT (user-facing name shown in UI)
- description: TEXT (optional description)
- is_public: BOOLEAN (visibility control)
- created_at, updated_at: TIMESTAMPTZ
```

**Row Level Security (RLS) Policies:**
- **Public models** (`is_public = true`): Visible to all users
- **Private models** (`is_public = false`): Visible only to admins
- Only admins can insert, update, or delete models

### Components

#### ModelSelector Component (`src/components/chat/ModelSelector.tsx`)
- Dynamically fetches models from database via `useModels` hook
- Filters models automatically based on user role (via RLS)
- Displays badge "private" next to private models (admin-only view)
- Auto-selects first available model if current selection becomes unavailable
- State managed in `ChatLayout.tsx` and passed down to `ChatInterface`
- Model `name` field is sent with every message to N8N webhook

#### ModelManagement Component (`src/components/admin/ModelManagement.tsx`)
Admin panel component for managing AI models:
- View all models in a table
- Toggle model visibility (public/private) with switch
- Create new models with form dialog
- Delete existing models
- Badge indicators: green "Público" or gray "Privado"

#### useModels Hook (`src/hooks/useModels.ts`)
Custom hook for model operations:
- `models`: Array of available models (filtered by RLS)
- `loading`: Loading state
- `toggleModelVisibility(modelId, isPublic)`: Change visibility
- `addModel(name, displayName, description, isPublic)`: Create new model
- `deleteModel(modelId)`: Remove model
- `refreshModels()`: Reload model list

### Model Flow (Knowledge Base Selection + RAG)
1. User selects model in `ModelSelector` → triggers `onValueChange`
2. `ChatLayout` updates `selectedModel` state via `handleModelChange`
3. State passed as prop to `ChatInterface`
4. User submits a question
5. Model `name` field included in webhook payload at three points:
   - Text messages (`ChatInterface.tsx:551`)
   - File uploads (`ChatInterface.tsx:508`)
   - Question suggestions (`ChatInterface.tsx:649`)
6. **N8N workflow receives the model name as a TAG**:
   - Uses `model` field to identify which knowledge base to query
   - Performs RAG lookup in the corresponding document table/collection
   - Example: `model: "basic"` → queries documents in "basic" knowledge base
   - Example: `model: "pro"` → queries documents in "pro" knowledge base
7. N8N retrieves relevant documents from the selected knowledge base
8. LLM generates response based ONLY on documents from that specific model's knowledge base
9. Response sent back to frontend and displayed to user

**Critical Understanding**: The `model` field acts as a **filter/tag** for the RAG system, ensuring users only get answers from the specific knowledge base they selected.

### Adding New Models (Knowledge Bases)

**IMPORTANT**: Before registering a new model, ensure you have already populated its knowledge base with content. Each model needs documents/data in the database that the RAG system can query.

#### Complete Workflow to Add a New Model:

**Step 1: Prepare the Knowledge Base Content**

First, populate your database with the documents/content for this knowledge base. This can be done in several ways depending on your setup:

**Option A** - Separate table per model:
```sql
-- Create a new table for the model's documents
CREATE TABLE documents_pro_v2 (
  id UUID PRIMARY KEY,
  content TEXT,
  embedding VECTOR(1536),
  metadata JSONB
);

-- Insert documents
INSERT INTO documents_pro_v2 (content, metadata) VALUES
  ('Conteúdo específico do Pro-v2...', '{"source": "manual.pdf"}'),
  ('Mais informações sobre Pro-v2...', '{"source": "faq.txt"}');
```

**Option B** - Single documents table with model tag in metadata:
```sql
-- Use existing 'documents' table with model identifier in metadata
INSERT INTO documents (content, metadata, embedding) VALUES
  ('Conteúdo do Pro-v2...', '{"model": "pro-v2", "source": "manual"}', embedding_vector),
  ('Informações Pro-v2...', '{"model": "pro-v2", "source": "faq"}', embedding_vector);
```

**Step 2: Configure N8N to Query the Correct Knowledge Base**

In your N8N workflow, add logic to route queries based on the `model` field:

```javascript
// Example: N8N Switch node or code
const model = $input.json.model; // Receives "pro-v2"

// Query the correct table/filter
if (model === 'pro-v2') {
  // Query documents_pro_v2 table
  // OR filter documents WHERE metadata->>'model' = 'pro-v2'
}
```

**Step 3: Register Model in the System**

**Option A - Via Admin Interface (Recommended)**:
1. Navigate to `/admin` as administrator
2. Scroll to **"Gerenciamento de Modelos"** section
3. Click **"Novo Modelo"** button
4. Fill in the form:
   - **Nome Técnico**: `pro-v2` (must match what N8N expects as TAG)
     - This EXACT value will be sent to N8N in the webhook
     - Must be unique, no spaces, lowercase recommended
   - **Nome de Exibição**: `Pro-v2` (user-friendly name)
   - **Descrição**: "Modelo Pro versão 2 - Base de conhecimento avançada"
   - **Visibilidade Pública**: Toggle ON if all users should access this knowledge base
5. Click **"Criar Modelo"**
6. Model appears immediately in `ModelSelector` for authorized users

**Option B - Via SQL (Direct Database)**:
```sql
INSERT INTO public.models (name, display_name, description, is_public)
VALUES ('pro-v2', 'Pro-v2', 'Base de conhecimento Pro versão 2', true);
```

**Step 4: Test the Integration**
1. Login to the chat interface
2. Select the new model in `ModelSelector`
3. Ask a question related to the content you added
4. Verify that N8N queries the correct knowledge base and returns relevant results

**Field Guidelines:**
- `name`: **CRITICAL** - Must match exactly what N8N uses to identify the knowledge base
  - This is the TAG sent in the webhook payload
  - Must match your N8N routing logic
- `display_name`: User-friendly name displayed in dropdown
- `description`: Explain what kind of information this knowledge base contains
- `is_public`:
  - `true` = All users can query this knowledge base
  - `false` = Only admins can query this knowledge base

### Managing Model Visibility

**To make a model private (admin-only):**
1. Go to `/admin` → "Gerenciamento de Modelos"
2. Find the model in the table
3. Toggle the **switch** to OFF (or click dropdown → "Tornar Privado")
4. Model becomes invisible to non-admin users immediately

**To make a model public (visible to all):**
1. Go to `/admin` → "Gerenciamento de Modelos"
2. Find the model in the table
3. Toggle the **switch** to ON (or click dropdown → "Tornar Público")
4. Model becomes visible to all users immediately

**Visual Indicators:**
- Admins see a **"private"** badge next to private models in `ModelSelector`
- Regular users don't see private models at all
- In admin panel: green "Público" badge or gray "Privado" badge

### Important Notes

- **Models = Knowledge Bases**: Each model represents a separate knowledge base with its own documents/content in the database
- **RAG Segregation**: The RAG system uses the model name as a filter/tag to query only the corresponding knowledge base
- **N8N Configuration Required**: You must configure N8N to recognize the model name and route queries to the correct document collection
- **Content First, Registration Second**: Always populate the knowledge base with content BEFORE registering the model in the admin panel
- **Name Field is Critical**: The `name` field is sent to N8N as-is and must match exactly what your workflow expects
- **No Code Changes Required**: Models are fully dynamic, no frontend code updates needed
- **Automatic Filtering**: RLS policies ensure users only see authorized knowledge bases
- **Fallback Handling**: If a user's selected model becomes unavailable (deleted or made private), the system auto-selects the first available model
- **Real-time Updates**: Changes in admin panel reflect immediately in user sessions (may require page refresh)
- **Use Cases**: Segregate content by product, department, access level, version, or any business criteria

## Admin Panel

### Overview
The admin panel (`/admin` route) provides comprehensive user and system management.

### Components

#### ImprovedAdminPanel (`src/components/admin/ImprovedAdminPanel.tsx`)
Modern table-based interface for user management with:
- User statistics cards (Total Users, Online Users)
- Full user table showing: name, email, role badge, online status, last seen
- Dropdown menu per user with actions:
  - Toggle Admin role
  - Delete user
- Create new user dialog
- Delete confirmation alerts
- Toast notifications for all actions

#### MaintenanceToggle (`src/components/admin/MaintenanceToggle.tsx`)
- Switch to enable/disable maintenance mode
- Updates `maintenance` table in real-time
- When active, non-admin users are redirected to `/maintenance` page

#### ModelManagement (`src/components/admin/ModelManagement.tsx`)
Knowledge base management interface for controlling AI model availability:
- View all registered knowledge bases (models) in a table
- Create new models (knowledge base references) via dialog form
- Toggle public/private visibility with switch controls
- Delete models that are no longer needed
- Visual indicators: green "Público" badge or gray "Privado" badge
- Real-time updates reflected in user `ModelSelector` dropdowns
- Manages the `models` table which serves as a catalog of available knowledge bases

#### UserActivityCard (`src/components/admin/UserActivityCard.tsx`)
Displays detailed user activity without requiring Realtime:
- Last seen timestamp (formatted: "2 min ago", "3h ago")
- Total message count per user
- Last message timestamp
- Auto-refreshes every 30 seconds
- Manual refresh button

### User Management Features
1. **Create Users**: Email/password form with validation
2. **Role Management**: One-click toggle between admin/default
3. **Delete Users**: Uses `delete_user` RPC function in database
4. **Activity Monitoring**: Real-time activity tracking via `last_seen` field

### Role Debugging
The `RoleDebugger` component (`src/components/debug/RoleDebugger.tsx`) can be temporarily added to any page to:
- Display auth user data
- Show profile table data
- Verify role assignments
- Generate SQL fix scripts automatically

## Realtime & WebSocket Handling

### Known Limitation
The Supabase Realtime service (WebSocket) is **not available** in the self-hosted setup. This affects:
- `PresenceContext` - Online user tracking
- `MaintenanceContext` - Real-time maintenance mode updates

### Graceful Degradation
Both contexts have been updated to handle Realtime failures gracefully:
- Errors are logged as warnings (not errors)
- Failed connections don't break the application
- Single retry attempt, then graceful fallback
- Alternative polling-based solutions implemented where needed

**PresenceContext.tsx:78-87**: Handles CHANNEL_ERROR, TIMED_OUT, and CLOSED states
**MaintenanceContext.tsx:49-53**: Logs warning if Realtime unavailable

## Docker & Networking

### Architecture
The application runs in a multi-container Docker setup:
- **Supabase Stack**: Self-hosted Supabase (PostgreSQL, Auth, Storage, etc.)
- **N8N Stack**: Workflow automation with separate containers for editor, webhook, and worker
- Each stack has its own PostgreSQL instance

### Container Details

**Supabase Containers:**
- `supabase-db-{INSTANCE_ID}`: PostgreSQL 15.1.1.78
  - Internal port: 5432
  - External port: 4321 (mapped via POSTGRES_PORT_EXT)
  - Service name in docker-compose: `db`

**N8N Containers:**
- `n8n-n8n_editor-1`: N8N UI (port 5678)
- `n8n-n8n_webhook-1`: Webhook handler (port 5679)
- `n8n-n8n_worker-1`: Background worker
- `n8n-n8n-postgres-1`: N8N's internal PostgreSQL (port 5434)

### Docker Network Configuration

**Network:** `supabase-{INSTANCE_ID}_default`

To connect N8N to Supabase database:

```bash
# Connect all N8N containers to Supabase network
docker network connect supabase-1759154705_default n8n-n8n_editor-1
docker network connect supabase-1759154705_default n8n-n8n_webhook-1
docker network connect supabase-1759154705_default n8n-n8n_worker-1
```

### N8N Postgres Node Configuration

When using the Postgres node in N8N to access Supabase, you have **two options**:

#### Option 1: Using Docker Compose Service Name (Recommended)
```yaml
Host: db
Port: 5432
Database: postgres
User: postgres
Password: [from POSTGRES_PASSWORD in .env]
SSL Mode: disable
```

#### Option 2: Using Full Container Name
```yaml
Host: supabase-db-1759154705
Port: 5432
Database: postgres
User: postgres
Password: [from POSTGRES_PASSWORD in .env]
SSL Mode: disable
```

**How to find the container name:**
```bash
docker ps | grep postgres
# Look for: supabase-db-{INSTANCE_ID}
```

**IMPORTANT**:
- Use port `5432` (internal) when connecting from Docker containers
- Use port `4321` (external) when connecting from outside Docker (DBeaver, psql, etc.)
- Use service name `db` or full container name `supabase-db-{INSTANCE_ID}` as host
- Never use external IP `38.242.138.127` from inside Docker
- After connecting Docker networks (see above), either hostname will work

### Port Reference

| Service | Internal Port | External Port | Access From |
|---------|--------------|---------------|-------------|
| Supabase Postgres | 5432 | 4321 | Internal: 5432, External: 4321 |
| N8N Postgres | 5432 | 5434 | Internal: 5432, External: 5434 |
| N8N Editor | 5678 | 5678 | Both |
| N8N Webhook | 5678 | 5679 | Both |

## Troubleshooting

### Model Not Sending to Webhook
- Check `ChatLayout.tsx:14` - ensure `selectedModel` state is initialized to `"global"`
- Verify `ModelSelector.tsx:17` - ensure no hardcoded `defaultValue="global"` assignment
- Check browser console for model value in webhook payload

### Admin Button Not Showing
- Verify user has `role = 'admin'` in `profiles` table
- Use `RoleDebugger` component to diagnose
- Check browser console for logs from `useUserRole.ts`
- Refresh page after role change

### N8N Can't Connect to Supabase
- Verify Docker network connection (see Docker Network Configuration above)
- Use internal port 5432 (not 4321)
- Use service name `db` as host
- Test with `docker exec -it n8n-n8n_webhook-1 sh` then `nc -zv db 5432`

### Realtime Errors
- Expected behavior in self-hosted setup
- Check console for warnings (not errors)
- Presence features will be disabled but app continues working
- Use `UserActivityCard` for user monitoring instead of Realtime presence

## Load Testing System

### Overview
The project includes a comprehensive load testing suite in the `load-tests/` directory for benchmarking system performance under various conditions.

### Available Test Scripts

#### 1. `message-load-test-parallel.js`
**Purpose**: Simulates concurrent users sending messages simultaneously (stress test)

**Usage**:
```bash
node load-tests/message-load-test-parallel.js [num-messages] [stagger-delay-ms]
```

**Parameters**:
- `num-messages`: Total number of messages to send concurrently
- `stagger-delay-ms`: Delay in milliseconds between firing each message (prevents instant overload)

**Configuration**:
- Webhook URL: Line 24
- Test User IDs: Lines 43-49
- Available Models: Line 52 (`global`, `rc-profissional`, `rc-geral`, `d&o`)
- **Timeout**: 5 minutes (300000ms) per message (line 200)

**Behavior**:
- Fires all messages with small delays between them
- Waits for ALL responses in parallel using `Promise.all()`
- Measures individual response times and overall throughput
- Calculates parallel processing window
- Tests system capacity under concurrent load

**Example Scenarios**:
```bash
# Light test (5 messages, 500ms delay)
node load-tests/message-load-test-parallel.js 5 500

# Moderate test (10 messages, 100ms delay)
node load-tests/message-load-test-parallel.js 10 100

# Heavy stress test (50 messages, 50ms delay)
node load-tests/message-load-test-parallel.js 50 50

# Burst test (30 messages, instant)
node load-tests/message-load-test-parallel.js 30 0
```

#### 2. `message-load-test-with-response.js`
**Purpose**: Tests sequential message processing with full AI response validation

**Usage**:
```bash
node load-tests/message-load-test-with-response.js [num-messages] [interval-ms]
```

**Parameters**:
- `num-messages`: Total number of messages to send sequentially
- `interval-ms`: Wait time between messages (recommended: 5000ms+)

**Configuration**:
- Webhook URL: Line 20
- Test User IDs: Lines 39-45
- Available Models: Line 48
- **Timeout**: 60 seconds per message (line 188)

**Behavior**:
- Sends ONE message at a time
- Waits for complete AI response before sending next
- Measures actual AI response time
- Validates response quality and content
- Tests sustained performance over time

**Example Scenarios**:
```bash
# Basic latency test (3 messages, 15s interval)
node load-tests/message-load-test-with-response.js 3 15000

# Quality test (5 messages, 10s interval)
node load-tests/message-load-test-with-response.js 5 10000

# Stability test (10 messages, 5s interval)
node load-tests/message-load-test-with-response.js 10 5000
```

#### 3. `auth-load-test.js`
**Purpose**: Tests authentication system under concurrent login attempts

**Usage**:
```bash
node load-tests/auth-load-test.js [num-users] [interval-ms]
```

**Parameters**:
- `num-users`: Number of concurrent login attempts
- `interval-ms`: Delay between login attempts

**Configuration**:
- Supabase URL: Line 17
- Supabase Anon Key: Line 18
- Test User Credentials: Lines 27-38 (requires pre-created users)

**Behavior**:
- Simulates multiple users logging in simultaneously
- Tests Supabase Auth performance
- Measures login response times
- Validates session creation

**Example Scenarios**:
```bash
# Basic auth test (5 logins, 500ms delay)
node load-tests/auth-load-test.js 5 500

# Moderate load (20 logins, 100ms delay)
node load-tests/auth-load-test.js 20 100

# Stress test (50 logins, 50ms delay)
node load-tests/auth-load-test.js 50 50
```

### Automatic Report Generation

All test scripts automatically generate detailed reports using the `utils/report-generator.js` module:

#### Generated Files

1. **Individual JSON Results** (`load-tests/results/json/`)
   - One JSON file per test execution
   - Filename format: `{test-type}_{timestamp}.json`
   - Contains full test configuration, statistics, errors, and sample responses

2. **Consolidated Markdown Report** (`load-tests/results/ALL_TESTS_REPORT.md`)
   - Cumulative report of ALL test executions
   - Never overwrites - always appends new results
   - Includes automatic analysis with performance ratings
   - Grouped by test type with timestamps

3. **Index Summary** (`load-tests/results/INDEX.md`)
   - Quick reference table of all tests
   - Shows: date, success count, total count, success rate
   - Grouped by test type for easy comparison

#### Report Generator Functions

Located in `load-tests/utils/report-generator.js`:

```javascript
// Save individual test result as JSON
saveTestResultJSON(testType, resultObject)

// Append to consolidated Markdown report
appendToConsolidatedReport(testType, resultObject)

// Update index with all test summaries
generateIndexReport()

// Optional: Clean old results (keeps last N)
cleanOldResults(keepLast = 50)
```

#### Test Result Structure

```javascript
{
  testType: 'message-parallel' | 'message-sequential' | 'auth-load',
  timestamp: ISO string,
  config: {
    total: number,
    interval: number,
    webhookUrl: string
  },
  total: number,
  success: number,
  failed: number,
  successRate: percentage,
  failureRate: percentage,
  times: {
    avg: milliseconds,
    min: milliseconds,
    max: milliseconds
  },
  duration: milliseconds,
  throughput: requests per second,
  statusCodes: { code: count },
  errors: array (max 10),
  responses: array (max 5 samples)
}
```

### Performance Metrics Interpretation

#### Success Rate
- **100%**: Perfect - no failures
- **≥90%**: Excellent - production ready
- **70-90%**: Good - acceptable with some failures
- **50-70%**: Regular - needs optimization
- **<50%**: Critical - system unstable

#### Response Time
- **<3s**: Fast - excellent user experience
- **3-10s**: Normal - acceptable performance
- **10-30s**: Slow - needs optimization
- **>30s**: Very Slow - critical issue

#### Throughput
- Measured in requests/second or responses/second
- Higher is better
- Compare against baseline after optimizations

### Testing Best Practices

1. **Progressive Testing**: Start with small loads and increase gradually
2. **Consistent Timing**: Run tests at similar times for fair comparison
3. **Document Changes**: Note code changes before each test run
4. **Establish Baselines**: Define acceptable performance thresholds
5. **Monitor Trends**: Use consolidated report to track performance over time

### Common Test Workflows

#### Daily (After Deploy)
```bash
node load-tests/message-load-test-parallel.js 10 100
```

#### Weekly (Comprehensive)
```bash
node load-tests/auth-load-test.js 10 100
node load-tests/message-load-test-parallel.js 20 100
node load-tests/message-load-test-with-response.js 5 10000
```

#### Monthly (Full Benchmark)
```bash
node load-tests/auth-load-test.js 20 100
node load-tests/message-load-test-parallel.js 50 100
node load-tests/message-load-test-with-response.js 10 5000
```

#### Pre-Release (Stress Test)
```bash
node load-tests/auth-load-test.js 50 50
node load-tests/message-load-test-parallel.js 100 50
node load-tests/message-load-test-with-response.js 10 5000
```

### Documentation

- **`load-tests/GUIA_DE_USO_BENCHMARKS.md`**: Comprehensive usage guide with all scenarios
- **`load-tests/GUIA_RAPIDO.md`**: Quick start guide for common operations
- **`load-tests/README.md`**: Technical documentation and script details

### Troubleshooting Load Tests

#### "Cannot find module"
Ensure you're in the correct directory:
```bash
cd load-tests
node message-load-test-parallel.js 10 100
```

#### High Timeout Rate
- Increase interval between messages
- Reduce total number of concurrent messages
- Check N8N webhook capacity and AI model response times
- Verify database connection limits

#### Low Success Rate
- Check N8N workflow logs for errors
- Verify webhook URL is correct and accessible
- Check Supabase rate limits
- Ensure test user IDs exist in database
- Review server resources (CPU, memory, network)

#### Connection Refused
- Verify N8N webhook is running and accessible
- Test webhook manually: `curl -X POST {WEBHOOK_URL}`
- Check firewall and network settings
