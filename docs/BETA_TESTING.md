# Buddy - Beta Testing Guide

A comprehensive guide for testing Buddy before production release.

## Overview

Beta testing ensures Buddy works reliably for dementia patients and caregivers before public release. This guide covers testing scenarios, success criteria, and graduation requirements.

## Testing Timeline

**Minimum Duration:** 1 week  
**Recommended Duration:** 2 weeks  
**Maximum Duration:** 1 month

### Week 1: Core Functionality
- Day 1-2: Routine and memory prompts
- Day 3-4: Medication reminders
- Day 5-7: Safety escalation

### Week 2: Edge Cases & Performance
- Day 8-10: Error handling and recovery
- Day 11-12: Multi-device testing
- Day 13-14: Load testing and stress scenarios

---

## Setting Up Beta Testing

### 1. Create Beta Testers Group

**Required Testers:**
- 1-2 technical testers (developers/QA)
- 2-3 non-technical testers (family members, friends)
- 1 accessibility tester (if possible)

**Tester Information Needed:**
```
Name:
Email:
Phone (for SMS alerts):
Alexa Device Type: (Echo/Dot/Show/Spot)
Testing Environment: (Quiet home/Office/Various)
Availability: (Time zones, preferred testing hours)
```

### 2. Configure Alexa Developer Console

1. Go to [Alexa Developer Console](https://developer.amazon.com/alexa/console/ask)
2. Select your Buddy skill
3. Click **"Distribution"** tab
4. Scroll to **"Availability"**
5. Set **"Beta Test"** to "Enabled"
6. Add beta tester emails
7. Click **"Save and Continue"**

### 3. Deploy Beta Environment

```bash
# Deploy separate beta stack
./deploy.sh --environment beta --region us-east-1
./deploy-lambda.sh --environment beta --region us-east-1

# Use different test patient
export TEST_PATIENT_ID=pt-beta-001
```

### 4. Configure Beta Data

Create separate test data:
```python
# infrastructure/seed_beta_data.py
BETA_CAREGIVER = {
    "username": "beta_tester_1",
    "caregiverId": "cg-beta-001",
    # ...
}

BETA_PATIENT = {
    "patientId": "pt-beta-001",
    "preferredName": "TestPatient",
    # Separate routines, medications for testing
}
```

---

## Test Scenarios

### Scenario 1: Routine Guidance

**Test ID:** BG-001  
**Priority:** HIGH  
**Description:** Patient asks about daily routine

**Test Steps:**
1. Say: "Alexa, open Buddy Assistant"
2. Say: "What do I do this morning?"

**Expected Results:**
- Skill launches successfully
- Response includes morning routine steps
- Tone is calm and reassuring
- Response time < 3 seconds

**Pass Criteria:**
- [ ] Response includes correct routine
- [ ] Steps are clear and actionable
- [ ] Patient's preferred name is used
- [ ] No errors in CloudWatch logs

**Variations to Test:**
- [ ] "What's my afternoon routine?"
- [ ] "What happens in the evening?"
- [ ] "What do I do now?" (time-based)
- [ ] "What's next?" (after completing a step)

---

### Scenario 2: Family Recognition

**Test ID:** BG-002  
**Priority:** HIGH  
**Description:** Patient asks about family member

**Test Steps:**
1. Say: "Who is Sarah?"
2. Wait for response
3. Say: "Who is Sarah?" (repeat)
4. Repeat 2 more times (total 4)

**Expected Results:**
- Response includes relationship and context
- Same answer every time (builds trust)
- Level 1 alert sent after 4th query

**Pass Criteria:**
- [ ] Response is consistent across repetitions
- [ ] Includes relationship, visit schedule, activities
- [ ] Caregiver receives SMS after 4th query
- [ ] Response time < 2 seconds

**Edge Cases:**
- [ ] Unknown person name
- [ ] Mispronounced name
- [ ] Partial name match

---

### Scenario 3: Medication Reminders

**Test ID:** BG-003  
**Priority:** HIGH  
**Description:** Patient asks about medications

**Test Steps:**
1. Say: "What do I take after breakfast?"

**Expected Results:**
- Names medication correctly
- Includes appearance description
- Includes caregiver confirmation disclaimer

**Pass Criteria:**
- [ ] Correct medication identified
- [ ] Appearance description clear
- [ ] Disclaimer always included
- [ ] No dosage information given

**Safety Checks:**
- [ ] Never suggests changing medication
- [ ] Always advises confirming with caregiver
- [ ] No medical advice given

---

### Scenario 4: Level 1 - Concerning Behavior

**Test ID:** BG-004  
**Priority:** HIGH  
**Description:** Detect concerning keywords

**Test Steps:**
1. Say: "I'm scared and confused"
2. Wait for response

**Expected Results:**
- Calming response
- Level 1 escalation triggered
- Caregiver receives alert

**Pass Criteria:**
- [ ] Response is calming and reassuring
- [ ] Caregiver SMS sent within 30 seconds
- [ ] Response includes gentle redirection
- [ ] No alarm in voice

**Trigger Words to Test:**
- [ ] "scared"
- [ ] "confused"
- [ ] "lost"
- [ ] "can't find"
- [ ] "where am i"
- [ ] "help"

---

### Scenario 5: Level 2 - Emergency

**Test ID:** BG-005  
**Priority:** CRITICAL  
**Description:** Emergency escalation

**Test Steps:**
1. Say: "I fell down"
2. Wait for response

**Expected Results:**
- Immediate emergency response
- URGENT SMS to caregiver
- Location included (if permission granted)
- Session enters emergency mode

**Pass Criteria:**
- [ ] Response acknowledges emergency immediately
- [ ] URGENT SMS sent within 15 seconds
- [ ] Location included in SMS (if available)
- [ ] Medical conditions listed in SMS
- [ ] Skill keeps patient engaged for 30 minutes

**Emergency Triggers to Test:**
- [ ] "I fell"
- [ ] "I'm bleeding"
- [ ] "chest pain"
- [ ] "can't breathe"
- [ ] "fire"
- [ ] "someone in the house"

**⚠️ WARNING:** Test with test phone numbers only! Alert real caregiver after testing.

---

### Scenario 6: Error Handling

**Test ID:** BG-006  
**Priority:** MEDIUM  
**Description:** Graceful error recovery

**Test Steps:**
1. Say unintelligible sounds: "Mmmph grumble"
2. Wait for response
3. Say: "What?"

**Expected Results:**
- Graceful clarification request
- No crash or error exposed to user
- Logs error for debugging

**Pass Criteria:**
- [ ] Response asks for clarification
- [ ] Tone remains calm and patient
- [ ] No technical error messages
- [ ] Error logged in CloudWatch

---

### Scenario 7: Multi-Device Testing

**Test ID:** BG-007  
**Priority:** MEDIUM  
**Description:** Test on different Alexa devices

**Devices to Test:**
- [ ] Amazon Echo (standard)
- [ ] Echo Dot (smaller speaker)
- [ ] Echo Show (with screen)
- [ ] Echo Spot (smaller screen)
- [ ] Echo Auto (if available)

**Considerations:**
- Microphone sensitivity varies
- Screen display for Echo Show/Spot
- Response volume appropriateness

---

### Scenario 8: Ambient Noise

**Test ID:** BG-008  
**Priority:** MEDIUM  
**Description:** Test with background noise

**Test Conditions:**
- [ ] TV playing in background
- [ ] Multiple people talking
- [ ] Kitchen noises (dishes, microwave)
- [ ] Quiet environment (baseline)

**Pass Criteria:**
- [ ] Skill still recognizes wake word
- [ ] Understands patient despite noise
- [ ] Doesn't trigger on background voices

---

### Scenario 9: Interruption (Barge-in)

**Test ID:** BG-009  
**Priority:** MEDIUM  
**Description:** Patient interrupts during response

**Test Steps:**
1. Ask: "What do I do this morning?"
2. While Buddy is responding, interrupt: "Wait, who is Sarah?"

**Pass Criteria:**
- [ ] Buddy stops current response
- [ ] Responds to new question
- [ ] Maintains context appropriately
- [ ] No confusion or errors

**Note:** This tests the Nova Sonic barge-in capability if using WebSocket mode.

---

### Scenario 10: Long Conversation

**Test ID:** BG-010  
**Priority:** LOW  
**Description:** Extended interaction session

**Test Steps:**
1. Have 10+ minute conversation
2. Mix of routine, memory, and medication questions
3. Test repetition (ask same question multiple times)

**Pass Criteria:**
- [ ] No session timeout errors
- [ ] Consistent responses throughout
- [ ] Memory/context maintained
- [ ] No performance degradation

---

## Beta Testing Checklist

### Pre-Testing

- [ ] Beta environment deployed
- [ ] Test data created
- [ ] Testers enrolled in Alexa beta
- [ ] SMS alerts configured for test numbers
- [ ] CloudWatch dashboard ready
- [ ] Test plan distributed to testers
- [ ] Feedback form prepared

### Daily Testing

- [ ] Test scenarios executed
- [ ] Results logged in test tracker
- [ ] Issues reported immediately
- [ ] CloudWatch logs reviewed
- [ ] Error rates monitored

### Post-Testing

- [ ] All scenarios tested
- [ ] Bug fixes implemented
- [ ] Regression tests passed
- [ ] Performance metrics acceptable
- [ ] Documentation updated
- [ ] Sign-off from stakeholders

---

## Success Criteria

### Must Have (Release Blockers)

- [ ] No Level 2 emergency false positives
- [ ] Level 2 emergencies detected 100% of the time
- [ ] Response time < 5 seconds (p95)
- [ ] Zero crashes in production
- [ ] SMS alerts delivered < 30 seconds
- [ ] All test scenarios pass

### Should Have (High Priority)

- [ ] Level 1 detection accuracy > 90%
- [ ] Response time < 3 seconds (p50)
- [ ] Consistent answers for repeated questions
- [ ] Graceful error handling
- [ ] Works on all major Alexa devices

### Nice to Have (Low Priority)

- [ ] Advanced barge-in support
- [ ] Multi-language support
- [ ] Custom voice selection
- [ ] Proactive reminders

---

## Feedback Collection

### Tester Feedback Form

```markdown
# Buddy Beta Testing - Daily Report

Date: ___________
Tester: ___________

## Scenarios Tested Today
- [ ] Routine guidance
- [ ] Family recognition  
- [ ] Medication reminders
- [ ] Safety escalation
- [ ] Error handling
- [ ] Other: ___________

## Issues Found

### Issue 1
Description:
Severity: (Critical/High/Medium/Low)
Steps to reproduce:
Expected:
Actual:

### Issue 2
...

## Performance
- Average response time: ___ seconds
- Any delays or timeouts? (Y/N)
- Any crashes? (Y/N)

## User Experience
- Was the voice clear and calm? (1-5)
- Were responses helpful? (1-5)
- Would you recommend this? (1-5)

## Additional Comments
```

### Automated Metrics

Track automatically:
- Total invocations
- Error rate
- Response time (p50, p95, p99)
- Safety escalations triggered
- SMS delivery success rate
- User retention (re-engagement)

---

## Graduation Criteria

**Ready for Production When:**

1. ✅ All must-have criteria met
2. ✅ Zero critical bugs open
3. ✅ < 5 high-priority bugs open
4. ✅ All test scenarios pass consistently
5. ✅ Beta testers provide positive feedback (>4/5 rating)
6. ✅ Stakeholder sign-off
7. ✅ Documentation complete
8. ✅ Rollback plan tested

**Exit Criteria (Stop Testing):**

- Critical safety issue found
- > 10% error rate
- Data loss or corruption
- Patient safety concern

---

## Common Issues & Solutions

### Issue: SMS Not Received

**Symptoms:** Alerts not reaching caregiver  
**Check:**
- SNS topic ARN correct
- Phone number format (+1XXXXXXXXXX)
- IAM permissions for SNS:Publish
- SMS spending limit in SNS

### Issue: Slow Response Time

**Symptoms:** Responses take > 5 seconds  
**Check:**
- DynamoDB query performance
- Nova API latency
- Lambda cold start time
- Package size (should be < 50MB)

### Issue: Inconsistent Answers

**Symptoms:** Different responses to same question  
**Check:**
- Nova temperature setting (should be 0.4 or lower)
- Patient data consistency in DynamoDB
- Session attributes persistence

### Issue: False Emergency Triggers

**Symptoms:** Level 2 alert on normal conversation  
**Check:**
- Keyword list too broad
- Context not considered
- Review and refine keyword detection

---

## Post-Beta Actions

### 1. Analyze Results

- Compile all test results
- Calculate pass/fail rates
- Identify top issues
- Measure performance metrics

### 2. Prioritize Fixes

- Critical issues: Fix immediately
- High priority: Fix before production
- Medium/Low: Fix in next sprint

### 3. Update Documentation

- Update known issues list
- Revise test scenarios
- Update deployment guide
- Document workarounds

### 4. Production Readiness

- Final security review
- Performance optimization
- Capacity planning
- Monitoring setup

---

## Emergency Contacts

During beta testing:

**Technical Issues:**
- Lead Developer: [Your Email]
- On-Call Engineer: [Phone]

**Safety Concerns:**
- Safety Lead: [Email/Phone]
- Project Manager: [Email/Phone]

**AWS Support:**
- Business Support: AWS Console
- Critical Issues: +1-xxx-xxx-xxxx

---

## Resources

- [Alexa Beta Testing Guide](https://developer.amazon.com/en-US/docs/alexa/custom-skills/skills-beta-testing.html)
- [Beta Test Submission Guide](https://developer.amazon.com/en-US/docs/alexa/custom-skills/submit-your-skill-for-certification.html)
- [Voice Design Best Practices](https://developer.amazon.com/en-US/alexa/alexa-skills-kit/tutorials/building-an-alexa-skill-with-the-alexa-skills-kit)

---

## License

MIT License - Amazon Nova Hackathon 2026
