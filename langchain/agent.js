const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { initializeAgentExecutorWithOptions } = require('langchain/agents');
const { DynamicTool } = require('langchain/tools');
const { BufferMemory } = require('langchain/memory');
const fs = require('fs');
const path = require('path');

// In-memory storage for appointments (MVP - no database)
let appointments = [];

// Load doctor data
const loadDoctorData = () => {
  try {
    const doctorsPath = path.join(__dirname, '../data/doctors.json');
    const doctorsData = fs.readFileSync(doctorsPath, 'utf8');
    return JSON.parse(doctorsData);
  } catch (error) {
    console.error('Error loading doctor data:', error);
    return [];
  }
};

// Tool to get available doctors
const getAvailableDoctorsTool = () => {
  return new DynamicTool({
    name: 'get_available_doctors',
    description: 'Get a list of available dermatologists with their specialties',
    func: async () => {
      const doctors = loadDoctorData();
      const doctorList = doctors.map(doctor => 
        `${doctor.name} (ID: ${doctor.id}) - ${doctor.specialty}`
      ).join(', ');
      return `Available doctors: ${doctorList}`;
    }
  });
};

// Tool to get doctor's available time slots
const getDoctorSlotsTool = () => {
  return new DynamicTool({
    name: 'get_doctor_slots',
    description: 'Get available time slots for a specific doctor. Input should be the doctor ID (e.g., dr1, dr2)',
    func: async (doctorId) => {
      const doctors = loadDoctorData();
      const doctor = doctors.find(d => d.id === doctorId.trim());
      
      if (!doctor) {
        return `Doctor with ID ${doctorId} not found. Available doctor IDs: ${doctors.map(d => d.id).join(', ')}`;
      }
      
      // Filter out already booked slots
      const bookedSlots = appointments
        .filter(apt => apt.doctorId === doctorId)
        .map(apt => apt.slot);
      
      const availableSlots = doctor.slots.filter(slot => !bookedSlots.includes(slot));
      
      if (availableSlots.length === 0) {
        return `${doctor.name} has no available slots today.`;
      }
      
      return `${doctor.name} is available at: ${availableSlots.join(', ')}`;
    }
  });
};

// Tool to book an appointment
const bookAppointmentTool = () => {
  return new DynamicTool({
    name: 'book_appointment',
    description: 'Book an appointment with a doctor. Input should be in format: "doctorId,slot,patientName" (e.g., "dr1,4:30 PM,John Doe")',
    func: async (input) => {
      try {
        const [doctorId, slot, patientName] = input.split(',').map(s => s.trim());
        
        if (!doctorId || !slot || !patientName) {
          return 'Please provide doctor ID, time slot, and patient name in format: "doctorId,slot,patientName"';
        }
        
        const doctors = loadDoctorData();
        const doctor = doctors.find(d => d.id === doctorId);
        
        if (!doctor) {
          return `Doctor with ID ${doctorId} not found.`;
        }
        
        if (!doctor.slots.includes(slot)) {
          return `${slot} is not available for ${doctor.name}. Available slots: ${doctor.slots.join(', ')}`;
        }
        
        // Check if slot is already booked
        const isBooked = appointments.some(apt => apt.doctorId === doctorId && apt.slot === slot);
        if (isBooked) {
          return `The ${slot} slot with ${doctor.name} is already booked.`;
        }
        
        // Book the appointment
        const appointment = {
          id: `apt_${Date.now()}`,
          doctorId,
          doctorName: doctor.name,
          slot,
          patientName,
          bookedAt: new Date().toISOString()
        };
        
        appointments.push(appointment);
        
        return `Appointment confirmed! ${patientName} has been booked with ${doctor.name} at ${slot}. Your appointment ID is ${appointment.id}.`;
      } catch (error) {
        return 'Error booking appointment. Please try again.';
      }
    }
  });
};

// Initialize the agent
const initializeAgent = async () => {
  try {
    const model = new ChatGoogleGenerativeAI({
      modelName: 'gemini-pro',
      apiKey: process.env.GEMINIAI_API_KEY,
      temperature: 0.7,
    });

    const tools = [
      getAvailableDoctorsTool(),
      getDoctorSlotsTool(),
      bookAppointmentTool()
    ];

    const memory = new BufferMemory({
      memoryKey: 'chat_history',
      returnMessages: true,
    });

    const executor = await initializeAgentExecutorWithOptions(tools, model, {
      agentType: 'zero-shot-react-description',
      memory,
      verbose: true,
      agentArgs: {
        prefix: `You are a helpful and friendly medical assistant for a dermatology clinic. Your role is to:

1. Greet patients warmly and ask for their name
2. Help them find available dermatologists and appointment slots
3. Book appointments when requested
4. Provide clear and professional communication
5. Always confirm appointment details before booking

Guidelines:
- Always be polite and professional
- Ask for the patient's name early in the conversation
- When showing doctor availability, mention both doctor names and their available time slots
- Before booking, always confirm the details (doctor, time, patient name)
- If a slot is unavailable, suggest alternative options
- Keep responses concise but friendly
- End conversations with appointment confirmation and thank the patient

Available doctors are dermatologists Dr. Sharma and Dr. Reddy. Use the tools to get their current availability and book appointments.

You have access to the following tools:`,
      },
    });

    return executor;
  } catch (error) {
    console.error('Error initializing agent:', error);
    throw error;
  }
};

module.exports = {
  initializeAgent,
  appointments // Export for testing/debugging
};