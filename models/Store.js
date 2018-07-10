const mongoose   = require ('mongoose');
mongoose.Promise = global.Promise;
const slug       = require('slugs');

const storeSchema = new mongoose.Schema({
	name: {
		type: String,
		trim: true,
		required: 'Please enter a store name'
	},
	slug: String,
	description: {
		type: String,
		trim: true
	},
	tags: [String],
	created: {
		type: Date,
		default: Date.now
	},
	location: {
		type: {
			type: String,
			default: 'Point'
		},
		coordinates: [{
			type: Number,
			required: "Coordinates is required"
		}],
		address: {
			type: String,
			required: "Must provide an address"
		}
	},
	photo: String,
	author: {
		type: mongoose.Schema.ObjectId,
		ref: 'User',
		required: 'Must apply an author for each store'
	}
}, {
	toJSON: { virtuals : true },
	toObject: { virtuals : true }
});

//Define our index
storeSchema.index({
	name: 'text',
	description: 'text'
});

//indexes for the location data
storeSchema.index({ location: '2dsphere' });

//for pre-save the slug string in the model before the name is stored 
storeSchema.pre('save', async function(next){
	if(!this.isModified('name')){
		next(); //if the name is not changed, then skip the slug creation
		return; //this will stop this whole function from running
	}
	this.slug = slug(this.name);
	//find other stores that have slugs like palace, palace-1, palace-2
	const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i'); 
	const storesWithSlug = await this.constructor.find({ slug: slugRegEx });
	if(storesWithSlug.length) {
		this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
	}
	next();
});

storeSchema.statics.getTagsList = function() {
	return this.aggregate([
		{ $unwind: '$tags' },
		{ $group: {_id: '$tags', count: { $sum: 1} }},
		{ $sort: { count: -1 }}
	]).cursor({}).exec().toArray();
};

storeSchema.statics.getTopStores = function() {
	return this.aggregate([
		//look for stores and populate their reviews
		{ $lookup: { 
				from: 'reviews',
				localField: '_id',
				foreignField: 'store',
				as: 'reviewDetails'
			}
		},
		{ $match: { 'reviewDetails.1': { $exists: true } } },
		{ $addFields: {
			averageRating: { $avg: '$reviewDetails.rating' }
		} },
		{ $sort: { averageRating: -1 } },
		{ $limit: 10 }
	]).cursor({}).exec().toArray();
};

//find reviews where the store._id === review.store
storeSchema.virtual('reviews', {
	ref: 'Review',
	localField: '_id', //field on the store that is a store from this store model 
	foreignField: 'store' //this would be field from the Review model
});

function autopopulate(next) {
	this.populate('reviews');
	next();
}

storeSchema.pre('find', autopopulate);
storeSchema.pre('findOne', autopopulate);


module.exports = mongoose.model('Store', storeSchema);