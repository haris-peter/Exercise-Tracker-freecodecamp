require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const app = express();

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.json());
app.use(cors());
app.use(express.static('public'));

// MongoDB Connection
mongoose
  .connect(process.env.MONGOOSE_KEY, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('Connected to MongoDB Atlas'))
  .catch((err) => console.error('Error connecting to MongoDB Atlas:', err));

// Schemas and Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, default: () => new Date() },
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Routes
app.get('/', (req, res) => res.sendFile(__dirname + '/views/index.html'));

app.post('/api/users', async (req, res) => {
  const { username } = req.body;
  try {
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(400).json({ error: 'Error creating User' });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (err) {
    res.status(400).json({ error: 'Error fetching users' });
  }
});

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not defined' });
    }

    const exercise = new Exercise({
      userId: _id,
      description,
      duration: Number(duration),
      date: date ? new Date(date) : new Date(),
    });
    await exercise.save();

    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString(),
      _id: user._id,
    });
  } catch (err) {
    res.status(400).json({ error: 'Error adding exercise' });
  }
});

app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    if (from && isNaN(Date.parse(from))) {
      return res.status(400).json({ error: 'Invalid from date' });
    }
    if (to && isNaN(Date.parse(to))) {
      return res.status(400).json({ error: 'Invalid to date' });
    }

    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let query = Exercise.find({ userId: _id });
    if (from) query = query.where('date').gte(new Date(from));
    if (to) query = query.where('date').lte(new Date(to));
    if (limit) query = query.limit(Number(limit));

    const exercises = await query.exec();
    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log: exercises.map((e) => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString(),
      })),
    });
  } catch (err) {
    res.status(400).json({ error: 'Error fetching logs' });
  }
});

// Start Server
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
