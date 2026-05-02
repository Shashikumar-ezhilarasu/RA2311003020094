# Campus Notifications Microservice Design



# Stage 1 :
solution -  
The platform supports the following core notification actions:
1.Fetch Notifications: Retrieve a paginated list of notifications for a specific student, with optional filtering.
2.Update the status of a specific notification to 'read'.
3.Remove a specific notification.
4.Retrieve the total number of unread notifications for the user.
Endpoints
GET /notifications → fetch notifications
PATCH /notifications/{id}/read → mark as read
DELETE /notifications/{id} → delete
GET /notifications/unread-count → unread count

🔹 Stage 2: Database Design
DB Choice → PostgreSQL

Structured data
Fast filtering + sorting
Strong indexing
Table: notifications
id (UUID)
student_id
type (PLACEMENT / RESULT / EVENT)
title
message
is_read (boolean)
created_at
Sample Queries
Get unread:
SELECT * FROM notifications 
WHERE student_id='0094' AND is_read=false;
Insert:
INSERT INTO notifications (...) VALUES (...);
Count:
SELECT COUNT(*) FROM notifications WHERE is_read=false;

Scaling Issues
Large data → use partitioning (by date)
Slow count → use Redis cache


🔹 Stage 3: Indexing & Optimization
Problem
Query scans full table → very slow (O(N))
Solution → Composite Index
(student_id, is_read, created_at DESC)

Filters fast
Already sorted → no extra sorting
Result
reduces the time

🔹 Stage 4: Scaling Strategy
Problem is the query needs to process lot of the data 
Too many DB reads on page load
Solutions
Redis Cache
Store unread count + top notifications
Fast (O(1))
Pagination
Load only 10 items
Lazy load more
Queue
For writes (not useful for reads)
Final Approach ✅
Redis → top data
DB → old data
🔹 Stage 5: Reliability
Problem in basic code
Sync calls → slow
Failures → inconsistent data
No retry
Solution → Message Queue

Flow:

API → pushes tasks to queue
Worker → processes async
Key Concepts
Retry (for temporary failures)
Dead Letter Queue (failed tasks)
Idempotent DB writes
Benefit

✔ Fast
✔ Reliable
✔ Scalable

🔹 Stage 6: Priority Inbox
Priority
PLACEMENT = 3
RESULT = 2
EVENT = 1
Sorting
First → priority (desc)
Then → latest time
Complexity
O(N log N) (but small N → almost constant)
Output Example
Placement (latest)
Placement (older)
Result
Result

### RESTful Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/v1/notifications` | Fetch notifications (paginated, filterable) |
| `PATCH` | `/api/v1/notifications/{id}/read` | Mark a notification as read |
| `DELETE` | `/api/v1/notifications/{id}` | Delete a specific notification |
| `GET` | `/api/v1/notifications/unread-count` | Get total count of unread notifications |

*(Note: We use PATCH instead of PUT for marking as read, as it's a partial update of the notification resource.)*

### JSON Request / Response Schemas

#### 1. Fetch Notifications (`GET /api/v1/notifications`)
**Query Parameters**:
- `page` (integer, default: 1)
- `limit` (integer, default: 20)
- `type` (string, optional: `PLACEMENT` | `RESULT` | `EVENT`)
- `isRead` (boolean, optional)

**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "notifications": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "studentId": "1042",
        "type": "PLACEMENT",
        "title": "Interview Shortlist: ",
        "message": "You have been shortlisted for the final interview round.",
        "isRead": false,
        "createdAt": "2023-10-25T10:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalItems": 100
    }
  }
}
```

#### 2. Mark as Read (`PATCH /api/v1/notifications/{id}/read`)
**Request**: No body required.
**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "isRead": true
  }
}
```

#### 3. Delete Notification (`DELETE /api/v1/notifications/{id}`)
**Response** (204 No Content): Empty body.

#### 4. Get Unread Count (`GET /api/v1/notifications/unread-count`)
**Response** (200 OK):
```json
{
  "status": "success",
  "data": {
    "unreadCount": 14
  }
}
```

### HTTP Headers & Status Codes
**Headers**:
- `Authorization: Bearer <token>` (for authentication and identifying the user implicitly)
- `Content-Type: application/json`

**Status Codes**:
- `200 OK`: Successful standard operations (GET, PATCH)
- `204 No Content`: Successful deletion
- `400 Bad Request`: Invalid parameters or validation errors
- `401 Unauthorized`: Missing or invalid authentication token
- `403 Forbidden`: Attempting to access another user's notifications
- `404 Not Found`: Notification does not exist
- `500 Internal Server Error`: Server-side failure

### Real-Time Notification Strategy
**Strategy: Server-Sent Events (SSE)**
Given that notifications are primarily one-way (server to client) and need to be lightweight, SSE is the optimal choice. It utilizes standard HTTP connections, handles automatic reconnections, and reduces overhead compared to WebSockets, which are designed for bi-directional communication.
- Endpoint: `GET /api/v1/notifications/stream`
- Connection stays open, and the server pushes JSON payloads as `text/event-stream` whenever a new notification is created for the authenticated user.

---

## Stage 2: Database Design & Storage Strategy

### Database Selection Rationale
**Storage Solution Chosen: PostgreSQL (Relational Database)**
While NoSQL databases like MongoDB are excellent for unstructured data, a notification system inherently relies on highly structured data (user IDs, status flags, timestamps) and benefits from strict schema enforcement. 
PostgreSQL is chosen because:
1. **Query Patterns**: The core read queries rely heavily on filtering (`studentId`, `isRead`, `type`) and sorting (`createdAt`). Relational databases with properly configured B-Tree composite indexes excel at this.
2. **Data Structure**: Notification schema is rigid and predictable. 
3. **Scale**: PostgreSQL handles millions of rows effectively and supports powerful indexing, partitions, and replication strategies as the system grows.

### Complete Schema Definition

**Table: `notifications`**
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id VARCHAR(50) NOT NULL,
    type VARCHAR(20) NOT NULL,  -- ENUM: 'PLACEMENT', 'RESULT', 'EVENT'
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

**Field Descriptions**:
- `id`: Unique identifier (UUID avoids sequence collision in distributed systems).
- `student_id`: References the student in the centralized user service.
- `type`: Categorization of notification.
- `title` & `message`: Content of the notification.
- `is_read`: Boolean flag to track read status.
- `created_at`: Timestamp for ordering.

### Sample Queries

**1. Fetch paginated unread notifications for a user:**
```sql
SELECT id, type, title, message, is_read, created_at 
FROM notifications 
WHERE student_id = '1042' AND is_read = FALSE 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 0;
```

**2. Insert a new notification:**
```sql
INSERT INTO notifications (student_id, type, title, message) 
VALUES ('1042', 'PLACEMENT', 'Interview Scheduled', 'Your interview is tomorrow at 10 AM.');
```

**3. Get unread count:**
```sql
SELECT COUNT(*) FROM notifications WHERE student_id = '1042' AND is_read = FALSE;
```

### Anticipated Scaling Problems & Solutions
- **Problem**: Table bloat and slow historical data retrieval as older notifications accumulate.
  - **Solution**: **Table Partitioning** by `created_at` (e.g., monthly partitions) to archive old data efficiently.
- **Problem**: Count queries become slow on huge datasets.
  - **Solution**: Counter tables or caching the unread count in an in-memory datastore (e.g., Redis).

---

## Stage 3: Query Optimization & Indexing

### Query Analysis and Bottleneck Identification
**Slow Query**:
```sql
SELECT * FROM notifications
WHERE studentID = 1042 AND isRead = false
ORDER BY createdAt DESC;
```
**Analysis**:
Without an index, the database engine must perform a **Full Table Scan**, reading all 5,000,000 rows to find matches. The computational complexity is `O(N)` for filtering, followed by an `O(M log M)` sort where M is the matching rows. Because this query runs constantly, the disk I/O and CPU required to scan and sort the data will completely overwhelm the database.

### Index Design and Rationale
We should create a **Composite Index** on the exact combination of columns used in the `WHERE` clause and the `ORDER BY` clause.

```sql
CREATE INDEX idx_student_unread_date ON notifications (student_id, is_read, created_at DESC);
```
**Rationale**:
1. `student_id`: High cardinality (filters out 99.9% of rows).
2. `is_read`: Narrows down to only unread notifications.
3. `created_at DESC`: Pre-sorts the data, entirely eliminating the need for a memory/disk sort step during query execution.

**Why adding indexes on every column is a bad idea**:
Indexes speed up read operations but slow down write operations (`INSERT`, `UPDATE`, `DELETE`) because every index must be updated concurrently. Furthermore, excessive indexes consume massive amounts of disk space and RAM. We only index access patterns that actually happen.

### Optimized Queries

**1. Fetch all unread notifications for a student (sorted by date)**
*(Optimized via the `idx_student_unread_date` composite index)*
```sql
SELECT * FROM notifications 
WHERE student_id = '1042' AND is_read = false 
ORDER BY created_at DESC;
```

**2. Find all placement notifications from the last 7 days**
We need another index for this specific query pattern:
```sql
CREATE INDEX idx_type_date ON notifications (type, created_at DESC);
```
```sql
SELECT * FROM notifications 
WHERE type = 'PLACEMENT' AND created_at >= NOW() - INTERVAL '7 days'
ORDER BY created_at DESC;
```

### Performance Improvement Estimates
With the correct composite index `(student_id, is_read, created_at DESC)`:
- Time complexity drops from `O(N)` (Full Scan) to roughly `O(log N)` (B-Tree traversal).
- Pre-sorted data eliminates the sorting phase (`O(M log M)` becomes `O(1)` overhead).
- **Metric Estimate**: The query execution time should drop from hundreds of milliseconds (or seconds under load) to **< 10ms**.

---

## Stage 4: Performance Scaling & Load Management

### Problem Analysis
Fetching notifications on every page load causes a massive spike in read operations, overwhelming the database connections and CPU. The root cause is a lack of intermediate caching and inefficient fetching patterns.

### Proposed Solutions

#### Option A: In-memory caching (Redis)
- **How it works**: Cache the unread count and the first page of notifications for each user in Redis.
- **Trade-offs**: High read speed (`O(1)`), significantly reduces DB load. However, adds complexity for cache invalidation (whenever a notification is read, deleted, or created, the cache must be updated).
- **When to use**: Highly repetitive read-heavy applications where the first chunk of data is requested frequently.

#### Option B: Pagination and Lazy Loading
- **How it works**: Stop fetching all data. Instead, return only the top 10 items. Load more only when the user explicitly clicks "Load More" or scrolls down.
- **Trade-offs**: Simple to implement, guarantees strong consistency (no cache staleness). However, it still hits the DB for every page load, which might still be too much.
- **When to use**: Standard REST API scenarios where you have moderate traffic and want to prevent large payload transfers.

#### Option C: Message Queue for Async Processing
- **How it works**: For *writing* notifications, offload the ingestion to a queue (like RabbitMQ or Kafka) so DB writes don't block. Wait, the bottleneck is the read layer. While message queues fix write-heavy bottlenecks, they don't solve read-heavy page loads.
- **Trade-offs**: Essential for ingestion, irrelevant for read optimizations.

### Recommended Approach: Hybrid Strategy
A combination of **Option A** and **Option B** is the standard industry approach.
1. **Unread Count & Top 10 Notifications**: Stored in Redis (`studentId:notifications:top10` and `studentId:unread_count`). When the page loads, the frontend hits an endpoint that pulls from Redis.
2. **Historical Data (Lazy Loading)**: If the user opens the full notification tray and scrolls past the top 10, the API falls back to the PostgreSQL database with proper pagination (`LIMIT` and `OFFSET`).
3. **Invalidation**: On a new notification, a background worker updates the DB and pushes the new item into the Redis list.

---

## Stage 5: Reliability & Failure Handling

### Problem Analysis
The initial implementation:
```python
function notifyAll(studentIds: array, message: string):
  for studentId in studentIds:
    sendEmail(studentId, message)      # Calls Email API
    saveToDb(studentId, message)       # DB insert
    pushToApp(studentId, message)      # Real-time notification
```
**Shortcomings**:
1. **Synchronous & Blocking**: Sending 50,000 emails sequentially in an HTTP request will time out the server.
2. **Non-Atomic Operations**: If `sendEmail` fails, the loop crashes or skips. The DB is not updated, and the real-time push isn't sent. It's impossible to know exactly which students received the notification and which didn't.
3. **Tight Coupling**: Database performance and external Email API performance are coupled.

### Should DB write and email send be atomic?
They should be **separate but eventually consistent**. You cannot wrap a third-party API call (Email) and a DB insert in a single ACID transaction reliably without distributed transaction protocols, which are slow and brittle. Instead, we use the **Outbox Pattern** or a **Message Queue**.

### Reliable Redesign with Message Queue
1. The HR clicks "Notify All". The server inserts a `BulkJob` record and publishes 50,000 individual tasks to a Message Queue (e.g., RabbitMQ). The API immediately returns `202 Accepted`.
2. Asynchronous workers consume the tasks from the queue.

### Revised Pseudocode
```python
# PRODUCER (API Endpoint)
def notify_all_endpoint(studentIds, message):
    for studentId in studentIds:
        task = {
            "taskId": generate_uuid(),
            "studentId": studentId,
            "message": message
        }
        MessageQueue.publish("notifications_queue", task)
    return HttpResponse(status=202, message="Processing started")

# CONSUMER (Background Worker)
def worker_process_notification(task):
    studentId = task.studentId
    message = task.message
    
    # 1. Idempotent DB Write
    # DB has a unique constraint on (studentId, message, date) to prevent duplicates on retry
    db_record = saveToDb(studentId, message) 
    
    # 2. External Calls with Retry Logic
    try:
        sendEmail(studentId, message)
    except TransientError:
        # Pushes back to queue with exponential backoff
        MessageQueue.retry_later("notifications_queue", task)
        return
    except FatalError:
        # Pushes to Dead Letter Queue for manual inspection
        MessageQueue.publish("dead_letter_queue", task)
        return
    
    # 3. Best-effort push
    pushToApp(studentId, message)
```

**Discussion of Patterns**:
- **Retry Logic**: Handles temporary glitches in the Email API.
- **Dead Letter Queue (DLQ)**: Stores messages that failed after 5 retries. Developers can inspect them later.
- **Trade-offs**: We trade immediate consistency (users get the email slightly after HR clicks send) for high availability and performance.

---

## Stage 6: Priority Inbox & Smart Ordering

### Algorithm Explanation
We assign a numerical weight to each category of notification:
- **PLACEMENT = 3**
- **RESULT = 2**
- **EVENT = 1**

When new notifications arrive or when fetching the inbox, the sorting algorithm utilizes a **composite sort key**:
1. `Weight` (Descending) - Prioritizes category importance.
2. `CreatedAt` (Descending) - Resolves ties by showing the most recent notification first.

### Efficiency Analysis and Complexity
In Python, Python's `list.sort()` uses Timsort, which is highly optimized for partially sorted arrays.
- **Time Complexity**: Maintaining the top-N array size by appending and sorting takes `O(K log K)` where K is the number of elements. Because we aggressively truncate the list to capacity `N` (e.g., 10 or 20) after every insert, K never exceeds `N + incoming_bulk_size`. If we process notifications one by one, sorting is essentially `O(N log N)`. Since `N` is tiny (e.g., 20), this is practically `O(1)`.
- **Space Complexity**: `O(N)` where N is the capacity of the inbox. 

*(A more optimal algorithm for massive un-truncated lists would use a Min-Heap of size N, which gives `O(M log N)` for processing M items, but sorting a list of 20 elements is faster in Python due to C-level optimizations).*

### Output Screenshots / Results
*(Executed via the provided `priority_inbox.py`)*

```text
--- Top 4 Priority Inbox ---
1. [PLACEMENT] (Priority: 3) - Amazon OA Link | Date: 2026-05-02T10:00:57.372142
2. [PLACEMENT] (Priority: 3) - Google Interview | Date: 2026-05-02T05:30:57.372142
3. [RESULT] (Priority: 2) - Quiz 2 Marks | Date: 2026-05-02T00:30:57.372142
4. [RESULT] (Priority: 2) - Semester 4 Grades Available | Date: 2026-04-30T10:30:57.372142
```
As demonstrated by the output, Placement tasks outrank Results, and newer Placements (Amazon, 30 mins ago) outrank older Placements (Google, 5 hours ago).
x