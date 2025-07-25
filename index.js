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

// Helper function to determine response format based on request
function getResponseFormat(event) {
  // If the request has authorizationEventObject or commonEventObject, it's likely a Workspace Add-on
  if (event.authorizationEventObject || event.commonEventObject) {
    return 'addon';
  }
  return 'chat';
}

// Helper function to create add-on card response
function createAddonCardResponse(text) {
  return {
    renderActions: {
      action: {
        navigations: [{
          updateCard: {
            sections: [{
              widgets: [{
                textParagraph: {
                  text: text
                }
              }]
            }]
          }
        }]
      }
    }
  };
}

// Helper function to create simple card response
function createSimpleCardResponse(text) {
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

// Helper function to create text response
function createTextResponse(text) {
  return {
    text: text
  };
}

app.post('/chatbot', (req, res) => {
  try {
    const reqLog = 'Received request: ' + JSON.stringify(req.body, null, 2);
    console.log(reqLog);
    logToFile(reqLog);
    
    // Handle Google Chat event
    const event = req.body;
    
    // Determine response format
    const responseFormat = getResponseFormat(event);
    logToFile(`Response format detected: ${responseFormat}`);
    
    // Check for different Google Chat event formats
    let eventType = null;
    let messageData = null;
    let spaceData = null;
    let senderData = null;
    
    if (event.type) {
      // Direct event format
      eventType = event.type;
      messageData = event.message;
      spaceData = event.space;
      senderData = event.message?.sender;
    } else if (event.chat && event.chat.messagePayload) {
      // Wrapped event format (what you're receiving)
      eventType = 'MESSAGE'; // This is a message event
      messageData = event.chat.messagePayload.message;
      spaceData = event.chat.messagePayload.space;
      senderData = event.chat.messagePayload.message?.sender;
    } else if (event.eventTime && event.space) {
      // Another possible format
      eventType = event.type || 'MESSAGE';
      messageData = event.message;
      spaceData = event.space;
      senderData = event.message?.sender;
    } else {
      console.error('Invalid event format received');
      logToFile('Invalid event format received - unrecognized structure');
      const errorResponse = responseFormat === 'addon' 
        ? createAddonCardResponse('Invalid request format')
        : createTextResponse('Invalid request format');
      return res.status(400).json(errorResponse);
    }

    logToFile(`Parsed event type: ${eventType}`);

    // Handle different event types
    switch (eventType) {
      case 'MESSAGE':
        return handleMessageEvent(messageData, senderData, spaceData, responseFormat, res);
      
      case 'ADDED_TO_SPACE':
        logToFile('Bot added to space');
        const welcomeResponse = responseFormat === 'addon'
          ? createAddonCardResponse('👋 Thanks for adding me to the space! I\'m ready to help. Try saying "hello" or "help" to get started.')
          : createTextResponse('👋 Thanks for adding me to the space! I\'m ready to help. Try saying "hello" or "help" to get started.');
        return res.json(welcomeResponse);
      
      case 'REMOVED_FROM_SPACE':
        const removedLog = `Bot removed from space: ${spaceData?.name}`;
        console.log(removedLog);
        logToFile(removedLog);
        const goodbyeResponse = responseFormat === 'addon'
          ? createAddonCardResponse('Goodbye! 👋')
          : createTextResponse('Goodbye! 👋');
        return res.json(goodbyeResponse);
      
      case 'CARD_CLICKED':
        const cardClickedLog = `Card clicked: ${event.action?.actionMethodName}`;
        console.log(cardClickedLog);
        logToFile(cardClickedLog);
        const cardResponse = responseFormat === 'addon'
          ? createAddonCardResponse('Card action received!')
          : createTextResponse('Card action received!');
        return res.json(cardResponse);
      
      default:
        const unhandledLog = `Unhandled event type: ${eventType}`;
        console.log(unhandledLog);
        logToFile(unhandledLog);
        const defaultResponse = responseFormat === 'addon'
          ? createAddonCardResponse('I received your event but I\'m not sure how to handle it yet.')
          : createTextResponse('I received your event but I\'m not sure how to handle it yet.');
        return res.json(defaultResponse);
    }
  } catch (error) {
    console.error('Error processing request:', error);
    logToFile('Error processing request: ' + error.stack);
    const errorResponse = getResponseFormat(req.body) === 'addon'
      ? createAddonCardResponse('Sorry, something went wrong. Please try again.')
      : createTextResponse('Sorry, something went wrong. Please try again.');
    res.status(500).json(errorResponse);
  }
});

function handleMessageEvent(messageData, senderData, spaceData, responseFormat, res) {
  const message = messageData?.text || messageData?.argumentText || messageData?.formattedText || '';
  const email = senderData?.email || '';
  const spaceName = spaceData?.name || '';

  const msgLog = `Message from ${email} in ${spaceName}: ${message}`;
  console.log(msgLog);
  logToFile(msgLog);

  // Check if message is empty
  if (!message.trim()) {
    logToFile('Empty message received');
    const emptyResponse = responseFormat === 'addon'
      ? createAddonCardResponse('I received your message but it appears to be empty. Please send me some text!')
      : createTextResponse('I received your message but it appears to be empty. Please send me some text!');
    return res.json(emptyResponse);
  }

  const allowedEmails = ['azad.vt@techjays.com'];
  if (!allowedEmails.includes(email)) {
    logToFile(`Unauthorized access attempt by: ${email}`);
    const unauthorizedResponse = responseFormat === 'addon'
      ? createAddonCardResponse('❌ Unauthorized access. You are not authorized to use this bot. Please contact the administrator.')
      : createTextResponse('❌ Unauthorized access. You are not authorized to use this bot. Please contact the administrator.');
    return res.json(unauthorizedResponse);
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

  logToFile(`Reply to ${email}: ${reply} (Format: ${responseFormat})`);
  
  // Return the response in the correct format
  const response = responseFormat === 'addon'
    ? createAddonCardResponse(reply)
    : createTextResponse(reply);
  
  return res.json(response);
}
app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
