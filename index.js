const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;
const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database Connection URI
const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.fizmj.mongodb.net/?appName=Cluster0`;

// Create a MongoClient instance
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// Async function to connect to MongoDB
async function run() {
    try {
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Group backend code structure created");

        const database = client.db("collabnesttools");
const tasksCollection = database.collection("Tasks");


app.get("/tasks", async (req, res) => {
    try {
        const { filter, search, userId } = req.query;
        let query = {};

        if (userId) query.userId = userId;
        if (search) query.title = { $regex: search, $options: "i" };

        if (filter === "Tasks with Attachments") query.fileUrl = { $exists: true, $ne: "" };
        if (filter === "Due Today") {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const tomorrow = new Date(today);
            tomorrow.setDate(today.getDate() + 1);
            query.dueDate = { $gte: today, $lt: tomorrow };
        }
        if (filter === "Due This Week") {
            const today = new Date();
            const nextWeek = new Date(today);
            nextWeek.setDate(today.getDate() + 7);
            query.dueDate = { $gte: today, $lt: nextWeek };
        }
        if (filter === "Completed Tasks") query.status = "Completed";

        const tasks = await tasksCollection.find(query).toArray();
        res.json(tasks);
    } catch (error) {
        console.error("Error fetching tasks:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Group backend code structure created")
        
        const taskCollection = database.collection('tasks');
        const userCollection = database.collection('users');
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
        });


    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}
run().catch(console.dir);

// Routes
app.get('/', (req, res) => {
    res.send('SIMPLE CRUD IS RUNNING');
});

// Start Server
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
