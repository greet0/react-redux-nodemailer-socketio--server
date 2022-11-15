const db = require("mongoose")
const { Schema } = db

const cartModel = new Schema({
    user: {
        type: db.Schema.Types.ObjectId,
        ref: "user",
    },
    product: {
        type: db.Schema.Types.ObjectId,
        ref: "product",
    },
})

module.exports = db.model("cart", cartModel)