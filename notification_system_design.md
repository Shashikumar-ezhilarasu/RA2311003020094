# Campus Notifications Microservice - Study Notes

## Stage 1: Core API Endpoints

**Q: What are the 4 main API operations?**

A: 
- **Fetch notifications** → GET /notifications (with pagination & filters)
- **Mark as read** → PATCH /notifications/{id}/read  
- **Delete notification** → DELETE /notifications/{id}
- **Get unread count** → GET /notifications/unread-count

**Q: Why PATCH instead of PUT?**

A: Because we're only updating ONE field (is_read = true), not replacing the entire notification object. PATCH = partial update.

---

## Stage 2: Database Design

**Q: Why PostgreSQL and not MongoDB?**

A: 
- Notifications = structured data (rigid schema)
- Need fast filtering + sorting on student_id, is_read, created_at
- PostgreSQL indexes are perfect for this
- Strong schema enforcement matters

**Q: Basic table structure?**

A:
```
id (UUID) | student_id | type | title | message | is_read | created_at
```

**Q: When data gets huge, what's the problem?**

A: Counting unread notifications takes forever. Solution: Use Redis cache instead of counting every time.

---

## Stage 3: Indexing & Optimization

**Q: What's the bottleneck without indexes?**

A: Full table scan (O(N)) — database reads ALL 5 million rows to find 20 notifications. Super slow.

**Q: What index do we create?**

A:
```sql
CREATE INDEX idx_student_unread_date 
ON notifications (student_id, is_read, created_at DESC)
```

**Q: Why this specific order?**

A:
1. student_id first → filters out 99.9% of rows
2. is_read second → narrows to only unread
3. created_at DESC → data already sorted, no extra sorting needed

**Q: Speed improvement?**

A: O(N) → O(log N). From ~500ms to <10ms per query.

---

## Stage 4: Scaling Strategy

**Q: What's the main problem at scale?**

A: Every page load = DB read → too many queries hitting the database simultaneously.

**Q: What are the 3 solutions?**

A:
1. **Redis Cache** → store top 10 + unread count (O(1) speed)
2. **Lazy Loading** → only fetch 10 items, load more on scroll
3. **Message Queue** → for writes (not useful for reads)

**Q: Best approach?**

A: Hybrid!
- Redis = top notifications (fast)
- Database = old notifications (when user scrolls)
- Cache invalidates when new notification arrives

---

## Stage 5: Reliability & Failure Handling

**Q: What's wrong with sync code?**

A:
```python
for student in students:
  sendEmail()      # Slow
  saveDB()         # If email fails, DB never gets updated
  pushApp()        # Might not run
```
→ Blocking, non-atomic, tightly coupled.

**Q: Solution?**

A: Message Queue (RabbitMQ/Kafka):
1. API pushes 50k tasks to queue → returns immediately (202 Accepted)
2. Background workers consume tasks
3. If task fails → retry with backoff
4. If retry fails 5 times → move to Dead Letter Queue

**Q: Key concepts?**

A:
- **Idempotent writes** = same task = same result (no duplicates)
- **Retry logic** = for temporary failures
- **Dead Letter Queue** = failed tasks for manual review

---

## Stage 6: Priority Inbox

**Q: What's the priority system?**

A:
- PLACEMENT = 3 (highest priority)
- RESULT = 2
- EVENT = 1 (lowest priority)

**Q: How to sort?**

A:
1. First by priority (high → low)
2. Then by timestamp (newest → oldest)

**Output example:**
```
1. Amazon OA (PLACEMENT) - today 10:00am
2. Google Interview (PLACEMENT) - today 5:30am  
3. Quiz Marks (RESULT) - today 12:30am
4. Grades (RESULT) - 2 days ago
```

**Q: Time complexity?**

A: O(N log N) for sort, but N is tiny (only top 10-20), so basically O(1) in practice.

---

## Quick Reference Table

| Stage | Problem | Solution |
|-------|---------|----------|
| 1 | No API defined | REST endpoints: GET, PATCH, DELETE |
| 2 | Data not structured | PostgreSQL with clean schema |
| 3 | Slow queries | Composite index (student_id, is_read, created_at) |
| 4 | Too many DB hits | Redis cache + lazy loading |
| 5 | Sync code fails | Message Queue + retry logic |
| 6 | All notifications equal | Priority sorting (PLACEMENT > RESULT > EVENT) |

---

## Key Takeaways

✅ **API Design** = Simple, RESTful, uses correct HTTP methods  
✅ **Database** = PostgreSQL with proper indexes beats everything  
✅ **Caching** = Redis for hot data, DB for historical data  
✅ **Reliability** = Async + Message Queue + retry = robust system  
✅ **Priority** = Sort by weight first, then by time  

**Remember:** Always optimize queries BEFORE adding caches!
