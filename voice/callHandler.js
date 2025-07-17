const { createClient } = require('@deepgram/sdk');
const { ElevenLabsClient } = require('@elevenlabs/elevenlabs-js');
const { initializeAgent } = require('../langchain/agent');

// Initialize Deepgram client
const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

// Initialize ElevenLabs client
const elevenlabs = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY,
});

// Store active conversation sessions
const activeSessions = new Map();

/**
 * Process incoming voice call from Exotel
 */
const handleIncomingCall = async (req, res) => {
  try {
    console.log('Incoming call received:', req.body);
    
    const callSid = req.body.CallSid || `call_${Date.now()}`;
    
    // Initialize new conversation session
    if (!activeSessions.has(callSid)) {
      let agent;
      
      // Check if we have valid API keys
      if (process.env.GEMINIAI_API_KEY && process.env.GEMINIAI_API_KEY !== 'test_key') {
        agent = await initializeAgent();
      } else {
        // Use mock agent for testing
        const { initializeMockAgent } = require('../langchain/mockAgent');
        agent = await initializeMockAgent();
      }
      
      activeSessions.set(callSid, {
        agent,
        conversationHistory: [],
        isActive: true
      });
    }

    // Initial greeting response
    const greeting = "Hello! I'm your healthcare assistant. May I know your name and how I can help you today?";
    
    // Convert greeting to speech
    const audioBuffer = await convertTextToSpeech(greeting);
    
    // Store the greeting in conversation history
    const session = activeSessions.get(callSid);
    session.conversationHistory.push({
      type: 'assistant',
      content: greeting,
      timestamp: new Date().toISOString()
    });

    // Return Exotel response to play the greeting
    const exotelResponse = generateExotelResponse(greeting, audioBuffer, callSid);
    
    res.set('Content-Type', 'application/xml');
    res.send(exotelResponse);
    
  } catch (error) {
    console.error('Error handling incoming call:', error);
    res.status(500).send(generateErrorResponse());
  }
};

/**
 * Process voice input from user during call
 */
const handleVoiceInput = async (req, res) => {
  try {
    console.log('Voice input received:', req.body);
    
    const callSid = req.body.CallSid;
    const recordingUrl = req.body.RecordingUrl;
    
    if (!callSid || !activeSessions.has(callSid)) {
      console.error('No active session found for call:', callSid);
      return res.status(400).send(generateErrorResponse());
    }

    const session = activeSessions.get(callSid);
    
    // Download and transcribe the audio
    const transcript = await transcribeAudio(recordingUrl);
    
    if (!transcript || transcript.trim().length === 0) {
      const response = "I'm sorry, I didn't catch that. Could you please repeat?";
      const audioBuffer = await convertTextToSpeech(response);
      const exotelResponse = generateExotelResponse(response, audioBuffer, callSid, true);
      
      return res.set('Content-Type', 'application/xml').send(exotelResponse);
    }

    // Add user input to conversation history
    session.conversationHistory.push({
      type: 'user',
      content: transcript,
      timestamp: new Date().toISOString()
    });

    // Process with AI agent
    const agentResponse = await session.agent.call({ input: transcript });
    const responseText = agentResponse.output;

    // Add agent response to conversation history
    session.conversationHistory.push({
      type: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString()
    });

    // Convert response to speech
    const audioBuffer = await convertTextToSpeech(responseText);
    
    // Check if conversation should end (appointment confirmed or user wants to end)
    const shouldEnd = checkIfConversationShouldEnd(responseText, transcript);
    
    const exotelResponse = generateExotelResponse(responseText, audioBuffer, callSid, !shouldEnd);
    
    if (shouldEnd) {
      // Clean up session
      activeSessions.delete(callSid);
    }

    res.set('Content-Type', 'application/xml');
    res.send(exotelResponse);
    
  } catch (error) {
    console.error('Error processing voice input:', error);
    res.status(500).send(generateErrorResponse());
  }
};

/**
 * Transcribe audio using Deepgram
 */
const transcribeAudio = async (audioUrl) => {
  try {
    if (!audioUrl) {
      console.log('No audio URL provided, using mock transcript for testing');
      return null;
    }

    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: audioUrl },
      {
        model: 'nova-2',
        language: 'en-US',
        smart_format: true,
      }
    );

    if (error) {
      console.error('Deepgram transcription error:', error);
      return null;
    }

    const transcript = result.results?.channels?.[0]?.alternatives?.[0]?.transcript;
    console.log('Transcription result:', transcript);
    
    return transcript || null;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return null;
  }
};

/**
 * Convert text to speech using ElevenLabs
 */
const convertTextToSpeech = async (text) => {
  try {
    const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Default voice
    
    const audio = await elevenlabs.textToSpeech.convert({
      voice_id: voiceId,
      text: text,
      model_id: 'eleven_monolingual_v1',
    });

    // Convert audio stream to buffer
    const chunks = [];
    for await (const chunk of audio) {
      chunks.push(chunk);
    }
    
    return Buffer.concat(chunks);
  } catch (error) {
    console.error('Error converting text to speech:', error);
    // Return null so we can fall back to text response
    return null;
  }
};

/**
 * Generate Exotel XML response
 */
const generateExotelResponse = (text, audioBuffer = null, callSid, continueCall = true) => {
  let response = '<?xml version="1.0" encoding="UTF-8"?><Response>';
  
  if (audioBuffer) {
    // In a real implementation, you would upload the audio to a public URL
    // For now, we'll use the Say verb with text
    response += `<Say voice="woman">${escapeXml(text)}</Say>`;
  } else {
    response += `<Say voice="woman">${escapeXml(text)}</Say>`;
  }
  
  if (continueCall) {
    // Record user response and continue conversation
    response += `<Record timeout="10" finishOnKey="#" action="/voice/process-input" method="POST"/>`;
  } else {
    // End the call
    response += '<Hangup/>';
  }
  
  response += '</Response>';
  return response;
};

/**
 * Generate error response
 */
const generateErrorResponse = () => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="woman">I'm sorry, there was a technical issue. Please try calling again later.</Say>
  <Hangup/>
</Response>`;
};

/**
 * Check if conversation should end
 */
const checkIfConversationShouldEnd = (agentResponse, userInput) => {
  const endKeywords = [
    'appointment confirmed',
    'thank you',
    'goodbye',
    'bye',
    'that\'s all',
    'no more questions'
  ];
  
  const responseText = agentResponse.toLowerCase();
  const userText = userInput.toLowerCase();
  
  return endKeywords.some(keyword => 
    responseText.includes(keyword) || userText.includes(keyword)
  );
};

/**
 * Escape XML special characters
 */
const escapeXml = (text) => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
};

/**
 * Handle call status updates
 */
const handleCallStatus = async (req, res) => {
  try {
    console.log('Call status update:', req.body);
    
    const callSid = req.body.CallSid;
    const callStatus = req.body.CallStatus;
    
    if (callStatus === 'completed' || callStatus === 'failed' || callStatus === 'busy') {
      // Clean up session
      if (activeSessions.has(callSid)) {
        activeSessions.delete(callSid);
        console.log(`Session cleaned up for call: ${callSid}`);
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error handling call status:', error);
    res.status(500).send('Error');
  }
};

module.exports = {
  handleIncomingCall,
  handleVoiceInput,
  handleCallStatus,
  activeSessions // Export for testing
};