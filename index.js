const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Helper function to log to file (keep this, it's good for debugging)
function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('server.log', `[${timestamp}] ${message}\n`);
}

// Middleware to log all requests (keep this, it's good for debugging)
app.use((req, res, next) => {
  const logMsg = `${req.method} ${req.path}`;
  console.log(`${new Date().toISOString()} - ${logMsg}`);
  logToFile(`${logMsg} | Body: ${JSON.stringify(req.body)}`);
  next();
});

// THIS FUNCTION IS CORRECT FOR CREATING A CARD RESPONSE
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
    const reqLog = 'Received full request body: ' + JSON.stringify(req.body, null, 2);
    console.log(reqLog);
    logToFile(reqLog);

    let event;
    let eventType;

    // --- Adapt to Google Chat V1 vs V2 payloads ---
    if (req.body.type) {
      // V1 Event
      event = req.body;
      eventType = req.body.type;
    } else if (req.body.chat) { // Check if 'chat' object exists for V2 events
        if (req.body.chat.messagePayload && req.body.chat.messagePayload.message) {
            // V2 MESSAGE event
            event = req.body.chat.messagePayload;
            eventType = 'MESSAGE';
        } else if (req.body.chat.type) {
            // Other V2 events (ADDED_TO_SPACE, REMOVED_FROM_SPACE, CARD_CLICKED)
            event = req.body.chat;
            eventType = req.body.chat.type;
        } else {
            // Fallback for unrecognized V2 structure within 'chat'
            console.warn('Unknown V2 event structure within chat object:', JSON.stringify(req.body, null, 2));
            eventType = 'UNKNOWN_V2_EVENT_CHAT';
            event = req.body.chat;
        }
    } else {
      // Neither V1 nor recognized V2 format
      console.error('Unrecognized request format received:', JSON.stringify(req.body, null, 2));
      logToFile('Unrecognized request format received: ' + JSON.stringify(req.body));
      return res.status(400).json(makeCardResponse('Invalid request format received. Please check payload structure.')); // Use card response for error
    }

    console.log(`Determined event type: ${eventType}`);
    logToFile(`Determined event type: ${eventType} | Extracted event: ${JSON.stringify(event, null, 2)}`);

    if (!eventType) {
        console.error('Could not determine event type from request body');
        logToFile('Could not determine event type from request body');
        return res.status(400).json(makeCardResponse('Could not determine event type.')); // Use card response for error
    }

    // Handle different event types
    switch (eventType) {
      case 'MESSAGE':
        return handleMessageEvent(event, res);

      case 'ADDED_TO_SPACE':
        const addedToSpaceLog = `Bot added to space: ${event.space?.name || 'unknown'}`;
        console.log(addedToSpaceLog);
        logToFile(addedToSpaceLog);
        // *** IMPORTANT CHANGE HERE: Use makeCardResponse ***
        return res.json(makeCardResponse('👋 Thanks for adding me to the space! I\'m ready to help. Try saying "hello" or "help" to get started.'));

      case 'REMOVED_FROM_SPACE':
        const removedLog = `Bot removed from space: ${event.space?.name || 'unknown'}`;
        console.log(removedLog);
        logToFile(removedLog);
        // *** IMPORTANT CHANGE HERE: Use makeCardResponse for consistency, though this won't be seen by user ***
        return res.json(makeCardResponse('Goodbye! 👋'));

      case 'CARD_CLICKED':
        const cardClickedLog = `Card clicked: ${event.action?.actionMethodName || 'unknown'}`;
        console.log(cardClickedLog);
        logToFile(cardClickedLog);
        // *** IMPORTANT CHANGE HERE: Use makeCardResponse ***
        return res.json(makeCardResponse('Card action received!'));

      default:
        const unhandledLog = `Unhandled event type: ${eventType}`;
        console.log(unhandledLog);
        logToFile(unhandledLog);
        // *** IMPORTANT CHANGE HERE: Use makeCardResponse ***
        return res.json(makeCardResponse('I received your event but I\'m not sure how to handle it yet.'));
    }
  } catch (error) {
    console.error('Error processing request:', error);
    logToFile('Error processing request: ' + error.stack);
    // *** IMPORTANT CHANGE HERE: Use makeCardResponse for error messages ***
    res.status(500).json(makeCardResponse('Sorry, something went wrong. Please try again.'));
  }
});

function handleMessageEvent(event, res) {
  const messageText = event.message?.text || '';
  const email = event.message?.sender?.email || '';
  const spaceName = event.space?.name || '';

  const msgLog = `Message from ${email} in ${spaceName}: ${messageText}`;
  console.log(msgLog);
  logToFile(msgLog);

  if (!messageText.trim()) {
    logToFile('Empty message received');
    // *** IMPORTANT CHANGE HERE: Use makeCardResponse ***
    return res.json(makeCardResponse('I received your message but it appears to be empty. Please send me some text!'));
  }

  const allowedEmails = ['azad.vt@techjays.com'];
  if (!allowedEmails.includes(email)) {
    logToFile(`Unauthorized access attempt by: ${email}`);
    // *** IMPORTANT CHANGE HERE: Use makeCardResponse ***
    return res.json(makeCardResponse('❌ Unauthorized access. You are not authorized to use this bot. Please contact the administrator.'));
  }

  let reply = '';
  const lowerMessage = messageText.toLowerCase();

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
    // Using current time: Friday, July 25, 2025 at 9:19:38 AM +07
    reply = `🕐 Current time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`;
  } else if (lowerMessage.includes('weather')) {
    reply = `🌤️ I can't check the weather yet, but I'm working on it! For now, try asking me something else.`;
  } else {
    reply = `You said: "${messageText}"\n\nI'm a simple bot. Try saying "hello", "help", or ask me about the time!`;
  }

  logToFile(`Reply to ${email}: ${reply}`);
  // *** IMPORTANT CHANGE HERE: Always use makeCardResponse ***
  return res.json(makeCardResponse(reply));
}

app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});