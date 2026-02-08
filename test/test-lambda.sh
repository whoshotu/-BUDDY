#!/bin/bash
# Buddy Lambda Test Script
# Tests Alexa skill without needing an Alexa device

set -e

export PATH="$HOME/.local/bin:$PATH"
FUNCTION_NAME="buddy-alexa-skill-dev"
REGION="us-east-1"

echo "╔════════════════════════════════════════════════════════╗"
echo "║     BUDDY LAMBDA TEST SUITE                            ║"
echo "║     Testing Emergency Flow & Core Features             ║"
echo "╚════════════════════════════════════════════════════════╝"

# Create test event files
cat > /tmp/test-emergency.json << 'EOF'
{
  "version": "1.0",
  "session": {
    "new": true,
    "sessionId": "test-session-emergency-001",
    "application": { "applicationId": "amzn1.ask.skill.test" },
    "user": { "userId": "amzn1.ask.account.test" }
  },
  "context": {
    "System": { 
      "user": { "userId": "amzn1.ask.account.test" }
    }
  },
  "request": {
    "type": "IntentRequest",
    "intent": {
      "name": "EmergencyIntent",
      "slots": {
        "query": { "name": "query", "value": "I fell down" }
      }
    }
  }
}
EOF

cat > /tmp/test-routine.json << 'EOF'
{
  "version": "1.0",
  "session": {
    "new": true,
    "sessionId": "test-session-routine-001",
    "application": { "applicationId": "amzn1.ask.skill.test" },
    "user": { "userId": "amzn1.ask.account.test" }
  },
  "context": {
    "System": { 
      "user": { "userId": "amzn1.ask.account.test" }
    }
  },
  "request": {
    "type": "IntentRequest",
    "intent": {
      "name": "RoutineIntent",
      "slots": {
        "query": { "name": "query", "value": "What do I do this morning?" }
      }
    }
  }
}
EOF

# Function to run test
run_test() {
    local test_name=$1
    local event_file=$2
    
    echo ""
    echo "🧪 Testing: $test_name"
    echo "─" | head -c 60 | tr '\n' '─'
    echo ""
    
    local start_time=$(date +%s%N)
    
    # Invoke Lambda
    local response=$(aws lambda invoke \
        --function-name "$FUNCTION_NAME" \
        --region "$REGION" \
        --payload "file://$event_file" \
        --cli-binary-format raw-in-base64-out \
        /tmp/response.json 2>&1)
    
    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 ))  # Convert to ms
    
    # Check status code
    local status_code=$(echo "$response" | grep "StatusCode" | awk '{print $2}')
    
    if [ "$status_code" == "200" ]; then
        echo "✅ Status: 200 OK"
        echo "⏱️  Duration: ${duration}ms"
        
        # Parse response
        local response_text=$(cat /tmp/response.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('response',{}).get('outputSpeech',{}).get('text','No response'))" 2>/dev/null || echo "Could not parse response")
        echo "📢 Response: $response_text"
        
        # Check if emergency mode
        local emergency_mode=$(cat /tmp/response.json | python3 -c "import sys,json; d=json.load(sys.stdin); print('true' if d.get('sessionAttributes',{}).get('emergencyMode') else 'false')" 2>/dev/null || echo "false")
        
        if [ "$emergency_mode" == "true" ]; then
            echo "🚨 EMERGENCY MODE ACTIVATED"
        fi
        
        return 0
    else
        echo "❌ Status: $status_code"
        echo "Error: $response"
        return 1
    fi
}

# Run tests
run_test 'EMERGENCY: "I fell down"' /tmp/test-emergency.json
sleep 2

run_test 'ROUTINE: "What do I do this morning?"' /tmp/test-routine.json
sleep 2

# Cleanup
rm -f /tmp/test-*.json /tmp/response.json

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║     TEST COMPLETE                                      ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""
echo "📱 Check your phone for SMS alerts!"
echo "   (If emergency test passed, you should receive an alert)"
echo ""
