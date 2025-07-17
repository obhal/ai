/**
 * Mock Agent for Testing
 * This provides a simplified version of the agent for testing without API keys
 */

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

/**
 * Mock agent that simulates conversation flow
 */
class MockAgent {
  constructor() {
    this.conversationState = {
      step: 'greeting',
      userName: null,
      selectedDoctor: null,
      selectedSlot: null
    };
  }

  async call({ input }) {
    const userInput = input.toLowerCase().trim();
    let response = '';

    switch (this.conversationState.step) {
      case 'greeting':
        if (userInput.includes('hello') || userInput.includes('hi') || userInput.includes('need')) {
          response = "Hello! I'm your healthcare assistant. May I know your name and how I can help you today?";
          this.conversationState.step = 'getting_name';
        } else {
          response = "Hello! I'm your healthcare assistant. How can I help you today?";
        }
        break;

      case 'getting_name':
        // Extract name (simple pattern matching)
        const nameMatch = userInput.match(/i'm (\w+)|my name is (\w+)|(\w+) here/i);
        if (nameMatch) {
          this.conversationState.userName = nameMatch[1] || nameMatch[2] || nameMatch[3];
        }
        
        if (userInput.includes('dermatologist') || userInput.includes('doctor') || userInput.includes('appointment')) {
          const doctors = loadDoctorData();
          response = `Nice to meet you${this.conversationState.userName ? ', ' + this.conversationState.userName : ''}! I can help you with dermatologist appointments. We have ${doctors.map(d => d.name).join(' and ')} available. Would you like to see their available time slots?`;
          this.conversationState.step = 'showing_doctors';
        } else {
          response = "Thank you! I can help you book appointments with our dermatologists. Would you like to see available doctors?";
          this.conversationState.step = 'showing_doctors';
        }
        break;

      case 'showing_doctors':
        const doctorsData = loadDoctorData();
        
        if (userInput.includes('sharma') || userInput.includes('dr1')) {
          const doctor = doctorsData.find(d => d.id === 'dr1');
          const bookedSlots = appointments.filter(apt => apt.doctorId === 'dr1').map(apt => apt.slot);
          const availableSlots = doctor.slots.filter(slot => !bookedSlots.includes(slot));
          
          response = `${doctor.name} is available at: ${availableSlots.join(', ')}. Which time slot would you prefer?`;
          this.conversationState.selectedDoctor = 'dr1';
          this.conversationState.step = 'selecting_slot';
        } else if (userInput.includes('reddy') || userInput.includes('dr2')) {
          const doctor = doctorsData.find(d => d.id === 'dr2');
          const bookedSlots = appointments.filter(apt => apt.doctorId === 'dr2').map(apt => apt.slot);
          const availableSlots = doctor.slots.filter(slot => !bookedSlots.includes(slot));
          
          response = `${doctor.name} is available at: ${availableSlots.join(', ')}. Which time slot would you prefer?`;
          this.conversationState.selectedDoctor = 'dr2';
          this.conversationState.step = 'selecting_slot';
        } else if (userInput.includes('yes') || userInput.includes('show') || userInput.includes('see')) {
          response = doctorsData.map(d => 
            `${d.name} - Available at: ${d.slots.join(', ')}`
          ).join('\n') + '\n\nWhich doctor would you prefer?';
        } else {
          response = "Would you like to see Dr. Sharma's or Dr. Reddy's availability?";
        }
        break;

      case 'selecting_slot':
        const doctorsForSlot = loadDoctorData();
        const selectedDoctor = doctorsForSlot.find(d => d.id === this.conversationState.selectedDoctor);
        const timeMatch = userInput.match(/(\d+:?\d*\s*(pm|am)|\d+\s*(pm|am)|4:?30|430)/i);
        
        if (timeMatch) {
          let timeSlot = timeMatch[0];
          // Normalize time format
          if (timeSlot.includes('4:30') || timeSlot.includes('430')) timeSlot = '4:30 PM';
          else if (timeSlot.includes('3') && timeSlot.includes('pm')) timeSlot = '3 PM';
          else if (timeSlot.includes('6')) timeSlot = '6 PM';
          else if (timeSlot.includes('2')) timeSlot = '2 PM';
          else if (timeSlot.includes('3:30') || timeSlot.includes('330')) timeSlot = '3:30 PM';
          else if (timeSlot.includes('5')) timeSlot = '5 PM';
          
          if (selectedDoctor.slots.includes(timeSlot)) {
            this.conversationState.selectedSlot = timeSlot;
            response = `Perfect! I'm confirming your ${timeSlot} appointment with ${selectedDoctor.name}${this.conversationState.userName ? ' for ' + this.conversationState.userName : ''}. Shall I proceed with the booking?`;
            this.conversationState.step = 'confirming_booking';
          } else {
            response = `I'm sorry, ${timeSlot} is not available for ${selectedDoctor.name}. Available slots are: ${selectedDoctor.slots.join(', ')}. Please choose one of these.`;
          }
        } else {
          response = `Please specify a time slot. ${selectedDoctor.name} is available at: ${selectedDoctor.slots.join(', ')}`;
        }
        break;

      case 'confirming_booking':
        if (userInput.includes('yes') || userInput.includes('proceed') || userInput.includes('confirm') || userInput.includes('book')) {
          // Book the appointment
          const doctorsForBooking = loadDoctorData();
          const selectedDoctorForBooking = doctorsForBooking.find(d => d.id === this.conversationState.selectedDoctor);
          const appointment = {
            id: `apt_${Date.now()}`,
            doctorId: this.conversationState.selectedDoctor,
            doctorName: selectedDoctorForBooking.name,
            slot: this.conversationState.selectedSlot,
            patientName: this.conversationState.userName || 'Patient',
            bookedAt: new Date().toISOString()
          };
          
          appointments.push(appointment);
          
          response = `Appointment confirmed! ${this.conversationState.userName || 'You'} ${this.conversationState.userName ? 'have' : 'has'} been booked with ${selectedDoctorForBooking.name} at ${this.conversationState.selectedSlot}. Your appointment ID is ${appointment.id}. Thank you for choosing our clinic!`;
          
          // Reset conversation state
          this.conversationState = {
            step: 'greeting',
            userName: null,
            selectedDoctor: null,
            selectedSlot: null
          };
        } else if (userInput.includes('no') || userInput.includes('cancel')) {
          response = "No problem! Would you like to choose a different time slot or doctor?";
          this.conversationState.step = 'showing_doctors';
        } else {
          response = "Please confirm if you'd like me to book this appointment. Say 'yes' to proceed or 'no' to make changes.";
        }
        break;

      default:
        response = "I'm sorry, I didn't understand. How can I help you with booking a dermatologist appointment?";
        this.conversationState.step = 'greeting';
    }

    return { output: response };
  }
}

const initializeMockAgent = async () => {
  return new MockAgent();
};

module.exports = {
  initializeMockAgent,
  appointments // Export for testing/debugging
};