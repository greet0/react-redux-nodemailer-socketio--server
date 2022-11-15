const db = require("mongoose")
const { Schema } = db

const otpModel = new Schema({
    otp: {
        type: String,
        minLength: 6
    },
    user: {
        type: db.Schema.Types.ObjectId,
        ref: "user",
    }
}, {
    timestamps: true
})

module.exports = db.model("otp", otpModel)