const mongoose = require('mongoose');
const Store    = mongoose.model('Store');
const User     = mongoose.model('User');

const multer = require('multer');
const jimp   = require('jimp');
const uuid   = require('uuid');

const multerOptions = {
	storage: multer.memoryStorage(),
	fileFilter: function(req, file, next) {
		const isPhoto = file.mimetype.startsWith('image/');
		if(isPhoto) {
			next(null, true);
		}else {
			next({ message: 'This filetype isn\'t allowed!' }, false);
		}
	}
};

//pointing multer function to the form field with the name 'photo'  
exports.upload = multer(multerOptions).single('photo');

//resizing the uploaded image
exports.resize = async (req, res, next) => {
	//check is there is any file
	if(!req.file) {
		next(); //skip to next middleware or function
		return;
	}
	//console.log(req.file);
	//rename the file with unique code
	const extension = req.file.mimetype.split('/')[1];
	req.body.photo = `${uuid.v4()}.${extension}`;
	//now resize
	const photo = await jimp.read(req.file.buffer);
	await photo.resize(800, jimp.AUTO);
	await photo.write(`./public/uploads/${req.body.photo}`);
	//to the next function
	next();
};

exports.homePage = (req, res) => {
	res.render('index');
};

//controller for add store page
exports.addStore = (req, res) => {
	//res.send("hello, there add link works");
	res.render('editStore', { title: 'Add Store' });
};

//for handelling the addStore post data
// exports.createStore = async(req, res) => {
// 	//res.json(req.body);
// 	const store = new Store(req.body);
// 	await store.save();
// 	console.log("store save success");
// 	req.flash('success', `Successfully Created ${store.name} store space.`);
// 	res.redirect('/');
// }

exports.createStore = async(req, res) => {
	req.body.author = req.user._id;
	const store = await (new Store(req.body)).save();
	console.log("store save success");
	req.flash('success', `Successfully Created <strong>${store.name}</strong> store space.`);
	res.redirect(`/stores/${store.slug}`);
}


//for displaying all the stores
exports.getStores = async (req, res) => {
	const page = req.params.page || 1;
	if(isNaN(page) || page < 1) {
		res.redirect(`/stores/page/1`);
		return;
	}
	const limit = 4; //4 stores per page
	const skip = (page * limit) - limit; // skip the given starting number of stores from the list

	const storesPromise = Store.find().skip(skip).limit(limit).sort({ created: 'desc'});
	const countPromise  = Store.count();

	const [stores, count] = await Promise.all([storesPromise, countPromise]);
	const pages = Math.ceil(count /  limit); 
	
	if(!stores.length && skip) {
		req.flash('info', `Your request for the page ${page} is currently unavailable. But we have put you on page ${pages}`);
		res.redirect(`/stores/page/${pages}`);
		return;
	}
	res.render('stores', { title: 'Stores', stores, page, pages, count});
}

//confirm owner before edit
const confirmOwner = (store, user) => {
	if(!store.author.equals(user._id)) {
		throw Error('You must own a store in order to edit it!');
	}
};

//for the store-edit page
exports.editStore = async (req, res) => {
	const store = await Store.findOne({ _id: req.params.id });
	confirmOwner(store, req.user);
	res.render('editStore', { title: `Edit: ${store.name} `, store });
}

//for storing the updated data
exports.updateStore = async (req, res) => {
	//set the location data to be of type "Point" before we send the data
	req.body.location.type = 'Point';
	//find the store by id and update its content
	const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
		new: true, //returns the new store instead of the old one
		runValidators: true
	}).exec();
	
	req.flash('success', `<strong>${store.name}:</strong> successfully updated, <a href="/stores/${store.slug}"><strong>View Store ➙</strong></a>`);

	res.redirect(`/stores/${store._id}/edit`);
};

//for single page store preview
exports.getStoreBySlug = async (req, res, next) => {
	const store = await Store.findOne({slug: req.params.slug}).populate('author reviews');
	if(!store) return next();
	//res.json(store);
	res.render('store', { store, title: store.name });
}

//for the tags
exports.getStoresByTag = async (req, res) => {
	const tag = req.params.tag;
	const tagQuery = tag || { $exists: true };
	const storesPromise = Store.find({ tags: tagQuery });
	const tagsPromise = Store.getTagsList();
	const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);
	res.render('tags', { title: 'Tags', tags, tag, stores });
};

//for map page
exports.mapPage = (req, res) => {
	res.render('map', { title: "Locate Stores" });
};

//for '/top' link
exports.getTopStores = async (req, res) => {
	const stores = await Store.getTopStores();
	//res.json(stores);
	res.render('topStores', { stores, title: 'Top Stores' });
};


/*
	API Endpoints **********************************
*/

//store search
exports.searchStores = async (req, res) => {
	const stores = await Store.find({
		$text: {
			$search: req.query.q,
		}
	}, {
		score: { $meta: 'textScore' }
	})
	.sort({
		score : { $meta: 'textScore' }
	})
	.limit(5);
	res.json(stores);
}

//map locations
exports.mapStores = async (req, res) => {
	const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
	const q = {
		location: {
			$near: {
				$geometry: {
					type: 'Point',
					coordinates: coordinates
				},
				$maxDistance: 10000 //10KM
			}
		}
	}

	const stores = await Store.find(q).select('slug name description location photo').limit(10);
	res.json(stores);
};

//for hearts
exports.heartStore = async(req, res) => {
	const hearts = req.user.hearts.map(obj => obj.toString());
	const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
	const user = await User.findByIdAndUpdate(
		req.user._id, 
		{ [operator]: { hearts: req.params.id }},
		{ new: true }
	);
	res.json(user);
};


//user's hearted stores
exports.getHearts = async (req,res) => {
	const stores = await Store.find({
		_id: { $in: req.user.hearts }
	});
	res.render('stores', { title: 'Favourite Stores', stores: stores });
};