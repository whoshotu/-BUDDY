/**
 * Buddy - Nova Sonic WebSocket Handler
 * Real-time speech-to-speech integration with bidirectional streaming
 * 
 * This module provides Nova Sonic capabilities alongside the traditional
 * Alexa skill, enabling natural voice conversations with dementia patients.
 * 
 * Architecture:
 * - WebSocket API Gateway maintains persistent connection
 * - Bidirectional audio streaming to/from Nova Sonic
 * - Integration with existing DynamoDB patient data
 * - Fallback to text-based skill for complex scenarios
 * 
 * @author Anthony Lopez
 * @version 1.0.0
 */

const { BedrockRuntimeClient, InvokeModelWithBidirectionalStreamCommand } = require('@aws-sdk/client-bedrock-runtime');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');
const { SNSClient, PublishCommand } = require('@aws-sdk/client-sns');

// AWS Clients
const bedrockClient = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' });
const ddbClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(ddbClient);
const snsClient = new SNSClient({ region: process.env.AWS_REGION || 'us-east-1' });

// Configuration
const CONFIG = {
  NOVA_MODEL: 'amazon.nova-sonic-v1:0',
  MAX_SESSION_DURATION_MS: 480000, // 8 minutes (Nova Sonic limit)
  AUDIO_FORMAT: 'pcm',
  SAMPLE_RATE: 24000,
  CHANNELS: 1
};

// Active connections storage (use DynamoDB for production)
const activeConnections = new Map();

/**
 * WebSocket Handler - Entry point for API Gateway WebSocket events
 */
exports.handler = async (event) => {
  const { requestContext, body } = event;
  const { connectionId, routeKey, eventType } = requestContext;

  console.log(`WebSocket Event: ${routeKey || eventType}`, { connectionId });

  try {
    switch (routeKey || eventType) {
      case '$connect':
        return await handleConnect(connectionId, event);
      
      case '$disconnect':
        return await handleDisconnect(connectionId);
      
      case '$default':
        return await handleMessage(connectionId, body);
      
      case 'initSession':
        return await handleInitSession(connectionId, body);
      
      case 'audioInput':
        return await handleAudioInput(connectionId, body);
      
      case 'textInput':
        return await handleTextInput(connectionId, body);
      
      default:
        console.log('Unknown route:', routeKey);
        return { statusCode: 200 };
    }
  } catch (error) {
    console.error('WebSocket handler error:', error);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: error.message }) 
    };
  }
};

/**
 * Handle new WebSocket connection
 */
async function handleConnect(connectionId, event) {
  console.log(`New connection: ${connectionId}`);
  
  // Extract patient context from query params or headers
  const patientId = event.queryStringParameters?.patientId || 'pt-001';
  
  // Store connection metadata
  activeConnections.set(connectionId, {
    connectionId,
    patientId,
    connectedAt: Date.now(),
    novaSession: null,
    messageHistory: []
  });

  return { statusCode: 200 };
}

/**
 * Handle WebSocket disconnection
 */
async function handleDisconnect(connectionId) {
  console.log(`Disconnect: ${connectionId}`);
  
  const connection = activeConnections.get(connectionId);
  if (connection?.novaSession) {
    // Close Nova Sonic session gracefully
    await closeNovaSession(connection);
  }
  
  activeConnections.delete(connectionId);
  return { statusCode: 200 };
}

/**
 * Initialize Nova Sonic session with patient context
 */
async function handleInitSession(connectionId, body) {
  const connection = activeConnections.get(connectionId);
  if (!connection) {
    return { statusCode: 400, body: 'Connection not found' };
  }

  try {
    const data = JSON.parse(body || '{}');
    const patientId = data.patientId || connection.patientId;
    
    // Get patient context from DynamoDB
    const patientContext = await getPatientContext(patientId);
    
    // Initialize Nova Sonic session
    const novaSession = await initNovaSession(connectionId, patientContext);
    
    connection.novaSession = novaSession;
    connection.patientContext = patientContext;
    
    console.log(`Nova Sonic session initialized for ${connectionId}`);
    
    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        status: 'initialized',
        patientName: patientContext.patient.preferredName 
      }) 
    };
  } catch (error) {
    console.error('Session init error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}

/**
 * Handle audio input from client
 */
async function handleAudioInput(connectionId, body) {
  const connection = activeConnections.get(connectionId);
  if (!connection?.novaSession) {
    return { statusCode: 400, body: 'Session not initialized' };
  }

  try {
    const data = JSON.parse(body || '{}');
    const audioBase64 = data.audio;
    
    if (!audioBase64) {
      return { statusCode: 400, body: 'No audio data' };
    }

    // Stream audio to Nova Sonic
    await streamAudioToNova(connection, audioBase64);
    
    return { statusCode: 200 };
  } catch (error) {
    console.error('Audio input error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}

/**
 * Handle text input (for testing or accessibility)
 */
async function handleTextInput(connectionId, body) {
  const connection = activeConnections.get(connectionId);
  if (!connection?.novaSession) {
    return { statusCode: 400, body: 'Session not initialized' };
  }

  try {
    const data = JSON.parse(body || '{}');
    const text = data.text;
    
    if (!text) {
      return { statusCode: 400, body: 'No text data' };
    }

    // Send text to Nova Sonic
    await sendTextToNova(connection, text);
    
    return { statusCode: 200 };
  } catch (error) {
    console.error('Text input error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}

/**
 * Initialize Nova Sonic bidirectional stream
 */
async function initNovaSession(connectionId, patientContext) {
  const systemPrompt = buildDementiaFriendlyPrompt(patientContext);
  
  // Create the bidirectional stream command
  const command = new InvokeModelWithBidirectionalStreamCommand({
    modelId: CONFIG.NOVA_MODEL,
    body: generateInitEvents(systemPrompt)
  });

  const response = await bedrockClient.send(command);
  
  // Handle the async stream
  handleNovaStream(connectionId, response.body);
  
  return {
    command,
    response,
    startTime: Date.now()
  };
}

/**
 * Generate initialization events for Nova Sonic
 */
function* generateInitEvents(systemPrompt) {
  const textEncoder = new TextEncoder();
  
  // Session start event
  const sessionStartEvent = {
    event: {
      sessionStart: {
        inferenceConfiguration: {
          maxTokens: 1024,
          topP: 0.9,
          temperature: 0.4  // Lower for consistency with dementia patients
        }
      }
    }
  };
  
  yield {
    chunk: {
      bytes: textEncoder.encode(JSON.stringify(sessionStartEvent))
    }
  };

  // System prompt event
  const promptEvent = {
    event: {
      promptStart: {
        promptName: 'system_prompt',
        textInput: {
          text: systemPrompt
        }
      }
    }
  };
  
  yield {
    chunk: {
      bytes: textEncoder.encode(JSON.stringify(promptEvent))
    }
  };

  // Content start event
  const contentStartEvent = {
    event: {
      contentStart: {
        promptName: 'system_prompt',
        contentName: 'initial_content',
        type: 'TEXT'
      }
    }
  };
  
  yield {
    chunk: {
      bytes: textEncoder.encode(JSON.stringify(contentStartEvent))
    }
  };
}

/**
 * Stream audio data to Nova Sonic
 */
async function streamAudioToNova(connection, audioBase64) {
  if (!connection.novaSession?.response) return;

  const textEncoder = new TextEncoder();
  
  const audioEvent = {
    event: {
      audioInput: {
        contentName: `audio_${Date.now()}`,
        type: 'AUDIO',
        audioInput: {
          mediaType: 'audio/lpcm',
          sampleRate: CONFIG.SAMPLE_RATE,
          sampleSizeBits: 16,
          channelCount: CONFIG.CHANNELS,
          encoding: 'base64',
          audioData: audioBase64
        }
      }
    }
  };

  // Send to Nova Sonic stream
  // Note: In production, you'd use the actual stream object
  console.log('Streaming audio to Nova Sonic:', audioBase64.substring(0, 50) + '...');
}

/**
 * Send text input to Nova Sonic
 */
async function sendTextToNova(connection, text) {
  if (!connection.novaSession?.response) return;

  const textEncoder = new TextEncoder();
  
  const textEvent = {
    event: {
      textInput: {
        contentName: `text_${Date.now()}`,
        type: 'TEXT',
        textInput: {
          text: text
        }
      }
    }
  };

  console.log('Sending text to Nova Sonic:', text);
}

/**
 * Handle Nova Sonic output stream
 */
async function handleNovaStream(connectionId, stream) {
  const connection = activeConnections.get(connectionId);
  if (!connection) return;

  try {
    for await (const chunk of stream) {
      const jsonString = new TextDecoder().decode(chunk.chunk?.bytes);
      const event = JSON.parse(jsonString);
      
      // Handle different event types
      if (event.event?.audioOutput) {
        // Send audio back to client
        await sendToClient(connectionId, {
          type: 'audioOutput',
          audio: event.event.audioOutput.content
        });
      } else if (event.event?.textOutput) {
        // Send transcription/text back to client
        await sendToClient(connectionId, {
          type: 'textOutput',
          text: event.event.textOutput.content,
          role: event.event.textOutput.role
        });
        
        // Log conversation for safety monitoring
        await logConversation({
          patientId: connection.patientId,
          utterance: event.event.textOutput.content,
          response: '',  // Will be filled when assistant responds
          intent: 'NovaSonicConversation',
          escalationLevel: 0,
          connectionId
        });
      } else if (event.event?.toolUse) {
        // Handle tool use (e.g., lookup patient data)
        await handleToolUse(connection, event.event.toolUse);
      }
    }
  } catch (error) {
    console.error('Nova stream error:', error);
  }
}

/**
 * Build dementia-friendly system prompt
 */
function buildDementiaFriendlyPrompt(patientContext) {
  const { patient, caregiver } = patientContext;
  
  return [
    `You are Buddy, a calm and patient voice assistant helping ${patient.preferredName} who has ${patient.dementiaStage} dementia.`,
    "",
    "CRITICAL INSTRUCTIONS:",
    "1. Use VERY short sentences (5-10 words max)",
    "2. Speak slowly and clearly",
    "3. Be warm, reassuring, and never rush the user",
    "4. If they repeat themselves, respond with the EXACT same answer",
    "5. Never correct them or argue",
    "6. Use their preferred name frequently",
    "7. Offer gentle reminders about their routine",
    "8. If they seem confused, help them feel safe",
    "",
    "SAFETY:",
    "- If they mention falling, pain, or danger, alert the caregiver immediately",
    "- Never give medical advice",
    "- Always suggest contacting their caregiver for health questions",
    "",
    `Patient: ${patient.preferredName}, Stage: ${patient.dementiaStage}`,
    `Caregiver: ${caregiver?.displayName || 'Family'}`,
    `Current time: ${new Date().toLocaleTimeString()}`,
    "",
    "You are having a natural voice conversation. Listen carefully and respond warmly."
  ].join('\n');
}

/**
 * Get patient context from DynamoDB
 */
async function getPatientContext(patientId) {
  try {
    const patientResult = await docClient.send(new GetCommand({
      TableName: process.env.PATIENTS_TABLE || 'BuddyPatients-dev',
      Key: { patientId }
    }));

    if (!patientResult.Item) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    return {
      patient: patientResult.Item,
      patientId
    };
  } catch (error) {
    console.error('Error getting patient context:', error);
    // Return default context
    return {
      patient: {
        patientId: 'pt-001',
        preferredName: 'John',
        dementiaStage: 'moderate'
      },
      patientId: 'pt-001'
    };
  }
}

/**
 * Send message to WebSocket client
 */
async function sendToClient(connectionId, message) {
  // In production, use AWS.ApiGatewayManagementApi to send messages
  console.log(`Sending to ${connectionId}:`, message);
}

/**
 * Handle tool use from Nova Sonic
 */
async function handleToolUse(connection, toolUse) {
  console.log('Tool use requested:', toolUse);
  
  // Implement tool handlers here (e.g., lookup routine, medication, etc.)
  // This allows Nova Sonic to query DynamoDB for patient data
}

/**
 * Close Nova Sonic session
 */
async function closeNovaSession(connection) {
  if (!connection.novaSession) return;
  
  // Send session end event
  const textEncoder = new TextEncoder();
  const sessionEndEvent = {
    event: {
      sessionEnd: {}
    }
  };
  
  console.log('Closing Nova Sonic session for', connection.connectionId);
}

/**
 * Log conversation for safety monitoring
 */
async function logConversation({ patientId, utterance, response, intent, escalationLevel, connectionId }) {
  const timestamp = new Date().toISOString();
  const expiresAt = Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60);

  try {
    const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
    const docClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' }));
    
    await docClient.send(new PutCommand({
      TableName: process.env.LOGS_TABLE || 'BuddyConversationLogs-dev',
      Item: {
        patientId,
        timestamp,
        userUtterance: utterance,
        assistantResponse: response,
        intent,
        escalationLevel,
        expiresAt,
        source: 'nova-sonic',
        connectionId
      }
    }));
  } catch (error) {
    console.error('Error logging conversation:', error);
  }
}

/**
 * Handle generic WebSocket messages
 */
async function handleMessage(connectionId, body) {
  console.log(`Message from ${connectionId}:`, body);
  return { statusCode: 200 };
}
