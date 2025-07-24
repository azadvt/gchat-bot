const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Middleware to log all requests
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.post('/chatbot', (req, res) => {
  try {
    console.log('Received request:', JSON.stringify(req.body, null, 2));
    
    // Handle Google Chat event
    const event = req.body;
    
    if (!event || !event.type) {
      console.error('Invalid event format received');
      return res.status(400).json({
        text: 'Invalid request format'
      });
    }

    // Handle different event types
    switch (event.type) {
      case 'MESSAGE':
        return handleMessageEvent(event, res);
      
      case 'ADDED_TO_SPACE':
        return res.json({
          text: '👋 Thanks for adding me to the space! I\'m ready to help. Try saying "hello" or "help" to get started.'
        });
      
      case 'REMOVED_FROM_SPACE':
        console.log('Bot removed from space:', event.space?.name);
        return res.json({
          text: 'Goodbye! 👋'
        });
      
      case 'CARD_CLICKED':
        console.log('Card clicked:', event.action?.actionMethodName);
        return res.json({
          text: 'Card action received!'
        });
      
      default:
        console.log('Unhandled event type:', event.type);
        return res.json({
          text: 'I received your event but I\'m not sure how to handle it yet.'
        });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    res.status(500).json({
      text: 'Sorry, something went wrong. Please try again.'
    });
  }
});

function handleMessageEvent(event, res) {
  const message = event.message?.text || '';
  const email = event.message?.sender?.email || '';
  const spaceName = event.space?.name || '';

  console.log(`Message from ${email} in ${spaceName}: ${message}`);

  // Check if message is empty
  if (!message.trim()) {
    return res.json({
      text: 'I received your message but it appears to be empty. Please send me some text!'
    });
  }

  const allowedEmails = ['azad.vt@techjays.com'];
  if (!allowedEmails.includes(email)) {
    return res.json({
      text: '❌ Unauthorized access. You are not authorized to use this bot. Please contact the administrator.'
    });
  }

  // Process the message and generate response
  let reply = '';
  const lowerMessage = message.toLowerCase();
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    reply = `Hi ${email.split('@')[0]}! 👋 How can I help you today?`;
  } else if (lowerMessage.includes('help')) {
    reply = `Here are some things you can ask me:
• Say "hello" or "hi" for a greeting
• Ask me anything and I'll respond
• Say "help" to see this message again
• I'm here to help! 🤖`;
  } else if (lowerMessage.includes('time') || lowerMessage.includes('date')) {
    const now = new Date();
    reply = `🕐 Current time: ${now.toLocaleString()}`;
  } else if (lowerMessage.includes('weather')) {
    reply = `🌤️ I can't check the weather yet, but I'm working on it! For now, try asking me something else.`;
  } else {
    reply = `You said: "${message}"\n\nI'm a simple bot. Try saying "hello", "help", or ask me about the time!`;
  }

  // Return the response in the correct Google Chat format
  return res.json({
    text: reply
  });
}

app.get('/', (req, res) => {
  res.send(`
    <h1>Google Chat Bot</h1>
    <p>Bot is running successfully!</p>
    <p><strong>Endpoint:</strong> POST /chatbot</p>
    <p><strong>Status:</strong> ✅ Ready to receive Google Chat events</p>
    <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
  `);
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Bot server running on port ${PORT}`);
  console.log(`📡 Bot endpoint: http://localhost:${PORT}/chatbot`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
  console.log(`🌐 Web interface: http://localhost:${PORT}/`);
});
