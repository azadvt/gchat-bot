const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/chatbot', (req, res) => {
  const message = req.body.message?.text || '';
  const email = req.body.message?.sender?.email || '';

  // Basic email auth
  const allowedEmails = ['azad.vt@techjays.com'];
  if (!allowedEmails.includes(email)) {
    return res.json({
      cardsV2: [
        {
          cardId: "unauthorized-card",
          card: {
            header: { title: "Unauthorized Access" },
            sections: [
              {
                widgets: [
                  {
                    textParagraph: {
                      text: "You are not authorized to use this bot."
                    }
                  }
                ]
              }
            ]
          }
        }
      ]
    });
  }

  // Handle the message
  let reply = '';
  if (message.toLowerCase().includes('hello')) {
    reply = `Hi ${email.split('@')[0]}! 👋`;
  } else {
    reply = `You said: "${message}"`;
  }

  // Respond with Google Chat card
  res.json({
    cardsV2: [
      {
        cardId: "response-card",
        card: {
          header: {
            title: "GChat Bot",
            subtitle: "Response from your bot"
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: reply
                  }
                }
              ]
            }
          ]
        }
      }
    ]
  });
});

app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
