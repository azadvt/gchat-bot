const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

function makeCardV2Response(text) {
  const cardId = `card-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    actionResponse: {
      type: "NEW_MESSAGE"
    },
    cardsV2: [
      {
        cardId,
        card: {
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
      }
    ]
  };
}

app.post('/chatbot', (req, res) => {
  // Onboarding: Send welcome message when added to a space
  if (req.body.type === 'ADDED_TO_SPACE') {
    return res.json(makeCardV2Response(
      'Hi, GChat bot at your service! Type "hello" to greet me, or just send a message and I will echo it back. To restrict access, only certain emails are allowed.'
    ));
  }

  // Support both classic and V2 payloads
  let message = '';
  let email = '';

  if (req.body.message && req.body.message.text) {
    // Classic
    message = req.body.message.text;
    email = req.body.message.sender?.email || '';
  } else if (req.body.chat && req.body.chat.message && req.body.chat.message.text) {
    // V2
    message = req.body.chat.message.text;
    email = req.body.chat.message.sender?.email || '';
  } else {
    return res.json(makeCardV2Response('Invalid request format'));
  }

  const allowedEmails = ['azad.vt@techjays.com'];
  if (!allowedEmails.includes(email)) {
    return res.json(makeCardV2Response('❌ Unauthorized access.'));
  }

  let reply = '';
  if (message.toLowerCase().includes('hello')) {
    reply = `Hi ${email.split('@')[0]}! 👋 How can I help you today?`;
  } else {
    reply = `You said: "${message}"`;
  }

  res.json(makeCardV2Response(reply));
});

app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
