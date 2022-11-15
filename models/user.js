const db = require("mongoose")
const { Schema } = db

const userModel = new Schema({
    image: {
        type: String,
        default: ""
    },
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    isBuyer: {
        type: Boolean,
        required: true
    },
    isSeller: {
        type: Boolean,
        required: true
    },
    balance: {
        type: Number,
        default: 200
    },
    description: {
        type: String,
        default: ""
    },
    verified: {
        type: Boolean
    },
    lastActive: {
        type: String,
        default: `${new Date()}`
    }
})

module.exports = db.model("user", userModel)