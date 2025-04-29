// const express = require("express");
// const cors = require("cors");
// require("dotenv").config();
// const { MongoClient, ServerApiVersion } = require("mongodb");
// const port = process.env.PORT || 5000;
// const app = express();

// // Middleware
// app.use(cors());
// app.use(express.json());
// const { ObjectId } = require("mongodb");
// const http = require("http").createServer(app);
// const { Server } = require("socket.io");
// const io = new Server(http, {
//     cors: {
//         origin: "*", // Adjust this for production
//         methods: ["GET", "POST"]
//     }
// });
// io.on("connection", (socket) => {
//     console.log("A user connected");
// });

// // Database Connection URI
// const uri = `mongodb+srv://${process.env.DB_user}:${process.env.DB_pass}@cluster0.khtuk.mongodb.net/?retryWrites=true&w=majority`;

// // Create a MongoClient instance
// const client = new MongoClient(uri, {
//     serverApi: {
//         version: ServerApiVersion.v1,
//         strict: true,
//         deprecationErrors: true,
//     },
// });



// async function run() {
//     try {
//         //   await client.connect();
//         //   await client.db("admin").command({ ping: 1 });
//         //   console.log("Group backend code structure created");


//         const database = client.db("collabnesttools");
//         const tasksCollection = database.collection("tasks");
//         const userCollection = database.collection("users");
//         const profileCollection = database.collection("profileInfo");
//         const reactionCollection = database.collection("reactions");
//         const commentCollection = database.collection("comments");
//         const userTaskCollection = database.collection('userTaskCollection');


//         app.get("/tasks", async (req, res) => {
//             try {
//                 const { filter, search, userId } = req.query;
//                 let query = {};


//                 if (userId) query.userId = userId;
//                 if (search) query.title = { $regex: search, $options: "i" };


//                 if (filter === "Tasks with Attachments")
//                     query.fileUrl = { $exists: true, $ne: "" };
//                 if (filter === "Due Today") {
//                     const today = new Date();
//                     today.setHours(0, 0, 0, 0);
//                     const tomorrow = new Date(today);
//                     tomorrow.setDate(today.getDate() + 1);
//                     query.dueDate = { $gte: today, $lt: tomorrow };
//                 }
//                 if (filter === "Due This Week") {
//                     const today = new Date();
//                     const nextWeek = new Date(today);
//                     nextWeek.setDate(today.getDate() + 7);
//                     query.dueDate = { $gte: today, $lt: nextWeek };
//                 }
//                 if (filter === "Completed Tasks") query.status = "Completed";


//                 const tasks = await tasksCollection.find(query).toArray();
//                 res.json(tasks);
//             } catch (error) {
//                 console.error("Error fetching tasks:", error);
//                 res.status(500).json({ message: "Internal server error" });
//             }
//         });
//         app.post('/upload-image', async (req, res) => {
//             const task = req.body;


//             try {
//                 const result = await client.db("collabnesttools").collection("tasks").insertOne(task);


//                 // Emit to all connected clients
//                 io.emit('newImage', task);


//                 res.status(201).json({ message: "Image shared successfully", taskId: result.insertedId });
//             } catch (error) {
//                 res.status(500).json({ message: "Failed to upload image", error });
//             }
//         });


//         // req to db for group leader
//         // In your Express app file or separate router
//         app.post("/groupLeaderRequest", async (req, res) => {
//             const { name, email, uid } = req.body;

//             try {
//                 const requestedAt = new Date();
//                 const status = "pending";

//                 const existing = await database.collection("groupLeaderRequests").findOne({ email, status: "pending" });

//                 if (existing) {
//                     return res.status(400).json({ message: "You have already submitted a request." });
//                 }

//                 await database.collection("groupLeaderRequests").insertOne({
//                     name,
//                     email,
//                     uid,
//                     requestedAt,
//                     status,
//                 });

//                 res.status(200).json({ message: "Request submitted successfully." });
//             } catch (error) {
//                 console.error("Request error:", error);
//                 res.status(500).json({ message: "Server error. Try again later." });
//             }
//         });
//         app.get("/leaderRequests", async (req, res) => {
//             try {
//                 const requests = await database
//                     .collection("groupLeaderRequests")
//                     .find({ status: "pending" })
//                     .toArray();

//                 res.status(200).json(requests);
//             } catch (error) {
//                 console.error("Fetch error:", error);
//                 res.status(500).json({ message: "Failed to fetch requests." });
//             }
//         });
//         // Approve group leader request
//         app.patch("/approveLeader/:email", async (req, res) => {
//             const { email } = req.params;

//             try {
//                 // Update the userRole to 'group leader'
//                 const result = await profileCollection.updateOne(
//                     { email: email },
//                     { $set: { userRole: "group leader" } }  // Set the user role to 'group leader'
//                 );

//                 // Mark the group leader request as approved in the requests collection (if applicable)
//                 const requestResult = await database.collection("groupLeaderRequests").updateOne(
//                     { email: email },
//                     { $set: { status: "approved" } }  // Update the request status to 'approved'
//                 );

//                 if (result.modifiedCount > 0 && requestResult.modifiedCount > 0) {
//                     res.status(200).json({ message: "User role updated and request approved" });
//                 } else {
//                     res.status(400).json({ message: "Failed to approve user role or request" });
//                 }
//             } catch (error) {
//                 console.error(error);
//                 res.status(500).json({ message: "Server error" });
//             }
//         });
//         // Decline group leader request
//         app.patch("/declineLeader/:email", async (req, res) => {
//             const { email } = req.params;

//             try {
//                 // Update the userRole to 'user'
//                 // const result = await profileCollection.updateOne(
//                 //     { email: email },
//                 //     { $set: { userRole: "user" } }  // Reset the user role to 'user'
//                 // );

//                 // Mark the group leader request as declined in the requests collection
//                 const requestResult = await database.collection("groupLeaderRequests").updateOne(
//                     { email: email },
//                     { $set: { status: "declined" } }  // Update the request status to 'declined'
//                 );

//                 if (requestResult.modifiedCount > 0) {
//                     res.status(200).json({ message: "User role updated and request declined" });
//                 } else {
//                     res.status(400).json({ message: "Failed to decline user role or request" });
//                 }
//             } catch (error) {
//                 console.error(error);
//                 res.status(500).json({ message: "Server error" });
//             }
//         });







//         app.post("/tasks", async (req, res) => {
//             try {
//                 console.log("Received data:", req.body);

//                 const { title, description, dueDate, userId, fileUrl } = req.body;

//                 if (!title || !dueDate) {
//                     return res.status(400).json({ success: false, message: "Title and due date are required" });
//                 }

//                 const task = {
//                     title,
//                     description,
//                     dueDate,
//                     status: "To-Do",
//                     assignedTo: userId,
//                     inProgressCount: 0,
//                     doneCount: 0,
//                     fileUrl,
//                     createdAt: new Date()
//                 };

//                 const result = await tasksCollection.insertOne(task);


//                 if (!result || !result.insertedId) {
//                     return res.status(500).json({ success: false, message: "Task creation failed" });
//                 }
//                 // if (!result1 || !result1.insertedId) {
//                 //     return res.status(500).json({ success: false, message: "Task creation failed" });
//                 // }

//                 console.log("Task saved:", result);

//                 const savedTask = {
//                     _id: result.insertedId,
//                     ...task
//                 };

//                 res.status(201).json({ success: true, task: savedTask });
//             } catch (error) {
//                 console.error("Task creation failed:", error);
//                 res.status(500).json({ success: false, message: "Task creation failed", error });
//             }
//         });
//         // get all the tasks
//         app.get('/tasks', async (req, res) => {
//             try {
//                 const data = await tasksCollection.find({}).toArray();
//                 res.json(data);
//             } catch (error) {
//                 res.status(500).json({ message: "Error fetching tasks", error });
//             }
//         });


//         // Get tasks for a user
//         app.get("/user-tasks/:userId", async (req, res) => {
//             try {
//                 const userTasks = await tasksCollection
//                     .find({ assignedTo: req.params.userId })
//                     .toArray();
//                 res.status(200).json({ success: true, tasks: userTasks });
//             } catch (error) {
//                 res.status(500).json({
//                     success: false,
//                     message: "Failed to fetch user tasks",
//                     error,
//                 });
//             }
//         });




//         app.put("/tasks/:id", async (req, res) => {
//             const taskId = req.params.id;
//             const { title, description, dueDate, fileUrl } = req.body;

//             try {
//                 const result = await tasksCollection.updateOne(
//                     { _id: new ObjectId(taskId) },
//                     {
//                         $set: {
//                             title,
//                             description,
//                             dueDate,
//                             fileUrl,
//                         },
//                     }
//                 );

//                 if (result.matchedCount === 0) {
//                     return res.status(404).json({ message: "Task not found" });
//                 }

//                 res.status(200).json({ message: "Task updated successfully" });
//             } catch (error) {
//                 console.error("Error updating task:", error);
//                 res.status(500).json({ message: "Server error" });
//             }
//         });
//         // individual task assigning
//         app.post('/assign-task', async (req, res) => {
//             console.log("Incoming request to /assign-task");
//             console.log("Request body:", req.body);

//             const { task, userId, email } = req.body;

//             if (!task || !task._id || !userId || !email) {
//                 return res.status(400).json({ message: "Missing required fields" });
//             }

//             try {
//                 const existingAssignment = await userTaskCollection.findOne({
//                     "task._id": task._id,
//                     userId
//                 });

//                 if (existingAssignment) {
//                     return res.status(400).json({ message: "Task is already assigned to this user" });
//                 }

//                 const result = await userTaskCollection.insertOne({
//                     task,
//                     email,
//                     userId,
//                     assignedAt: new Date()
//                 });

//                 console.log("Task assigned and saved:", result);
//                 res.status(200).json({ message: "Task assigned successfully", result });
//             } catch (err) {
//                 console.error("Error assigning task:", err);
//                 res.status(500).json({ message: "Error assigning task" });
//             }
//         });
//         // Update user task (status + counts)
//         app.put("/mytasks/:id", async (req, res) => {
//             const taskDocId = req.params.id;
//             const updatedData = req.body;

//             console.log(`Updating user task for outer ID ${taskDocId}`);
//             console.log("Received update data:", updatedData);

//             try {
//                 const result = await userTaskCollection.updateOne(
//                     { _id: new ObjectId(taskDocId) },
//                     {
//                         $set: {
//                             "task.status": updatedData.status,
//                             "task.inProgressCount": updatedData.inProgressCount,
//                             "task.doneCount": updatedData.doneCount
//                         }
//                     }
//                 );

//                 console.log("User task update result:", result);
//                 res.send(result);
//             } catch (err) {
//                 console.error("Error in /mytasks/:id:", err);
//                 res.status(500).send({ error: "Failed to update user task", details: err });
//             }
//         });

//         // check if task exist
//         app.get('/is-assigned/:taskId/:email', async (req, res) => {
//             const { taskId, email } = req.params;

//             try {
//                 const existingAssignment = await userTaskCollection.findOne({ "task._id": taskId, email });

//                 if (existingAssignment) {
//                     return res.status(200).json({ assigned: true });
//                 } else {
//                     return res.status(200).json({ assigned: false });
//                 }
//             } catch (err) {
//                 console.error(err);
//                 res.status(500).json({ message: "Error checking assignment" });
//             }
//         });

//         app.get("/userassignedtasks/:email", async (req, res) => {
//             const userEmail = req.params.email;

//             try {
//                 const userTasks = await userTaskCollection.find({ email: userEmail }).toArray();
//                 res.status(200).json(userTasks); // send only the array, no need to wrap in { success: true, tasks }
//             } catch (error) {
//                 res.status(500).json({ message: "Failed to fetch user tasks", error });
//             }
//         });





//         app.put("/task/:id", async (req, res) => {
//             const taskId = req.params.id;
//             let { inProgressCount = 0, doneCount = 0 } = req.body;

//             // Ensure input is numeric
//             inProgressCount = parseInt(inProgressCount, 10) || 0;
//             doneCount = parseInt(doneCount, 10) || 0;

//             console.log(`🛠️ Updating main task counts for ID ${taskId}`);
//             console.log("🔢 Received delta counts:", { inProgressCount, doneCount });

//             try {
//                 const task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });

//                 // If existing fields are strings, convert them first
//                 const updates = {};
//                 if (typeof task?.doneCount === "string") {
//                     updates.doneCount = parseInt(task.doneCount, 10) || 0;
//                 }
//                 if (typeof task?.inProgressCount === "string") {
//                     updates.inProgressCount = parseInt(task.inProgressCount, 10) || 0;
//                 }

//                 // If any fix needed, update document
//                 if (Object.keys(updates).length > 0) {
//                     await tasksCollection.updateOne(
//                         { _id: new ObjectId(taskId) },
//                         { $set: updates }
//                     );
//                     console.log("🔧 Fixed non-numeric fields before incrementing:", updates);
//                 }

//                 // Now perform the increment operation
//                 const result = await tasksCollection.updateOne(
//                     { _id: new ObjectId(taskId) },
//                     {
//                         $inc: {
//                             inProgressCount,
//                             doneCount
//                         }
//                     }
//                 );

//                 console.log("✅ Task count update result:", result);
//                 res.send(result);
//             } catch (err) {
//                 console.error("❌ Error in /task/:id:", err);
//                 res.status(500).send({ error: "Failed to update task counts", details: err });
//             }
//         });




//         app.delete('/tasks/:id', async (req, res) => {
//             const taskId = req.params.id;

//             try {
//                 const result = await tasksCollection.deleteOne({ _id: new ObjectId(taskId) });

//                 if (result.deletedCount === 1) {
//                     res.status(200).json({ message: "Task deleted successfully" });
//                 } else {
//                     res.status(404).json({ message: "Task not found" });
//                 }
//             } catch (error) {
//                 res.status(500).json({ message: "Error deleting task", error });
//             }
//         });


//         // get all task
//         app.get("/tasks", async (req, res) => {
//             try {
//                 const data = await tasksCollection.find({}).toArray();
//                 res.json(data);
//             } catch (error) {
//                 res.status(500).json({ message: "Error fetching tasks", error });
//             }
//         });





//         app.post("/user", async (req, res) => {
//             const {
//                 fullName,
//                 email,
//                 photoURL,
//                 userRole,
//                 registrationDate,
//                 userImage,
//                 profession,
//                 yearOfExperience,
//                 registryType,
//             } = req.body;

//             try {
//                 // Check if the user already exists
//                 const existingUser = await userCollection.findOne({ email });

//                 if (existingUser) {
//                     return res
//                         .status(200)
//                         .json({ message: "User already exists", userId: existingUser._id });
//                 }

//                 // Common user data
//                 const userData = {
//                     fullName,
//                     email,
//                     photoURL,
//                     userRole,
//                     registrationDate,
//                     userImage: userImage || "n/a",
//                     profession: profession || "n/a",
//                     yearOfExperience: yearOfExperience || "n/a",
//                     registryType: registryType || "email",
//                 };

//                 // Insert into both collections
//                 const result = await userCollection.insertOne(userData);
//                 await profileCollection.insertOne(userData);

//                 res.status(201).json({
//                     message: "User saved successfully",
//                     userId: result.insertedId,
//                 });
//             } catch (error) {
//                 console.error("Error saving user data:", error);
//                 res.status(500).json({ message: "Error saving user data", error });
//             }
//         });





//         // profile related api
//         app.post("/profile/:email", async (req, res) => {
//             const email = req.params.email;
//             const profileInfo = req.body;


//             try {
//                 const isExist = await profileCollection.findOne({ email });


//                 if (isExist) {
//                     const updatedProfile = await profileCollection.updateOne(
//                         { email },
//                         { $set: profileInfo }
//                     );


//                     if (updatedProfile.modifiedCount > 0) {
//                         res.status(200).json({ message: "profile updated successfully!" });
//                     } else {
//                         res.status(400).json({ message: "Failed to update profile" });
//                     }
//                 } else {
//                     const newProfile = await profileCollection.insertOne({
//                         email,
//                         ...profileInfo,
//                     });


//                     if (newProfile.insertedId) {
//                         res.status(201).json({ message: "Info added successfully!" });
//                     } else {
//                         res.status(400).json({ message: "Failed to add info!" });
//                     }
//                 }
//             } catch (error) {
//                 console.error("Error handling profile update:", error);
//                 res.status(500).json({ message: "Server error" });
//             }
//         });
//         app.get("/profileInfo/:email", async (req, res) => {
//             const email = req.params.email;
//             const query = { email };
//             const result = await profileCollection.find(query).toArray();
//             res.send(result);
//         });


//         // reaction related api start
//         app.post("/reactions", async (req, res) => {
//             const { cardId, reactions } = req.body;
//             const update =
//                 reactions === "like"
//                     ? { $inc: { likeCount: 1 } }
//                     : reactions === "dislike"
//                         ? { $inc: { disLikeCount: 1 } }
//                         : null;


//             try {
//                 const result = await reactionCollection.findOneAndUpdate(
//                     { _id: cardId },
//                     update,
//                     { upsert: true, returnDocument: "after" }
//                 );


//                 if (!result.value) {
//                     return res.status(404).send({ error: "Task not found" });
//                 }
//                 res.status(200).send(result.value);
//             } catch (err) {
//                 res.status(500).send({ error: "Internal Server Error" });
//             }
//         });

//         // fetching user for mention
//         app.get('/user', async (req, res) => {
//             try {
//                 const users = await userCollection.find({}).toArray();
//                 res.json(users);
//             } catch (error) {
//                 res.status(500).json({ message: "Error fetching users", error });
//             }
//         });

//         app.get("/reaction/:id", async (req, res) => {
//             const id = req.params.id;
//             const query = { _id: id };
//             const result = await reactionCollection.findOne(query);
//             res.status(200).send(result);
//         });
//         // reaction related api end


//         // comment related api start
//         app.post("/comments/:id", async (req, res) => {
//             const id = req.params.id;
//             const { commentInfo } = req.body;
//             const taskId = new ObjectId(id);
//             const result = await commentCollection.insertOne({
//                 taskId,
//                 ...commentInfo,
//             });
//             res.status(200).send(result);
//         });


//         app.get("/comment/:id", async (req, res) => {
//             const taskId = req.params.id;
//             const objectId = new ObjectId(taskId);
//             const result = await commentCollection
//                 .find({ taskId: objectId })
//                 .toArray();
//             res.status(200).send(result);
//         });
//         // comment related api end
//     } catch (error) {
//         console.error("Error connecting to MongoDB:", error);
//     }
// }
// // }

// run().catch(console.dir);

// app.get("/", (req, res) => {
//     res.send("SIMPLE CRUD IS RUNNING");
// });
// app.listen(port, () => {
//     console.log(`SIMPLE crud is running on port: ${port}`)

// })


require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();


const { createServer } = require("http");
const { Server } = require("socket.io");
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Adjust this for production
        methods: ["GET", "POST"],
    },
});
io.on("connection", (socket) => {
    console.log("A user connected");
});


// Middleware
app.use(cors());
app.use(express.json());

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



async function run() {
    try {
        //   await client.connect();
        //   await client.db("admin").command({ ping: 1 });
        //   console.log("Group backend code structure created");


        // const database = client.db("collabnesttools");
        // const tasksCollection = database.collection("tasks");
        // const userCollection = database.collection("users");
        // const profileCollection = database.collection("profileInfo");
        // const reactionCollection = database.collection("reactions");
        // const commentCollection = database.collection("comments");
        // const userTaskCollection = database.collection('userTaskCollection');
        // const messagesCollection = database.collection('messagesCollection');
        const database = client.db("collabnesttools");
        // const database = client.db("coffeeDB");
        const messagesCollection = database.collection("messages");
        const tasksCollection = database.collection("tasks");
        const userCollection = database.collection("users");
        const profileCollection = database.collection("profileInfo");
        const reactionCollection = database.collection("reactions");
        const commentCollection = database.collection("comments");
        const userTaskCollection = database.collection("userTaskCollection");



        app.get("/tasks", async (req, res) => {
            try {
                const { filter, search, userId } = req.query;
                let query = {};


                if (userId) query.userId = userId;
                if (search) query.title = { $regex: search, $options: "i" };


                if (filter === "Tasks with Attachments")




                    query.fileUrl = { $exists: true, $ne: "" };
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
        app.post('/upload-image', async (req, res) => {
            const task = req.body;


            try {
                const result = await client.db("collabnesttools").collection("tasks").insertOne(task);


                // Emit to all connected clients
                io.emit('newImage', task);


                res.status(201).json({ message: "Image shared successfully", taskId: result.insertedId });
            } catch (error) {
                res.status(500).json({ message: "Failed to upload image", error });
            }
        });


        // req to db for group leader
        // In your Express app file or separate router
        app.post("/groupLeaderRequest", async (req, res) => {
            const { name, email, uid } = req.body;

            try {
                const requestedAt = new Date();
                const status = "pending";

                const existing = await database.collection("groupLeaderRequests").findOne({ email, status: "pending" });

                if (existing) {
                    return res.status(400).json({ message: "You have already submitted a request." });
                }

                await database.collection("groupLeaderRequests").insertOne({
                    name,
                    email,
                    uid,
                    requestedAt,
                    status,
                });

                res.status(200).json({ message: "Request submitted successfully." });
            } catch (error) {
                console.error("Request error:", error);
                res.status(500).json({ message: "Server error. Try again later." });
            }
        });
        app.get("/leaderRequests", async (req, res) => {
            try {
                const requests = await database
                    .collection("groupLeaderRequests")
                    .find({ status: "pending" })
                    .toArray();

                res.status(200).json(requests);
            } catch (error) {
                console.error("Fetch error:", error);
                res.status(500).json({ message: "Failed to fetch requests." });
            }
        });
        // Approve group leader request
        app.patch("/approveLeader/:email", async (req, res) => {
            const { email } = req.params;

            try {
                // Update the userRole to 'group leader'
                const result = await profileCollection.updateOne(
                    { email: email },
                    { $set: { userRole: "group leader" } }  // Set the user role to 'group leader'
                );

                // Mark the group leader request as approved in the requests collection (if applicable)
                const requestResult = await database.collection("groupLeaderRequests").updateOne(
                    { email: email },
                    { $set: { status: "approved" } }  // Update the request status to 'approved'
                );

                if (result.modifiedCount > 0 && requestResult.modifiedCount > 0) {
                    res.status(200).json({ message: "User role updated and request approved" });
                } else {
                    res.status(400).json({ message: "Failed to approve user role or request" });
                }
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Server error" });
            }
        });
        // Decline group leader request
        app.patch("/declineLeader/:email", async (req, res) => {
            const { email } = req.params;

            try {
                // Update the userRole to 'user'
                // const result = await profileCollection.updateOne(
                //     { email: email },
                //     { $set: { userRole: "user" } }  // Reset the user role to 'user'
                // );

                // Mark the group leader request as declined in the requests collection
                const requestResult = await database.collection("groupLeaderRequests").updateOne(
                    { email: email },
                    { $set: { status: "declined" } }  // Update the request status to 'declined'
                );

                if (requestResult.modifiedCount > 0) {
                    res.status(200).json({ message: "User role updated and request declined" });
                } else {
                    res.status(400).json({ message: "Failed to decline user role or request" });
                }
            } catch (error) {
                console.error(error);
                res.status(500).json({ message: "Server error" });
            }
        });







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
                // if (!result1 || !result1.insertedId) {
                //     return res.status(500).json({ success: false, message: "Task creation failed" });
                // }

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
                const userTasks = await tasksCollection
                    .find({ assignedTo: req.params.userId })
                    .toArray();
                res.status(200).json({ success: true, tasks: userTasks });
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: "Failed to fetch user tasks",
                    error,
                });
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
        // individual task assigning
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

        // check if task exist
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
        // pinned task
        app.post('/pin-task', async (req, res) => {
            const { taskId, email, pinned } = req.body;

            if (!taskId || !email || typeof pinned !== "boolean") {
                return res.status(400).json({ message: "Missing required fields" });
            }

            try {
                const result = await userTaskCollection.updateOne(
                    { "task._id": taskId, email },
                    { $set: { pinned } }
                );

                res.status(200).json({ message: "Pin state updated", result });
            } catch (error) {
                res.status(500).json({ message: "Failed to update pin state", error });
            }
        });




        app.put("/task/:id", async (req, res) => {
            const taskId = req.params.id;
            let { inProgressCount = 0, doneCount = 0 } = req.body;

            // Ensure input is numeric
            inProgressCount = parseInt(inProgressCount, 10) || 0;
            doneCount = parseInt(doneCount, 10) || 0;

            console.log(`🛠️ Updating main task counts for ID ${taskId}`);
            console.log("🔢 Received delta counts:", { inProgressCount, doneCount });

            try {
                const task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });

                // If existing fields are strings, convert them first
                const updates = {};
                if (typeof task?.doneCount === "string") {
                    updates.doneCount = parseInt(task.doneCount, 10) || 0;
                }
                if (typeof task?.inProgressCount === "string") {
                    updates.inProgressCount = parseInt(task.inProgressCount, 10) || 0;
                }

                // If any fix needed, update document
                if (Object.keys(updates).length > 0) {
                    await tasksCollection.updateOne(
                        { _id: new ObjectId(taskId) },
                        { $set: updates }
                    );
                    console.log("🔧 Fixed non-numeric fields before incrementing:", updates);
                }

                // Now perform the increment operation
                const result = await tasksCollection.updateOne(
                    { _id: new ObjectId(taskId) },
                    {
                        $inc: {
                            inProgressCount,
                            doneCount
                        }
                    }
                );

                console.log("✅ Task count update result:", result);
                res.send(result);
            } catch (err) {
                console.error("❌ Error in /task/:id:", err);
                res.status(500).send({ error: "Failed to update task counts", details: err });
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


        // get all task
        app.get("/tasks", async (req, res) => {
            try {
                const data = await tasksCollection.find({}).toArray();
                res.json(data);
            } catch (error) {
                res.status(500).json({ message: "Error fetching tasks", error });
            }
        });





        app.post("/user", async (req, res) => {
            const {
                fullName,
                email,
                photoURL,
                userRole,
                registrationDate,
                userImage,
                profession,
                yearOfExperience,
                registryType,
            } = req.body;

            try {
                // Check if the user already exists
                const existingUser = await userCollection.findOne({ email });

                if (existingUser) {
                    return res
                        .status(200)
                        .json({ message: "User already exists", userId: existingUser._id });
                }

                // Common user data
                const userData = {
                    fullName,
                    email,
                    photoURL,
                    userRole,
                    registrationDate,
                    userImage: userImage || "n/a",
                    profession: profession || "n/a",
                    yearOfExperience: yearOfExperience || "n/a",
                    registryType: registryType || "email",
                };

                // Insert into both collections
                const result = await userCollection.insertOne(userData);
                await profileCollection.insertOne(userData);

                res.status(201).json({
                    message: "User saved successfully",
                    userId: result.insertedId,
                });
            } catch (error) {
                console.error("Error saving user data:", error);
                res.status(500).json({ message: "Error saving user data", error });
            }
        });





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
        app.get("/profileInfo/:email", async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const result = await profileCollection.find(query).toArray();
            res.send(result);
        });


        // reaction related api start
        app.post("/reactions", async (req, res) => {
            const { cardId, reactions } = req.body;
            const update =
                reactions === "like"
                    ? { $inc: { likeCount: 1 } }
                    : reactions === "dislike"
                        ? { $inc: { disLikeCount: 1 } }
                        : null;


            try {
                const result = await reactionCollection.findOneAndUpdate(
                    { _id: cardId },
                    update,
                    { upsert: true, returnDocument: "after" }
                );


                if (!result.value) {
                    return res.status(404).send({ error: "Task not found" });
                }
                res.status(200).send(result.value);
            } catch (err) {
                res.status(500).send({ error: "Internal Server Error" });
            }
        });

        // fetching user for mention
        app.get('/user', async (req, res) => {
            try {
                const users = await userCollection.find({}).toArray();
                res.json(users);
            } catch (error) {
                res.status(500).json({ message: "Error fetching users", error });
            }
        });

        app.get("/reaction/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: id };
            const result = await reactionCollection.findOne(query);
            res.status(200).send(result);
        });
        // reaction related api end


        // comment related api start
        app.post("/comments/:id", async (req, res) => {
            const id = req.params.id;
            const { commentInfo } = req.body;
            const taskId = new ObjectId(id);
            const result = await commentCollection.insertOne({
                taskId,
                ...commentInfo,
            });
            res.status(200).send(result);
        });
        // Socket.IO Real-time Chat
        io.on("connection", (socket) => {
            console.log("A user connected:", socket.id);


            socket.on("sendMessage", async (messageData) => {
                try {
                    const { roomId, senderId, message, senderName } = messageData;


                    if (!roomId || !senderId || !message) {
                        throw new Error("Missing required fields");
                    }


                    const newMessage = {
                        roomId,
                        senderId,
                        senderName: senderName || senderId,
                        message,
                        timestamp: new Date(),
                    };


                    const result = await messagesCollection.insertOne(newMessage);


                    io.to(roomId).emit("newMessage", {
                        ...newMessage,
                        _id: result.insertedId,
                    });
                } catch (err) {
                    console.error("Message save error:", err);
                    socket.emit("chatError", {
                        type: "MESSAGE_SAVE_FAILED",
                        message: err.message,
                    });
                }
            });
            // Listen for joining a room
            socket.on("joinRoom", async (roomId) => {
                try {
                    socket.join(roomId);
                    // console.log(`User ${socket.id} joined room: ${roomId}`);


                    // Fetch message history for that room
                    const history = await messagesCollection
                        .find({ roomId })
                        .sort({ timestamp: 1 })
                        .toArray();


                    socket.emit("chatHistory", history);
                } catch (err) {
                    console.error("Error joining room:", err);
                    socket.emit("chatError", {
                        type: "JOIN_ROOM_FAILED",
                        message: err.message,
                    });
                }
            });


            socket.on("disconnect", () => {
                console.log("User disconnected:", socket.id);
            });
        });


        // temporary test endpoint
        // app.post("/api/test-message", async (req, res) => {
        //   try {
        //     const testMsg = {
        //       roomId: "test-room",
        //       senderId: "test-user",
        //       message: "This is a test message",
        //       timestamp: new Date(),
        //     };


        //     const result = await messagesCollection.insertOne(testMsg);
        //     res.json({ success: true, insertedId: result.insertedId });
        //   } catch (err) {
        //     res.status(500).json({ error: err.message });
        //   }
        // });


        // Chat API Endpoints
        app.get("/api/messages/:roomId", async (req, res) => {
            try {
                const messages = await messagesCollection
                    .find({ roomId: req.params.roomId })
                    .sort({ timestamp: 1 })
                    .toArray();
                res.json(messages);
            } catch (err) {
                console.error("Failed to fetch messages:", err);
                res.status(500).json({ error: "Failed to fetch messages" });
            }
        });






        app.get("/comment/:id", async (req, res) => {
            const taskId = req.params.id;
            const objectId = new ObjectId(taskId);
            const result = await commentCollection
                .find({ taskId: objectId })
                .toArray();
            res.status(200).send(result);
        });
        // comment related api end
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}
// }

run().catch(console.dir);

app.get("/", (req, res) => {
    res.send("SIMPLE CRUD IS RUNNING");
});
app.listen(port, () => {
    console.log(`SIMPLE crud is running on port: ${port}`)

})