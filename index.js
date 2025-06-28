const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

const mongoose = require('mongoose')
// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err))

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// User schema and model
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  exercises: [{
    description: String,
    duration: Number,
    date: Date
  }]
})

const User = mongoose.model('User', userSchema)

app.use(express.urlencoded({ extended: false }))

app.post('/api/users', async (req, res) => {
  try {
    const { username } = req.body
    if (!username) return res.status(400).json({ error: 'Username is required' })

    const user = new User({ username })
    await user.save()
    res.json({ username: user.username, _id: user._id })
  } catch (err) {
    if (err.code === 11000) {
      res.status(400).json({ error: 'Username already taken' })
    } else {
      res.status(500).json({ error: 'Server error' })
    }
  }
})

app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id')
    res.json(users)
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const { description, duration, date } = req.body
  const { _id } = req.params

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' })
  }

  let exerciseDate = date ? new Date(date) : new Date()
  if (exerciseDate.toString() === 'Invalid Date') {
    exerciseDate = new Date()
  }

  try {
    const user = await User.findById(_id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    const exercise = {
      description,
      duration: parseInt(duration),
      date: exerciseDate
    }

    user.exercises.push(exercise)
    await user.save()

    res.json({
      _id: user._id,
      username: user.username,
      date: exercise.date.toDateString(),
      duration: exercise.duration,
      description: exercise.description
    })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})

app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query
  const { _id } = req.params

  try {
    const user = await User.findById(_id)
    if (!user) return res.status(404).json({ error: 'User not found' })

    let log = user.exercises.map(ex => ({
      description: ex.description,
      duration: ex.duration,
      date: ex.date ? ex.date.toDateString() : undefined
    }))

    // Filter by 'from' and 'to' dates if provided
    if (from) {
      const fromDate = new Date(from)
      log = log.filter(ex => new Date(ex.date) >= fromDate)
    }
    if (to) {
      const toDate = new Date(to)
      log = log.filter(ex => new Date(ex.date) <= toDate)
    }

    // Limit the number of logs if 'limit' is provided
    if (limit) {
      log = log.slice(0, parseInt(limit))
    }

    res.json({
      _id: user._id,
      username: user.username,
      count: log.length,
      log
    })
  } catch (err) {
    res.status(500).json({ error: 'Server error' })
  }
})



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
