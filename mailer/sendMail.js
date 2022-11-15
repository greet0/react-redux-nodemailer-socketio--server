
const nodemailer = require('nodemailer');

let transporter = null

try {
    transporter = nodemailer.createTransport({
        // service: process.env.MAIL_SERVICE,
        host: process.env.MAIL_HOST,
        port: process.env.MAIL_PORT,
        // secure: process.env.MAIL_SECURE,
        auth: {
            user: process.env.MAIL_ID,
            pass: process.env.MAIL_PWD,
        },
    });

} catch (error) {
    console.log(error)
}

let verifyMail = async (data) => {
    try {

        let msg = {
            from: `${process.env.APP_NAME} Team <${process.env.MAIL_ID}>`,
            to: `${data.name}  <${data.mail}>`,
            subject: "Verify your email",
            text: "OTP for email verification",
            html: `<h1>OTP for email verification</h1><br>
        <h2>Enter this OTP to verify:</h2><br><br>
        <h1>${data.otp}</h1><br><br>
        <h4>
        this otp will be valid for 1 hour.<br>
        don't share this otp with anyone.<br>
        this is an auto-generated mail.<br>
        don't reply to this message.<br><br>
        For any query, contact us at support@${process.env.APP_NAME}.com
        </h4>`
        }
    

        await transporter.sendMail(msg);
    } catch (error) {
        console.log(error);
    }

}

let resetPwd = async (data) => {
    try {

        let msg = {
            from: `${process.env.APP_NAME} Team <${process.env.MAIL_ID}>`,
            to: `${data.name}  <${data.mail}>`,
            subject: "RESET PASSWORD",
            text: "OTP for password reset",
            html: `<h1>We recieved a password reset request</h1><br>
        <h2>Enter this OTP to reset password:</h2><br><br>
        <h1>${data.otp}</h1><br><br>
        <h4>
        this otp will be valid for 1 hour.<br>
        don't share this otp with anyone.<br>
        this is an auto-generated mail.<br>
        don't reply to this message.<br><br>
        For any query, contact us at support@${process.env.APP_NAME}.com
        </h4>`
        }
    

        await transporter.sendMail(msg);
    } catch (error) {
        console.log(error);
    }

}


module.exports = { verifyMail, resetPwd }