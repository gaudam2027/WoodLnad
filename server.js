const express = require('express');
const app = express();
const path = require('path');
require('dotenv').config();
const http = require('http');
const session = require('express-session');
const db = require('./config/db');
const userRouter = require('./routes/UserRouter');
const adminRouter = require('./routes/AdminRouter');
const passport = require('./config/passport');
const noCache = require('./middleware/noCache');
const socket = require('./config/socket'); // socket.js module
const { registerSocketEvents } = require('./sockets/index');
const startOfferStatusCron = require('./helpers/cron job/offerStatusUpdater');
const startOfferPriceCron = require('./helpers/cron job/startOfferPriceCron');


// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO with your socket.js init method
const io = socket.init(server);

// Initialize your socket event listeners
registerSocketEvents(io);

// Connect to DB
db();

// cron job
startOfferStatusCron();
startOfferPriceCron();

// Middleware
app.use(noCache);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session config
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 72 * 60 * 60 * 1000,
  }
}));

// Passport
app.use(passport.initialize());
app.use(passport.session());

// View engine & static files
app.set('view engine', 'ejs');
app.set('views', [
  path.join(__dirname, 'views/user'),
  path.join(__dirname, 'views/admin'),
]);

app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/', userRouter);
app.use('/admin', adminRouter);

// Start server
server.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
