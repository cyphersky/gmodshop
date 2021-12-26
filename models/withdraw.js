const { Schema, model } = require("mongoose");

const WithdrawSchema = new Schema({
	id: {type: Number},
	type: {type: String, default: "Qiwi"},
	rek: {type: String, default: "0"},
	rub: {type: Number, default: 0},
	status: {type: String, default: "waiting"},
	owner: {type: String}
});

module.exports = model("withdraw_product", WithdrawSchema);