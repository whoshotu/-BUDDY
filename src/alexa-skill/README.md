# Buddy - Alexa Skill

Voice-first AI assistant for dementia patients, integrated with Amazon Nova.

## Overview

This Lambda function handles Alexa voice interactions for Buddy, connecting patient queries to:
- DynamoDB patient knowledge base
- Amazon Nova for intelligent responses  
- SNS for caregiver safety alerts
- Safety escalation system

## Architecture

```
Alexa Request
    │
    ▼
AWS Lambda (this code)
    │
    ├─► DynamoDB (patient data, conversation logs)
    ├─► Amazon Nova (response generation)
    └─► SNS (caregiver alerts)
    │
    ▼
Alexa Response (speech)
```

## Files

| File | Purpose |
|------|---------|
| `index.js` | Main Lambda handler with all intent logic |
| `skill.json` | Skill manifest for Alexa Developer Console |
| `models/en-US.json` | Interaction model (intents, slots, utterances) |
| `package.json` | Node.js dependencies |

## Intents

### Core Intents

**GetRoutineIntent**
- "What do I do this morning?"
- "What's my afternoon routine?"
- Returns: Step-by-step routine with context

**WhoIsIntent**
- "Who is Sarah?"
- "Tell me about my daughter"
- Returns: Relationship, visit schedule, shared activities
- Tracks repetition for safety

**GetMedicationIntent**
- "What do I take after breakfast?"
- "Do I need medication now?"
- Returns: Medication name + appearance + disclaimer

**NextStepIntent**
- "What do I do next?"
- "What comes after brushing teeth?"
- Returns: Next step in current routine

### System Intents

- **LaunchRequest**: "Alexa, open Buddy Assistant"
- **HelpIntent**: "Help" or "What can I say?"
- **StopIntent**: "Stop" or "Goodbye"

## Safety Features

### 3-Level Escalation

**Level 0 - Normal**
- Routine queries
- Standard logging
- No alerts

**Level 1 - Concerning**
- Triggers: Repetition (4x in 2hrs), keywords ("scared", "confused")
- Action: Ask permission, then SMS caregiver
- Response: Calming techniques, redirection

**Level 2 - Emergency**
- Triggers: "I fell", "chest pain", "bleeding"
- Action: Immediate SMS + Alexa Emergency Assist
- Response: "Help is coming, stay with me"

### Implementation

```javascript
// Classification happens in classifySafetyLevel()
const level = await classifySafetyLevel(utterance, patientContext, repeatCount);

if (level === 2) {
  await sendCaregiverAlert({ escalationLevel: 2 });
  // Immediate response
} else if (level === 1) {
  // Ask permission first
}
```

## DynamoDB Integration

### Tables Used

- **BuddyCaregivers**: Authentication, phone numbers for SMS
- **BuddyPatients**: Patient profiles, routines, medications, people
- **BuddyAssignments**: Links caregivers to patients
- **BuddyConversationLogs**: All interactions with TTL (90 days)

### Key Functions

```javascript
// Get patient context from Alexa userId
const patientContext = await getPatientContext(alexaUserId);

// Check for repetition
const repeatCount = await checkRepetition(patientId, utterance);

// Log conversation with safety metadata
await logConversation({ patientId, utterance, response, escalationLevel });
```

## Amazon Nova Integration

### Model
- **Current**: `amazon.nova-micro-v1:0` (cost-effective)
- **Upgrade path**: `amazon.nova-pro-v1:0` for better quality

### Prompt Engineering

```javascript
const systemPrompt = [
  "You are a calm, dementia-friendly voice assistant named Buddy.",
  "Use short sentences (10-15 words max). Be reassuring.",
  "Never shame or infantilize. Always empower.",
  "For repeated questions, give the EXACT same answer."
].join(' ');
```

### Response Format
- Max tokens: 160
- Temperature: 0.4 (consistent)
- 1-2 short sentences max

## Environment Variables

Required in Lambda configuration:

```bash
CAREGIVERS_TABLE=BuddyCaregivers-dev
PATIENTS_TABLE=BuddyPatients-dev
ASSIGNMENTS_TABLE=BuddyAssignments-dev
LOGS_TABLE=BuddyConversationLogs-dev
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:XXX:buddy-alerts-dev
NOVA_MODEL=amazon.nova-micro-v1:0
NODE_ENV=dev
```

## Deployment

```bash
# From project root
./deploy-lambda.sh --environment dev --region us-east-1
```

This will:
1. Install Node.js dependencies
2. Package code into lambda.zip
3. Create/update Lambda function
4. Add Alexa Skills Kit trigger
5. Save function ARN to .env

## Local Testing

### Prerequisites
```bash
npm install
```

### Test Events

Create `test-event.json`:

```json
{
  "version": "1.0",
  "session": {
    "new": true,
    "sessionId": "test-session-001",
    "application": {
      "applicationId": "test-app-id"
    },
    "user": {
      "userId": "test-user-id"
    }
  },
  "context": {
    "System": {
      "user": {
        "userId": "test-user-id"
      }
    }
  },
  "request": {
    "type": "IntentRequest",
    "requestId": "test-request-001",
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

Run locally:
```bash
node -e "
const handler = require('./index.js').handler;
const event = require('./test-event.json');
handler(event, {}, (err, result) => {
  console.log('Result:', JSON.stringify(result, null, 2));
});
"
```

## Alexa Developer Console Setup

1. Go to https://developer.amazon.com/alexa/console/ask
2. Create new skill
3. Name: "Buddy - Dementia Care Assistant"
4. Custom model, English (US)
5. Replace interaction model with `models/en-US.json`
6. Set endpoint to Lambda ARN from deployment
7. Save and build

## Testing Commands

```bash
# Routine query
"What do I do this morning?"

# Memory prompt
"Who is Sarah?"

# Medication
"What do I take after breakfast?"

# Safety test (Level 1)
"I'm scared" (4 times in 2 hours)

# Safety test (Level 2)
"I fell down"
```

## Monitoring

### CloudWatch Logs
```bash
aws logs tail /aws/lambda/buddy-alexa-skill-dev --follow
```

### Key Metrics
- Response latency: < 2 seconds
- Error rate: < 1%
- Safety escalation accuracy

## Troubleshooting

### Lambda Timeout
- Increase timeout in deploy script (default: 30s)
- Check Nova API latency

### DynamoDB Not Found
- Ensure tables are deployed: `./deploy.sh`
- Check environment variables

### Nova Model Access Denied
- Request access: https://console.aws.amazon.com/bedrock/home#/modelaccess
- Verify IAM permissions

### SMS Not Sending
- Verify SNS topic ARN
- Check caregiver phone number format (+1XXXXXXXXXX)
- Confirm IAM permissions for SNS:Publish

## Future Enhancements

- [ ] Nova Sonic speech-to-speech upgrade
- [ ] Proactive routine reminders
- [ ] Multi-language support
- [ ] Caregiver voice notes
- [ ] Integration with wearable devices

## License

MIT License - Amazon Nova Hackathon 2026
