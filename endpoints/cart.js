const express = require("express")
const router = express.Router()
const middleware = require("../handler/auth")
const prodModel = require("../models/product")
const userModel = require("../models/user")
const cartModel = require("../models/cart")

router.post("/add/:id", middleware, async (req, res) => {
    try {
        const paramId = req.params.id
        const existingItem = await prodModel.findById(paramId)
        const existingOrder = await cartModel.findOne({ user: req.user.id, product: paramId })
        const reqUser = await userModel.findById(req.user.id).select("id isBuyer")
        if (!reqUser.isBuyer) {
            return res.status(400).send({ error: "You are not a buyer" })
        }
        else if (!existingItem) {
            return res.status(404).send({ error: "Product not found" })
        }
        else if (existingItem.user.toString() === req.user.id) {
            return res.status(400).send({ error: "That product is being sold by you" })
        }
        else if (existingOrder) {
            return res.status(400).send({ error: "Already in cart" })
        }
        const createdOrder = new cartModel({
            user: req.user.id,
            product: paramId
        });
        const savedOrder = await createdOrder.save();
        const savedItem = await prodModel.findById(savedOrder.product)
        res.json(savedItem);
    } catch (error) {
        console.log(error);
        res.status(500).send({ error: "INTERNAL SERVER ERROR" })
    }
}
)

router.get("/", middleware, async (req, res) => {
    try {
        let existingOrders = await cartModel.find({ user: req.user.id })
        const itemsFound = [];
        for (let i = 0; i < existingOrders.length; i++) {
            const el = existingOrders[i];
            const item = await prodModel.findById(el.product)
            itemsFound.push(item)
        }
        res.json(itemsFound)

    } catch (error) {
        console.error(error.message);
        res.status(500).send({ error: "INTERNAL SERVER ERROR" })
    }
}
)

router.delete("/remove/:id", middleware, async (req, res) => {
    try {
        const existingOrder = await cartModel.findOne({ user: req.user.id, product: req.params.id });
        if (!existingOrder) {
            return res.status(400).send({ error: "Order Not Found" });
        }
        await cartModel.deleteMany({ user: req.user.id, product: req.params.id });
        res.json({ success: "removed" });
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ error: "INTERNAL SERVER ERROR" })
    }
}
)

module.exports = router