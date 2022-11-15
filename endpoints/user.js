const express = require("express")
const router = express.Router()
const { body, validationResult } = require("express-validator")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const userModel = require("../models/user")
const prodModel = require("../models/product")
const cartModel = require("../models/cart")
const middleware = require("../handler/auth")
const otphandler = require("../handler/otp")
const saveImg = require('../handler/file')
const secret = process.env.JWT_SECRET

router.post("/join",
    body("name", "Enter a valid name").isLength({ min: 1, max: 50 }),
    body("email", "Enter a valid email address").isEmail(),
    body("password", "Use a strong password").isLength({ min: 8, max: 25 }),
    body("isBuyer").isBoolean(), body("isSeller").isBoolean(),
    async (req, res) => {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() })
            }
            const existingUser = await userModel.findOne({ email: req.body.email });
            if (existingUser) {
                return res
                    .status(400)
                    .json({ error: "A user with this email already exists" });
            }
            if (req.body.isBuyer !== "true" && req.body.isSeller !== "true") {
                return res.status(400).send({ error: "you must choose atleast one role for you" })
            }
            const salt = await bcrypt.genSalt(14)
            const hashedPwd = await bcrypt.hash(req.body.password, salt);
            const createdUser = await userModel.create({
                image: await saveImg(req.body.image, req.body.name),
                name: req.body.name,
                password: hashedPwd,
                email: req.body.email,
                isBuyer: req.body.isBuyer,
                isSeller: req.body.isSeller,
                verified: false
            });
            const token = await otphandler.newotp(createdUser, "1")

            res.json({ token: token, message: "Please verify your email" })
        } catch (error) {
            console.error(error.message);
            res.status(500).send({ error: "INTERNAL SERVER ERROR" })
        }
    }
)

router.post("/resendmail",
    async (req, res) => {
        try {
            let token = req.header("authToken")
            if (!token) {
                return res.status(400).json({ error: "invalid request" })
            }
            let matched = await jwt.verify(token, secret)

            if (!matched.user) {
                return res.status(400).json({ error: matched.message || matched })
            }
            if (Date.now() - matched.date < (2 * 60 * 1000)) {
                return res.json({ error: "Please wait atleast 2 minutes." })
            }
            token = await otphandler.newotp(matched.user, matched.to)
            res.json({ token: token, message: "Sent successfully" })
        } catch (error) {
            console.error(error.message);
            res.status(500).send({ error: "INTERNAL SERVER ERROR" })
        }
    }
)

router.post("/verifyemail",
    body("otp", "Enter a valid OTP").isLength({ min: 6, max: 6 }),
    async (req, res) => {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() })
            }
            const otp = req.body.otp
            const token = req.header("authToken")
            if (!token) {
                return res.status(400).json({ error: "invalid request" })
            }
            const verified = await otphandler.verify(otp, token)
            if (!verified?.id) {
                return res.status(400).json({ errors: verified.message || verified })
            }
            const tokenElement = {
                user: {
                    id: verified.id,
                    verified: true
                }
            }
            const newToken = jwt.sign(tokenElement, secret, { expiresIn: "365d" });

            res.json({ token: newToken })
        } catch (error) {
            console.error(error.message);
            res.status(500).send({ error: "INTERNAL SERVER ERROR" })
        }
    }
)

router.post("/passwordlost",
    body("email", "Enter your email").isEmail(),
    async (req, res) => {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() })
            }
            const existingUser = await userModel.findOne({ email: req.body.email }).select("id name email");

            if (!existingUser) {
                return res
                    .status(400)
                    .json({ error: "incorrect email" });
            }
            const token = await otphandler.newotp(existingUser, "0")

            return res.json({ token: token, message: "Please verify your email to proceed" })
        } catch (error) {
            console.error(error.message);
            res.status(500).send({ error: "INTERNAL SERVER ERROR" })
        }
    }
)

router.post("/newpassword", middleware,
    body("password", "Use a strong password").isLength({ min: 8, max: 25 }),
    async (req, res) => {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() })
            }
            const salt = await bcrypt.genSalt(14)
            const hashedPwd = await bcrypt.hash(req.body.password, salt);

            await userModel.findByIdAndUpdate(req.user.id, { password: hashedPwd }, { new: true })
            res.json({ success: "password updated" })
        } catch (error) {
            console.error(error.message);
            res.status(500).send({ error: "INTERNAL SERVER ERROR" })
        }
    }
)

router.post("/login",
    body("email", "Enter a valid email address").isEmail(),
    body("password", "Use a strong password").isLength({ min: 8, max: 25 }),
    async (req, res) => {
        try {
            let success = false
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() })
            }
            const { email, password } = req.body
            const existingUser = await userModel.findOne({ email }).select("id name email password verified");
            if (!existingUser) {
                return res
                    .status(400)
                    .json({ success, error: "incorrect credentials" });
            }
            const passwordMatch = await bcrypt.compare(
                password,
                existingUser.password
            );
            if (!passwordMatch) {
                return res
                    .status(400)
                    .json({ success, error: "incorrect credentials" });
            }
            if (!existingUser.verified) {
                const token = await otphandler.newotp(existingUser, "1")
                return res.json({ token: token, message: "Please verify your email to continue" })
            }
            const tokenElement = {
                user: {
                    id: existingUser.id,
                    verified: true
                }
            }
            const token = jwt.sign(tokenElement, secret, { expiresIn: "365d" });
            success = true
            res.json({ success, token })

        } catch (error) {
            console.error(error.message);
            res.status(500).send({ error: "INTERNAL SERVER ERROR" })
        }
    }
)

router.post("/account", middleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const userData = await userModel.findById(userId).select("-password");
        res.json(userData);
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ error: "INTERNAL SERVER ERROR" })
    }
}
)

router.get("/find/:id", async (req, res) => {
    try {
        const userId = req.params.id;
        const userData = await userModel.findById(userId)?.select("-password -email -balance");
        if (!userData?.verified) {
            return res.status(404).json({ error: "user not found" })
        }
        res.json(userData);
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ error: "INTERNAL SERVER ERROR" })
    }
}
)

router.post("/account/edit", middleware, async (req, res) => {
    try {
        const reqUser = await userModel.findById(req.user.id)
        const { image, name, description } = req.body
        let newUser = {}
        if (image) {
            newUser.image = await saveImg(image, reqUser.name)
        }
        if (name) {
            newUser.name = name
        }
        if (description) {
            newUser.description = description
        }
        await userModel.findByIdAndUpdate(
            req.user.id,
            { $set: newUser },
            { new: true }
        );
        const userData = await userModel.findById(req.user.id).select("-password");
        return res.json(userData);
    } catch (error) {
        console.error(error.message);
        res.status(500).send({ error: "INTERNAL SERVER ERROR" })
    }
}
)

router.delete("/account/delete",
    body("password").isLength({ min: 8, max: 25 }),
    middleware, async (req, res) => {
        try {
            const errors = validationResult(req)
            if (!errors.isEmpty()) {
                return res.status(400).json({ error: errors.array() })
            }
            const existingUser = await userModel.findById(req.user.id);
            const passwordMatch = await bcrypt.compare(
                req.body.password,
                existingUser.password
            );
            if (!passwordMatch) {
                return res
                    .status(400)
                    .json({ error: "incorrect password" });
            }
            const deletedUser = await userModel.findByIdAndDelete(req.user.id).select("-password");
            const deletedProducts = await prodModel.deleteMany({ user: req.user.id });
            await cartModel.deleteMany({ user: req.user.id });
            res.json({ Success: "Account and related stuff has been deleted", Account: deletedUser, Products: deletedProducts });
        } catch (error) {
            console.error(error.message);
            res.status(500).send({ error: "INTERNAL SERVER ERROR" })
        }
    }
)

module.exports = router