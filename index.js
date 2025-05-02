const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());
const { ObjectId } = require("mongodb");

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.khtuk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});
const server = app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Group backend code structure created")
        const database = client.db('collabnesttools');
        const taskCollection = database.collection('tasks');
        const userCollection = database.collection('users');
        const profileCollection = db.collection("profileInfo");
        const notificationCollection = database.collection("notifications");

        // Socket.IO Connection Handling
        io.on("connection", (socket) => {
            console.log(`A user connected: ${socket.id}`);

            socket.on("join", (userEmail) => {
                socket.join(userEmail);
                console.log(`${userEmail} joined their notification room`);
            });

            socket.on("disconnect", () => {
                console.log(`User disconnected: ${socket.id}`);
            });
        });

        // Comment related API
        app.post("/comments/:id", async (req, res) => {
            const id = req.params.id;
            const { commentInfo } = req.body;
            const taskId = new ObjectId(id);

            const result = await commentCollection.insertOne({
                taskId,
                ...commentInfo,
            });

            // Check for mentions and send notifications
            if (commentInfo.mentionName && commentInfo.mentionEmail) {
                const notification = {
                    mentionName: commentInfo.mentionName,
                    mentionEmail: commentInfo.mentionEmail,
                    commentId: result.insertedId,
                    taskId: taskId,
                    read: false,
                    createdAt: new Date(),
                };

                await notificationCollection.insertOne(notification);
                io.to(commentInfo.mentionEmail).emit("newNotification", notification);
            }

            res.status(200).send(result);
        });

        app.get("/comment/:id", async (req, res) => {
            const taskId = req.params.id;
            const objectId = new ObjectId(taskId);
            const result = await commentCollection
                .find({ taskId: objectId })
                .toArray();
            res.status(200).send(result);
        });

        // Notification APIs
        app.get("/notifications/:email", async (req, res) => {
            const email = req.params.email;
            const result = await notificationCollection
                .find({ mentionEmail: email })
                .toArray();
            res.status(200).send(result);
        });

        app.put("/notifications/mark-read/:email", async (req, res) => {
            const email = req.params.email;
            const result = await notificationCollection.updateMany(
                { mentionEmail: email, read: false },
                { $set: { read: true } }
            );
            res.status(200).send({ message: "Notifications marked as read" });
        });
        // get all task
        app.get('/tasks', async (req, res) => {
            try {
                const data = await taskCollection.find({}).toArray();
                res.json(data);
            } catch (error) {
                res.status(500).json({ message: "Error fetching tasks", error });
            }
        });
        // post task
        app.post('/tasks', async (req, res) => {
            try {
                const task = req.body;
                const result = await taskCollection.insertOne(task);
                res.status(201).json({ message: "Task added successfully", taskId: result.insertedId });
            } catch (error) {
                res.status(500).json({ message: "Error adding task", error });
            }
        });

        app.delete('/tasks/:id', async (req, res) => {
            const taskId = req.params.id;

            try {
                const result = await taskCollection.deleteOne({ _id: new ObjectId(taskId) });

                if (result.deletedCount === 1) {
                    res.status(200).json({ message: "Task deleted successfully" });
                } else {
                    res.status(404).json({ message: "Task not found" });
                }
            } catch (error) {
                res.status(500).json({ message: "Error deleting task", error });
            }
        });

        app.put('/tasks/:id', async (req, res) => {
            const taskId = req.params.id;
            const updatedTask = req.body;

            try {
                const result = await taskCollection.updateOne(
                    { _id: new ObjectId(taskId) },
                    { $set: updatedTask }
                );

                if (result.modifiedCount === 1) {
                    res.status(200).json({ message: "Task updated successfully" });
                } else {
                    res.status(404).json({ message: "Task not found or no changes made" });
                }
            } catch (error) {
                res.status(500).json({ message: "Error updating task", error });
            }
        });
        // User info from database
        app.post('/user', async (req, res) => {
            const { fullName, email, photoURL, userRole, registrationDate } = req.body;

            try {
                const result = await userCollection.insertOne({ fullName, email, photoURL, userRole, registrationDate });
                res.status(201).json({ message: "User saved successfully", userId: result.insertedId });
            } catch (error) {
                res.status(500).json({ message: "Error saving user data", error });
            }
        })
        

        // profile related api
        app.post("/profile/:email", async (req, res) => {
            const email = req.params.email;
            const profileInfo = req.body;

            try {
                const isExist = await profileCollection.findOne({ email });

                if (isExist) {
                    const updatedProfile = await profileCollection.updateOne(
                        { email },
                        { $set: profileInfo }
                    );

                    if (updatedProfile.modifiedCount > 0) {
                        res.status(200).json({ message: "profile updated successfully!" });
                    } else {
                        res.status(400).json({ message: "Failed to update profile" });
                    }
                } else {
                    const newProfile = await profileCollection.insertOne({
                        email,
                        ...profileInfo,
                    });

                    if (newProfile.insertedId) {
                        res.status(201).json({ message: "Info added successfully!" });
                    } else {
                        res.status(400).json({ message: "Failed to add info!" });
                    }
                }
            } catch (error) {
                console.error("Error handling profile update:", error);
                res.status(500).json({ message: "Server error" });
            }
        });
        app.get('/profileInfo/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const result = await profileCollection.find(query).toArray();
            res.send(result)
        })
// notification
        app.post("/send-email", async (req, res) => {
            const { email, subject, message } = req.body;
            try {
                await transporter.sendMail({
                    from: "your-email@gmail.com",
                    to: email,
                    subject,
                    text: message,
                });
                res.status(200).send("Email sent");
            } catch (error) {
                console.error(error);
                res.status(500).send("Failed to send email");
            }
        });

    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }


}
run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("SIMPLE CRUD IS RUNNING");
});
// app.listen(port, () => {
//     console.log(`SIMPLE crud is running on port: ${port}`)

// })
