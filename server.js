const express = require('express');
const app = express();
const path = require('path')
const env = require('dotenv').config();
const session = require('express-session')
const db = require('./config/db')
const userRouter = require('./routes/UserRouter.js')
const adminRouter = require('./routes/AdminRouter.js')
const passport = require('./config/passport.js')
const noCache = require('./middleware/noCache.js');


// db connect
db()

//no cache
app.use(noCache);

app.use(express.json());
app.use(express.urlencoded({extended:true}));

//session
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))

//passport
app.use(passport.initialize());
app.use(passport.session());


// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')]);
// Serve static files (CSS, images, etc.)
app.use(express.static(path.join(__dirname, 'public')));  // Serve static files from the 'public' folder


app.use('/',userRouter);
app.use('/admin',adminRouter);




// Start Server
app.listen(process.env.PORT, () => console.log(`Server running on http://localhost:${process.env.PORT}`));
