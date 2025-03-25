const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());
const { ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.khtuk.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
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


    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('SIMPLE CRUD IS RUNNING')
})
// app.listen(port, () => {
//     console.log(`SIMPLE crud is running on port: ${port}`)

// })