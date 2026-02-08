# Buddy - API Documentation

## Overview

Buddy exposes RESTful APIs for the caregiver dashboard and administrative functions. All APIs use JSON format and require authentication via JWT tokens.

**Base URL:** `https://api.buddy.example.com/v1`  
**Content-Type:** `application/json`  
**Authentication:** Bearer Token (JWT)

---

## Authentication

### Login

Authenticate caregiver and receive JWT token.

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "username": "caregiver_test",
  "password": "Demo2026!"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "caregiver_id": "cg-001",
  "display_name": "Caregiver Test"
}
```

**Response (401 Unauthorized):**
```json
{
  "error": "Invalid credentials",
  "message": "Username or password is incorrect"
}
```

### Refresh Token

Refresh an expiring JWT token.

**Endpoint:** `POST /auth/refresh`

**Headers:**
```
Authorization: Bearer <current_token>
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600
}
```

---

## Patients

### List Patients

Get all patients assigned to the authenticated caregiver.

**Endpoint:** `GET /patients`

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "patients": [
    {
      "patient_id": "pt-001",
      "preferred_name": "John",
      "full_name": "John Doe",
      "dementia_stage": "moderate",
      "last_conversation_at": "2026-02-08T07:45:26Z",
      "last_escalation_level": 2,
      "unacknowledged_alerts": 1
    }
  ],
  "total": 1,
  "page": 1,
  "per_page": 20
}
```

### Get Patient Details

Get detailed information about a specific patient.

**Endpoint:** `GET /patients/{patient_id}`

**Response (200 OK):**
```json
{
  "patient_id": "pt-001",
  "preferred_name": "John",
  "full_name": "John Doe",
  "birthdate": "1950-03-15",
  "dementia_stage": "moderate",
  "safety_profile": {
    "caregiver_phone": "+15551234567",
    "emergency_contacts": [
      "Sarah (daughter): +15559876543",
      "Neighbor Tom: +15555678901"
    ],
    "medical_conditions": [
      "Alzheimer's Disease",
      "Hypertension",
      "Type 2 Diabetes"
    ],
    "allergies": [
      "Penicillin",
      "Shellfish"
    ]
  },
  "routines": [
    {
      "routine_id": "r-001",
      "name": "Morning Routine",
      "time": "08:00",
      "steps": [
        "Brush your teeth",
        "Wash your face",
        "Change your clothes"
      ]
    }
  ],
  "medications": [
    {
      "medication_id": "m-001",
      "name": "Metformin",
      "appearance": "White round pill",
      "schedule": "After breakfast"
    }
  ],
  "people": [
    {
      "person_id": "p-001",
      "name": "Sarah",
      "relationship": "daughter",
      "description": "Sarah visits on Sundays and likes to garden with you"
    }
  ],
  "last_conversation_at": "2026-02-08T07:45:26Z",
  "last_escalation_level": 2,
  "conversation_count_today": 5
}
```

### Update Patient

Update patient information (caregiver only).

**Endpoint:** `PUT /patients/{patient_id}`

**Request:**
```json
{
  "preferred_name": "Johnny",
  "safety_profile": {
    "caregiver_phone": "+15559876543"
  }
}
```

**Response (200 OK):**
```json
{
  "patient_id": "pt-001",
  "message": "Patient updated successfully",
  "updated_fields": ["preferred_name", "safety_profile.caregiver_phone"]
}
```

---

## Conversations

### List Conversations

Get conversation history for a patient.

**Endpoint:** `GET /patients/{patient_id}/conversations`

**Query Parameters:**
- `limit` (integer, optional): Number of results (default: 20, max: 100)
- `cursor` (string, optional): Pagination cursor
- `start_date` (ISO 8601, optional): Filter from date
- `end_date` (ISO 8601, optional): Filter to date
- `escalation_level` (integer, optional): Filter by level (0, 1, or 2)

**Response (200 OK):**
```json
{
  "conversations": [
    {
      "conversation_id": "conv-001",
      "timestamp": "2026-02-08T07:45:26Z",
      "user_utterance": "I fell down",
      "assistant_response": "I'm contacting emergency services and your caregiver now...",
      "intent": "EmergencyIntent",
      "escalation_level": 2,
      "caregiver_notified": true,
      "session_id": "test-session-emergency-001"
    },
    {
      "conversation_id": "conv-002",
      "timestamp": "2026-02-08T07:30:15Z",
      "user_utterance": "What do I do this morning?",
      "assistant_response": "Good morning John! Time to brush your teeth...",
      "intent": "RoutineIntent",
      "escalation_level": 0,
      "caregiver_notified": false,
      "session_id": "test-session-routine-001"
    }
  ],
  "pagination": {
    "total": 45,
    "has_more": true,
    "next_cursor": "eyJ0aW1lc3RhbXAiOiAyMDI2LTAyLTA4VDA3OjMwOjE1WiJ9"
  }
}
```

### Get Conversation Stats

Get statistics for patient conversations.

**Endpoint:** `GET /patients/{patient_id}/conversations/stats`

**Query Parameters:**
- `period` (string, optional): Time period (day, week, month) - default: day

**Response (200 OK):**
```json
{
  "period": "day",
  "total_conversations": 15,
  "escalation_breakdown": {
    "level_0": 10,
    "level_1": 3,
    "level_2": 2
  },
  "most_common_intents": [
    {"intent": "RoutineIntent", "count": 5},
    {"intent": "WhoIsIntent", "count": 4},
    {"intent": "MedicationIntent", "count": 3}
  ],
  "caregiver_notifications": 5,
  "average_response_time_ms": 2345
}
```

---

## Alerts

### List Alerts

Get all safety alerts for a patient.

**Endpoint:** `GET /patients/{patient_id}/alerts`

**Query Parameters:**
- `status` (string, optional): Filter by status (all, acknowledged, unacknowledged) - default: all
- `level` (integer, optional): Filter by level (1 or 2)
- `limit` (integer, optional): Number of results (default: 20)

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "alert_id": "alert-001",
      "patient_id": "pt-001",
      "patient_name": "John",
      "level": 2,
      "message": "EMERGENCY: John triggered a Level 2 alert. Statement: \"I fell down\"",
      "timestamp": "2026-02-08T07:45:26Z",
      "acknowledged": false,
      "acknowledged_at": null,
      "acknowledged_by": null,
      "conversation_id": "conv-001"
    },
    {
      "alert_id": "alert-002",
      "patient_id": "pt-001",
      "patient_name": "John",
      "level": 1,
      "message": "Buddy Alert: John said \"Who is Sarah?\" 4+ times in 2 hours",
      "timestamp": "2026-02-08T06:30:00Z",
      "acknowledged": true,
      "acknowledged_at": "2026-02-08T06:35:00Z",
      "acknowledged_by": "caregiver_test",
      "conversation_id": "conv-003"
    }
  ],
  "summary": {
    "total": 2,
    "unacknowledged": 1,
    "level_1": 1,
    "level_2": 1
  }
}
```

### Acknowledge Alert

Mark an alert as acknowledged.

**Endpoint:** `POST /alerts/{alert_id}/acknowledge`

**Response (200 OK):**
```json
{
  "alert_id": "alert-001",
  "message": "Alert acknowledged successfully",
  "acknowledged_at": "2026-02-08T07:50:00Z",
  "acknowledged_by": "caregiver_test"
}
```

### Get Unacknowledged Alerts Count

Get count of unacknowledged alerts across all patients.

**Endpoint:** `GET /alerts/unacknowledged/count`

**Response (200 OK):**
```json
{
  "total_unacknowledged": 3,
  "by_patient": [
    {
      "patient_id": "pt-001",
      "patient_name": "John",
      "unacknowledged_count": 2
    }
  ]
}
```

---

## Caregivers

### Get Current Caregiver

Get information about the authenticated caregiver.

**Endpoint:** `GET /caregivers/me`

**Response (200 OK):**
```json
{
  "caregiver_id": "cg-001",
  "username": "caregiver_test",
  "display_name": "Caregiver Test",
  "phone_number": "+15550123",
  "notification_preferences": {
    "sms_enabled": true,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "07:00",
    "level_1_alerts": true,
    "level_2_alerts": true
  },
  "patients": [
    {
      "patient_id": "pt-001",
      "preferred_name": "John",
      "assigned_at": "2026-02-08T00:00:00Z"
    }
  ],
  "created_at": "2026-02-08T00:00:00Z",
  "last_login": "2026-02-08T07:45:00Z"
}
```

### Update Notification Preferences

Update caregiver notification settings.

**Endpoint:** `PUT /caregivers/me/notifications`

**Request:**
```json
{
  "sms_enabled": true,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00",
  "level_1_alerts": true,
  "level_2_alerts": true
}
```

**Response (200 OK):**
```json
{
  "message": "Notification preferences updated",
  "updated_preferences": {
    "sms_enabled": true,
    "quiet_hours_start": "22:00",
    "quiet_hours_end": "07:00",
    "level_1_alerts": true,
    "level_2_alerts": true
  }
}
```

---

## Dashboard

### Get Dashboard Overview

Get summary data for the caregiver dashboard.

**Endpoint:** `GET /dashboard/overview`

**Response (200 OK):**
```json
{
  "patients": [
    {
      "patient_id": "pt-001",
      "preferred_name": "John",
      "dementia_stage": "moderate",
      "last_conversation_at": "2026-02-08T07:45:26Z",
      "last_escalation_level": 2,
      "unacknowledged_alerts": 1,
      "conversation_count_today": 5
    }
  ],
  "summary": {
    "total_patients": 1,
    "total_conversations_today": 5,
    "total_unacknowledged_alerts": 1,
    "emergencies_today": 1
  },
  "recent_activity": [
    {
      "type": "emergency",
      "patient_id": "pt-001",
      "patient_name": "John",
      "message": "Level 2 emergency: Patient said 'I fell down'",
      "timestamp": "2026-02-08T07:45:26Z"
    }
  ]
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {}
}
```

### Common HTTP Status Codes

| Code | Meaning | Example |
|------|---------|---------|
| 200 | Success | Request completed |
| 400 | Bad Request | Invalid parameters |
| 401 | Unauthorized | Invalid or missing token |
| 403 | Forbidden | Not authorized for this resource |
| 404 | Not Found | Patient or resource doesn't exist |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server error |

### Error Codes

- `invalid_token`: JWT token is invalid or expired
- `insufficient_permissions`: User doesn't have access to this resource
- `patient_not_found`: Patient ID doesn't exist
- `alert_not_found`: Alert ID doesn't exist
- `invalid_request`: Request body is malformed
- `rate_limit_exceeded`: Too many requests

---

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Authenticated requests:** 1000 requests per hour
- **Unauthenticated requests:** 60 requests per hour
- **Burst limit:** 100 requests per minute

Rate limit headers are included in all responses:
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1644345600
```

---

## WebSocket API (Real-time)

For real-time updates, connect to the WebSocket endpoint:

**Endpoint:** `wss://api.buddy.example.com/ws`

**Authentication:** Pass JWT token as query parameter:
```
wss://api.buddy.example.com/ws?token=<jwt_token>
```

### Events

**Subscribe to patient updates:**
```json
{
  "action": "subscribe",
  "patient_id": "pt-001"
}
```

**Receive real-time alerts:**
```json
{
  "type": "alert",
  "data": {
    "alert_id": "alert-003",
    "patient_id": "pt-001",
    "level": 2,
    "message": "Emergency detected",
    "timestamp": "2026-02-08T07:45:26Z"
  }
}
```

---

## SDK Examples

### JavaScript/TypeScript

```typescript
const BASE_URL = 'https://api.buddy.example.com/v1';

class BuddyAPI {
  private token: string;
  
  constructor(token: string) {
    this.token = token;
  }
  
  async getPatients() {
    const response = await fetch(`${BASE_URL}/patients`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      }
    });
    return response.json();
  }
  
  async getPatientConversations(patientId: string) {
    const response = await fetch(
      `${BASE_URL}/patients/${patientId}/conversations`,
      {
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    return response.json();
  }
  
  async acknowledgeAlert(alertId: string) {
    const response = await fetch(
      `${BASE_URL}/alerts/${alertId}/acknowledge`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      }
    );
    return response.json();
  }
}
```

### Python

```python
import requests

class BuddyAPI:
    def __init__(self, token):
        self.token = token
        self.base_url = 'https://api.buddy.example.com/v1'
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def get_patients(self):
        response = requests.get(
            f'{self.base_url}/patients',
            headers=self.headers
        )
        return response.json()
    
    def get_patient_conversations(self, patient_id):
        response = requests.get(
            f'{self.base_url}/patients/{patient_id}/conversations',
            headers=self.headers
        )
        return response.json()
    
    def acknowledge_alert(self, alert_id):
        response = requests.post(
            f'{self.base_url}/alerts/{alert_id}/acknowledge',
            headers=self.headers
        )
        return response.json()
```

---

## Changelog

### v1.0 (2026-02-08)
- Initial API release
- Patient management endpoints
- Conversation history
- Alert system
- Dashboard overview

---

**Last Updated:** February 8, 2026  
**Version:** 1.0.0
