app.post('/gchat-bot', (req, res) => {
  console.log('[RAW EVENT] Received:', JSON.stringify(req.body, null, 2));

  const eventType = req.body?.type || 'UNKNOWN';
  console.log('[EVENT TYPE]', eventType);

  if (eventType === 'MESSAGE') {
    const userMessage = req.body.message?.text || 'No message';
    const botReply = `You said: "${userMessage}"`;
    console.log('[MESSAGE] Replying:', botReply);
    return res.status(200).json({ text: botReply });
  }

  // You can handle other types here if needed
  if (eventType === 'ADDED_TO_SPACE') {
    console.log('[EVENT] Bot was added to space.');
    return res.status(200).json({ text: 'Thanks for adding me to this space!' });
  }

  if (eventType === 'REMOVED_FROM_SPACE') {
    console.log('[EVENT] Bot was removed from space.');
    return res.sendStatus(200);
  }

  console.log('[EVENT] Unknown or unsupported type');
  return res.status(200).json({ text: `Event received: ${eventType}` });
});
