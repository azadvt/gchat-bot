const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(bodyParser.json());

app.post('/chatbot', (req, res) => {
  const message = req.body.message?.text || '';
  const email = req.body.message?.sender?.email || '';

  const allowedEmails = ['azad.vt@techjays.com'];

  let responseText = '';

  if (!allowedEmails.includes(email)) {
    responseText = '❌ Unauthorized access.';
  } else if (message.toLowerCase().includes('hello')) {
    responseText = `Hi ${email.split('@')[0]}! 👋`;
  } else {
    responseText = `You said: "${message}"`;
  }

  // Proper Google Chat response using `cards`
  const response = {
    cards: [
      {
        header: {
          title: 'GChat Bot',
          subtitle: 'Your AI Assistant'
        },
        sections: [
          {
            widgets: [
              {
                textParagraph: {
                  text: responseText
                }
              }
            ]
          }
        ]
      }
    ]
  };

  res.json(response);
});

app.get('/', (req, res) => {
  res.send('GChat bot is running.');
});

app.listen(PORT, () => {
  console.log(`Bot server running on port ${PORT}`);
});
