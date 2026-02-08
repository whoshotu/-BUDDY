/**
 * Buddy - Lambda Test Script
 * Simulates Alexa requests without needing an Alexa device
 */

const { LambdaClient, InvokeCommand } = require('@aws-sdk/client-lambda');

const lambda = new LambdaClient({ region: 'us-east-1' });

// Test: Emergency Escalation (Level 2)
const emergencyTestEvent = {
  version: '1.0',
  session: {
    new: true,
    sessionId: 'test-session-emergency-001',
    application: { applicationId: 'amzn1.ask.skill.test' },
    user: { userId: 'amzn1.ask.account.test' }
  },
  context: {
    System: { 
      user: { userId: 'amzn1.ask.account.test' },
      device: { deviceId: 'amzn1.ask.device.test' }
    }
  },
  request: {
    type: 'IntentRequest',
    requestId: 'test-request-001',
    timestamp: new Date().toISOString(),
    intent: {
      name: 'EmergencyIntent',
      slots: {
        query: { name: 'query', value: 'I fell down' }
      }
    }
  }
};

// Test: Routine Query (Normal flow)
const routineTestEvent = {
  version: '1.0',
  session: {
    new: true,
    sessionId: 'test-session-routine-001',
    application: { applicationId: 'amzn1.ask.skill.test' },
    user: { userId: 'amzn1.ask.account.test' }
  },
  context: {
    System: { 
      user: { userId: 'amzn1.ask.account.test' },
      device: { deviceId: 'amzn1.ask.device.test' }
    }
  },
  request: {
    type: 'IntentRequest',
    requestId: 'test-request-002',
    timestamp: new Date().toISOString(),
    intent: {
      name: 'RoutineIntent',
      slots: {
        query: { name: 'query', value: 'What do I do this morning?' }
      }
    }
  }
};

// Test: Who Is Intent
const whoIsTestEvent = {
  version: '1.0',
  session: {
    new: true,
    sessionId: 'test-session-whois-001',
    application: { applicationId: 'amzn1.ask.skill.test' },
    user: { userId: 'amzn1.ask.account.test' }
  },
  context: {
    System: { 
      user: { userId: 'amzn1.ask.account.test' },
      device: { deviceId: 'amzn1.ask.device.test' }
    }
  },
  request: {
    type: 'IntentRequest',
    requestId: 'test-request-003',
    timestamp: new Date().toISOString(),
    intent: {
      name: 'WhoIsIntent',
      slots: {
        person: { name: 'person', value: 'Sarah' }
      }
    }
  }
};

async function testLambda(testName, event) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log('─'.repeat(60));
  
  try {
    const startTime = Date.now();
    
    const command = new InvokeCommand({
      FunctionName: 'buddy-alexa-skill-dev',
      Payload: JSON.stringify(event)
    });
    
    const response = await lambda.send(command);
    const duration = Date.now() - startTime;
    
    const payload = JSON.parse(Buffer.from(response.Payload).toString());
    
    console.log(`✅ Status: ${response.StatusCode}`);
    console.log(`⏱️  Duration: ${duration}ms`);
    console.log(`📢 Response: ${payload.response?.outputSpeech?.text || 'No response'}`);
    
    if (payload.response?.reprompt) {
      console.log(`💬 Reprompt: ${payload.response.reprompt.outputSpeech.text}`);
    }
    
    if (payload.sessionAttributes?.emergencyMode) {
      console.log(`🚨 EMERGENCY MODE ACTIVATED`);
    }
    
    return { success: true, duration, payload };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     BUDDY LAMBDA TEST SUITE                            ║');
  console.log('║     Testing Emergency Flow & Core Features             ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  
  // Test 1: Emergency
  const emergencyResult = await testLambda('EMERGENCY: "I fell down"', emergencyTestEvent);
  
  // Wait a moment for logs to propagate
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Routine
  const routineResult = await testLambda('ROUTINE: "What do I do this morning?"', routineTestEvent);
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 3: Who Is
  const whoIsResult = await testLambda('WHOIS: "Who is Sarah?"', whoIsTestEvent);
  
  // Summary
  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║     TEST SUMMARY                                       ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`Emergency Test: ${emergencyResult.success ? '✅ PASS' : '❌ FAIL'} (${emergencyResult.duration || 0}ms)`);
  console.log(`Routine Test:   ${routineResult.success ? '✅ PASS' : '❌ FAIL'} (${routineResult.duration || 0}ms)`);
  console.log(`WhoIs Test:     ${whoIsResult.success ? '✅ PASS' : '❌ FAIL'} (${whoIsResult.duration || 0}ms)`);
  
  if (emergencyResult.success && emergencyResult.payload.sessionAttributes?.emergencyMode) {
    console.log('\n🚨 CHECK YOUR PHONE! Emergency SMS should be sent!');
  }
}

// Run tests
runTests().catch(console.error);
