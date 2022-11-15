
const otpgenerator = require("otp-generator")
const mailer = require("../mailer/sendMail")
const userModel = require("../models/user")
const otpModel = require("../models/otp")
const jwt = require("jsonwebtoken")
const secret = process.env.JWT_SECRET

const newotp = async (usr, to) => {
    try {
        if (usr.verified && usr.verified === true) {
            return { message: "already verified" }
        }
        await otpModel.deleteMany({ user: usr.id })
        const otp = otpgenerator.generate(6, { lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false })
        const createdOTP = await otpModel.create({
            user: usr.id,
            otp: otp
        });
        if (!usr.name || !usr.email) {
            usr = await userModel.findOne({ id: usr.id }).select("id name email")
        }
        let tokenElement = {
            user: { id: usr.id, verified: false },
            otp: otp,
            date: `${Date.now()}`
        }
        if (to === "1") {
            await mailer.verifyMail({ name: usr.name, mail: usr.email, otp: otp })
            tokenElement.to = "1"
        } else if (to === "0") {
            await mailer.resetPwd({ name: usr.name, mail: usr.email, otp: otp })
            tokenElement.to = "0"
        }
        const token = await jwt.sign(tokenElement, secret, { expiresIn: "10m" });
        return token
    } catch (err) {
        console.log(err.message);
        return err
    }
}

const verify = async (otp, token) => {
    try {
        const matched = await jwt.verify(token, secret)
        if (matched.user?.verified === "true") {
            return { message: "invalid token" }
        }
        if (matched.otp !== otp) {
            return { message: "incorrect otp" }
        }
        const checkdb = await otpModel.findOne({ otp: otp, user: matched.user.id })
        if (!checkdb) {
            return { message: "otp already used" }
        }
        await otpModel.deleteMany({ user: matched.user.id })
        await userModel.findByIdAndUpdate(matched.user.id, { verified: true }, { new: true })
        matched.user.verified = true
        return matched.user

    } catch (err) {
        console.log(err.message);
        return err
    }
}

module.exports = { newotp, verify }
