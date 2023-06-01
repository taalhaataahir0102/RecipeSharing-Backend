const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));
db.once('open', () => {
  console.log('Connected to MongoDB');
});

// User schema
const userSchema = new mongoose.Schema({
  fullName: String,
  email: String,
  password: String,
});

const User = mongoose.model('User', userSchema);

// Signup endpoint
app.post('/api/form', (req, res) => {
    const { fullName, email, password } = req.body;
  
    // Create a new user
    const user = new User({ fullName, email, password });
  
    // Save the user to the database
    user
      .save()
      .then(() => {
        res.json({ message: 'Signup successful' });
      })
      .catch((err) => {
        console.error(err);
        res.status(500).json({ error: 'An error occurred while saving the user' });
      });
  });

  app.get('/api/users', (req, res) => {
    User.find()
      .then((users) => {
        res.json(users);
      })
      .catch((err) => {
        console.error('Failed to fetch users:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
      });
  });

// Catch all handler for all other request.
app.use('*', (req, res) => {
    res.json({ msg: 'no route handler found' }).end()
  })

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});