# Buddy - Product Requirements Document (PRD)

**Version:** 1.0  
**Date:** February 6, 2026  
**Author:** Anthony Lopez  
**Project:** Amazon Nova AI Hackathon 2026 Submission  
**Status:** Phase 1 - Infrastructure Complete

---

## 1. Executive Summary

Buddy is a voice-first AI assistant for dementia patients, combining Amazon Nova 2 Sonic (speech-to-speech) with Nova Lite (agentic reasoning) to provide 24/7 memory support, routine guidance, and intelligent safety escalation.

### Key Differentiators
- Nova Sonic's interruption handling for natural dementia conversations
- 3-level safety escalation (normal → caregiver alert → emergency)
- Personalized knowledge base (family, routines, medications)
- Dementia-specific UX principles (short sentences, consistent answers, positive framing)

---

## 2. System Architecture

### 2.1 High-Level Design

```
Patient Device (Alexa Echo/Dot)
           │
           ▼
┌─────────────────────────────────────┐
│   AWS Lambda (Alexa Skill Handler)  │
│   - Intent routing                  │
│   - User context lookup             │
│   - Safety classification           │
└─────────────────────────────────────┘
           │
           ▼ (bidirectional streaming)
┌─────────────────────────────────────┐
│  Amazon Bedrock Nova 2 Sonic        │
│  - Speech-to-speech                 │
│  - 300K context window              │
│  - LOW endpointing sensitivity      │
└─────────────────────────────────────┘
           │
           ▼ (tool calls)
┌─────────────────────────────────────┐
│   Nova 2 Lite Agent                 │
│   - Tool orchestration              │
│   - Safety risk scoring             │
│   - Response generation             │
└─────────────────────────────────────┘
           │
           ▼
┌──────────┬──────────┬───────────────┐
│ DynamoDB │  Bedrock │     SNS       │
│ Tables   │  Models  │   (Alerts)    │
└──────────┴──────────┴───────────────┘
```

### 2.2 Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Voice Interface | Amazon Nova 2 Sonic | Speech-to-speech, interruption handling |
| Agentic Reasoning | Amazon Nova 2 Lite | Tool orchestration, safety classification |
| Backend | AWS Lambda (Python) | Alexa skill fulfillment |
| Database | DynamoDB | Patient data, conversation logs |
| Alerts | Amazon SNS | SMS notifications |
| Emergency | Alexa Emergency Assist | 24/7 urgent response |
| Web Dashboard | FastAPI + HTML/JS | Caregiver interface |

### 2.3 Data Architecture

**Three DynamoDB Tables:**

1. **BuddyCaregivers-{env}**
   - PK: `username` (string)
   - Attributes: `caregiverId`, `passwordHash`, `displayName`, `createdAt`
   - GSI: `caregiverIdIndex` (for reverse lookup)

2. **BuddyPatients-{env}**
   - PK: `patientId` (string)
   - Attributes: `caregiverId`, `name`, `preferredName`, `dementiaStage`, `people[]`, `routines[]`, `medications[]`, `safetyProfile`
   - GSI: `caregiverIdIndex` (list patients by caregiver)

3. **BuddyConversationLogs-{env}**
   - PK: `patientId` (string)
   - SK: `timestamp` (ISO-8601, descending)
   - Attributes: `userUtterance`, `assistantResponse`, `intent`, `escalationLevel`, `repeatCount`, `expiresAt` (TTL)
   - GSI: `escalationLevelIndex` (filter by severity)
   - **TTL**: 90 days auto-deletion

### 2.4 User Identity Mapping

**Challenge**: Alexa provides opaque `userId`, but our data uses `patientId`.

**Solution**: Store mapping in BuddyCaregivers table

```json
{
  "username": "caregiver_test",
  "caregiverId": "cg-001",
  "patientMappings": {
    "amzn1.ask.account.XXX": "pt-001"
  }
}
```

**Flow:**
1. Alexa request includes `userId`
2. Lambda queries Caregivers table for mapping
3. Retrieves patient data from Patients table
4. Proceeds with patient context

---

## 3. Core Features

### 3.1 Voice-First Memory Support

**Use Case**: Patient asks about daily routine

**Intents:**
- `GetRoutineIntent` - "What do I do this morning?"
- `NextStepIntent` - "What do I do next?"

**Flow:**
1. Extract time context (current time or slot value)
2. Query DynamoDB for patient's routine matching time
3. Format response (1-2 short sentences)
4. Nova Sonic speaks response with calm prosody

**Example:**
```
Patient: "What do I do this morning?"
Buddy: "Let's brush your teeth. Find your toothbrush in the blue cup by the sink."
```

### 3.2 Family Recognition

**Use Case**: Patient asks about family member

**Intent**: `WhoIsIntent` - "Who is Sarah?"

**Flow:**
1. Extract `person` slot value
2. Query `people` array in patient record
3. Format response with relationship, visit schedule, activities
4. Track repetition count

**Repetition Handling:**
- Log every query to ConversationLogs
- Count occurrences of same `userUtterance` within 2 hours
- After 3rd repetition → escalationLevel = 1, notify caregiver

**Example:**
```
Patient: "Who is Sarah?"
Buddy: "Sarah is your daughter. She visits on Tuesdays and loves gardening with you."

[5 minutes later]
Patient: "Who is Sarah?"
Buddy: "Sarah is your daughter. She visits on Tuesdays and loves gardening with you."
[repeatCount = 1]
```

### 3.3 Medication Reminders

**Use Case**: Patient asks about medications

**Intent**: `GetMedicationIntent` - "What do I take after breakfast?"

**Flow:**
1. Extract `meal` or `timing` slot
2. Query `medications` array for matching timing
3. Format response with name + appearance
4. **Always include disclaimer**: "Please confirm with your caregiver"

**Safety Rails:**
- Never suggest dosage changes
- Never diagnose
- Always advise confirming with caregiver/pharmacist
- Log all medication queries

**Example:**
```
Patient: "What do I take after breakfast?"
Buddy: "You take Donepezil, a small white round pill. Please confirm with your caregiver if you're unsure."
```

### 3.4 3-Level Safety Escalation

#### Level 0: Normal Conversation
- Routine queries, memory prompts, casual chat
- No alerts
- Standard logging

#### Level 1: Concerning Behavior

**Triggers:**
- Same question repeated 4+ times in 2 hours
- Agitation keywords: "scared", "confused", "lost", "can't find"
- Off-schedule queries: "Why is it dark?" at 3 AM
- Location confusion: "Where am I?"

**Response:**
1. Calming technique: "You're safe at home. Let's take a deep breath."
2. Structured redirection: "Would you like to hear your favorite music?"
3. **Ask permission**: "Should I notify your caregiver?"
4. If yes (or no response after 10s) → Send SMS

**SMS Format:**
```
Buddy Alert: John asked "Where am I?" 4 times in the past hour. 
View conversation: [dashboard-link]
Reply STOP to unsubscribe.
```

#### Level 2: Emergency

**Triggers:**
- Explicit danger: "I fell", "I'm bleeding", "chest pain", "can't breathe"
- Fire/safety: "smoke", "fire", "gas smell"
- Threats: "someone's in the house"
- No response after 3 prompts (potential medical emergency)

**Response (NO PERMISSION REQUIRED):**
1. Immediate announcement: "I'm contacting emergency services now. Stay on the line."
2. Parallel actions:
   - Send URGENT SMS to caregiver
   - Invoke Alexa Emergency Assist
3. Continue engagement: "Help is coming. Can you tell me where you are?"

**SMS Format:**
```
URGENT: John said "I fell." Initiating emergency protocol.
Call now: +1-555-0123
Reply: 1) I'm calling 911, 2) Proceed with protocol
```

### 3.5 Safety Classification Logic

**Implementation:**

```python
def classify_safety_level(utterance, history, patient_context):
    # Hard keyword rules
    level_2_keywords = ['fell', 'bleeding', 'chest pain', 'fire', 
                       'can\'t breathe', 'smoke', 'gas smell']
    level_1_keywords = ['scared', 'confused', 'lost', 'where am i']
    
    # Check for Level 2 triggers
    if any(kw in utterance.lower() for kw in level_2_keywords):
        return 2
    
    # Check repetition rate (2-hour window)
    recent = [h for h in history if h['timestamp'] > now() - timedelta(hours=2)]
    repeats = len([h for h in recent if h['utterance'] == utterance])
    if repeats >= 3:  # 4th occurrence triggers Level 1
        return 1
    
    # Check Level 1 keywords
    if any(kw in utterance.lower() for kw in level_1_keywords):
        return 1
    
    # Optional: Nova Lite risk scoring for ambiguous cases
    # risk = nova_lite.classify_risk(utterance, patient_context)
    # return risk['level']
    
    return 0
```

**Rules:**
- Deterministic rules FIRST (keywords, repetition)
- Nova Lite agent for ambiguous cases
- Fail-safe: escalate on uncertainty
- Level 2: No permission required (emergency)
- Level 1: Ask permission first (concerning but not urgent)

---

## 4. API Specification

### 4.1 Backend API (FastAPI)

**Base URL:** `https://api.buddy.dev/v1`

**Authentication:** JWT Bearer tokens

**Core Endpoints:**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Username/password → JWT |
| POST | `/auth/logout` | Invalidate token |
| GET | `/me` | Current caregiver profile |
| GET | `/patients` | List caregiver's patients |
| GET | `/patients/{id}` | Get patient full profile |
| PUT | `/patients/{id}` | Update patient fields |
| GET | `/patients/{id}/logs` | Conversation history |
| POST | `/patients/{id}/people` | Add family member |
| PUT | `/patients/{id}/people/{pid}` | Update person |
| DELETE | `/patients/{id}/people/{pid}` | Remove person |
| POST | `/patients/{id}/routines` | Add routine block |
| PUT | `/patients/{id}/routines/{rid}` | Update routine |
| DELETE | `/patients/{id}/routines/{rid}` | Remove routine |
| POST | `/patients/{id}/medications` | Add medication |
| PUT | `/patients/{id}/medications/{mid}` | Update medication |
| DELETE | `/patients/{id}/medications/{mid}` | Remove medication |

**Note:** Full OpenAPI spec available in `api.yaml`

### 4.2 Alexa Skill Interface

**Invocation Name:** "Buddy Assistant"

**Intents:**

```json
{
  "intents": [
    {
      "name": "GetRoutineIntent",
      "samples": [
        "What do I do {timeOfDay}",
        "What's my {timeOfDay} routine",
        "What happens {timeOfDay}"
      ],
      "slots": [
        {
          "name": "timeOfDay",
          "type": "AMAZON.TimeOfDay",
          "samples": ["this morning", "today", "now"]
        }
      ]
    },
    {
      "name": "GetMedicationIntent",
      "samples": [
        "What do I take {meal}",
        "Do I need medication",
        "What medication is next"
      ],
      "slots": [
        {
          "name": "meal",
          "type": "MealType",
          "values": ["after breakfast", "after lunch", "after dinner", "at bedtime"]
        }
      ]
    },
    {
      "name": "WhoIsIntent",
      "samples": [
        "Who is {person}",
        "Tell me about {person}",
        "What is {person} to me"
      ],
      "slots": [
        {
          "name": "person",
          "type": "AMAZON.Person"
        }
      ]
    },
    {
      "name": "NextStepIntent",
      "samples": [
        "What do I do next",
        "What's the next step",
        "What comes after {task}"
      ],
      "slots": [
        {
          "name": "task",
          "type": "AMAZON.SearchQuery"
        }
      ]
    },
    {
      "name": "AMAZON.HelpIntent"
    },
    {
      "name": "AMAZON.StopIntent"
    },
    {
      "name": "AMAZON.CancelIntent"
    }
  ]
}
```

### 4.3 Lambda Handler Contract

**Request Format (from Alexa):**
```json
{
  "version": "1.0",
  "session": {
    "new": false,
    "sessionId": "amzn1.echo-api.session.XXX",
    "application": {
      "applicationId": "amzn1.ask.skill.XXX"
    },
    "user": {
      "userId": "amzn1.ask.account.XXX"
    }
  },
  "context": {
    "System": {
      "user": {
        "userId": "amzn1.ask.account.XXX"
      }
    }
  },
  "request": {
    "type": "IntentRequest",
    "requestId": "amzn1.echo-api.request.XXX",
    "timestamp": "2026-02-06T18:30:00Z",
    "intent": {
      "name": "WhoIsIntent",
      "slots": {
        "person": {
          "name": "person",
          "value": "Sarah"
        }
      }
    }
  }
}
```

**Response Format (to Alexa):**
```json
{
  "version": "1.0",
  "response": {
    "outputSpeech": {
      "type": "SSML",
      "ssml": "<speak>Sarah is your daughter. She visits on Tuesdays.</speak>"
    },
    "reprompt": {
      "outputSpeech": {
        "type": "PlainText",
        "text": "Anything else you want help with?"
      }
    },
    "shouldEndSession": false
  },
  "sessionAttributes": {
    "lastIntent": "WhoIsIntent",
    "escalationLevel": 0
  }
}
```

---

## 5. Technical Specifications

### 5.1 Nova Configuration

**Nova Sonic (Speech-to-Speech):**
- Model: `amazon.nova-sonic-v1:0`
- Endpointing Sensitivity: `LOW` (2-second pause tolerance)
- Max Session Duration: 8 minutes
- Context Window: 300K tokens
- Voice: Calm, reassuring tone

**Nova Lite (Agentic):**
- Model: `amazon.nova-micro-v1:0` (cost-effective for demo)
- Temperature: 0.4 (consistent, predictable)
- Max Tokens: 160 (short responses)
- System Prompt:
```
You are a calm, dementia-friendly voice assistant.
Use short sentences. Be reassuring. Do not argue.
If unsure, ask one gentle clarifying question.
Do not give medical advice. Encourage contacting caregiver.
```

### 5.2 Performance Requirements

| Metric | Target | Measurement |
|--------|--------|-------------|
| Response Latency | < 2 seconds | Speech end to Buddy response |
| Uptime | 99.5% | Lambda + DynamoDB SLA |
| Accuracy | > 90% | Manual evaluation of routine/person retrieval |
| SMS Delivery | < 30 seconds | Safety alert to caregiver receipt |

### 5.3 Security Requirements

- **Encryption**: DynamoDB SSE (AES-256), TLS 1.2+ for all APIs
- **Authentication**: JWT tokens, 1-hour expiry
- **Authorization**: Caregivers can only access their patients
- **Data Minimization**: No audio stored, only text transcripts
- **Retention**: 90-day auto-deletion via DynamoDB TTL
- **HIPAA**: Demo scope (not HIPAA-compliant). Production path: AWS HIPAA-eligible services

### 5.4 Error Handling

**Categories:**
1. **User Errors**: Misunderstood speech → Clarifying question
2. **Data Errors**: Missing patient data → Fallback response
3. **System Errors**: AWS failures → Graceful degradation
4. **Safety Errors**: Escalation failure → Immediate Level 2

**Fallback Responses:**
```
"I didn't understand. Can you say that again?"
"I'm having trouble. Let's try a different question."
"I'm calling your caregiver to help us."
```

---

## 6. Implementation Phases

### Phase 1: Core Infrastructure ✅ COMPLETE
- [x] DynamoDB tables deployed
- [x] IAM roles created
- [x] Seed data inserted
- [x] Deployment automation

**Deliverables:**
- CloudFormation templates
- Deployment scripts
- Test credentials

### Phase 2: Agentic Workflow (Feb 13-19)
- [ ] Alexa Custom Skill setup
- [ ] Nova Lite agent integration
- [ ] Tool definitions for DynamoDB queries
- [ ] Safety classification logic
- [ ] SNS SMS integration
- [ ] Level 1 alerts functional

**Deliverables:**
- Lambda function (Alexa handler)
- Intent schema JSON
- Safety escalation module
- SMS notification system

### Phase 3: Refinement (Feb 20-26)
- [ ] Nova Sonic speech-to-speech integration
- [ ] Alexa Emergency Assist integration (Level 2)
- [ ] Conversation history logging
- [ ] Repetition detection
- [ ] CloudWatch monitoring
- [ ] Prompt tuning for dementia-friendly responses

**Deliverables:**
- Full escalation pathway
- Analytics dashboard
- Polished conversation flows

### Phase 4: Polish & Documentation (Feb 27-Mar 5)
- [ ] Caregiver web dashboard UI
- [ ] FastAPI backend implementation
- [ ] Edge case handling
- [ ] Documentation: README, deployment guide
- [ ] Architecture diagrams

**Deliverables:**
- Web dashboard
- Complete API implementation
- Documentation

### Phase 5: Demo & Submission (Mar 6-16)
- [ ] Script 3 demo scenarios
- [ ] Record demo video (3 minutes)
- [ ] Video editing with #AmazonNova
- [ ] Devpost submission
- [ ] Optional: Blog post

**Deliverables:**
- 3-minute demo video
- Devpost submission
- Test credentials for judges

---

## 7. Success Metrics

### Technical Performance
- [ ] Latency < 2 seconds (speech to response)
- [ ] 99.5% uptime
- [ ] > 90% accuracy in routine/person retrieval
- [ ] < 10% false alarm rate (Level 1)

### Hackathon Judging (60% Technical)
- [ ] Bidirectional streaming with Nova Sonic
- [ ] Multi-agent architecture (Sonic + Lite)
- [ ] Real-time safety detection
- [ ] Working demo with test credentials

### Impact (20%)
- [ ] Addresses 55M dementia patients globally
- [ ] Reduces caregiver burnout
- [ ] 24/7 accessibility

### Innovation (20%)
- [ ] First dementia assistant with Sonic barge-in
- [ ] 3-level escalation with caregiver control
- [ ] Privacy-first design (no audio storage)

---

## 8. Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| False emergency escalation | Caregiver alarm fatigue | Require 2 consecutive Level 2 triggers OR explicit phrase |
| Missed true emergency | Patient harm | Fail-safe: escalate on ambiguity, keep patient engaged |
| Nova model latency | Slow responses | Use micro model, cache patient data, optimize DynamoDB queries |
| Wi-Fi outage | No assistance | Alexa displays error: "Call your caregiver at [number]" |
| Wrong medication info | Patient takes wrong dose | Always include disclaimer, never suggest changes |
| Privacy breach | HIPAA violation | Encryption, least-privilege IAM, no PHI in logs |
| Voice recognition failure | Misunderstood commands | Clarifying questions, graceful error handling |

---

## 9. Acceptance Criteria

### Functional Requirements

**FR-001**: Patient can ask "What do I do this morning?" and receive correct routine steps
- **Test**: Ask intent with "morning" slot → Verify response includes correct steps
- **Pass**: Response includes steps from patient's morning routine

**FR-002**: Patient can ask "Who is Sarah?" and receive consistent answer
- **Test**: Ask same question 3 times → Verify identical answers
- **Pass**: All 3 responses match exactly

**FR-003**: System detects repetition and escalates after 4th occurrence
- **Test**: Ask "Who is Sarah?" 4 times within 2 hours
- **Pass**: Caregiver receives SMS after 4th query

**FR-004**: System detects emergency keywords and escalates immediately
- **Test**: Say "I fell" → Verify Level 2 response
- **Pass**: URGENT SMS sent, Alexa Emergency Assist invoked

**FR-005**: Caregiver can view conversation logs via dashboard
- **Test**: Login → Navigate to patient → View logs
- **Pass**: Logs display with timestamps, escalation levels, repeat counts

**FR-006**: System advises confirming medications with caregiver
- **Test**: Ask "What do I take after breakfast?"
- **Pass**: Response includes disclaimer

### Non-Functional Requirements

**NFR-001**: Response latency < 2 seconds
**NFR-002**: 90-day automatic log deletion
**NFR-003**: JWT token authentication required for all API calls
**NFR-004**: Caregivers can only access their assigned patients
**NFR-005**: System continues functioning during AWS partial outages

---

## 10. Appendix

### A. Test Scenarios

| Scenario | Voice Command | Expected Behavior |
|----------|--------------|-------------------|
| Routine query | "What do I do this morning?" | Lists morning steps |
| Memory prompt | "Who is Sarah?" | Describes daughter relationship |
| Medication | "What do I take after breakfast?" | Names Donepezil + disclaimer |
| Repetition | Ask "Who is Sarah?" 4 times | Consistent answer + SMS on 4th |
| Level 1 concern | "I'm scared. Where am I?" | Calming response + caregiver alert |
| Level 2 emergency | "I fell down" | Immediate escalation + emergency assist |

### B. Demo Script (3 Minutes)

**Opening (0:00-0:20)**
- Introduce Buddy and problem statement
- "55 million people globally affected by dementia"

**Demo 1: Routine Guidance (0:20-1:00)**
- Patient: "What do I do this morning?"
- Show: Nova Sonic handling interruptions, DynamoDB retrieval
- Highlight: Short sentences, calming tone

**Demo 2: Memory Prompt (1:00-1:30)**
- Patient asks "Who is Sarah?" twice
- Show: Consistent answers, repetition tracking
- Highlight: Trust-building through consistency

**Demo 3: Safety Escalation (1:30-2:20)**
- Patient: "I think I fell"
- Show: Level 2 trigger, parallel alerts, caregiver SMS
- Highlight: Emergency pathway without delay

**Caregiver Dashboard (2:20-2:45)**
- Show: Log viewing, escalation filtering
- Highlight: Privacy-first, 90-day deletion

**Closing (2:45-3:00)**
- Value proposition summary
- Call to action

### C. References

- [1] Amazon Nova AI Hackathon Rules
- [2] AWS Nova Sonic Documentation
- [4] Judging Criteria
- [18] Nova Sonic Introduction
- [25] I-CONECT Clinical Trial Protocols
- [32] Alexa Emergency Assist

---

**Document Control:**
- Version: 1.0
- Last Updated: 2026-02-06
- Author: Anthony Lopez
- Status: Phase 1 Complete, Phase 2 In Progress
