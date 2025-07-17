# Voice Healthcare Agent MVP

A comprehensive voice-based healthcare appointment agent that handles phone calls from patients and facilitates appointment booking with dermatologists.

## Features

- **Voice Call Processing**: Exotel Programmable Voice API integration
- **Speech Processing**: Deepgram STT and ElevenLabs TTS
- **AI Agent**: Langchain with Gemini AI for conversation orchestration
- **Appointment Management**: In-memory storage for MVP
- **Telephony Integration**: Complete voice call handling workflow

## Technology Stack

- **Exotel** - Telephony infrastructure
- **Deepgram** - Speech-to-text processing
- **ElevenLabs** - Text-to-speech synthesis
- **Langchain** - Conversation orchestration
- **Gemini AI** - Natural language processing
- **Node.js/Express** - Backend server

## Project Structure

```
project-root/
├── data/
│   └── doctors.json          # Hardcoded doctor data
├── langchain/
│   └── agent.js             # AI agent with tools
├── voice/
│   └── callHandler.js       # Voice call processing
├── server.js                # Express server
├── .env.example            # Environment template
└── package.json            # Dependencies
```

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

3. **Required API Keys:**
   - `DEEPGRAM_API_KEY` - For speech-to-text
   - `ELEVENLABS_API_KEY` - For text-to-speech
   - `GEMINIAI_API_KEY` - For AI processing

4. **Start the server:**
   ```bash
   npm start
   ```

## API Endpoints

- `GET /health` - Health check
- `GET /test` - System status
- `POST /voice/call-handler` - Exotel incoming call webhook
- `POST /voice/process-input` - Process voice input during call
- `POST /voice/call-status` - Handle call status updates
- `POST /test/agent` - Test agent functionality (development)

## Expected Conversation Flow

```
Agent: Hello! I'm your assistant. May I know your name?
User: Hi, I'm Anil. I need to see a dermatologist.
Agent: We have Dr. Sharma and Dr. Reddy available. Would you like to hear their timings?
User: Tell me Dr. Sharma's availability.
Agent: Dr. Sharma is available at 3 PM, 4:30 PM, and 6 PM. Which one do you prefer?
User: 4:30 is fine.
Agent: Confirming your 4:30 PM appointment with Dr. Sharma. Shall I proceed?
User: Yes.
Agent: Appointment confirmed! Thank you.
```

## Available Doctors

The system includes two dermatologists with pre-configured time slots:

- **Dr. Sharma**: 3 PM, 4:30 PM, 6 PM
- **Dr. Reddy**: 2 PM, 3:30 PM, 5 PM

## Development

The system includes comprehensive error handling, logging, and development tools for testing the complete voice workflow without requiring actual phone calls.

## Production Deployment

For production use:
1. Replace test API keys with production keys
2. Configure proper webhooks with Exotel
3. Set up proper audio file hosting for TTS responses
4. Implement database storage for appointments
5. Add proper authentication and rate limiting