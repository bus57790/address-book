const express = require('express');
const app = express();
app.use(express.json());

let contacts = [
  { id: 1, name: "Alice Smith", phone: "222-555-0199", email: "alice@example.com" }
];

app.get('/api/contacts', (req, res) => res.json(contacts));

app.post('/api/contacts', (req, res) => {
  const contact = { id: contacts.length + 1, ...req.body };
  contacts.push(contact);
  res.status(201).json(contact);
});

app.get('/health', (req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Address Book running on port ${PORT}`));
