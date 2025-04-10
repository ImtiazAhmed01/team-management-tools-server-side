const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
const { ObjectId } = require("mongodb");

// Database Connection URI
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.khtuk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient instance
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    },
});

// Async function to connect to MongoDB
async function run() {
    try {
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Group backend code structure created")

        const database = client.db('collabnesttools');
        const tasksCollection = database.collection('tasks');

        const userCollection = database.collection('users');
        const profileCollection = database.collection("profileInfo");
        const userTaskCollection = database.collection('userTaskCollection');




        app.post("/tasks", async (req, res) => {
            try {
                console.log("Received data:", req.body);

                const { title, description, dueDate, userId, fileUrl } = req.body;

                if (!title || !dueDate) {
                    return res.status(400).json({ success: false, message: "Title and due date are required" });
                }

                const task = {
                    title,
                    description,
                    dueDate,
                    status: "To-Do",
                    assignedTo: userId,
                    inProgressCount: 0,
                    doneCount: 0,
                    fileUrl,
                    createdAt: new Date()
                };

                const result = await tasksCollection.insertOne(task);


                if (!result || !result.insertedId) {
                    return res.status(500).json({ success: false, message: "Task creation failed" });
                }
                if (!result1 || !result1.insertedId) {
                    return res.status(500).json({ success: false, message: "Task creation failed" });
                }

                console.log("Task saved:", result);

                const savedTask = {
                    _id: result.insertedId,
                    ...task
                };

                res.status(201).json({ success: true, task: savedTask });
            } catch (error) {
                console.error("Task creation failed:", error);
                res.status(500).json({ success: false, message: "Task creation failed", error });
            }
        });
        // get all the tasks
        app.get('/tasks', async (req, res) => {
            try {
                const data = await tasksCollection.find({}).toArray();
                res.json(data);
            } catch (error) {
                res.status(500).json({ message: "Error fetching tasks", error });
            }
        });



        // Get tasks for a user
        app.get("/user-tasks/:userId", async (req, res) => {
            try {
                const userTasks = await tasksCollection.find({ assignedTo: req.params.userId }).toArray();
                res.status(200).json({ success: true, tasks: userTasks });
            } catch (error) {
                res.status(500).json({ success: false, message: "Failed to fetch user tasks", error });
            }
        });



        app.put("/tasks/:id", async (req, res) => {
            const taskId = req.params.id;
            const { title, description, dueDate, fileUrl } = req.body;

            try {
                const result = await tasksCollection.updateOne(
                    { _id: new ObjectId(taskId) },
                    {
                        $set: {
                            title,
                            description,
                            dueDate,
                            fileUrl,
                        },
                    }
                );

                if (result.matchedCount === 0) {
                    return res.status(404).json({ message: "Task not found" });
                }

                res.status(200).json({ message: "Task updated successfully" });
            } catch (error) {
                console.error("Error updating task:", error);
                res.status(500).json({ message: "Server error" });
            }
        });


        // Update main task (counts only)
        app.put("/task/:id", async (req, res) => {
            const taskId = req.params.id;
            const { inProgressCount = 0, doneCount = 0 } = req.body;

            console.log(`🛠️ Updating main task counts for ID ${taskId}`);
            console.log("🔢 Received delta counts:", { inProgressCount, doneCount });

            try {
                const result = await tasksCollection.updateOne(
                    { _id: new ObjectId(taskId) },
                    {
                        $inc: {
                            inProgressCount,
                            doneCount
                        }
                    }
                );
                console.log("Task count update result:", result);
                res.send(result);
            } catch (err) {
                console.error("Error in /task/:id:", err);
                res.status(500).send({ error: "Failed to update task counts", details: err });
            }
        });


        app.post('/assign-task', async (req, res) => {
            console.log("Incoming request to /assign-task");
            console.log("Request body:", req.body);

            const { task, userId, email } = req.body;

            if (!task || !task._id || !userId || !email) {
                return res.status(400).json({ message: "Missing required fields" });
            }

            try {
                const existingAssignment = await userTaskCollection.findOne({
                    "task._id": task._id,
                    userId
                });

                if (existingAssignment) {
                    return res.status(400).json({ message: "Task is already assigned to this user" });
                }

                const result = await userTaskCollection.insertOne({
                    task,
                    email,
                    userId,
                    assignedAt: new Date()
                });

                console.log("Task assigned and saved:", result);
                res.status(200).json({ message: "Task assigned successfully", result });
            } catch (err) {
                console.error("Error assigning task:", err);
                res.status(500).json({ message: "Error assigning task" });
            }
        });
        // Update user task (status + counts)
        app.put("/mytasks/:id", async (req, res) => {
            const taskDocId = req.params.id;
            const updatedData = req.body;

            console.log(`Updating user task for outer ID ${taskDocId}`);
            console.log("Received update data:", updatedData);

            try {
                const result = await userTaskCollection.updateOne(
                    { _id: new ObjectId(taskDocId) },
                    {
                        $set: {
                            "task.status": updatedData.status,
                            "task.inProgressCount": updatedData.inProgressCount,
                            "task.doneCount": updatedData.doneCount
                        }
                    }
                );

                console.log("User task update result:", result);
                res.send(result);
            } catch (err) {
                console.error("Error in /mytasks/:id:", err);
                res.status(500).send({ error: "Failed to update user task", details: err });
            }
        });


        app.get('/is-assigned/:taskId/:email', async (req, res) => {
            const { taskId, email } = req.params;

            try {
                const existingAssignment = await userTaskCollection.findOne({ "task._id": taskId, email });

                if (existingAssignment) {
                    return res.status(200).json({ assigned: true });
                } else {
                    return res.status(200).json({ assigned: false });
                }
            } catch (err) {
                console.error(err);
                res.status(500).json({ message: "Error checking assignment" });
            }
        });

        app.get("/userassignedtasks/:email", async (req, res) => {
            const userEmail = req.params.email;

            try {
                const userTasks = await userTaskCollection.find({ email: userEmail }).toArray();
                res.status(200).json(userTasks); // send only the array, no need to wrap in { success: true, tasks }
            } catch (error) {
                res.status(500).json({ message: "Failed to fetch user tasks", error });
            }
        });



        app.delete('/tasks/:id', async (req, res) => {
            const taskId = req.params.id;

            try {
                const result = await tasksCollection.deleteOne({ _id: new ObjectId(taskId) });

                if (result.deletedCount === 1) {
                    res.status(200).json({ message: "Task deleted successfully" });
                } else {
                    res.status(404).json({ message: "Task not found" });
                }
            } catch (error) {
                res.status(500).json({ message: "Error deleting task", error });
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



    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }


}

run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("SIMPLE CRUD IS RUNNING");
});
app.listen(port, () => {
    console.log(`SIMPLE crud is running on port: ${port}`)

})

