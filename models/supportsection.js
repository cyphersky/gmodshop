const { Schema, model } = require("mongoose");

const SupportsScheme = new Schema({
	id: { type: Number },
	owner: { type: String},
	to: { type: Number, default: 1},
	type: { type: Number},
	title: { type: String, default: "Название"},
	subject: { type: String, default: "Описание"},
	messages: {type: Array, default: []},
	date: {type: Number, default: Date.now()},
	status: { type: String, default: "wait"}

});

module.exports = model("supports_ticket", SupportsScheme);