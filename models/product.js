const db = require("mongoose")
const { Schema } = db

const productModel = new Schema({
    user: {
        type: db.Schema.Types.ObjectId,
        ref: "user",
    },
    image: {
        type: String,
        default: ""
    },
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        default: this.title
    },
    price: {
        type: Number,
        required: true
    },
    sold: {
        type: Number,
        default: 0
    },
}, {
    timestamps: true
})

module.exports = db.model("product", productModel)