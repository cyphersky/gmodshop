const { Schema, model } = require("mongoose");

const DiscordSchema = new Schema({
	id: { type: String },
	siteid: {type: String}

});

// We export it as a mongoose model.
module.exports = model("discord_profile", DiscordSchema);