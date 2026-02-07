# Buddy DynamoDB Schema Documentation

## Overview

Hybrid schema design:
- **Nested structures** for immediate Alexa performance (fast reads)
- **Assignments table** for caregiver-patient relationships (scalable)
- **Activity metadata** for dashboard performance
- **Foundation** for future flat conversion

## Tables

### 1. BuddyCaregivers-{env}

Stores caregiver authentication and notification preferences.

**Primary Key:**
- PK: `username` (String) - login identifier

**Attributes:**
```json
{
  "username": "caregiver_test",
  "caregiverId": "cg-001",
  "displayName": "Caregiver Test",
  "passwordHash": "$2b$12$...",
  "phoneNumber": "+15550123",
  "notificationPreferences": {
    "smsEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00",
    "level1Alerts": true,
    "level2Alerts": true
  },
  "createdAt": "2026-02-06T18:06:00-08:00",
  "updatedAt": "2026-02-06T18:06:00-08:00"
}
```

**GSI:**
- `caregiverIdIndex`: PK=`caregiverId` - reverse lookup by ID

**Access Patterns:**
- Login: Query by username (exact match)
- Profile lookup: Query by caregiverId

---

### 2. BuddyPatients-{env}

Stores patient profiles with nested arrays for fast reads.

**Primary Key:**
- PK: `patientId` (String)

**Key Design Decisions:**
- ✅ **Nested arrays** for people, routines, medications - optimized for Alexa Lambda reads
- ✅ **Activity metadata** fields for dashboard performance
- ✅ **Versioning** for optimistic locking
- ❌ **No caregiverId** - moved to BuddyAssignments table (scalability)

**Attributes:**
```json
{
  "patientId": "pt-001",
  "name": "John Doe",
  "preferredName": "John",
  "birthdate": "1950-03-15",
  "dementiaStage": "moderate",
  
  // Activity metadata (for dashboard performance)
  "lastConversationAt": null,
  "lastEscalationLevel": 0,
  "conversationCountToday": 0,
  "lastModifiedAt": "2026-02-06T18:06:00-08:00",
  "lastModifiedBy": "system",
  "_version": 1,
  
  // Nested structures (fast reads)
  "people": [...],
  "routines": [...],
  "medications": [...],
  "safetyProfile": {...}
}
```

**GSI:**
- None currently (caregiver lookup via BuddyAssignments)

**Access Patterns:**
- Get patient by ID: `patientId = "pt-001"`
- List patients by caregiver: Query BuddyAssignments by `caregiverId`

---

### 3. BuddyAssignments-{env} ⭐ NEW

Links caregivers to patients. Solves scalability issue of storing all patient mappings in caregiver record.

**Primary Key:**
- PK: `caregiverId` (String)
- SK: `patientId` (String)

**Attributes:**
```json
{
  "caregiverId": "cg-001",
  "patientId": "pt-001",
  "assignedAt": "2026-02-06T18:06:00-08:00",
  "isPrimary": true,
  "patientSnapshot": {
    "preferredName": "John",
    "dementiaStage": "moderate",
    "lastActivityAt": null
  }
}
```

**GSIs:**
- `patientIdIndex`: PK=`patientId`, SK=`assignedAt` - find caregivers for a patient
- `assignedAtIndex`: PK=`caregiverId`, SK=`assignedAt` - list assignments by date

**Access Patterns:**
- List my patients: Query by `caregiverId` → returns all patient mappings
- Find caregivers: Query `patientIdIndex` by `patientId`
- Recent assignments: Query `assignedAtIndex` with date range

**Why Separate Table?**
- Caregiver can have unlimited patients (no 400KB item limit)
- Easy to add/remove patient assignments
- Supports multiple caregivers per patient (family members)
- Patient snapshot avoids full patient record fetch for list views

---

### 4. BuddyConversationLogs-{env}

Stores all patient-Alexa interactions with 90-day TTL.

**Primary Key:**
- PK: `patientId` (String)
- SK: `timestamp` (String, ISO-8601) - descending sort

**Attributes:**
```json
{
  "patientId": "pt-001",
  "timestamp": "2026-02-06T18:30:00Z",
  "userUtterance": "Who is Sarah?",
  "assistantResponse": "Sarah is your daughter...",
  "intent": "WhoIsIntent",
  "escalationLevel": 0,
  "repeatCount": 1,
  "caregiverNotified": false,
  "expiresAt": 1711234567  // TTL epoch seconds (90 days)
}
```

**GSIs:**
- `escalationLevelIndex`: PK=`escalationLevel` (0,1,2), SK=`timestamp` - filter by severity

**Access Patterns:**
- Get conversation history: Query by `patientId`, sort by timestamp desc
- Filter by escalation: Query `escalationLevelIndex` by level
- Repetition detection: Query last 2 hours, count matching utterances
- Safety monitoring: Query `escalationLevelIndex` for Level 2 events

**TTL Configuration:**
- Attribute: `expiresAt` (epoch seconds)
- Auto-deletion after 90 days
- Privacy requirement: no long-term conversation storage

---

## Schema Evolution Strategy

### Current State (Phase 1)
- ✅ BuddyCaregivers (enhanced with phone/notifications)
- ✅ BuddyPatients (nested, with activity metadata)
- ✅ BuddyAssignments (new - caregiver-patient links)
- ✅ BuddyConversationLogs (with TTL)

### Future Flat Conversion

When ready to migrate to flat schema:

```python
# Migration utilities available in infrastructure/migration/

# 1. Extract nested arrays to flat tables
python infrastructure/migration/nested-to-flat.py
# Creates:
#   - BuddyPeopleFlat
#   - BuddyRoutinesFlat  
#   - BuddyMedicationsFlat

# 2. Dual-write period (both nested + flat)
# Update Lambda to write to both schemas

# 3. Switch read path to flat tables
# Update Alexa Lambda to query flat tables

# 4. Remove nested arrays
# Update BuddyPatients schema
```

**Flat Table Design (Future):**

```yaml
# BuddyPeopleFlat
PK: patientId
SK: personId
Attributes: name, relationship, visitSchedule, sharedActivities

# BuddyRoutinesFlat
PK: patientId
SK: routineId
Attributes: timeOfDay, steps[]

# BuddyMedicationsFlat
PK: patientId
SK: medicationId
Attributes: name, timing, appearance, notes
```

---

## Performance Optimizations

### 1. Dashboard "List My Patients" Query

**Without Assignments table:**
```python
# Slow: Scan all patients, filter by caregiverId
patients = table.scan(
    FilterExpression="caregiverId = :cg"
)
```

**With Assignments table:**
```python
# Fast: Query assignments, get patient snapshots
assignments = assignments_table.query(
    KeyConditionExpression="caregiverId = :cg"
)
# Returns patientSnapshot for each (no full patient fetch needed)
```

### 2. Activity Metadata

Patient record includes derived fields updated by triggers:
- `lastConversationAt` - prevents scanning logs for "latest activity"
- `lastEscalationLevel` - shows alert status without log query
- `conversationCountToday` - quick stats for dashboard

### 3. Conversation Log Indexes

- Time-range queries (repetition detection): Use SK with timestamp filter
- Escalation filtering: Use `escalationLevelIndex`
- No need for additional indexes (keep costs low)

---

## Cost Optimization

**On-Demand (PAY_PER_REQUEST)** - Current
- ✅ Good for: Development, variable traffic, hackathon demo
- ❌ Expensive for: High traffic, predictable workloads

**Provisioned Capacity** - Production
- Switch to provisioned mode when traffic patterns known
- Set auto-scaling policies
- Typical costs: ~$5-10/month for MVP load

**Storage Costs:**
- Patient records: ~1-5KB each
- Conversation logs: ~500 bytes per interaction
- 90-day TTL keeps log storage bounded
- Estimated: <$1/month for demo data

---

## Security

- **Encryption at Rest**: SSE-S3 (AES-256) on all tables
- **Encryption in Transit**: TLS 1.2+
- **IAM**: Least-privilege access (table-specific)
- **No PHI in logs**: Only text transcripts, no audio
- **TTL**: Automatic deletion after 90 days

---

## Testing

```bash
# Verify schema deployed
./verify.sh

# Check all tables exist
aws dynamodb list-tables --region us-east-1

# Test assignment query
aws dynamodb query \
    --table-name BuddyAssignments-dev \
    --key-condition-expression "caregiverId = :cg" \
    --expression-attribute-values '{":cg":{"S":"cg-001"}}'

# Test patient retrieval
aws dynamodb get-item \
    --table-name BuddyPatients-dev \
    --key '{"patientId":{"S":"pt-001"}}'
```

---

## Migration from Original Schema

If you deployed the original schema before this update:

```bash
# 1. Deploy new assignments table
./deploy.sh

# 2. Run migration script
python infrastructure/migration/create-assignments.py

# 3. Verify
python infrastructure/seed_data.py --verify

# 4. Optionally: Remove caregiverId from patient records
# (Not required, but cleaner)
python infrastructure/migration/remove-caregiverId.py
```

---

**Last Updated:** 2026-02-06  
**Status:** Phase 1 Complete - Ready for Phase 2 (Agentic Workflow)
