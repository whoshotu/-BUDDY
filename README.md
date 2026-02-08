# Buddy - Voice-First Dementia Care Assistant

AI-powered voice assistant for dementia patients, built for the Amazon Nova AI Hackathon 2026.

## 🎯 MVP Scope

- **Alexa Custom Skill** - Patient voice interface with Amazon Nova
- **Caregiver Dashboard** - Web interface for managing patient knowledge base
- **3-Level Safety Escalation** - Smart alerts via Amazon SNS SMS
- **Core Use Cases**: Routine guidance, family recognition, medication reminders

## 🏗️ Architecture

```
Patient Device (Alexa)
↓
AWS Lambda (Alexa Skill Handler)
↓ (bidirectional streaming)
Amazon Bedrock Nova 2 Sonic (speech-to-speech)
↓ (tool calls)
Nova 2 Lite Agentic Workflow
↓
┌─────────────┬─────────────┬─────────────┐
│  DynamoDB   │  RAG Query  │ Safety Gate │
│(Knowledge   │ (Patient    │(Escalation  │
│   Base)     │  Context)   │   Logic)    │
└─────────────┴─────────────┴─────────────┘
↓
Caregiver Alert (SMS/SNS) or Emergency Assist
```

## 🚀 Quick Start

### Prerequisites

- AWS CLI configured (`aws configure`)
- AWS Account with Nova access
- Node.js 18+ (for Lambda deployment)
- Python 3.9+ (for infrastructure scripts)

### Phase 1: Deploy Infrastructure

```bash
# Deploy DynamoDB tables and seed data
./deploy.sh --environment dev --region us-east-1
```

This creates:
- `BuddyCaregivers-dev` - Login credentials and notification preferences
- `BuddyPatients-dev` - Patient profiles, routines, medications, people
- `BuddyAssignments-dev` - Caregiver-patient relationship mapping
- `BuddyConversationLogs-dev` - Conversation history (90-day TTL)

**Test Credentials:**
- Username: `caregiver_test`
- Password: `Demo2026!`
- Patient: John Doe

### Phase 2: Deploy Alexa Skill

#### 1. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your AWS values
nano .env
```

#### 2. Deploy Lambda Function

```bash
# Deploy the Alexa skill Lambda
./deploy-lambda.sh --environment dev --region us-east-1
```

This creates:
- Lambda function `buddy-alexa-skill-dev`
- Alexa Skills Kit trigger configured
- Environment variables for DynamoDB tables

**Save the Lambda ARN** - you'll need it for the Alexa Developer Console.

#### 3. Configure Alexa Developer Console

1. Go to [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Click **"Create Skill"**
3. **Skill Name**: "Buddy - Dementia Care Assistant"
4. **Choose a model**: Custom
5. **Choose a method**: Provision your own
6. Click **"Create Skill"**

7. **Interaction Model**:
   - Click on **"JSON Editor"** (left sidebar)
   - Delete the default content
   - Copy the contents of `src/alexa-skill/models/en-US.json` and paste it in
   - Click **"Save Model"** then **"Build Model"**

8. **Endpoint Configuration**:
   - Go to **"Endpoint"** (left sidebar)
   - Select **"AWS Lambda ARN"**
   - Paste your Lambda ARN from deployment
   - Click **"Save Endpoints"**

9. **Account Linking** (Optional):
   - Go to **"Account Linking"** (left sidebar)
   - Configure if you want user authentication

10. **Test**:
    - Go to **"Test"** tab
    - Enable testing for your skill
    - Test: "Alexa, open Buddy Assistant"

#### 4. Test Your Skill

```bash
# Test commands
"What do I do this morning?"
"Who is Sarah?"
"What do I take after breakfast?"

# Safety tests
"I'm scared" (repeat 4 times for Level 1 alert)
"I fell down" (immediate Level 2 alert)
```

### Phase 3: Refinement & Monitoring (Optional)

```bash
# Deploy Nova Sonic WebSocket API for advanced speech-to-speech
./scripts/deploy-websocket.sh --environment dev --region us-east-1

# Deploy CloudWatch monitoring dashboard
./scripts/deploy-monitoring.sh --environment dev --region us-east-1
```

**Nova Sonic Features:**
- Bidirectional streaming with barge-in support
- Natural turn-taking and adaptive speech
- WebSocket API for real-time conversations
- Hybrid mode (traditional skill + Nova Sonic)

**Emergency Assist Features:**
- Level 2 emergency protocol with location sharing
- 30-minute emergency session persistence
- Dual notification system (SNS + SMS)
- Real-time caregiver updates

See [Nova Sonic README](src/nova-sonic-websocket/README.md) and [Emergency Documentation](docs/EMERGENCY.md) for details.

### Phase 4: Caregiver Dashboard

```bash
# Start the React dashboard
cd src/caregiver-dashboard
npm install
npm run dev

# Open http://localhost:3000
```

**Dashboard Features:**
- Patient profile overview
- Real-time conversation monitoring
- Safety alert management
- Emergency contact information

### Phase 5: Testing Without Alexa Device

```bash
# Test Lambda function directly
cd test
./test-lambda.sh

# This simulates Alexa requests and tests emergency flow
```

See [Testing Guide](docs/BETA_TESTING.md) for comprehensive test scenarios.

## 📁 Project Structure

```
buddy/
├── docs/                          # Documentation
│   ├── README.md                 # Documentation index
│   ├── EXECUTIVE_SUMMARY.md      # Project overview
│   ├── ARCHITECTURE.md           # System design
│   ├── API.md                    # API reference
│   ├── DEMO_SCRIPT.md           # Demo guide
│   ├── PRD.md                    # Product requirements
│   ├── SETUP.md                  # Installation guide
│   ├── DEPLOYMENT.md            # Deployment strategies
│   ├── EMERGENCY.md             # Emergency features
│   ├── BETA_TESTING.md          # Testing procedures
│   └── DYNAMODB_OPTIMIZATION.md # Performance guide
│
├── infrastructure/               # CloudFormation templates
│   ├── dynamodb.yaml            # DynamoDB tables
│   ├── websocket-api.yaml       # WebSocket API
│   ├── monitoring.yaml          # CloudWatch dashboards
│   └── seed_data.py             # Test data
│
├── src/
│   ├── alexa-skill/             # Lambda function
│   │   ├── index.js
│   │   ├── skill.json
│   │   ├── models/
│   │   ├── package.json
│   │   └── tests/               # Unit tests
│   │
│   ├── caregiver-dashboard/     # React web interface
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── nova-sonic-websocket/    # Advanced speech-to-speech
│       ├── index.js
│       ├── test-client.html
│       └── README.md
│
├── scripts/                      # Deployment scripts
│   ├── deploy.sh
│   ├── deploy-iam.sh
│   ├── deploy-lambda.sh
│   ├── deploy-websocket.sh
│   ├── deploy-monitoring.sh
│   └── verify.sh
│
├── test/                         # Test suite
│   ├── test-lambda.sh
│   └── test-lambda.js
│
├── demo/                         # Demo materials
└── README.md                     # Main project README
```

## 🔧 Environment Configuration

Copy `.env.example` to `.env` and configure:

```bash
# Required variables (auto-populated by deployment scripts)
AWS_REGION=us-east-1
ENVIRONMENT=dev
ROLE_ARN=arn:aws:iam::YOUR_ACCOUNT_ID:role/buddy-lambda-role
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:YOUR_ACCOUNT_ID:buddy-alerts-dev
LAMBDA_ARN=arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:buddy-alexa-skill-dev

# DynamoDB tables (auto-populated)
CAREGIVERS_TABLE=BuddyCaregivers-dev
PATIENTS_TABLE=BuddyPatients-dev
ASSIGNMENTS_TABLE=BuddyAssignments-dev
LOGS_TABLE=BuddyConversationLogs-dev
```

## 🧪 Testing

### Local Testing

```bash
# Navigate to skill directory
cd src/alexa-skill

# Install dependencies
npm install

# Create test event
cat > test-event.json << 'EOF'
{
  "version": "1.0",
  "session": {
    "new": true,
    "sessionId": "test-session-001",
    "application": { "applicationId": "test-app-id" },
    "user": { "userId": "amzn1.ask.account.test" }
  },
  "context": {
    "System": { "user": { "userId": "amzn1.ask.account.test" } }
  },
  "request": {
    "type": "IntentRequest",
    "intent": {
      "name": "WhoIsIntent",
      "slots": { "person": { "name": "person", "value": "Sarah" } }
    }
  }
}
EOF

# Run test
node -e "
const handler = require('./index.js').handler;
const event = require('./test-event.json');
handler(event, {}, (err, result) => {
  console.log('Result:', JSON.stringify(result, null, 2));
});
"
```

### CloudWatch Monitoring

```bash
# View Lambda logs
aws logs tail /aws/lambda/buddy-alexa-skill-dev --follow

# Check invocation metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=buddy-alexa-skill-dev \
  --start-time $(date -u -v-1H +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 60 \
  --statistics Sum
```

## 🔒 Security

- **Encryption**: DynamoDB SSE (AES-256) at rest, TLS 1.2+ in transit
- **Authentication**: JWT tokens (1-hour expiry) for caregiver API
- **Authorization**: Caregivers can only access their assigned patients
- **Data Minimization**: No audio stored, only text transcripts
- **Retention**: 90-day auto-deletion of conversation logs (DynamoDB TTL)
- **IAM**: Least-privilege access with table-specific permissions

## 📅 Project Timeline

- **Phase 1** (Feb 6-12): Core Infrastructure ✅
  - DynamoDB tables deployed
  - IAM roles created
  - Seed data inserted
  
- **Phase 2** (Feb 13-19): Alexa Skill Implementation ✅
  - Lambda function with Nova integration
  - Safety escalation system
  - SNS SMS alerts
  - Intent handlers for routines, medications, family
  
- **Phase 3** (Feb 20-26): Refinement ✅
  - Nova Sonic speech-to-speech integration with WebSocket API
  - Enhanced Emergency Assist with location sharing and 30-min session
  - CloudWatch monitoring dashboard and alarms
  - Conversation logging and analytics
  
- **Phase 4** (Feb 27-Mar 5): Caregiver Dashboard 🔄
  - React dashboard with patient monitoring
  - Web UI implementation
  - API documentation
  - Edge case handling
  
- **Phase 5** (Mar 6-16): Demo & Submission ⏳
  - Demo video production
  - Devpost submission
  - Documentation polish
  - Test credentials for judges

## 📚 Documentation

- [Product Requirements Document](docs/PRD.md) - Full feature specification
- [Database Schema](docs/SCHEMA.md) - DynamoDB design and access patterns
- [Alexa Skill README](src/alexa-skill/README.md) - Skill-specific documentation

## 🤝 Contributing

This is a hackathon project. For issues or improvements, please:
1. Check existing issues first
2. Create a new issue with detailed description
3. Submit pull requests with clear commit messages

## 📝 License

MIT License - Amazon Nova AI Hackathon 2026

---

**Status**: Phase 4 In Progress - Caregiver Dashboard & Documentation
