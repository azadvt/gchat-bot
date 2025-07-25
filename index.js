const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Helper function to log to file
function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('server.log', `[${timestamp}] ${message}\n`);
}

// Middleware to log all requests
app.use((req, res, next) => {
  const logMsg = `${req.method} ${req.path}`;
  console.log(`${new Date().toISOString()} - ${logMsg}`);
  logToFile(`${logMsg} | Body: ${JSON.stringify(req.body)}`);
  next();
});

function makeCardResponse(text) {
  return {
    cards: [
      {
        sections: [
          {
            widgets: [
              {
                textParagraph: {
                  text
                }
              }
            ]
          }
        ]
      }
    ]
  };
}

app.post('/chatbot', (req, res) => {
  try {
    const reqLog = 'Received request: ' + JSON.stringify(req.body, null, 2);
    console.log(reqLog);
    logToFile(reqLog);
    
    // Handle Google Chat event
    const event = req.body;
    
    if (!event || !event.type) {
      console.error('Invalid event format received');
      logToFile('Invalid event format received');
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
        const removedLog = `Bot removed from space: ${event.space?.name}`;
        console.log(removedLog);
        logToFile(removedLog);
        return res.json({
          text: 'Goodbye! 👋'
        });
      
      case 'CARD_CLICKED':
        const cardClickedLog = `Card clicked: ${event.action?.actionMethodName}`;
        console.log(cardClickedLog);
        logToFile(cardClickedLog);
        return res.json({
          text: 'Card action received!'
        });
      
      default:
        const unhandledLog = `Unhandled event type: ${event.type}`;
        console.log(unhandledLog);
        logToFile(unhandledLog);
        return res.json({
          text: 'I received your event but I\'m not sure how to handle it yet.'
        });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    logToFile('Error processing request: ' + error.stack);
    res.status(500).json({
      text: 'Sorry, something went wrong. Please try again.'
    });
  }
});

function handleMessageEvent(event, res) {
  const message = event.message?.text || '';
  const email = event.message?.sender?.email || '';
  const spaceName = event.space?.name || '';

  const msgLog = `Message from ${email} in ${spaceName}: ${message}`;
  console.log(msgLog);
  logToFile(msgLog);

  // Check if message is empty
  if (!message.trim()) {
    logToFile('Empty message received');
    return res.json({
      text: 'I received your message but it appears to be empty. Please send me some text!'
    });
  }

  const allowedEmails = ['azad.vt@techjays.com'];
  if (!allowedEmails.includes(email)) {
    logToFile(`Unauthorized access attempt by: ${email}`);
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

  logToFile(`Reply to ${email}: ${reply}`);
  // Return the response in the correct Google Chat format
  return res.json({
    text: reply
  });
}

app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
