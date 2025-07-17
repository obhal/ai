require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { handleIncomingCall, handleVoiceInput, handleCallStatus } = require('./voice/callHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  console.log('Request body:', req.body);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Main voice call handler endpoint (Exotel webhook)
app.post('/voice/call-handler', handleIncomingCall);

// Process voice input during call
app.post('/voice/process-input', handleVoiceInput);

// Handle call status updates
app.post('/voice/call-status', handleCallStatus);

// Test endpoint for development
app.get('/test', (req, res) => {
  res.json({
    message: 'Voice Healthcare Agent API is running',
    endpoints: {
      health: 'GET /health',
      callHandler: 'POST /voice/call-handler',
      processInput: 'POST /voice/process-input',
      callStatus: 'POST /voice/call-status'
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      port: PORT,
      hasDeepgramKey: !!process.env.DEEPGRAM_API_KEY,
      hasElevenLabsKey: !!process.env.ELEVENLABS_API_KEY,
      hasGeminiKey: !!process.env.GEMINIAI_API_KEY
    }
  });
});

// Test agent endpoint for development/debugging
app.post('/test/agent', async (req, res) => {
  try {
    let agent;
    
    // Check if we have valid API keys
    if (process.env.GEMINIAI_API_KEY && process.env.GEMINIAI_API_KEY !== 'test_key') {
      const { initializeAgent } = require('./langchain/agent');
      agent = await initializeAgent();
    } else {
      // Use mock agent for testing
      const { initializeMockAgent } = require('./langchain/mockAgent');
      agent = await initializeMockAgent();
    }
    
    const input = req.body.message || 'Hello, I need to see a dermatologist';
    const response = await agent.call({ input });
    
    res.json({
      input,
      output: response.output,
      mode: process.env.GEMINIAI_API_KEY === 'test_key' ? 'mock' : 'production',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Test agent error:', error);
    res.status(500).json({
      error: 'Failed to test agent',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.originalUrl
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`Voice Healthcare Agent server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Test endpoint: http://localhost:${PORT}/test`);
  
  // Check environment variables
  const requiredEnvVars = ['DEEPGRAM_API_KEY', 'ELEVENLABS_API_KEY', 'GEMINIAI_API_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('Warning: Missing environment variables:', missingVars.join(', '));
    console.warn('Please check your .env file or environment configuration');
  } else {
    console.log('All required environment variables are configured ✓');
  }
});

module.exports = app;