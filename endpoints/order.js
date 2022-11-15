const express = require("express")
const router = express.Router()
const middleware = require("../handler/auth")
const prodModel = require("../models/product")
const userModel = require("../models/user")
const cartModel = require("../models/cart")
const orderModel = require("../models/order")

router.get("/:id", middleware, async (req, res) => {
    try {
        const paramId = req.params.id
        const existingItem = await prodModel.findById(paramId)
        const reqUser = await userModel.findById(req.user.id)
        if (!reqUser.isBuyer) {
            return res.status(400).send({ error: "You are not a buyer" })
        }
        else if (!existingItem) {
            return res.status(404).send({ error: "Product not found" })
        }
        else if (existingItem.user.toString() === req.user.id) {
            return res.status(400).send({ error: "That product is being sold by you" })
        }
        else if (reqUser.balance < existingItem.price) {
            return res.status(400).send({ error: "You have not enough balance in your account" })
        }
        await prodModel.findByIdAndUpdate(
            paramId,
            { $inc: { sold: + 1 } },
            { new: true }
        );
        await userModel.findByIdAndUpdate(
            req.user.id,
            { $inc: { balance: - existingItem.price } },
            { new: true }
        );
        await cartModel.deleteOne({ user: req.user.id, product: paramId });
        await userModel.findByIdAndUpdate(
            existingItem.user,
            { $inc: { balance: + existingItem.price } },
            { new: true }
        );
        const createdOrder = new orderModel({
            user: req.user.id,
            product: paramId
        });
        await createdOrder.save();
        res.json({ success: "purchased" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ error: "INTERNAL SERVER ERROR" })
    }
}
)

module.exports = router