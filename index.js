const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require("path");

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "./client/build")));

app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "./client/build/index.html"));
});

// MongoDB setup
const atlasURI = 'mongodb+srv://talha:talha@cluster0.fkpkyuy.mongodb.net/'; // Replace with your MongoDB Atlas connection URI
mongoose.connect(atlasURI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});
const connection = mongoose.connection;
connection.once('open', () => {
  console.log('Connected to MongoDB');
});

// Form model
const formSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
});

const Form = mongoose.model('Form', formSchema);

// Routes
app.post('/submit', (req, res) => {
  const { name, email, password } = req.body;
  const newForm = new Form({ name, email, password });

  newForm
    .save()
    .then(() => res.json('Form submitted successfully'))
    .catch((err) => res.status(400).json('Error: ' + err));
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
