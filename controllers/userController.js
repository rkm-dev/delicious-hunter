const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
	res.render('login', { title: 'Login' });
};

//for the register template
exports.registerForm = (req, res) => {
	res.render('register', { title: "Sign Up" });
};

//for validation of the user data coming from the register form
exports.validateRegister = (req, res, next) => {
	req.sanitizeBody('name');
	req.checkBody('name', 'Must Provide A Name').notEmpty();
	req.checkBody('email', 'Email Provided is not Valid').isEmail();
	req.sanitizeBody('email').normalizeEmail({
		remove_dots: false,
		remove_extension: false,
		gmail_remoave_subaddress: false
	});
	req.checkBody('password', 'Please Provide A Password').notEmpty();
	req.checkBody('confirm-password', 'Please Confirm Your Password').notEmpty();
	req.checkBody('confirm-password', 'Passwords do not match').equals(req.body.password);

	const errors = req.validationErrors();
	if(errors) {
		req.flash('error', errors.map(err => err.msg));
		res.render('register', { title: 'Sign Up', body: req.body, flashes: req.flash() });
		return; //stop further execution of this function
	}
	next(); //no errors move on to the next function
};

//register the user
exports.register = async (req, res, next) => {
	const user = new User({ email: req.body.email, name: req.body.name });
	const register = promisify(User.register, User);
	await register(user, req.body.password);
	//res.send('works');
	next(); //pass to the authController.login
};

//for the account edit page
exports.account = (req, res) => {
	res.render('account', { title: 'Edit Your Profile'} );
}

//for user account update
exports.updateAccount = async (req, res) => {
	const updates = {
		name: req.body.name,
		email: req.body.email
	};

	const user = await User.findOneAndUpdate (
		{_id: req.user._id },
		{ $set: updates },
		{ new: true, runValidators: true, context: 'query' }
	);

	req.flash('success', 'Profile Updated');
	res.redirect('back');
};