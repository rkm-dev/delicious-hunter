const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');

//providing the model to passport to act upon
passport.use(User.createStrategy());

//providing the config to passport, so that it can embed each request with the user data, when the user is logged-in
passport.serializeUser(User.serializeUser());

//same as above but this will reverse the above process and remove the user data from the requests
passport.deserializeUser(User.deserializeUser());