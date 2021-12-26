const { Schema, model } = require("mongoose");

const ProductSchema = new Schema({
	id: {type: Number},
	name: {type: String},
	description: {type: String},
	seller: {type: String},
	price: {type: Number, default: 100},
	purchases: {type: Number, default: 0},
	date: {type: Number, default: Date.now()},
	tags: {type: String},
	negative: {type: Number, default: 0},
	positive: {type: Number, default: 0},
	category: {type: Number, default: 0},
	gamemodes: {type: Number, default: 0},
	img: {type: String, default: "https://i.ytimg.com/vi/WeUKh9GHpt4/maxresdefault.jpg"},
	image_order: {type: String, default: "1.png"},
	reviews: {type: Array, default: []},
	allow: {type: String, default: 'wait'}
});

module.exports = model("store_product", ProductSchema);