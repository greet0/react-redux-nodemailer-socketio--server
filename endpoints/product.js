const express = require("express")
const router = express.Router()
const { body, validationResult } = require("express-validator")
const prodModel = require("../models/product")
const userModel = require("../models/user")
const middleware = require("../handler/auth")
const saveImg = require('../handler/file')

router.post("/add", middleware,
  body("title", "Please provide a title").isLength({ min: 1, max: 150 }),
  body("description", "Please provide a description").isLength({ min: 1, max: 500 }),
  body("category", "Please provide a category").isLength({ min: 1, max: 50 }),
  body("price", "Please provide a price").isLength({ min: 1, max: 10 }),
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ error: errors.array() });
      }
      const reqUser = await userModel.findById(req.user.id).select("id name isSeller")
      let { image, title, description, category, price } = req.body;
      if (!reqUser.isSeller) {
        return res.status(400).send({ error: "you are not a seller" })
      }
      const createdProduct = new prodModel({
        image: await saveImg(image, reqUser.name),
        title,
        description,
        category,
        price,
        user: req.user.id,
      });
      const productSaved = await createdProduct.save();
      res.json(productSaved);
    } catch (error) {
      console.error(error.message);
      res.status(500).send({ error: "INTERNAL SERVER ERROR" })
    }
  }
)

router.get("/read/:id", async (req, res) => {
  try {
    const id = req.params.id
    if (id == "all") {
      const existingItems = await prodModel.find()
      return res.json(existingItems);
    }
    const existingItem = await prodModel.findById(id)
    res.json([existingItem]);
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ error: "INTERNAL SERVER ERROR" })
  }
}
)

router.get("/by/1/:user", middleware, async (req, res) => {
  try {
    const user = req.params.user
    if (user === "me") {
      const existingItems = await prodModel.find({ user: req.user.id })
      return res.json(existingItems);
    }
    if (user === "oth") {
      const existingItems = await prodModel.find({ user: { $ne: req.user.id } })
      return res.json(existingItems);
    }
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ error: "INTERNAL SERVER ERROR" })
  }
}
)

router.get("/by/0/:user", async (req, res) => {
  try {
    const user = req.params.user
    const existingItems = await prodModel.find({ user: user })
    res.json(existingItems);
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ error: "INTERNAL SERVER ERROR" })
  }
}
)

router.put("/edit/:id", middleware, async (req, res) => {
  try {
    const reqUser = await userModel.findById(req.user.id).select("id isSeller name")
    const { image, title, description, category, price } = req.body
    if (!reqUser.isSeller) {
      return res.status(400).send({ error: "you are not a seller" })
    }
    let newItem = {};
    if (image) {
      newItem.image = await saveImg(image, reqUser.name);
    }
    if (title) {
      newItem.title = title;
    }
    if (description) {
      newItem.description = description;
    }
    if (category) {
      newItem.category = category;
    }
    if (price) {
      newItem.price = price;
    }

    const existingProduct = await prodModel.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).send({ error: "Product Not Found" });
    }

    if (existingProduct.user.toString() !== req.user.id) {
      return res.status(400).send({ error: "Forbidden" });
    }
    const productUpdated = await prodModel.findByIdAndUpdate(
      req.params.id,
      { $set: newItem },
      { new: true }
    )
    res.json({productUpdated});
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ error: "INTERNAL SERVER ERROR" })
  }
}
)

router.delete("/delete/:id", middleware, async (req, res) => {
  try {
    const reqUser = await userModel.findById(req.user.id).select("id isSeller")
    if (!reqUser.isSeller) {
      return res.status(400).send({ error: "you are not a seller" })
    }
    const existingProduct = await prodModel.findById(req.params.id);
    if (!existingProduct) {
      return res.status(404).send({ error: "Product Not Found" });
    }

    if (existingProduct.user.toString() !== req.user.id) {
      return res.status(401).send({ error: "Forbidden" });
    }
    const deletedItem = await prodModel.findByIdAndDelete(req.params.id)
    res.json({ Success: "Product has been deleted", Product: deletedItem });
  } catch (error) {
    console.error(error.message);
    res.status(500).send({ error: "INTERNAL SERVER ERROR" })
  }
}
)

module.exports = router