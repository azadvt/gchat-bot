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
    const reqLog = 'Received full request body: ' + JSON.stringify(req.body, null, 2);
    console.log(reqLog);
    logToFile(reqLog);

    let event; // This will hold the actual event object
    let eventType; // This will hold the extracted event type

    // --- Adapt to Google Chat V1 vs V2 payloads ---
    if (req.body.type) {
      // This looks like a V1 event (e.g., MESSAGE, ADDED_TO_SPACE, REMOVED_FROM_SPACE)
      event = req.body;
      eventType = req.body.type;
    } else if (req.body.chat && req.body.chat.messagePayload) {
      // This looks like a V2 MESSAGE event
      event = req.body.chat.messagePayload; // The core event details are in messagePayload
      eventType = 'MESSAGE'; // Assume MESSAGE for now, or derive from sub-objects
      // Note: V2 can also have "ADDED_TO_SPACE" etc., which might be in req.body.chat.eventTime + other indicators,
      // but the explicit 'type' field is more reliable if present.
      // For ADDED_TO_SPACE/REMOVED_FROM_SPACE in V2, the structure is slightly different.
      // Let's refine the type detection for V2.
      if (req.body.chat.messagePayload.message) {
          eventType = 'MESSAGE';
      } else if (req.body.chat.type === 'ADDED_TO_SPACE') { // Some V2 types are at chat.type
          eventType = 'ADDED_TO_SPACE';
          event = req.body.chat; // The relevant info for ADDED is often at req.body.chat
      } else if (req.body.chat.type === 'REMOVED_FROM_SPACE') {
          eventType = 'REMOVED_FROM_SPACE';
          event = req.body.chat;
      } else if (req.body.chat.type === 'CARD_CLICKED') {
          eventType = 'CARD_CLICKED';
          event = req.body.chat;
      } else {
          // Fallback for other V2 events if 'type' is not directly present but implied
          console.warn('Unknown V2 event structure detected:', JSON.stringify(req.body, null, 2));
          eventType = 'UNKNOWN_V2_EVENT'; // Assign a fallback type
          event = req.body.chat; // Use chat object for unknown V2 events
      }
    } else {
      // Neither V1 nor recognized V2 format
      console.error('Unrecognized request format received:', JSON.stringify(req.body, null, 2));
      logToFile('Unrecognized request format received: ' + JSON.stringify(req.body));
      return res.status(400).json({
        text: 'Invalid request format received. Please check payload structure.'
      });
    }

    // Now 'event' contains the relevant data and 'eventType' has the derived type
    // Log the determined type and extracted event for debugging
    console.log(`Determined event type: ${eventType}`);
    logToFile(`Determined event type: ${eventType} | Extracted event: ${JSON.stringify(event, null, 2)}`);

    if (!eventType) { // Final check, should not happen if logic above is thorough
        console.error('Could not determine event type from request body');
        logToFile('Could not determine event type from request body');
        return res.status(400).json({
            text: 'Could not determine event type.'
        });
    }

    // Handle different event types using the derived eventType
    switch (eventType) {
      case 'MESSAGE':
        // For MESSAGE events, the original `event` variable (which is `req.body.chat.messagePayload` for V2)
        // should contain `message` and `space`.
        return handleMessageEvent(event, res);

      case 'ADDED_TO_SPACE':
        // For ADDED_TO_SPACE, the `event` is now `req.body.chat` for V2.
        // It should contain `space` information.
        const addedToSpaceLog = `Bot added to space: ${event.space?.name || 'unknown'}`;
        console.log(addedToSpaceLog);
        logToFile(addedToSpaceLog);
        return res.json({
          text: '👋 Thanks for adding me to the space! I\'m ready to help. Try saying "hello" or "help" to get started.'
        });

      case 'REMOVED_FROM_SPACE':
        const removedLog = `Bot removed from space: ${event.space?.name || 'unknown'}`;
        console.log(removedLog);
        logToFile(removedLog);
        return res.json({
          text: 'Goodbye! 👋'
        });

      case 'CARD_CLICKED':
        // For CARD_CLICKED, `event` is `req.body.chat` for V2.
        const cardClickedLog = `Card clicked: ${event.action?.actionMethodName || 'unknown'}`;
        console.log(cardClickedLog);
        logToFile(cardClickedLog);
        return res.json({
          text: 'Card action received!'
        });

      default:
        const unhandledLog = `Unhandled event type: ${eventType}`;
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

// Your handleMessageEvent function remains mostly the same,
// as it expects event.message and event.space, which will now be correctly passed from messagePayload.
function handleMessageEvent(event, res) {
  // Ensure message and space are accessed from the correct nested path for V2
  const messageText = event.message?.text || ''; // Use messageText to avoid conflict with `message` event object
  const email = event.message?.sender?.email || '';
  const spaceName = event.space?.name || '';

  const msgLog = `Message from ${email} in ${spaceName}: ${messageText}`;
  console.log(msgLog);
  logToFile(msgLog);

  // Check if message is empty
  if (!messageText.trim()) {
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
    reply = `🕐 Current time: ${now.toLocaleString()}`;
  } else if (lowerMessage.includes('weather')) {
    reply = `🌤️ I can't check the weather yet, but I'm working on it! For now, try asking me something else.`;
  } else {
    reply = `You said: "${messageText}"\n\nI'm a simple bot. Try saying "hello", "help", or ask me about the time!`;
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
