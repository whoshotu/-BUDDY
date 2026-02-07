# Buddy - Voice-First Dementia Care Assistant

AI-powered voice assistant for dementia patients, built for the Amazon Nova AI Hackathon 2026.

## 🎯 MVP Scope

- **Alexa Custom Skill** - Patient voice interface with Amazon Nova 2 Sonic
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
- Python 3.9+
- AWS Account with Nova access

### Phase 1: Deploy Infrastructure

```bash
# Deploy DynamoDB tables and seed data
./deploy.sh --environment dev --region us-east-1
```

This creates:
- `BuddyCaregivers-dev` - Login credentials
- `BuddyPatients-dev` - Patient profiles, routines, medications
- `BuddyConversationLogs-dev` - Conversation history (90-day TTL)

**Test Credentials:**
- Username: `caregiver_test`
- Password: `Demo2026!`
- Patient: John Doe

### Phase 2: Alexa Skill (Coming Soon)

### Phase 3: Caregiver API (Coming Soon)

## 📁 Project Structure

```
buddy/
├── infrastructure/     # CloudFormation, seed data
├── src/
│   ├── alexa-skill/   # Lambda function for Alexa
│   └── caregiver-api/ # FastAPI backend
├── tests/             # Test suites
└── docs/              # Documentation
```

## 🔒 Security

- DynamoDB encryption at rest (SSE)
- JWT authentication
- 90-day auto-deletion of conversation logs (TTL)
- No audio recordings stored (text transcripts only)

## 📅 Timeline

- **Phase 1** (Feb 6-12): Core Infrastructure ✅
- **Phase 2** (Feb 13-19): Agentic Workflow
- **Phase 3** (Feb 20-26): Refinement
- **Phase 4** (Feb 27-Mar 5): Polish & Documentation
- **Phase 5** (Mar 6-16): Demo & Submission

## 📝 License

MIT License - Hackathon Project
