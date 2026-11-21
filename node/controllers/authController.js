const User = require('../models/User');
const bcrypt = require('bcryptjs');

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: 'User account is unavailable' });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          tuitionName: user.tuitionName,
          phone: user.phone,
          role: user.role,
          subject: user.subject || '',
          batchIds: user.batchIds || [],
          ownerId: user.ownerId || null,
        },
      },
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Failed to fetch current user' });
  }
};

// Register new user
const register = async (req, res) => {
  try {
    const { tuitionName, name, email, phone, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create new user
    const newUser = await User.create({
      tuitionName,
      name,
      email,
      phone,
      password,
    });

    // Remove password from response
    newUser.password = undefined;

    // Generate token
    const token = newUser.generateAuthToken();

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        user: {
          id: newUser._id,
          email: newUser.email,
          name: newUser.name,
          tuitionName: newUser.tuitionName,
          phone: newUser.phone,
        },
        token,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({ message: messages.join(', ') });
    }
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    res.status(500).json({ message: 'Registration failed' });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user by email (include password for comparison)
    const user = await User.findOne({ email }).select('+password +authVersion');

    // Check if user exists
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = user.generateAuthToken();

    // Update last login
    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    // Remove password from response
    user.password = undefined;

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          tuitionName: user.tuitionName,
          phone: user.phone,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Login failed' });
  }
};

module.exports = { register, login, getMe };
