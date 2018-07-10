const passport = require('passport');
const mongoose = require('mongoose');
const User = mongoose.model('User');
const crypto = require('crypto');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

exports.login = passport.authenticate('local', {
	failureRedirect: '/login',
	failureFlash: 'Failed Login',
	successRedirect: '/',
	successFlash: 'Login Successful'
});

exports.logout = (req, res) => {
	req.logout();
	req.flash('success', 'Logged Out');
	res.redirect('/');
};

exports.isLoggedIn = (req, res, next) => {
	//check if the user is authenticated
	if(req.isAuthenticated()) {
		return next(); //on to the next function
	}
	req.flash('error', 'You must be logged-in');
	res.redirect('/login');
};

//password reset
exports.forgot = async (req, res) => {
	//check if the email is registered or not
	const user = await User.findOne({ email: req.body.email });
	if(!user) {
		req.flash('error', 'Email provided is not registered to any account');
		res.redirect('/login');
	}
	//if user exists, then set token with an expiry date
	user.resetPasswordToken = crypto.randomBytes(20).toString('hex');
	user.resetPasswordExpires = Date.now() + 3600000; //1 hour from now
	await user.save();
	//send the token to the user-email
	const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;
	await mail.send({
		user: user,
		subject: 'Password Reset',
		resetURL,
		filename: 'password-reset'
	});
	req.flash('success', `A password reset has been mailed to your registered email`);
	res.redirect('/login');
};

//reset URL
exports.reset = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});
	if(!user) {
		req.flash('error', 'Reset token is invalid or expired, please try again');
		return res.redirect('/login');
	}
	//if there is a user data then,
	res.render('reset', { title: 'Reset Password' });
};

//middleware for the password check
exports.confirmedPasswords = (req, res, next) => {
	if(req.body.password === req.body['confirm-password']) {
		return next();
	}
	req.flash('error', 'Passwords do not match!');
	res.redirect('back');
};

//update the password
exports.update = async (req, res) => {
	const user = await User.findOne({
		resetPasswordToken: req.params.token,
		resetPasswordExpires: { $gt: Date.now() }
	});
	if(!user) {
		req.flash('error', 'Reset token is invalid or expired, please try again');
		return res.redirect('/login');
	}

	const setPassword = promisify(user.setPassword, user);
	await setPassword(req.body.password);
	
	//remove the token and expiry date
	user.resetPasswordToken = undefined;
	user.resetPasswordExpires = undefined;
	const updateUser = await user.save();

	//automatic login
	await req.login(updateUser);
	req.flash('success', 'Password reset confirmed, you are now upated and logged-in');
	res.redirect('/');
};