/**
 * Buddy - Voice-First Dementia Care Assistant
 * Lambda Handler for Alexa Skill
 * 
 * Integrates with Amazon Nova for speech-to-speech and agentic reasoning
 * Manages patient knowledge base via DynamoDB
 * Implements 3-level safety escalation
 * 
 * @author Anthony Lopez
 * @version 1.0.0
 */

const Alexa = require('ask-sdk-core');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand, QueryCommand, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

// AWS Clients
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Configuration
const TABLES = {
  CAREGIVERS: process.env.CAREGIVERS_TABLE || 'BuddyCaregivers-dev',
  PATIENTS: process.env.PATIENTS_TABLE || 'BuddyPatients-dev',
  ASSIGNMENTS: process.env.ASSIGNMENTS_TABLE || 'BuddyAssignments-dev',
  LOGS: process.env.LOGS_TABLE || 'BuddyConversationLogs-dev'
};

const CONFIG = {
  NOVA_MODEL: process.env.NOVA_MODEL || 'amazon.nova-micro-v1:0',
  SNS_TOPIC: process.env.SNS_TOPIC_ARN,
  ESCALATION_KEYWORDS_LEVEL_1: ['scared', 'confused', 'lost', "can't find", 'where am i', 'help'],
  ESCALATION_KEYWORDS_LEVEL_2: ['fell', 'bleeding', 'chest pain', 'fire', "can't breathe", 'hurt', 'pain'],
  REPETITION_THRESHOLD: 3, // 4th occurrence triggers Level 1
  REPETITION_WINDOW_HOURS: 2
};

/**
 * Get patient context from DynamoDB
 * Looks up Alexa userId → patientId mapping, then fetches patient data
 */
async function getPatientContext(alexaUserId) {
  try {
    // Step 1: Find caregiver with this Alexa user mapping
    const caregiverResult = await docClient.send(new QueryCommand({
      TableName: TABLES.CAREGIVERS,
      IndexName: 'caregiverIdIndex',
      KeyConditionExpression: 'caregiverId = :cg',
      FilterExpression: 'contains(alexaUserMappings, :userId)',
      ExpressionAttributeValues: {
        ':cg': 'cg-001', // Default for demo
        ':userId': alexaUserId
      }
    }));

    // For hackathon demo: use default mapping if not found
    let patientId = 'pt-001';
    let caregiverId = 'cg-001';

    if (caregiverResult.Items && caregiverResult.Items.length > 0) {
      const caregiver = caregiverResult.Items[0];
      patientId = caregiver.alexaUserMappings[alexaUserId];
      caregiverId = caregiver.caregiverId;
    }

    // Step 2: Get patient data
    const patientResult = await docClient.send(new GetCommand({
      TableName: TABLES.PATIENTS,
      Key: { patientId }
    }));

    if (!patientResult.Item) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    // Step 3: Get assignment (for caregiver info)
    const assignmentResult = await docClient.send(new GetCommand({
      TableName: TABLES.ASSIGNMENTS,
      Key: { caregiverId, patientId }
    }));

    return {
      patient: patientResult.Item,
      caregiver: assignmentResult.Item,
      patientId,
      caregiverId
    };

  } catch (error) {
    console.error('Error getting patient context:', error);
    // Fallback to demo patient for testing
    return {
      patient: {
        patientId: 'pt-001',
        preferredName: 'John',
        dementiaStage: 'moderate',
        people: [],
        routines: [],
        medications: [],
        safetyProfile: {}
      },
      caregiver: null,
      patientId: 'pt-001',
      caregiverId: 'cg-001'
    };
  }
}

/**
 * Log conversation to DynamoDB
 * Tracks escalation levels and repetition for safety monitoring
 */
async function logConversation({ patientId, utterance, response, intent, escalationLevel, repeatCount }) {
  const timestamp = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60); // 90 days TTL

  try {
    await docClient.send(new PutCommand({
      TableName: TABLES.LOGS,
      Item: {
        patientId,
        timestamp,
        userUtterance: utterance,
        assistantResponse: response,
        intent: intent || 'Unknown',
        escalationLevel: escalationLevel || 0,
        repeatCount: repeatCount || 0,
        expiresAt,
        caregiverNotified: escalationLevel > 0
      }
    }));

    // Update patient activity metadata
    await docClient.send(new PutCommand({
      TableName: TABLES.PATIENTS,
      Item: {
        patientId,
        lastConversationAt: timestamp,
        lastEscalationLevel: escalationLevel || 0,
        conversationCountToday: { $add: 1 } // Atomic counter
      }
    }));

  } catch (error) {
    console.error('Error logging conversation:', error);
  }
}

/**
 * Check for repetition in recent conversation history
 * Returns count of matching utterances in last 2 hours
 */
async function checkRepetition(patientId, utterance) {
  try {
    const twoHoursAgo = new Date(Date.now() - (CONFIG.REPETITION_WINDOW_HOURS * 60 * 60 * 1000)).toISOString();
    
    const result = await docClient.send(new QueryCommand({
      TableName: TABLES.LOGS,
      KeyConditionExpression: 'patientId = :pid AND #ts > :since',
      ExpressionAttributeNames: {
        '#ts': 'timestamp'
      },
      ExpressionAttributeValues: {
        ':pid': patientId,
        ':since': twoHoursAgo
      }
    }));

    const matches = result.Items?.filter(item => 
      item.userUtterance.toLowerCase() === utterance.toLowerCase()
    ) || [];

    return matches.length;

  } catch (error) {
    console.error('Error checking repetition:', error);
    return 0;
  }
}

/**
 * Classify safety level based on utterance and context
 * Returns: 0 (normal), 1 (concerning), 2 (emergency)
 */
async function classifySafetyLevel(utterance, patientContext, repeatCount) {
  const lowerUtterance = utterance.toLowerCase();

  // Level 2: Emergency keywords (immediate danger)
  if (CONFIG.ESCALATION_KEYWORDS_LEVEL_2.some(kw => lowerUtterance.includes(kw))) {
    return 2;
  }

  // Level 1: Repetition threshold reached
  if (repeatCount >= CONFIG.REPETITION_THRESHOLD) {
    return 1;
  }

  // Level 1: Concerning keywords
  if (CONFIG.ESCALATION_KEYWORDS_LEVEL_1.some(kw => lowerUtterance.includes(kw))) {
    return 1;
  }

  return 0;
}

/**
 * Send SMS alert to caregiver
 */
async function sendCaregiverAlert({ caregiverPhone, patientName, utterance, escalationLevel, conversationLink }) {
  if (!CONFIG.SNS_TOPIC && !caregiverPhone) {
    console.warn('No SNS topic or phone number configured for alerts');
    return;
  }

  try {
    let message;
    
    if (escalationLevel === 2) {
      message = `URGENT: ${patientName} said "${utterance}". Initiating emergency protocol. ${conversationLink || ''}`;
    } else {
      message = `Buddy Alert: ${patientName} said "${utterance}" ${CONFIG.REPETITION_THRESHOLD + 1}+ times. ${conversationLink || ''}`;
    }

    await snsClient.send(new PublishCommand({
      TopicArn: CONFIG.SNS_TOPIC,
      Message: message,
      Subject: escalationLevel === 2 ? 'URGENT: Buddy Emergency Alert' : 'Buddy Alert'
    }));

    console.log(`Alert sent (Level ${escalationLevel}): ${message}`);

  } catch (error) {
    console.error('Error sending alert:', error);
  }
}

/**
 * Generate response using Amazon Nova
 */
async function generateNovaResponse({ intent, slots, facts, patientContext, escalationLevel }) {
  try {
    const systemPrompt = [
      "You are a calm, dementia-friendly voice assistant named Buddy.",
      "Use short sentences (10-15 words max). Be reassuring and patient.",
      "Never shame or infantilize. Always empower the patient.",
      "If unsure, ask ONE gentle clarifying question.",
      "Do not give medical advice. Always advise confirming with caregiver.",
      "For repeated questions, give the EXACT same answer (builds trust)."
    ].join(' ');

    const userContext = {
      patientName: patientContext.patient.preferredName,
      dementiaStage: patientContext.patient.dementiaStage,
      intent,
      slots,
      facts,
      escalationLevel
    };

    const requestBody = {
      inputText: `${systemPrompt}\n\nPatient context: ${JSON.stringify(userContext)}\n\nGenerate a calm, helpful response in 1-2 short sentences:`,
      textGenerationConfig: {
        maxTokenCount: 160,
        temperature: 0.4,
        topP: 0.9
      }
    };

    const response = await bedrockClient.send(new InvokeModelCommand({
      modelId: CONFIG.NOVA_MODEL,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(requestBody)
    }));

    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.results?.[0]?.outputText?.trim() || 
           "I'm here to help. What would you like to know?";

  } catch (error) {
    console.error('Error generating Nova response:', error);
    
    // Fallback responses for common intents
    if (intent === 'WhoIsIntent' && slots.person) {
      const person = patientContext.patient.people?.find(p => 
        p.name.toLowerCase() === slots.person.toLowerCase()
      );
      if (person) {
        return `${person.name} is your ${person.relationship || 'family member'}.`;
      }
    }

    return "I'm here with you. Can you tell me more?";
  }
}

/**
 * Extract facts from DynamoDB based on intent
 */
async function getFactsForIntent({ patientId, intent, slots, patientData }) {
  const facts = [];

  switch (intent) {
    case 'WhoIsIntent':
      if (slots.person) {
        const person = patientData.people?.find(p => 
          p.name.toLowerCase() === slots.person.toLowerCase()
        );
        if (person) {
          facts.push({
            type: 'person',
            name: person.name,
            relationship: person.relationship,
            visitSchedule: person.visitSchedule,
            sharedActivities: person.sharedActivities
          });
        }
      }
      break;

    case 'GetRoutineIntent':
      const timeOfDay = slots.timeOfDay || getCurrentTimeOfDay();
      const routine = patientData.routines?.find(r => 
        r.timeOfDay.toLowerCase() === timeOfDay.toLowerCase()
      );
      if (routine) {
        facts.push({
          type: 'routine',
          timeOfDay: routine.timeOfDay,
          steps: routine.steps
        });
      }
      break;

    case 'GetMedicationIntent':
      const timing = slots.meal || 'now';
      const medications = patientData.medications?.filter(m => 
        m.timing?.toLowerCase().includes(timing.toLowerCase())
      );
      if (medications && medications.length > 0) {
        facts.push({
          type: 'medications',
          timing,
          medications
        });
      }
      break;
  }

  return facts;
}

/**
 * Helper: Get current time of day (morning, afternoon, evening, night)
 */
function getCurrentTimeOfDay() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Extract slot value from Alexa request
 */
function getSlotValue(handlerInput, slotName) {
  const intent = handlerInput.requestEnvelope.request.intent || {};
  return intent.slots?.[slotName]?.value;
}

// ============== ALEXA HANDLERS ==============

/**
 * Launch Request Handler
 * Triggered when user says "Alexa, open Buddy Assistant"
 */
const LaunchRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
  },
  async handle(handlerInput) {
    const speakOutput = 
      "Hi, I'm Buddy. I'm here to help with your routine, medications, and people you know. " +
      "What would you like to ask?";
    
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt("What would you like help with?")
      .getResponse();
  }
};

/**
 * Intent Request Handler
 * Routes all custom intents (routine, medication, who is, etc.)
 */
const IntentRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
  },
  async handle(handlerInput) {
    const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
    const alexaUserId = handlerInput.requestEnvelope.context.System.user.userId;
    
    // Extract slot values
    const slots = {
      timeOfDay: getSlotValue(handlerInput, 'timeOfDay'),
      meal: getSlotValue(handlerInput, 'meal'),
      person: getSlotValue(handlerInput, 'person'),
      routineName: getSlotValue(handlerInput, 'routineName'),
      task: getSlotValue(handlerInput, 'task')
    };

    console.log(`Intent: ${intentName}`, { slots, userId: alexaUserId });

    try {
      // Get patient context
      const patientContext = await getPatientContext(alexaUserId);
      
      // Get original utterance for repetition checking
      const utterance = handlerInput.requestEnvelope.request.intent?.slots?.query?.value || 
                       slots.person || 
                       slots.routineName || 
                       'unknown query';

      // Check for repetition
      const repeatCount = await checkRepetition(patientContext.patientId, utterance);

      // Classify safety level
      const escalationLevel = await classifySafetyLevel(
        utterance, 
        patientContext, 
        repeatCount
      );

      // Get relevant facts from patient data
      const facts = await getFactsForIntent({
        patientId: patientContext.patientId,
        intent: intentName,
        slots,
        patientData: patientContext.patient
      });

      // Generate response using Nova
      const response = await generateNovaResponse({
        intent: intentName,
        slots,
        facts,
        patientContext,
        escalationLevel
      });

      // Log conversation
      await logConversation({
        patientId: patientContext.patientId,
        utterance,
        response,
        intent: intentName,
        escalationLevel,
        repeatCount
      });

      // Handle escalations
      if (escalationLevel === 2) {
        // Emergency: Send alert immediately
        await sendCaregiverAlert({
          caregiverPhone: patientContext.patient.safetyProfile?.caregiverPhone,
          patientName: patientContext.patient.preferredName,
          utterance,
          escalationLevel: 2
        });

        return handlerInput.responseBuilder
          .speak("I'm contacting your caregiver now. Stay with me. " + response)
          .reprompt("Help is on the way. Can you tell me where you are?")
          .getResponse();

      } else if (escalationLevel === 1) {
        // Concerning: Ask permission before alerting
        if (repeatCount >= CONFIG.REPETITION_THRESHOLD) {
          await sendCaregiverAlert({
            caregiverPhone: patientContext.patient.safetyProfile?.caregiverPhone,
            patientName: patientContext.patient.preferredName,
            utterance,
            escalationLevel: 1
          });
        }
      }

      return handlerInput.responseBuilder
        .speak(response)
        .reprompt("Anything else you want help with?")
        .getResponse();

    } catch (error) {
      console.error('Error handling intent:', error);
      
      return handlerInput.responseBuilder
        .speak("I'm having trouble right now. Let's try again in a moment.")
        .reprompt("Can you repeat that?")
        .getResponse();
    }
  }
};

/**
 * Help Intent Handler
 */
const HelpIntentHandler = {
  canHandle(handlerInput) {
    return Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
  },
  handle(handlerInput) {
    const speakOutput = 
      "You can say things like: 'What do I do this morning?', " +
      "'What do I take after breakfast?', or 'Who is Sarah?'. " +
      "What would you like to know?";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .reprompt("What would you like to ask?")
      .getResponse();
  }
};

/**
 * Cancel and Stop Intent Handlers
 */
const CancelAndStopIntentHandler = {
  canHandle(handlerInput) {
    return ['AMAZON.CancelIntent', 'AMAZON.StopIntent'].includes(
      Alexa.getIntentName(handlerInput.requestEnvelope)
    );
  },
  handle(handlerInput) {
    const speakOutput = "Goodbye. I'll be here whenever you need help.";

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  }
};

/**
 * Error Handler
 */
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.error('Error:', error);

    return handlerInput.responseBuilder
      .speak("Sorry, I had trouble with that. Can you ask in a different way?")
      .reprompt("Can you try again?")
      .getResponse();
  }
};

// ============== LAMBDA EXPORT ==============

exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    LaunchRequestHandler,
    IntentRequestHandler,
    HelpIntentHandler,
    CancelAndStopIntentHandler
  )
  .addErrorHandlers(ErrorHandler)
  .lambda();
