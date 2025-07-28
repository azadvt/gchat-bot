const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

// Middleware to log all requests
app.use((req, res, next) => {
  const logMsg = `${req.method} ${req.path}`;
  console.log(`${new Date().toISOString()} - ${logMsg}`);
  console.log(`${logMsg} | Body: ${JSON.stringify(req.body)}`);
  console.log(`Headers: ${JSON.stringify(req.headers)}`);
  next();
});

// Simple response function for Google Workspace Add-ons
function makeResponse(text) {
  return {
    cards: [{
      sections: [{
        widgets: [{
          textParagraph: {
            text: text
          }
        }]
      }]
    }]
  };
}

// Helper function to send response with proper headers
function sendChatResponse(res, responseData) {
  try {
    console.log(`SENDING RESPONSE: ${JSON.stringify(responseData)}`);
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    const response = res.status(200).json(responseData);
    console.log(`RESPONSE SENT SUCCESSFULLY`);
    return response;
  } catch (error) {
    console.error(`ERROR SENDING RESPONSE: ${error.message}`);
    console.error(`ERROR STACK: ${error.stack}`);
    throw error;
  }
}

app.post('/chatbot', (req, res) => {
  console.log('=== WEBHOOK REQUEST RECEIVED ===');
  
  try {
    const reqLog = 'Received full request body: ' + JSON.stringify(req.body, null, 2);
    console.log(reqLog);

    let event;
    let eventType;

    // Handle different Google Chat webhook structures
    if (req.body.type) {
      // Direct event structure
      event = req.body;
      eventType = req.body.type;
    } else if (req.body.chat && req.body.chat.messagePayload) {
      // Interactive card/app configuration event with message payload
      event = req.body.chat.messagePayload;
      eventType = 'MESSAGE';
    } else if (req.body.authorizationEventObject) {
      // App authorization event - treat as configuration
      eventType = 'AUTHORIZATION';
      event = req.body;
    } else {
      console.error('Unrecognized request format received:', JSON.stringify(req.body, null, 2));
      console.log('Unrecognized request format received: ' + JSON.stringify(req.body));
              res.status(400);
        return sendChatResponse(res, makeResponse('Invalid request format received. Please check payload structure.'));
    }

    if (!eventType) {
        console.error('Could not determine event type from request body');
        console.log('Could not determine event type from request body');
        res.status(400);
        return sendChatResponse(res, makeResponse('Could not determine event type.'));
    }

    console.log(`Determined event type: ${eventType}`);

    switch (eventType) {
      case 'MESSAGE':
        return handleMessageEvent(event, res);

      case 'ADDED_TO_SPACE':
        const addedToSpaceLog = `Bot added to space: ${event.space?.name || 'unknown'}`;
        console.log(addedToSpaceLog);
        return sendChatResponse(res, makeResponse('👋 Thanks for adding me to the space! I\'m ready to help. Type "hello" or "help" to get started.'));

      case 'REMOVED_FROM_SPACE':
        const removedLog = `Bot removed from space: ${event.space?.name || 'unknown'}`;
        console.log(removedLog);
        return sendChatResponse(res, makeResponse('Goodbye! 👋'));

      case 'CARD_CLICKED':
        const cardClickedLog = `Card clicked: ${event.action?.actionMethodName || 'unknown'}`;
        console.log(cardClickedLog);
        return sendChatResponse(res, makeResponse('Card action received!'));

      case 'AUTHORIZATION':
        console.log('Authorization event received');
        return sendChatResponse(res, makeResponse('✅ Bot authorization completed successfully!'));

      default:
        const unhandledLog = `Unhandled event type: ${eventType}`;
        console.log(unhandledLog);
        return sendChatResponse(res, makeResponse('I received your event but I\'m not sure how to handle it yet.'));
    }
  } catch (error) {
    console.error('Error processing request:', error);
    console.log('Error processing request: ' + error.stack);
    res.status(500);
    return sendChatResponse(res, makeResponse('Sorry, something went wrong. Please try again.'));
  }
});

function handleMessageEvent(event, res) {
  console.log('=== START handleMessageEvent ===');
  
  // Extract data from the actual webhook structure
  const messageText = event.message?.text || '';
  const email = event.message?.sender?.email || '';
  const spaceName = event.space?.name || '';

  console.log(`Raw messageText: "${messageText}"`);
  console.log(`Raw email: "${email}"`);
  console.log(`Raw spaceName: "${spaceName}"`);

  const msgLog = `Message from ${email} in ${spaceName}: ${messageText}`;
  console.log(msgLog);

  if (!messageText.trim()) {
    console.log('Empty message received - sending empty message response');
    return sendChatResponse(res, makeResponse('I received your message but it appears to be empty. Please send me some text!'));
  }

  console.log(`Checking email authorization for: ${email}`);
  const allowedEmails = ['azad.vt@techjays.com'];
  if (!allowedEmails.includes(email)) {
    console.log(`Unauthorized access attempt by: ${email} - sending unauthorized response`);
    return sendChatResponse(res, makeResponse('❌ Unauthorized access. You are not authorized to use this bot. Please contact the administrator.'));
  }

  console.log(`Email ${email} is authorized - processing message`);

  // Only respond to hello/hi messages
  const lowerMessage = messageText.toLowerCase();
  console.log(`Lowercase message: "${lowerMessage}"`);
  
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
    console.log('Message contains hello/hi - generating response');
    const name = email.split('@')[0];
    const reply = `Hi ${name}, how can I help you?`;
    
    console.log(`Generated reply: ${reply}`);
    console.log(`Sending response: ${JSON.stringify(makeResponse(reply))}`);
    console.log('=== END handleMessageEvent (hello response) ===');
    return sendChatResponse(res, makeResponse(reply));
  }

  // For all other messages, don't respond or give a simple message
  console.log(`Message does not contain hello/hi - sending default response`);
  console.log(`Sending response: ${JSON.stringify(makeResponse('Please say hello to start our conversation.'))}`);
  console.log('=== END handleMessageEvent (default response) ===');
  return sendChatResponse(res, makeResponse('Please say hello to start our conversation.'));
}

app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

// Test endpoint to verify webhook is accessible
app.get('/chatbot', (req, res) => {
  console.log('GET request to /chatbot endpoint');
  res.json({ 
    status: 'ok', 
    message: 'Webhook endpoint is accessible',
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});