const db = require("mongoose")
const { Schema } = db

const chatModel = new Schema({
    from: {
        type: db.Schema.Types.ObjectId,
        ref: "user",
    },
    to: {
        type: db.Schema.Types.ObjectId,
        ref: "user",
    },
    message: {
        type: String,
        required: true
    },
    status: {
        type: String,
        default: "sent"
    },
}, {
    timestamps: true
})

module.exports = db.model("chat", chatModel)