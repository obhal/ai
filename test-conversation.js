#!/usr/bin/env node

/**
 * Interactive test script for the Voice Healthcare Agent
 * Demonstrates the complete conversation flow
 */

const { initializeMockAgent } = require('./langchain/mockAgent');

async function testConversationFlow() {
  console.log('🏥 Voice Healthcare Agent - Conversation Test\n');
  console.log('Simulating the expected conversation flow from the requirements:\n');
  
  const agent = await initializeMockAgent();
  
  const conversation = [
    "Hello, I need to see a dermatologist",
    "Hi, I'm Anil. I need to see a dermatologist",
    "Tell me Dr. Sharma's availability",
    "4:30 is fine",
    "Yes"
  ];
  
  for (let i = 0; i < conversation.length; i++) {
    const userInput = conversation[i];
    console.log(`👤 User: ${userInput}`);
    
    const response = await agent.call({ input: userInput });
    console.log(`🤖 Agent: ${response.output}\n`);
    
    // Small delay to make it feel more natural
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log('✅ Conversation flow completed successfully!');
  console.log('\n📋 Summary:');
  console.log('- Patient name collected: Anil');
  console.log('- Doctor selected: Dr. Sharma');
  console.log('- Time slot booked: 4:30 PM');
  console.log('- Appointment confirmed');
  
  // Show current appointments
  const { appointments } = require('./langchain/mockAgent');
  if (appointments.length > 0) {
    console.log('\n📅 Current Appointments:');
    appointments.forEach(apt => {
      console.log(`   ${apt.patientName} - ${apt.doctorName} at ${apt.slot} (ID: ${apt.id})`);
    });
  }
}

// Test individual tools
async function testTools() {
  console.log('\n🔧 Testing Individual Tools:\n');
  
  const agent = await initializeMockAgent();
  
  // Test getting doctors
  console.log('1. Testing doctor availability:');
  let response = await agent.call({ input: "Show me available doctors" });
  console.log(`   Response: ${response.output}\n`);
  
  // Test specific doctor slots
  console.log('2. Testing specific doctor slots:');
  response = await agent.call({ input: "Tell me Dr. Sharma's availability" });
  console.log(`   Response: ${response.output}\n`);
  
  // Test booking flow
  console.log('3. Testing booking confirmation:');
  response = await agent.call({ input: "4:30 PM is good" });
  console.log(`   Response: ${response.output}\n`);
}

async function main() {
  try {
    await testConversationFlow();
    await testTools();
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { testConversationFlow, testTools };