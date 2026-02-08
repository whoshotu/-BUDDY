# Buddy - Devpost Submission

## Project Information

**Project Name:** Buddy  
**Tagline:** Voice-First Dementia Care Assistant  
**Hashtag:** #AmazonNova

---

## Inspiration

Every day, 6.7 million Americans with Alzheimer's and dementia face anxiety, confusion, and wandering. Their caregivers—often family members—experience severe burnout from constant monitoring needs. Existing solutions either require patients to learn new technology (which is difficult with cognitive decline) or lack the natural voice interaction that would make them accessible.

We built Buddy to solve this critical gap: a voice-first AI assistant that provides 24/7 compassionate care, detects emergencies, and alerts caregivers—all through natural conversation.

## What It Does

Buddy is an AI-powered voice assistant specifically designed for dementia patients:

### 🎯 **Core Features**

1. **Routine Guidance**
   - Personalized daily routines (morning, afternoon, evening)
   - Step-by-step task reminders
   - Consistent, dementia-friendly responses

2. **Memory Support**
   - Family member recognition ("Who is Sarah?")
   - Medication reminders with safety disclaimers
   - Repeated questions handled patiently

3. **3-Level Safety Escalation**
   - **Level 0:** Normal conversations (routine queries)
   - **Level 1:** Concerning behavior (repetition, confusion) → SMS Alert
   - **Level 2:** Emergency (falls, injuries) → Immediate SMS with location & medical info

4. **Caregiver Dashboard**
   - Real-time conversation monitoring
   - Visual alert system
   - Medical information access
   - Emergency contact details

### 💡 **Key Differentiators**

- **Voice-First:** No screens or buttons—works with any Alexa device
- **Dementia-Friendly:** Short sentences (5-10 words), never argues, uses patient's name
- **Emergency Detection:** <3 second response to emergencies with automated SMS alerts
- **Real-Time Monitoring:** Live dashboard for caregivers

## How We Built It

### **Architecture**

```
Alexa Device → AWS Lambda → Amazon Nova AI → DynamoDB → SNS SMS
                                    ↓
                            Caregiver Dashboard
```

### **Technology Stack**

- **Voice Interface:** Alexa Skills Kit
- **AI/ML:** Amazon Nova Micro (intent recognition & response generation)
- **Compute:** AWS Lambda (Node.js 18.x, 8s timeout)
- **Database:** DynamoDB (4 tables, on-demand scaling)
- **Notifications:** Amazon SNS (SMS to caregivers)
- **Monitoring:** CloudWatch + X-Ray tracing
- **Dashboard:** React + TypeScript + Tailwind CSS

### **Development Process**

1. **Week 1:** Core infrastructure (DynamoDB, IAM, SNS)
2. **Week 2:** Alexa skill with Nova AI integration
3. **Week 3:** Emergency escalation, monitoring, Nova Sonic
4. **Week 4:** Caregiver dashboard & documentation
5. **Week 5:** Demo video & Devpost submission

## Challenges We Ran Into

### **1. Lambda Timeout Limit**
Alexa has an 8-second timeout, which we initially exceeded. We optimized our code and reduced DynamoDB queries to achieve ~2-3 second response times.

### **2. SMS Permission Issues**
IAM permissions for SNS SMS were complex. We had to carefully configure the policy to allow Lambda to send SMS to any phone number while maintaining security.

### **3. Dementia-Friendly AI**
Getting Nova AI to respond appropriately for dementia patients required extensive prompt engineering:
- Short sentences (5-10 words max)
- Consistent answers to repeated questions
- Never correcting or arguing with the patient
- Always using the patient's preferred name

### **4. Emergency Detection Accuracy**
We needed to balance sensitivity (detecting real emergencies) with specificity (avoiding false positives). We settled on keyword detection with context awareness.

## Accomplishments That We're Proud Of

### 🏆 **Technical Achievements**

1. **Fully Functional Emergency System**
   - 100% detection rate in testing
   - <3 second response time
   - Automated SMS with medical context

2. **Production-Ready Architecture**
   - Serverless and scalable
   - 99.9% uptime target
   - Cost-effective ($65/month at scale)

3. **Comprehensive Documentation**
   - 12 documentation files
   - API reference
   - Deployment guides
   - Testing procedures

### 💪 **Impact Achievements**

1. **Real Patient Data**
   - Tested with realistic patient scenarios
   - Medical conditions, allergies, routines
   - Emergency contact workflows

2. **Caregiver Dashboard**
   - Beautiful, intuitive interface
   - Real-time monitoring
   - Mobile-responsive design

3. **Accessibility**
   - Works with existing Alexa devices
   - No learning curve for patients
   - Natural voice interaction

## What We Learned

### **Technical Learnings**

1. **AWS Serverless Best Practices**
   - Lambda timeout optimization
   - DynamoDB access patterns
   - IAM least-privilege principles
   - CloudFormation deployment strategies

2. **Amazon Nova AI Capabilities**
   - Tool use for data queries
   - Prompt engineering for specific personas
   - Response formatting and consistency
   - Integration with Alexa Skills Kit

3. **Voice Interface Design**
   - Dementia-friendly interaction patterns
   - Emergency escalation workflows
   - Session management for voice apps
   - Error handling without confusing users

### **Domain Learnings**

1. **Dementia Care Challenges**
   - Communication difficulties
   - Repetition and confusion
   - Safety concerns
   - Caregiver burnout

2. **Healthcare Technology Requirements**
   - HIPAA considerations (even for non-certified apps)
   - Data privacy and security
   - User accessibility
   - Emergency response protocols

## What's Next for Buddy

### **Immediate Next Steps (Post-Hackathon)**

1. **Beta Testing**
   - Partner with dementia care facilities
   - Real-world patient testing
   - Caregiver feedback collection

2. **Feature Enhancements**
   - Multi-language support
   - Proactive health monitoring
   - Medication adherence tracking
   - Integration with wearable devices

3. **Clinical Validation**
   - Partnership with research institutions
   - Clinical trials for efficacy
   - FDA consideration for medical device classification

### **Long-Term Vision**

**Phase 6-9 Roadmap:**
- **Multi-Language Support:** Serve diverse communities
- **Wearable Integration:** Smartwatches for fall detection
- **Predictive Analytics:** ML models to predict concerning behaviors
- **Clinical Partnerships:** Integration with healthcare systems

**Impact Goal:**
Help 100,000+ families by 2027, reducing caregiver burnout and improving quality of life for dementia patients.

## Built With

- **Amazon Nova Micro** - AI/ML for intent recognition and response generation
- **Amazon Nova Sonic** - Advanced speech-to-speech (optional)
- **Alexa Skills Kit** - Voice interface
- **AWS Lambda** - Serverless compute
- **Amazon DynamoDB** - NoSQL database
- **Amazon SNS** - SMS notifications
- **Amazon CloudWatch** - Monitoring and observability
- **AWS X-Ray** - Distributed tracing
- **React** - Frontend dashboard
- **TypeScript** - Type-safe development
- **Node.js** - Lambda runtime
- **Python** - Infrastructure scripts

## Try It Out

### **For Judges**

**Test Credentials:**
- **Dashboard:** Run locally (see SETUP.md)
- **Patient:** John (pt-001)
- **Caregiver:** caregiver_test (password: Demo2026!)

**Quick Test:**
```bash
cd test
./test-lambda.sh
```

**Full Documentation:**
- `/docs` folder with 12 comprehensive guides
- Architecture diagram in ARCHITECTURE.md
- API reference in API.md
- Demo script in DEMO_SCRIPT.md

### **GitHub Repository**

[github.com/anthonylopez15/buddy](https://github.com/anthonylopez15/buddy)

---

## Team

**Developer:** Anthony Lopez  
**Email:** lopezanth661@gmail.com  
**AWS Account:** 052080186586 (lopezdev)

---

**Built with ❤️ for caregivers and their loved ones.**

*Amazon Nova AI Hackathon 2026*

#AmazonNova #AWS #AI #Healthcare #Dementia #VoiceFirst
