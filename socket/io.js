const userModel = require("../models/user")
const chatModel = require("../models/chat")
const jwt = require("jsonwebtoken")
const secret = process.env.JWT_SECRET

let myUsers = []

const msgUpdate = async (data) => {
    try {
        if (data.status === "recieved") {
            if (data.from === "") {
                await chatModel.updateMany({ to: data.to, status: "sent" }, { status: "recieved" })
                return "updated"
            }
            await chatModel.updateMany({ from: data.from, to: data.to, status: "sent" }, { status: "recieved" })
            return "updated"
        }
        else if (data.status === "read") {
            if (data.from === "") {
                await chatModel.updateMany({ to: data.to, status: "recieved" }, { status: "read" })
                return "updated"
            }
            await chatModel.updateMany({ from: data.from, to: data.to, status: "recieved" }, { status: "read" })
            return "updated"
        }
        let status = "sent"
        const getStatus = userModel.findOne({ id: data.to }).select("id lastActive")
        if (getStatus?.lastActive === "active") {
            status = "recieved"
        }
        const msgNew = new chatModel({
            from: data.from,
            to: data.to,
            status: status,
            message: data.msg,
            createdAt: data.createdAt
        });
        await msgNew.save();
        return "saved"
    } catch (err) {
        console.log(err.message);
        return "error"
    }
}

const lsUpdate = async (data) => {
    try {
        await userModel.findByIdAndUpdate(data.user, { lastActive: data.status }, { new: true })
        return "status changed"
    } catch (err) {
        console.log(err.message);
        return "error"
    }
}

const socket = (io) => {
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth.token
            const auth = jwt.verify(token, secret)
            if (!auth.user?.verified) {
                next(new Error("not authorized"))
            }
            myUsers[socket.id] = auth.user
            next()
        } catch {
            next(new Error("not authorized"))
        }
    })
    io.on("connection", async (socket) => {
        try {
            let user = await userModel.findById(myUsers[socket.id].id).select("id name verified")
            myUsers[socket.id] = user
            lsUpdate({ status: "active", user: myUsers[socket.id].id })
            socket.join(user.id)

            let all = await chatModel.find({ to: myUsers[socket.id].id, status: "sent" })
            let len = all.length
            if (len < 10) {
                let h = await chatModel.find().or([{ from: myUsers[socket.id].id }, { to: myUsers[socket.id].id }]).limit(10).sort({ createdAt: -1 })
                all = [...new Set(all.concat(h))]
            }
            let sorted = all.sort((a, b) => new Date(a.createdAt) < new Date(b.createdAt) ? 1 : -1)

            if (!sorted) {
                socket.emit("recieved-data", { from: "", history: [] })
            } else {
                socket.emit("recieved-data", { from: "", history: sorted })
            }
            socket.broadcast.emit("user-joined", myUsers[socket.id].id);
        } catch (error) {
            console.log(error.message);
        }

        socket.on("request-data", async (data) => {
            try {
                let todt = data.date ? new Date(data.date) : new Date()
                
                let user = await userModel.findOne({ id: data.userID }).select("id name")
                let all = await chatModel.find().or([{ to: data.userID, from: myUsers[socket.id].id }, { from: data.userID, to: myUsers[socket.id].id }]).and([{ createdAt: { $lte: todt } }]).limit(15).sort({ createdAt: -1 })
                
                all = all.sort((a, b) => new Date(a.createdAt) < new Date(b.createdAt) ? 1 : -1)
                if (!user) {
                    user = { name: "", id: "" }
                }
                socket.emit("recieved-data", { from: user.id, history: all })
            } catch (error) {
                console.log(error.message);
            }
        });

        socket.on("send-msg", (data) => {
            try {
                if (data.to) {
                    if (data.message !== "") {
                        if (!data.createdAt) {
                            data.createdAt = new Date()
                        }
                        socket.to(data.to).emit("recieve-msg", {
                            message: data.message,
                            from: myUsers[socket.id].id,
                            createdAt: data.createdAt
                        });
                        msgUpdate({ from: myUsers[socket.id].id, to: data.to, msg: data.message, createdAt: data.createdAt, status: "sent" })
                    }
                }
            } catch (error) {
                console.log(error.message);
            }
        });

        socket.on("recieved", (from) => {
            try {
                msgUpdate({ from: from, to: myUsers[socket.id].id, status: "recieved" })
            } catch (error) {
                console.log(error.message);
            }
        });

        socket.on("read", (from) => {
            try {
                msgUpdate({ from: from, to: myUsers[socket.id].id, status: "read" })
            } catch (error) {
                console.log(error.message);
            }
        });

        socket.on("disconnect", () => {
            try {
                if (myUsers[socket.id]) {
                    socket.broadcast.emit("user-left", myUsers[socket.id].id);
                    lsUpdate({ status: `${new Date()}`, user: myUsers[socket.id].id })
                }
            } catch (error) {
                console.log(error.message)
            }
        });
    });
}
module.exports = socket