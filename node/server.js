const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET must be set in node/.env before starting the API');
}

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/dashboard'));
app.use('/api/batches', require('./routes/batches'));
app.use('/api/students', require('./routes/students'));
  app.use('/api/attendance', require('./routes/attendance'));
  app.use('/api/fees', require('./routes/fees'));
app.use('/api/enquiries', require('./routes/enquiries'));
app.use('/api/teacher-invites', require('./routes/teacherInvites'));
app.use('/api/teachers', require('./routes/teachers'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/teacher-events', require('./routes/teacherEvents'));
app.use('/api/student', require('./routes/studentPortal'));
app.use('/api/events', require('./routes/events'));
app.use('/api/notes', require('./routes/notes'));

// Health check
app.get('/', (req, res) => {
  res.json({ message: 'TuitionDesk API is running' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tuitiondesk')
  .then(() => {
    console.log('MongoDB connected');
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
