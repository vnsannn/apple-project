const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const authRoutes = require('./routes/auth.routes');
app.use('/api/v1/auth', authRoutes);

const authenticate = require('./middleware/auth');
const requireRole = require('./middleware/requireRole');

app.get('/', (req, res) => {
    res.send('Backend alive');
});

app.get('/api/v1/protected', authenticate, (req, res) => {
    res.json({ message: 'You are authenticated', user: req.user });
});

app.get('/api/v1/librarian-area', authenticate, requireRole('librarian', 'master'), (req, res) => {
    res.json({ message: 'Welcome librarian/master', user: req.user });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));