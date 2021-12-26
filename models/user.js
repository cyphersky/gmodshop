const { Schema, model } = require("mongoose");

const UserSchema = new Schema({
	sid: { type: String },
	nickname: {type: String},
	desc: {type: String},
	rank: {type: String, default: 'rank rank-member'},
	rankname: {type: String, default: 'Участник'},
	rub: {type: Number, default: 0},
	purchases: {type: Array, default: []},
	description: {type: String, default: ""},
	isnotify: {type: Boolean, default: false},
	banned: {type: Boolean, default: false},
	notify: {type: Array, default: []},
	discordid: {type: String},
	cooldowns: { type: Number, default: 0}

});

// We export it as a mongoose model.
module.exports = model("user_profile", UserSchema);