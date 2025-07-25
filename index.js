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

// REMOVING makeCardResponse FOR NOW TO SIMPLIFY AND DEBUG THE ERROR
// If you want to use cards later, we'll reintroduce it with the correct top-level structure.
// For now, let's focus on getting ANY valid response through.

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
      // Use simple text response for error
      return res.status(400).json({ text: 'Invalid request format received. Please check payload structure.' });
    }

    console.log(`Determined event type: ${eventType}`);
    logToFile(`Determined event type: ${eventType} | Extracted event: ${JSON.stringify(event, null, 2)}`);

    if (!eventType) {
        console.error('Could not determine event type from request body');
        logToFile('Could not determine event type from request body');
        // Use simple text response for error
        return res.status(400).json({ text: 'Could not determine event type.' });
    }

    // Handle different event types
    switch (eventType) {
      case 'MESSAGE':
        return handleMessageEvent(event, res);

      case 'ADDED_TO_SPACE':
        const addedToSpaceLog = `Bot added to space: ${event.space?.name || 'unknown'}`;
        console.log(addedToSpaceLog);
        logToFile(addedToSpaceLog);
        // *** IMPORTANT CHANGE HERE: Revert to simple text response ***
        return res.json({ text: '👋 Thanks for adding me to the space! I\'m ready to help. Try saying "hello" or "help" to get started.' });

      case 'REMOVED_FROM_SPACE':
        const removedLog = `Bot removed from space: ${event.space?.name || 'unknown'}`;
        console.log(removedLog);
        logToFile(removedLog);
        // *** IMPORTANT CHANGE HERE: Revert to simple text response ***
        return res.json({ text: 'Goodbye! 👋' });

      case 'CARD_CLICKED':
        const cardClickedLog = `Card clicked: ${event.action?.actionMethodName || 'unknown'}`;
        console.log(cardClickedLog);
        logToFile(cardClickedLog);
        // *** IMPORTANT CHANGE HERE: Revert to simple text response ***
        return res.json({ text: 'Card action received!' });

      default:
        const unhandledLog = `Unhandled event type: ${eventType}`;
        console.log(unhandledLog);
        logToFile(unhandledLog);
        // *** IMPORTANT CHANGE HERE: Revert to simple text response ***
        return res.json({ text: 'I received your event but I\'m not sure how to handle it yet.' });
    }
  } catch (error) {
    console.error('Error processing request:', error);
    logToFile('Error processing request: ' + error.stack);
    // *** IMPORTANT CHANGE HERE: Revert to simple text response for error messages ***
    res.status(500).json({ text: 'Sorry, something went wrong. Please try again.' });
  }
});

function handleMessageEvent(event, res) {
  console.log('handleMessageEvent called.');
  logToFile('handleMessageEvent called.');
  // Temporarily bypass all logic, just send a response
  return res.json({ text: 'Hello from simplified bot!' });
}

app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});