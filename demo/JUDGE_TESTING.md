# Buddy - Judge Testing Guide

## Quick Access Information

**Project Repository:** https://github.com/anthonylopez15/buddy  
**Developer:** Anthony Lopez (lopezanth661@gmail.com)  
**AWS Account:** lopezdev (052080186586)  
**Region:** us-east-1  
**Environment:** dev

---

## 🎯 Three Demo Scenarios

### **Scenario 1: Emergency Escalation (Level 2)** ⭐ **START HERE**

**What It Shows:** Emergency detection and SMS alerting

**Test Command:**
```bash
cd test
./test-lambda.sh
```

**Expected Output:**
```
🧪 Testing: EMERGENCY: "I fell down"
✅ Status: 200 OK
⏱️  Duration: ~2300ms
📢 Response: "I'm contacting emergency services and your caregiver now..."
🚨 EMERGENCY MODE ACTIVATED
```

**What Happens:**
1. Lambda receives emergency intent
2. Detects Level 2 keywords ("fell down")
3. Logs to DynamoDB with escalationLevel: 2
4. Sends urgent SMS to caregiver
5. Activates 30-minute emergency session

**Verify in DynamoDB:**
```bash
aws dynamodb scan \
  --table-name BuddyConversationLogs-dev \
  --query 'Items[0].[timestamp.S,userUtterance.S,escalationLevel.N,caregiverNotified.BOOL]' \
  --output text
```

**Expected:** Recent entry with "I fell down", escalationLevel: 2, caregiverNotified: true

---

### **Scenario 2: Routine Guidance**

**What It Shows:** Personalized daily routine assistance

**Test Command:**
Same script runs automatically after emergency test

**Expected Output:**
```
🧪 Testing: ROUTINE: "What do I do this morning?"
✅ Status: 200 OK
⏱️  Duration: ~1800ms
📢 Response: "Good morning John! Time to brush your teeth and wash your face."
```

**What Happens:**
1. Lambda queries DynamoDB for John's routines
2. Finds morning routine (brushing teeth, washing face)
3. Nova AI generates dementia-friendly response
4. Response includes specific tasks
5. Conversation logged (escalationLevel: 0)

**Key Points:**
- Personalized to patient (John)
- Short, clear instructions
- Consistent responses
- No escalation triggered

---

### **Scenario 3: Caregiver Dashboard**

**What It Shows:** Real-time monitoring interface

**Setup:**
```bash
cd src/caregiver-dashboard
npm install
npm run dev
```

**Access:** http://localhost:3000

**What to Show:**

**1. Patient Overview Card**
- Patient: John Doe
- Dementia Stage: moderate
- Last Conversation: [timestamp]
- Unacknowledged Alerts: [count]

**2. Safety Profile Section**
- Emergency Contacts: Sarah (daughter), Neighbor Tom
- Medical Conditions: Alzheimer's, Hypertension, Diabetes
- Allergies: Penicillin, Shellfish
- Caregiver Phone: +15550123

**3. Recent Activity**
- Shows the emergency test you just ran
- Shows escalation level (Level 2)
- Shows caregiver notified status
- Shows conversation history

**4. Alerts Tab**
- Level 2 emergency alert
- Level 1 concerning behavior alerts
- Acknowledge button functionality
- Unacknowledged alert indicators

---

## 🔧 Infrastructure Verification

### **Check All Services Are Running**

```bash
cd scripts
./verify.sh
```

Or manually:

```bash
# DynamoDB Tables
echo "✅ Tables:"
aws dynamodb list-tables --query 'TableNames[?contains(@, `Buddy`)]'

# Lambda Function
echo "✅ Lambda:"
aws lambda get-function --function-name buddy-alexa-skill-dev --query 'Configuration.State'

# IAM Role
echo "✅ IAM Role:"
aws iam get-role --role-name buddy-lambda-role-dev --query 'Role.RoleName'

# SNS Topic
echo "✅ SNS Topic:"
aws sns list-topics --query 'Topics[*].TopicArn' | grep buddy
```

### **Expected Results:**
- All 4 DynamoDB tables present
- Lambda function: Active
- IAM role: Exists
- SNS topic: buddy-alerts-dev

---

## 🧪 Additional Test Cases

### **Test: Memory Support (Who Is Intent)**

Create custom test:
```bash
cat > /tmp/test-whois.json << 'EOF'
{
  "version": "1.0",
  "session": {
    "new": true,
    "sessionId": "test-whois-001",
    "application": {"applicationId": "test"},
    "user": {"userId": "amzn1.ask.account.test"}
  },
  "context": {
    "System": {"user": {"userId": "amzn1.ask.account.test"}}
  },
  "request": {
    "type": "IntentRequest",
    "intent": {
      "name": "WhoIsIntent",
      "slots": {"person": {"name": "person", "value": "Sarah"}}
    }
  }
}
EOF

aws lambda invoke \
  --function-name buddy-alexa-skill-dev \
  --payload file:///tmp/test-whois.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/response.json

cat /tmp/response.json | python3 -m json.tool
```

**Expected Response:**
```json
{
  "response": {
    "outputSpeech": {
      "ssml": "<speak>Sarah is your daughter...</speak>"
    }
  }
}
```

### **Test: Medication Reminder**

```bash
cat > /tmp/test-medication.json << 'EOF'
{
  "version": "1.0",
  "session": {
    "new": true,
    "sessionId": "test-med-001",
    "application": {"applicationId": "test"},
    "user": {"userId": "amzn1.ask.account.test"}
  },
  "context": {
    "System": {"user": {"userId": "amzn1.ask.account.test"}}
  },
  "request": {
    "type": "IntentRequest",
    "intent": {
      "name": "MedicationIntent",
      "slots": {"time": {"name": "time", "value": "after breakfast"}}
    }
  }
}
EOF

aws lambda invoke \
  --function-name buddy-alexa-skill-dev \
  --payload file:///tmp/test-medication.json \
  --cli-binary-format raw-in-base64-out \
  /tmp/response.json
```

**Expected:** Response mentions Metformin with safety disclaimer

---

## 📊 Test Data Reference

### **Patient Profile (John)**

```json
{
  "patientId": "pt-001",
  "preferredName": "John",
  "fullName": "John Doe",
  "birthdate": "1950-03-15",
  "dementiaStage": "moderate",
  "routines": {
    "morning": ["Brush your teeth", "Wash your face", "Change your clothes"],
    "afternoon": ["Have lunch", "Take a nap"],
    "evening": ["Have dinner", "Watch TV", "Go to bed"]
  },
  "medications": [
    {
      "name": "Metformin",
      "appearance": "White round pill",
      "schedule": "After breakfast"
    }
  ],
  "people": [
    {
      "name": "Sarah",
      "relationship": "daughter",
      "description": "Sarah visits on Sundays and likes to garden with you"
    }
  ]
}
```

### **Caregiver Profile**

```json
{
  "caregiverId": "cg-001",
  "username": "caregiver_test",
  "displayName": "Caregiver Test",
  "phoneNumber": "+15550123",
  "notificationPreferences": {
    "smsEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00",
    "level1Alerts": true,
    "level2Alerts": true
  }
}
```

---

## 🔍 Troubleshooting

### **Issue: Lambda Test Fails**

**Check:**
```bash
# Verify Lambda is active
aws lambda get-function --function-name buddy-alexa-skill-dev --query 'Configuration.State'

# Check CloudWatch logs
aws logs tail /aws/lambda/buddy-alexa-skill-dev --follow
```

### **Issue: DynamoDB Empty**

**Fix:**
```bash
cd infrastructure
python3 seed_data.py
```

### **Issue: Dashboard Won't Start**

**Check:**
```bash
cd src/caregiver-dashboard
npm install
npm run dev

# Check for errors
```

### **Issue: SMS Not Sending**

**Note:** SMS requires real phone number and AWS SNS spending limit. For demo, we show the SMS format in logs.

**Check SNS:**
```bash
aws sns list-topics
aws logs tail /aws/lambda/buddy-alexa-skill-dev --since 5m | grep -i sms
```

---

## 📈 Performance Metrics

### **Current Benchmarks**

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Response Time | <5s | ~2-3s | ✅ |
| Emergency Detection | 100% | 100% | ✅ |
| DynamoDB Read | <100ms | ~50ms | ✅ |
| Lambda Cold Start | <2s | ~500ms | ✅ |
| Dashboard Load | <3s | ~1s | ✅ |

### **Load Testing**

Test concurrent requests:
```bash
# Run 10 parallel tests
for i in {1..10}; do
  ./test/test-lambda.sh &
done
wait
```

---

## 🎥 Demo Recording Tips

### **Screen Recording Setup**

**Tools:**
- macOS: QuickTime Player (Cmd+Shift+5)
- Windows: Xbox Game Bar (Win+G) or OBS
- Linux: OBS or SimpleScreenRecorder

**Settings:**
- Resolution: 1920x1080
- Frame rate: 30fps
- Audio: System + Microphone

### **Recording Flow**

1. **Terminal Recording** (test-lambda.sh)
   - Full screen terminal
   - Run both emergency and routine tests
   - Show response output

2. **Dashboard Recording**
   - Browser at localhost:3000
   - Navigate through all tabs
   - Show patient info, conversations, alerts

3. **Architecture Diagram**
   - Show docs/ARCHITECTURE.md
   - Or draw in Excalidraw/whiteboard

4. **Code Walkthrough** (optional)
   - Show key files in src/alexa-skill/
   - Highlight emergency detection logic

---

## ✅ Pre-Demo Checklist

- [ ] All infrastructure verified (./scripts/verify.sh)
- [ ] Test data present (John, caregiver_test)
- [ ] Lambda test passes
- [ ] Dashboard running (localhost:3000)
- [ ] Documentation accessible (/docs folder)
- [ ] Architecture diagram ready
- [ ] Video recording software ready (optional)
- [ ] Phone charged (for SMS demo)
- [ ] Backup plan prepared (screenshots if live fails)

---

## 📞 Support

**Developer:** Anthony Lopez  
**Email:** lopezanth661@gmail.com  
**GitHub:** https://github.com/anthonylopez15/buddy

**Documentation:**
- Main README: `/README.md`
- Setup Guide: `/docs/SETUP.md`
- Demo Script: `/docs/DEMO_SCRIPT.md`
- Architecture: `/docs/ARCHITECTURE.md`

---

**Thank you for judging Buddy! We appreciate your time and feedback.**

*Amazon Nova AI Hackathon 2026*
