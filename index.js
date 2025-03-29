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
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.fizmj.mongodb.net/?appName=Cluster0`;

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


        // app.post("/users", async (req, res) => {
        // //     try {
        //         console.log("Received data:", req.body);
        //         const userData = req.body;
        //         const db = client.db("collabnesttools");
        //         const usersCollection = db.collection("users");

        //         const result = await usersCollection.insertOne(userData);
        //         res.status(201).json(result);
        //     } catch (error) {
        //         console.error("Error saving user:", error);
        //         res.status(500).json({ message: "Failed to save user" });
        //     }
        // });

        app.post("/tasks", async (req, res) => {
            try {
                // Log the incoming data for debugging
                console.log("Received data:", req.body);

                const { title, description, dueDate, status, userId, fileUrl } = req.body;

                // Validate input
                if (!title || !dueDate) {
                    return res.status(400).json({ success: false, message: "Title and due date are required" });
                }

                // Construct the task object
                const task = {
                    title,
                    description,
                    dueDate,
                    status,
                    assignedTo: userId,
                    fileUrl,  // File URL passed from the frontend
                    createdAt: new Date()
                };

                // Insert the task into MongoDB
                const result = await tasksCollection.insertOne(task);

                // Check if the result is valid before accessing the ops array
                if (!result || !result.insertedId) {
                    return res.status(500).json({ success: false, message: "Task creation failed" });
                }

                console.log("Task saved:", result);

                // If insertion was successful, respond with the task details
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



        // Get tasks for a user
        app.get("/user-tasks/:userId", async (req, res) => {
            try {
                const userTasks = await tasksCollection.find({ assignedTo: req.params.userId }).toArray();
                res.status(200).json({ success: true, tasks: userTasks });
            } catch (error) {
                res.status(500).json({ success: false, message: "Failed to fetch user tasks", error });
            }
        });


        // editor change only
        app.put("/tasks/:id", async (req, res) => {
            try {
                const taskId = req.params.id;
                const { title, description, priority, deadline, userId } = req.body;

                const db = client.db("collabnesttools");
                const tasksCollection = db.collection("tasks");

                const task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });

                if (!task) {
                    return res.status(404).json({ message: "Task not found" });
                }

                if (task.userId !== userId) {
                    return res.status(403).json({ message: "Unauthorized: You can only edit your own tasks" });
                }

                const updatedTask = {
                    $set: { title, description, priority, deadline }
                };

                await tasksCollection.updateOne({ _id: new ObjectId(taskId) }, updatedTask);
                res.status(200).json({ message: "Task updated successfully" });
            } catch (error) {
                console.error("Error updating task:", error);
                res.status(500).json({ message: "Failed to update task" });
            }
        });

        app.put("/tasks/:taskId", async (req, res) => {
            try {
                const taskId = new ObjectId(req.params.taskId);
                const { status, userId } = req.body;

                // Update the task status in the main task collection
                const updatedTask = await tasksCollection.findOneAndUpdate(
                    { _id: taskId },
                    { $set: { status } },
                    { returnDocument: "after" }
                );

                if (!updatedTask.value) {
                    return res.status(404).json({ success: false, message: "Task not found" });
                }

                // If status is "In-Progress" or "Completed", save it in a user-specific task collection
                if (status === "In-Progress" || status === "Completed") {
                    const userTasksCollection = db.collection("user_tasks");

                    const userTask = {
                        userId,
                        taskId: updatedTask.value._id,
                        title: updatedTask.value.title,
                        description: updatedTask.value.description,
                        status,
                        externalLink: updatedTask.value.externalLink,
                        fileUrl: updatedTask.value.fileUrl,
                        createdAt: new Date()
                    };

                    await userTasksCollection.insertOne(userTask);
                }

                res.status(200).json({ success: true, task: updatedTask.value });
            } catch (error) {
                res.status(500).json({ success: false, message: "Task update failed", error });
            }
        });


        // app.delete("/tasks/:id", async (req, res) => {
        //     try {
        //         const taskId = req.params.id;
        //         const userId = req.body.userId;

        //         const db = client.db("collabnesttools");
        //         const tasksCollection = db.collection("tasks");

        //         const task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });

        //         if (!task) {
        //             return res.status(404).json({ message: "Task not found" });
        //         }

        //         if (task.userId !== userId) {
        //             return res.status(403).json({ message: "Unauthorized: You can only delete your own tasks" });
        //         }

        //         await tasksCollection.deleteOne({ _id: new ObjectId(taskId) });
        //         res.status(200).json({ message: "Task deleted successfully" });
        //     } catch (error) {
        //         console.error("Error deleting task:", error);
        //         res.status(500).json({ message: "Failed to delete task" });
        //     }
        // });

        // get all task
        app.get('/tasks', async (req, res) => {
            try {
                const data = await tasksCollection.find({}).toArray();
                res.json(data);
            } catch (error) {
                res.status(500).json({ message: "Error fetching tasks", error });
            }
        });
        // post task
        // app.post('/tasks', async (req, res) => {
        //     try {
        //         const task = req.body;
        //         const result = await tasksCollection.insertOne(task);
        //         res.status(201).json({ message: "Task added successfully", taskId: result.insertedId });
        //     } catch (error) {
        //         res.status(500).json({ message: "Error adding task", error });
        //     }
        // });

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

        app.put('/tasks/:id', async (req, res) => {
            const taskId = req.params.id;
            const updatedTask = req.body;

            try {
                const result = await tasksCollection.updateOne(
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
