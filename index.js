const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

function logToFile(message) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync('server.log', `[${timestamp}] ${message}\n`);
}

app.use((req, res, next) => {
  const logMsg = `${req.method} ${req.path}`;
  console.log(`${new Date().toISOString()} - ${logMsg}`);
  logToFile(`${logMsg} | Body: ${JSON.stringify(req.body)}`);
  next();
});

// Helper function to determine the correct response format
function determineResponseFormat(requestBody) {
  // Check if this is a Google Workspace Add-on request
  if (requestBody.authorizationEventObject || requestBody.commonEventObject) {
    return 'workspace-addon';
  }
  // Check if this is a regular Google Chat app
  else if (requestBody.chat && requestBody.chat.messagePayload) {
    return 'chat-app';
  }
  // Default to simple text format
  else {
    return 'simple';
  }
}

// Create simple text response
function createTextResponse(text) {
  return { text: text };
}

// Create cardsV2 response for Chat apps
function createCardsV2Response(text) {
  return {
    cardsV2: [
      {
        cardId: `card-${Date.now()}`,
        card: {
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: text
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  };
}

// Create Workspace Add-on response
function createWorkspaceAddonResponse(text) {
  return {
    renderActions: {
      action: {
        navigations: [
          {
            updateCard: {
              sections: [
                {
                  widgets: [
                    {
                      textParagraph: {
                        text: text
                      }
                    }
                  ]
                }
              ]
            }
          }
        ]
      }
    }
  };
}

// Main response function that chooses the right format
function makeResponse(text, requestBody) {
  const format = determineResponseFormat(requestBody);
  
  logToFile(`Using response format: ${format}`);
  
  switch (format) {
    case 'workspace-addon':
      return createWorkspaceAddonResponse(text);
    case 'chat-app':
      return createCardsV2Response(text);
    default:
      return createTextResponse(text);
  }
}

// *** MODIFIED makeCardResponse to use the new response system ***
function makeCardResponse(text, requestBody = {}) {
  return makeResponse(text, requestBody);
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
      // *** Use makeResponse for this error too ***
      return res.status(400).json(makeResponse('Invalid request format received. Please check payload structure.', req.body));
    }

    console.log(`Determined event type: ${eventType}`);
    logToFile(`Determined event type: ${eventType} | Extracted event: ${JSON.stringify(event, null, 2)}`);

    if (!eventType) {
        console.error('Could not determine event type from request body');
        logToFile('Could not determine event type from request body');
        // *** Use makeResponse for this error too ***
        return res.status(400).json(makeResponse('Could not determine event type.', req.body));
    }

    switch (eventType) {
      case 'MESSAGE':
        return handleMessageEvent(event, req.body, res);

      case 'ADDED_TO_SPACE':
        const addedToSpaceLog = `Bot added to space: ${event.space?.name || 'unknown'}`;
        console.log(addedToSpaceLog);
        logToFile(addedToSpaceLog);
        // *** IMPORTANT CHANGE: Use makeResponse here ***
        return res.json(makeResponse('👋 Thanks for adding me to the space! I\'m ready to help. Type "hello" or "help" to get started.', req.body));

      case 'REMOVED_FROM_SPACE':
        const removedLog = `Bot removed from space: ${event.space?.name || 'unknown'}`;
        console.log(removedLog);
        logToFile(removedLog);
        // *** IMPORTANT CHANGE: Use makeResponse here ***
        return res.json(makeResponse('Goodbye! 👋', req.body));

      case 'CARD_CLICKED':
        const cardClickedLog = `Card clicked: ${event.action?.actionMethodName || 'unknown'}`;
        console.log(cardClickedLog);
        logToFile(cardClickedLog);
        // *** IMPORTANT CHANGE: Use makeResponse here ***
        return res.json(makeResponse('Card action received!', req.body));

      default:
        const unhandledLog = `Unhandled event type: ${eventType}`;
        console.log(unhandledLog);
        logToFile(unhandledLog);
        // *** IMPORTANT CHANGE: Use makeResponse here ***
        return res.json(makeResponse('I received your event but I\'m not sure how to handle it yet.', req.body));
    }
  } catch (error) {
    console.error('Error processing request:', error);
    logToFile('Error processing request: ' + error.stack);
    // *** IMPORTANT CHANGE: Use makeResponse for error messages ***
    res.status(500).json(makeResponse('Sorry, something went wrong. Please try again.', req.body));
  }
});

function handleMessageEvent(event, requestBody, res) {
  const messageText = event.message?.text || '';
  const email = event.message?.sender?.email || '';
  const spaceName = event.space?.name || '';

  const msgLog = `Message from ${email} in ${spaceName}: ${messageText}`;
  console.log(msgLog);
  logToFile(msgLog);

  if (!messageText.trim()) {
    logToFile('Empty message received');
    // *** IMPORTANT CHANGE: Use makeResponse here ***
    return res.json(makeResponse('I received your message but it appears to be empty. Please send me some text!', requestBody));
  }

  const allowedEmails = ['azad.vt@techjays.com'];
  if (!allowedEmails.includes(email)) {
    logToFile(`Unauthorized access attempt by: ${email}`);
    // *** IMPORTANT CHANGE: Use makeResponse here ***
    return res.json(makeResponse('❌ Unauthorized access. You are not authorized to use this bot. Please contact the administrator.', requestBody));
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
    reply = `🕐 Current time: ${now.toLocaleString('en-US', { timeZone: 'Asia/Bangkok' })}`;
  } else if (lowerMessage.includes('weather')) {
    reply = `🌤️ I can't check the weather yet, but I'm working on it! For now, try asking me something else.`;
  } else {
    reply = `You said: "${messageText}"\n\nI'm a simple bot. Try saying "hello", "help", or ask me about the time!`;
  }

  logToFile(`Reply to ${email}: ${reply}`);
  // *** IMPORTANT CHANGE: Use makeResponse here ***
  return res.json(makeResponse(reply, requestBody));
}

app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});