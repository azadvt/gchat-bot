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

// Simple response function
function makeResponse(text) {
  return { text: text };
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
      event = req.body;
      eventType = req.body.type;
    } else if (req.body.chat) {
        if (req.body.chat.messagePayload && req.body.chat.messagePayload.message) {
            event = req.body.chat.messagePayload;
            eventType = 'MESSAGE';
        } else if (req.body.chat.type) {
            event = req.body.chat;
            eventType = req.body.chat.type;
        } else {
            console.warn('Unknown V2 event structure within chat object:', JSON.stringify(req.body, null, 2));
            eventType = 'UNKNOWN_V2_EVENT_CHAT';
            event = req.body.chat;
        }
    } else {
      console.error('Unrecognized request format received:', JSON.stringify(req.body, null, 2));
      logToFile('Unrecognized request format received: ' + JSON.stringify(req.body));
      return res.status(400).json(makeResponse('Invalid request format received. Please check payload structure.'));
    }

    console.log(`Determined event type: ${eventType}`);
    logToFile(`Determined event type: ${eventType} | Extracted event: ${JSON.stringify(event, null, 2)}`);

    if (!eventType) {
        console.error('Could not determine event type from request body');
        logToFile('Could not determine event type from request body');
        return res.status(400).json(makeResponse('Could not determine event type.'));
    }

    switch (eventType) {
      case 'MESSAGE':
        return handleMessageEvent(event, res);

      case 'ADDED_TO_SPACE':
        const addedToSpaceLog = `Bot added to space: ${event.space?.name || 'unknown'}`;
        console.log(addedToSpaceLog);
        logToFile(addedToSpaceLog);
        return res.json(makeResponse('👋 Thanks for adding me to the space! I\'m ready to help. Type "hello" or "help" to get started.'));

      case 'REMOVED_FROM_SPACE':
        const removedLog = `Bot removed from space: ${event.space?.name || 'unknown'}`;
        console.log(removedLog);
        logToFile(removedLog);
        return res.json(makeResponse('Goodbye! 👋'));

      case 'CARD_CLICKED':
        const cardClickedLog = `Card clicked: ${event.action?.actionMethodName || 'unknown'}`;
        console.log(cardClickedLog);
        logToFile(cardClickedLog);
        return res.json(makeResponse('Card action received!'));

      default:
        const unhandledLog = `Unhandled event type: ${eventType}`;
        console.log(unhandledLog);
        logToFile(unhandledLog);
        return res.json(makeResponse('I received your event but I\'m not sure how to handle it yet.'));
    }
  } catch (error) {
    console.error('Error processing request:', error);
    logToFile('Error processing request: ' + error.stack);
    res.status(500).json(makeResponse('Sorry, something went wrong. Please try again.'));
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
    return res.json(makeResponse('I received your message but it appears to be empty. Please send me some text!'));
  }

  const allowedEmails = ['azad.vt@techjays.com'];
  if (!allowedEmails.includes(email)) {
    logToFile(`Unauthorized access attempt by: ${email}`);
    return res.json(makeResponse('❌ Unauthorized access. You are not authorized to use this bot. Please contact the administrator.'));
  }

  // Only respond to hello/hi messages
  const lowerMessage = messageText.toLowerCase();
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    const name = email.split('@')[0];
    const reply = `Hi ${name}, how can I help you?`;
    
    logToFile(`Reply to ${email}: ${reply}`);
    return res.json(makeResponse(reply));
  }

  // For all other messages, don't respond or give a simple message
  logToFile(`No response for message: ${messageText}`);
  return res.json(makeResponse('Please say hello to start our conversation.'));
}

app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});