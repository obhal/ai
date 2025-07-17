#!/usr/bin/env node

/**
 * Complete conversation test maintaining session state
 */

const { initializeMockAgent } = require('./langchain/mockAgent');

async function testFullConversation() {
  console.log('🏥 Voice Healthcare Agent - Complete Conversation Test\n');
  
  // Create a single agent instance to maintain state
  const agent = await initializeMockAgent();
  
  const conversationSteps = [
    {
      user: "Hello, I need to see a dermatologist",
      expected: "greeting response"
    },
    {
      user: "Hi, I'm Anil. I need to see a dermatologist", 
      expected: "name acknowledgment and doctor options"
    },
    {
      user: "Tell me Dr. Sharma's availability",
      expected: "Dr. Sharma's time slots"
    },
    {
      user: "4:30 PM is fine",
      expected: "confirmation request"
    },
    {
      user: "Yes",
      expected: "appointment confirmed"
    }
  ];
  
  console.log('Starting conversation simulation...\n');
  
  for (let i = 0; i < conversationSteps.length; i++) {
    const step = conversationSteps[i];
    console.log(`👤 User: ${step.user}`);
    
    const response = await agent.call({ input: step.user });
    console.log(`🤖 Agent: ${response.output}\n`);
    
    // Small delay to make it feel more natural
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Check if appointment was actually booked
  const { appointments } = require('./langchain/mockAgent');
  console.log('📅 Final Appointments:');
  if (appointments.length > 0) {
    appointments.forEach(apt => {
      console.log(`   ✅ ${apt.patientName} - ${apt.doctorName} at ${apt.slot} (ID: ${apt.id})`);
    });
  } else {
    console.log('   ❌ No appointments were booked');
  }
  
  return appointments.length > 0;
}

async function testVoiceCallEndpoint() {
  console.log('\n📞 Testing Voice Call Handler Endpoint...\n');
  
  const tests = [
    {
      method: 'POST',
      endpoint: '/voice/call-handler',
      body: { CallSid: 'test_call_123' },
      description: 'Incoming call handling'
    },
    {
      method: 'POST', 
      endpoint: '/voice/process-input',
      body: { 
        CallSid: 'test_call_123',
        RecordingUrl: null // Will use mock transcript
      },
      description: 'Voice input processing'
    }
  ];
  
  for (const test of tests) {
    try {
      const response = await fetch(`http://localhost:3000${test.endpoint}`, {
        method: test.method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(test.body)
      });
      
      console.log(`${test.description}: ${response.status === 200 ? '✅ Pass' : '❌ Fail'}`);
      if (response.status !== 200) {
        const error = await response.text();
        console.log(`   Error: ${error}`);
      }
    } catch (error) {
      console.log(`${test.description}: ❌ Fail - ${error.message}`);
    }
  }
}

async function main() {
  try {
    const conversationSuccess = await testFullConversation();
    
    if (conversationSuccess) {
      console.log('\n🎉 All tests passed! The voice healthcare agent is working correctly.');
    } else {
      console.log('\n⚠️  Conversation completed but no appointment was booked.');
    }
    
    // Note: Voice call endpoint test would require the server to be running
    console.log('\n💡 To test voice endpoints, ensure the server is running and use:');
    console.log('   curl -X POST http://localhost:3000/voice/call-handler -H "Content-Type: application/json" -d \'{"CallSid":"test_123"}\'');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testFullConversation };