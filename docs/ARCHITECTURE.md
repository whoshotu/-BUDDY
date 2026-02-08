# Buddy - System Architecture

## Overview

Buddy uses a serverless architecture on AWS, leveraging Amazon Nova AI for natural language processing and Alexa for voice interaction. The system is designed for high availability, scalability, and real-time responsiveness critical for dementia care.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │Alexa Device │    │Web Browser   │    │Mobile Browser    │   │
│  │(Echo/Dot)   │    │(Dashboard)   │    │(Caregiver View)  │   │
│  └──────┬──────┘    └──────┬───────┘    └────────┬─────────┘   │
└─────────┼──────────────────┼─────────────────────┼───────────────┘
          │                  │                     │
          ▼                  │                     │
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐            ┌──────────────────────────┐    │
│  │Alexa Skills Kit │            │API Gateway WebSocket     │    │
│  │(Voice Interface)│            │(Nova Sonic S2S)          │    │
│  └────────┬────────┘            └────────────┬─────────────┘    │
└───────────┼───────────────────────────────────┼──────────────────┘
            │                                   │
            ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                     COMPUTE LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐    ┌──────────────────────────┐     │
│  │AWS Lambda              │    │AWS Lambda                │     │
│  │(Alexa Skill Handler)   │    │(Nova Sonic Handler)      │     │
│  │- Node.js 18.x          │    │- Node.js 18.x            │     │
│  │- 8s timeout            │    │- 15m timeout             │     │
│  │- 512MB memory          │    │- WebSocket support       │     │
│  └───────────┬────────────┘    └────────────┬─────────────┘     │
└──────────────┼───────────────────────────────┼───────────────────┘
               │                               │
               └───────────────┬───────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                   AI/ML LAYER (Amazon Bedrock)                   │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐    ┌──────────────────────────┐     │
│  │Amazon Nova Micro       │    │Amazon Nova Sonic         │     │
│  │(Text-based)            │    │(Speech-to-Speech)        │     │
│  │- Intent recognition    │    │- Barge-in support        │     │
│  │- Response generation   │    │- Natural turn-taking     │     │
│  │- Tool calling          │    │- Real-time streaming     │     │
│  └────────────────────────┘    └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA LAYER                                  │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │DynamoDB            │  │DynamoDB            │                │
│  │BuddyCaregivers     │  │BuddyPatients       │                │
│  │(Auth & Prefs)      │  │(Profiles & Data)   │                │
│  └────────────────────┘  └────────────────────┘                │
│  ┌────────────────────┐  ┌────────────────────┐                │
│  │DynamoDB            │  │DynamoDB            │                │
│  │BuddyAssignments    │  │BuddyConversation   │                │
│  │(Relationships)     │  │Logs (90-day TTL)   │                │
│  └────────────────────┘  └────────────────────┘                │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌────────────────────────┐    ┌──────────────────────────┐     │
│  │Amazon SNS              │    │Amazon CloudWatch         │     │
│  │- SMS to caregivers     │    │- Monitoring dashboards   │     │
│  │- Topic-based alerts    │    │- Custom metrics          │     │
│  │- Multi-level alerts    │    │- X-Ray tracing           │     │
│  └────────────────────────┘    └──────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Client Layer

**Alexa Devices**
- Echo, Echo Dot, Echo Show
- Natural voice interface
- No visual requirements (accessible)
- Works over WiFi

**Web Dashboard**
- React + TypeScript
- Tailwind CSS styling
- Real-time updates via API
- Mobile-responsive

### 2. API Gateway Layer

**Alexa Skills Kit**
- RESTful API endpoint
- JSON request/response format
- Built-in authentication
- Request validation

**WebSocket API** (Optional)
- Bidirectional streaming
- Persistent connections
- Real-time audio streaming
- Nova Sonic integration

### 3. Compute Layer

**Lambda Function 1: Alexa Skill Handler**
```yaml
Runtime: nodejs18.x
Memory: 512 MB
Timeout: 8 seconds  # Alexa service limit
Concurrency: 1000 (auto-scaling)
Tracing: AWS X-Ray
```

**Lambda Function 2: Nova Sonic Handler** (Optional)
```yaml
Runtime: nodejs18.x
Memory: 1024 MB
Timeout: 15 minutes  # WebSocket session
Concurrency: 100
Tracing: AWS X-Ray
```

### 4. AI/ML Layer

**Amazon Nova Micro**
- Text-based interactions
- Intent classification
- Tool use for data queries
- Dementia-friendly prompting

**Amazon Nova Sonic** (Optional)
- Speech-to-speech
- Natural turn-taking
- Barge-in support
- Real-time streaming

### 5. Data Layer

**DynamoDB Tables**

| Table | Purpose | Key Schema | Indexes |
|-------|---------|------------|---------|
| BuddyCaregivers | Authentication & preferences | caregiverId (PK) | username (GSI) |
| BuddyPatients | Patient profiles & data | patientId (PK) | caregiverId (GSI) |
| BuddyAssignments | Caregiver-patient links | caregiverId (PK), patientId (SK) | patientId (GSI) |
| BuddyConversationLogs | Conversation history | patientId (PK), timestamp (SK) | escalationLevel (GSI) |

**Features:**
- On-demand capacity (auto-scaling)
- Point-in-time recovery
- Encryption at rest (SSE)
- 90-day TTL on conversation logs

### 6. Notification Layer

**Amazon SNS**
- SMS to caregiver phones
- Topic-based routing
- Multi-level alert filtering
- Delivery status tracking

**Amazon CloudWatch**
- Custom dashboards
- Alarm thresholds
- X-Ray service maps
- Log aggregation

## Data Flow Examples

### Emergency Escalation Flow

```
Patient: "I fell down"
    ↓
Alexa → ASK → Lambda
    ↓
Nova Micro: Classify intent
    ↓
Safety Check: Level 2 keywords detected
    ↓
DynamoDB: Log conversation (escalationLevel: 2)
    ↓
SNS: Send emergency SMS to caregiver
    ↓
Response: "I'm contacting emergency services..."
    ↓
Session: Enter emergency mode (30 min)
```

### Routine Query Flow

```
Patient: "What do I do this morning?"
    ↓
Alexa → ASK → Lambda
    ↓
DynamoDB: Query patient routines
    ↓
Nova Micro: Generate response
    ↓
DynamoDB: Log conversation
    ↓
Response: "Time to brush your teeth..."
    ↓
Check Repetition: Increment counter
```

## Security Architecture

### Authentication & Authorization

**IAM Roles**
- Least privilege access
- Service-linked roles
- No hardcoded credentials

**Data Protection**
- TLS 1.2+ in transit
- SSE-S3 at rest
- No PHI stored (patient names only)

**Access Control**
- Caregivers see only assigned patients
- JWT tokens (1-hour expiry)
- API Gateway throttling

### Compliance Considerations

**HIPAA (Not Certified)**
- 90-day conversation log retention
- Encrypted storage
- Audit trails
- Access logging

**Data Residency**
- us-east-1 region
- No cross-region replication
- Patient data isolated by ID

## Scalability & Performance

### Auto-Scaling

**Lambda**
- Concurrency: 1000 default
- Burst: 3000 concurrent
- Provisioned concurrency (optional)

**DynamoDB**
- On-demand mode
- Auto-scaling: 0-40,000 WCU/RCU
- Adaptive capacity

**API Gateway**
- Throttling: 10,000 RPS
- Burst: 5,000 requests
- Caching (optional)

### Performance Targets

| Metric | Target | Current |
|--------|--------|---------|
| Response Time | <5s | ~2-3s |
| Cold Start | <2s | ~500ms |
| SMS Delivery | <30s | ~5-10s |
| Availability | 99.9% | 99.9% |

## Monitoring & Observability

### CloudWatch Metrics

**Custom Metrics:**
- Buddy/Safety:EmergencyEscalations
- Buddy/Safety:SafetyAlerts  
- Buddy/Usage:Conversations

**Alarms:**
- Lambda error rate > 1%
- Lambda duration > 6s
- DynamoDB throttled requests > 0

### X-Ray Tracing

**Subsegments:**
- getPatientContext
- generateNovaResponse
- sendCaregiverAlert
- logConversation

**Service Map:**
```
Alexa → Lambda → DynamoDB
      ↓
Nova Micro → SNS
```

## Deployment Architecture

### Environments

```
Development (dev)
├── All-at-once deployment
├── Auto-deploy on push
└── Test data seeded

Staging (staging)
├── Blue/green deployment
├── Manual approval
└── Production-like data

Production (prod)
├── Canary deployment
├── 10% → 50% → 100%
└── Real patient data
```

### CI/CD Pipeline

```
Git Push
    ↓
GitHub Actions
    ↓
Lint → Test → Build
    ↓
Deploy to dev
    ↓
Integration tests
    ↓
Deploy to staging
    ↓
Manual approval
    ↓
Deploy to prod (canary)
```

## Cost Estimation

### Monthly Costs (Production)

| Service | Usage | Cost |
|---------|-------|------|
| Lambda | 100K requests/day | ~$20 |
| DynamoDB | 1GB storage + ops | ~$15 |
| SNS SMS | 100 alerts/month | ~$5 |
| Nova Micro | 50K requests | ~$15 |
| CloudWatch | Logs + metrics | ~$10 |
| **Total** | | **~$65/month** |

### Free Tier Eligible

- DynamoDB: 25 GB storage
- Lambda: 1M requests
- SNS: 1K SMS (US only)

## Future Architecture

### Phase 6: Multi-Region

```
us-east-1 (Primary)
    ↓ DynamoDB Global Tables
us-west-2 (DR)
```

### Phase 7: Edge Computing

```
CloudFront → Lambda@Edge
    ↓
Regional DynamoDB
```

### Phase 8: ML Pipeline

```
S3 → SageMaker → DynamoDB
    ↓
Predictive analytics
```

## References

- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Serverless Applications Lens](https://docs.aws.amazon.com/wellarchitected/latest/serverless-applications-lens/welcome.html)
- [Amazon Nova Documentation](https://docs.aws.amazon.com/nova/)

---

**Last Updated:** February 8, 2026  
**Version:** 1.0
