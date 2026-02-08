# Buddy - Demo Video Script

## Video Specifications

- **Duration:** 3 minutes (180 seconds)
- **Format:** MP4, 1920x1080
- **Audio:** Clear narration + background music (optional)
- **Hashtag:** #AmazonNova prominently displayed
- **Style:** Professional, clear, engaging

## Storyboard

### Scene 1: The Problem (0:00 - 0:30)
**Duration:** 30 seconds

**Visual:**
- Text overlay: "6.7 Million Americans live with Alzheimer's"
- Fade to: 70% experience anxiety and confusion daily"
- Show: Caregiver looking exhausted/stressed
- Show: Patient looking confused/scared
"
**Audio (Narration):**
> "Every day, 6.7 million Americans with dementia face anxiety, confusion, and emergencies. Their caregivers experience burnout from constant monitoring. Existing solutions lack natural voice interaction and emergency response."

**Text on Screen:**
```
THE PROBLEM
━━━━━━━━━━━━
❌ 6.7M Americans with dementia
❌ 70% experience daily anxiety
❌ Caregiver burnout
❌ No natural voice solutions
```

---

### Scene 2: Meet Buddy (0:30 - 0:50)
**Duration:** 20 seconds

**Visual:**
- Buddy logo animation
- Show Alexa device
- Show patient speaking to Alexa
- Warm, friendly interface

**Audio:**
> "Meet Buddy. An AI-powered voice assistant built specifically for dementia patients using Amazon Nova AI."

**Text on Screen:**
```
MEET BUDDY
━━━━━━━━━━━━
🎯 Voice-first design
🤖 Amazon Nova AI
🏥 Dementia-specialized
⚡ 24/7 care
```

---

### Scene 3: Routine Guidance (0:50 - 1:20)
**Duration:** 30 seconds

**Visual:**
- Split screen: Patient on left, Terminal output on right
- Show test script running
- Show Lambda response in real-time

**Terminal Recording:**
```bash
$ ./test-lambda.sh
🧪 Testing: ROUTINE: "What do I do this morning?"
✅ Status: 200 OK
⏱️  Duration: 1892ms
📢 Response: "Good morning John! Time to brush your teeth and wash your face."
```

**Audio:**
> "Buddy provides personalized routine guidance. When John asks about his morning routine, Buddy knows exactly what he needs to do. The responses are short, consistent, and dementia-friendly."

**Text Overlay:**
```
FEATURE 1: ROUTINE GUIDANCE
━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Personalized routines
✅ Consistent responses
✅ Short, clear instructions
✅ Patient's preferred name
```

---

### Scene 4: Emergency Detection (1:20 - 2:00)
**Duration:** 40 seconds

**Visual:**
- Terminal showing emergency test
- Cut to: Phone receiving SMS
- Split screen: Emergency response + SMS alert
- Show DynamoDB log entry

**Terminal Recording:**
```bash
$ ./test-lambda.sh
🧪 Testing: EMERGENCY: "I fell down"
✅ Status: 200 OK
⏱️  Duration: 2345ms
📢 Response: "I'm contacting emergency services and your caregiver now..."
🚨 EMERGENCY MODE ACTIVATED
```

**SMS Screenshot:**
```
🚨 URGENT: Buddy Emergency Alert

EMERGENCY: John triggered a Level 2 alert.
Statement: "I fell down"
Time: Feb 8, 2026 7:45 AM
Location: Available

ACTION REQUIRED:
1. Call John immediately
2. If no response, call 911
3. Check camera if available
```

**Audio:**
> "But Buddy's real power is safety. When John says 'I fell down,' Buddy immediately detects this Level 2 emergency, activates emergency mode, and sends an urgent SMS to the caregiver with location and medical information. All within 3 seconds."

**Text Overlay:**
```
FEATURE 2: EMERGENCY ESCALATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 3-Level Safety System
⚡ <3 second response time
📱 Instant SMS alerts
📍 Location sharing
💊 Medical context included
```

---

### Scene 5: Caregiver Dashboard (2:00 - 2:30)
**Duration:** 30 seconds

**Visual:**
- Screen recording of React dashboard
- Show patient overview
- Show conversation history
- Show alerts panel
- Show emergency contact info

**Dashboard Views:**
1. Patient card with John Doe
2. Recent conversations list
3. Safety alerts with Level 2 indicator
4. Medical information panel

**Audio:**
> "Caregivers get real-time visibility through the Buddy Dashboard. They can see all conversations, monitor safety alerts, and access critical medical information instantly."

**Text Overlay:**
```
FEATURE 3: CAREGIVER DASHBOARD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Real-time monitoring
🔔 Visual alert system
📱 Mobile-responsive
🔒 Secure & encrypted
```

---

### Scene 6: Architecture & Tech (2:30 - 2:50)
**Duration:** 20 seconds

**Visual:**
- Architecture diagram animation
- AWS service icons (Lambda, DynamoDB, SNS, Nova)
- Data flow arrows
- Serverless badge

**Architecture Diagram:**
```
Alexa → Lambda → Nova AI → DynamoDB → SNS SMS
              ↓
        Caregiver Dashboard
```

**Audio:**
> "Buddy is built on AWS serverless architecture using Amazon Nova AI, Lambda, DynamoDB, and SNS. It's scalable, reliable, and cost-effective at just $65 per month for production use."

**Text Overlay:**
```
TECHNOLOGY STACK
━━━━━━━━━━━━━━━━
☁️  AWS Serverless
🧠 Amazon Nova AI
📱 Alexa Skills Kit
📊 DynamoDB
🔔 Amazon SNS
⚡ <3s response time
💰 $65/month at scale
```

---

### Scene 7: Impact & Call to Action (2:50 - 3:00)
**Duration:** 10 seconds

**Visual:**
- Heartwarming image of caregiver and patient
- Buddy logo
- GitHub repository link
- Contact information

**Audio:**
> "Buddy brings peace of mind to families caring for loved ones with dementia. Built with love for the Amazon Nova AI Hackathon 2026."

**Text on Screen:**
```
IMPACT
━━━━━━━━━━━━━━━━
❤️ 24/7 companionship
🛡️ Emergency detection
😌 Peace of mind for caregivers

Built with Amazon Nova AI
#AmazonNova

github.com/anthonylopez15/buddy
lopezanth661@gmail.com
```

---

## Recording Instructions

### Equipment Needed
- Screen recording software (OBS, QuickTime, Loom)
- Microphone (or phone headset)
- Quiet recording environment

### Recording Order

1. **Record Terminal Scenes First**
   ```bash
   # Setup terminal for recording
   cd test
   ./test-lambda.sh
   # Record both emergency and routine tests
   ```

2. **Record Dashboard**
   ```bash
   cd src/caregiver-dashboard
   npm run dev
   # Record navigation through all tabs
   ```

3. **Record Architecture**
   - Use docs/ARCHITECTURE.md diagram
   - Or draw on whiteboard/tool like Excalidraw

4. **Record Voiceover**
   - Read script clearly
   - Pause between scenes
   - Multiple takes allowed

### Video Editing

**Recommended Tools:**
- Free: DaVinci Resolve, iMovie, OpenShot
- Online: Canva, Clipchamp

**Editing Steps:**
1. Import all clips
2. Add transitions (simple cuts)
3. Add text overlays
4. Record/import voiceover
5. Add background music (optional, low volume)
6. Add #AmazonNova watermark
7. Export as MP4 (1080p)

### Quality Checklist

- [ ] Audio is clear and audible
- [ ] Text is readable
- [ ] Transitions are smooth
- [ ] Total duration is 3 minutes or less
- [ ] #AmazonNova is visible
- [ ] All 7 scenes included
- [ ] Shows working emergency flow

### Export Settings

```
Format: MP4
Resolution: 1920x1080 (1080p)
Frame Rate: 30fps
Bitrate: 5-8 Mbps
Audio: AAC, 128kbps
File Size: Target <100MB
```

---

## Alternative: Live Demo Recording

If you prefer live demo over scripted:

**Setup:**
1. Open terminal (test-lambda.sh ready)
2. Open dashboard (localhost:3000)
3. Open architecture diagram
4. Have phone ready for SMS

**Live Script:**
1. Intro (30s)
2. "Let me show you Buddy in action"
3. Run emergency test (show terminal + phone)
4. Show dashboard (30s)
5. Show architecture (20s)
6. Conclusion (20s)

**Tips:**
- Practice 3-5 times
- Keep energy high
- Don't rush emergency test
- Show genuine excitement

---

## Resources

- **Demo Scenarios:** docs/DEMO_SCRIPT.md
- **Architecture Diagram:** docs/ARCHITECTURE.md
- **Test Script:** test/test-lambda.sh
- **Dashboard:** src/caregiver-dashboard/

---

**Estimated Production Time:** 2-3 hours  
**Target Length:** 3 minutes  
**Hashtag:** #AmazonNova
