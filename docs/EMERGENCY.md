# Buddy - Emergency Assist Integration

This document details the Level 2 emergency escalation system integrated with Buddy.

## Overview

Buddy implements a comprehensive 3-level safety escalation system:

- **Level 0**: Normal conversation (routine queries, memory prompts)
- **Level 1**: Concerning behavior (repetition, confusion, anxiety) - Alerts caregiver
- **Level 2**: Emergency (falls, injuries, danger) - Immediate action required

## Level 2 Emergency Protocol

### Triggers

Emergency escalation is triggered by keywords detected in patient speech:

```javascript
const LEVEL_2_KEYWORDS = [
  'fell', 'falling', 'bleeding', 'blood',
  'chest pain', 'heart', "can't breathe", 'breathing',
  'fire', 'smoke', 'gas smell', 'burning',
  'hurt', 'pain', 'injured', 'broken',
  'someone in house', 'intruder', 'robber',
  'emergency', 'help me', '911'
];
```

### Emergency Flow

```
Patient says: "I fell"
         ↓
[Keyword Detection]
         ↓
[Immediate Actions - NO PERMISSION REQUIRED]
    ├─→ Send URGENT SMS to caregiver with:
    │   - Patient statement
    │   - Device location (if available)
    │   - Medical conditions/allergies
    │   - Emergency contacts
    │
    ├─→ Store emergency context in session
    │
    └─→ Alexa response: "I'm contacting emergency services...
                        Stay with me. Help is coming."
         ↓
[Emergency Mode Activated - 30 minutes]
    ├─→ Keep patient engaged
    ├─→ Gather information (location, injuries)
    ├─→ Send real-time updates to caregiver
    └─→ Monitor for escalation/de-escalation
         ↓
[Caregiver Response Options]
    ├─→ Reply 1: "I'm responding"
    ├─→ Reply 2: "Called 911"
    └─→ Call patient directly
```

## SMS Alert Format

### Level 2 - Emergency Alert

```
🚨 URGENT: Buddy Emergency Alert

EMERGENCY: John triggered a Level 2 alert.

Statement: "I fell down"
Time: 2/7/2026, 3:45:23 PM
Location: 123 Main St, Boston, MA 02101

Patient Info:
- Medical Conditions: Alzheimer's, hypertension
- Allergies: penicillin
- Emergency Contacts: Sarah, Neighbor Tom

ACTION REQUIRED:
1. Call John immediately
2. If no response, call 911
3. Check camera/doorbell if available

Reply 1 if you're responding
Reply 2 if you've called 911
```

### Level 1 - Concerning Alert

```
Buddy Alert - Concerning Behavior

Buddy Alert: John

Statement: "Where am I?"
Frequency: 4+ times in 2 hours
Time: 2/7/2026, 2:30:15 PM

This may indicate:
- Confusion or disorientation
- Anxiety or distress
- Change in condition

Suggested Actions:
- Check in with John soon
- Review their daily routine
- Consider a wellness visit
```

## Implementation Details

### Emergency Session Management

When Level 2 is triggered:

```javascript
handlerInput.attributesManager.setSessionAttributes({
  emergencyMode: true,
  emergencyStartTime: Date.now(),
  lastUtterance: utterance,
  patientName: patientContext.patient.preferredName
});
```

The skill stays in emergency mode for **30 minutes**:
- All interactions handled by `EmergencyIntentHandler`
- Patient is kept engaged and calm
- Real-time updates sent to caregiver
- Session automatically clears after timeout

### Location Services

The skill requests device address permissions to include location in emergency alerts:

```json
{
  "permissions": [
    {
      "name": "alexa::devices:all:address:full:read"
    },
    {
      "name": "alexa::devices:all:address:country_and_postal_code:read"
    }
  ]
}
```

**Privacy Note**: Location is only accessed during Level 2 emergencies.

### Dual Notification System

1. **SNS Topic Alert**: Detailed message with full context
2. **Direct SMS**: Immediate notification to caregiver's phone

```javascript
// Send to SNS Topic (detailed)
await snsClient.send(new PublishCommand({
  TopicArn: CONFIG.SNS_TOPIC,
  Message: detailedMessage,
  Subject: '🚨 URGENT: Buddy Emergency Alert'
}));

// Send direct SMS (immediate)
await snsClient.send(new PublishCommand({
  PhoneNumber: caregiverPhone,
  Message: `🚨 URGENT: ${patientName} needs help immediately.`,
  Subject: 'Emergency Alert'
}));
```

## Alexa Emergency Assist Integration

**Note**: True Alexa Emergency Assist integration requires:
- Special Amazon approval
- Compliance with emergency service regulations
- Certification process

For the hackathon/demo, Buddy implements:
1. Immediate caregiver notification
2. Location sharing
3. Session persistence for emergency monitoring
4. Documentation for future Emergency Assist integration

### Future Integration Path

When ready to integrate with Alexa Emergency Assist:

```javascript
// In emergency handler, add:
const emergencyRequest = {
  type: 'Emergency.Assist',
  patientName: patientContext.patient.preferredName,
  location: deviceAddress,
  nature: utterance,
  medicalConditions: patientContext.patient.safetyProfile?.medicalConditions
};

// Call Alexa Emergency Assist API
// Note: Requires special permissions and approval
```

## Testing Emergency Scenarios

### Test Level 2 Emergency

```bash
# Test utterance
"I fell down"
"My chest hurts"
"I can't breathe"
"There's a fire"

# Expected:
# - Immediate SMS to caregiver
# - Location included if permission granted
# - Skill enters emergency mode
# - Patient kept engaged for 30 minutes
```

### Test Level 1 Concerning

```bash
# Test repetition (say 4 times in 2 hours)
"Who is Sarah?"
"Who is Sarah?"
"Who is Sarah?"
"Who is Sarah?"

# Expected:
# - Alert sent on 4th occurrence
# - Suggestion to check on patient
```

### Test Emergency Mode

```bash
# After triggering emergency
"Where am I?"
"I'm scared"
"It hurts"

# Expected:
# - Responses appropriate to emergency context
# - Updates sent to caregiver
# - Calming, reassuring tone
```

## Monitoring and Metrics

### CloudWatch Alarms

Set up alarms for:
- Level 2 escalation rate (alert if > 1 per day)
- SMS delivery failures
- Emergency session duration
- False positive rate

```bash
# View emergency escalations
aws logs filter-log-events \
  --log-group-name /aws/lambda/buddy-alexa-skill-dev \
  --filter-pattern "EMERGENCY ESCALATION"
```

### Safety Metrics

Track:
- **Response Time**: Speech to SMS delivery
- **Detection Accuracy**: True emergencies vs false positives
- **Caregiver Response Rate**: How often caregivers respond to alerts
- **Session Engagement**: Patient interaction during emergency mode

## Best Practices

### 1. Caregiver Onboarding

When setting up Buddy:
- Collect emergency contact information
- Verify SMS delivery
- Explain alert levels
- Set quiet hours (optional)

### 2. False Positive Mitigation

- Keyword list refined for dementia context
- Repetition threshold prevents single-trigger alerts
- Location context helps verify legitimacy

### 3. Patient Safety

- Never delay emergency response for clarification
- Always err on side of caution
- Keep patient informed and calm
- Maintain connection until help arrives

### 4. Compliance

- HIPAA considerations for medical data in SMS
- Patient consent for monitoring
- Data retention (90-day TTL on logs)
- Emergency service regulations

## Configuration

### Environment Variables

```bash
# SNS Topic for alerts
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:xxx:buddy-alerts-dev

# Emergency keywords (comma-separated)
ESCALATION_KEYWORDS_LEVEL_2=fell,bleeding,chest pain,fire,can't breathe

# Emergency session timeout (minutes)
EMERGENCY_SESSION_TIMEOUT=30

# Repetition threshold for Level 1
REPETITION_THRESHOLD=3
```

### Skill Manifest Permissions

Update `skill.json` with:

```json
{
  "permissions": [
    {
      "name": "alexa::devices:all:address:full:read"
    },
    {
      "name": "alexa::devices:all:address:country_and_postal_code:read"
    },
    {
      "name": "alexa::devices:all:contact:read"
    }
  ]
}
```

## Troubleshooting

### SMS Not Sending

1. Check SNS topic ARN is configured
2. Verify IAM permissions for SNS:Publish
3. Check CloudWatch logs for errors
4. Test SNS topic directly:
```bash
aws sns publish \
  --topic-arn arn:aws:sns:us-east-1:xxx:buddy-alerts-dev \
  --message "Test alert"
```

### Location Not Available

1. Verify permissions in skill manifest
2. Check user granted location permission
3. Fallback to postal code only
4. Consider manual address entry in patient profile

### Emergency Mode Not Activating

1. Check keyword detection in logs
2. Verify escalation logic
3. Test with exact phrases from keyword list
4. Check session attributes persistence

## References

- [Alexa Emergency Assist Documentation](https://developer.amazon.com/en-US/docs/alexa/alexa-gadgets-toolkit/emergency-assist.html)
- [Device Address API](https://developer.amazon.com/en-US/docs/alexa/device-apis/alexa-device-address.html)
- [SNS SMS Documentation](https://docs.aws.amazon.com/sns/latest/dg/sns-sms.html)

## License

MIT License - Amazon Nova Hackathon 2026
