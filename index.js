const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const port = process.env.PORT || 5000;
const app = express();
const http = require("http").createServer(app);
const { Server } = require("socket.io");
const io = new Server(http, {
    cors: {
        origin: "*", // Adjust this for production
        methods: ["GET", "POST"]
    }
});
io.on("connection", (socket) => {
    console.log("A user connected");
});
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
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Connected to MongoDB");

        const database = client.db("collabnesttools");
        const tasksCollection = database.collection("tasks");
        const userCollection = database.collection("users");
        const profileCollection = database.collection("profileInfo");
        const userTaskCollection = database.collection("userTaskCollection");
        const reactionCollection = database.collection("reactions");
        const commentCollection = database.collection("comments");

        // GET tasks with filters
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
                    today.setHours(0, 0, 0, 0);
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

        // POST task (create new task)
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
                    dueDate: new Date(dueDate),
                    status: "To-Do",
                    assignedTo: userId,
                    inProgressCount: 0,
                    doneCount: 0,
                    fileUrl,
                    createdAt: new Date()
                };

                const result = await tasksCollection.insertOne(task);

                if (!result.insertedId) {
                    return res.status(500).json({ success: false, message: "Task creation failed" });
                }

                res.status(201).json({ success: true, taskId: result.insertedId });
            } catch (error) {
                console.error("Error creating task:", error);
                res.status(500).json({ success: false, message: "Internal server error" });
            }
        });

        // POST image upload (for real-time sharing)
        app.post('/upload-image', async (req, res) => {
            const task = req.body;

            try {
                const result = await tasksCollection.insertOne(task);

                // Emit to all connected clients (Socket.IO)
                io.emit('newImage', task);

                res.status(201).json({ message: "Image shared successfully", taskId: result.insertedId });
            } catch (error) {
                console.error("Upload image error:", error);
                res.status(500).json({ message: "Failed to upload image", error });
            }
        });

    } catch (err) {
        console.error("Failed to connect to MongoDB:", err);
    }
}

app.post("/tasks", async (req, res) => {
    try {
      console.log("Received data:", req.body);
  
      const { title, description, dueDate, status, userId, fileUrl } = req.body;
  
      if (!title || !dueDate) {
        return res.status(400).json({
          success: false,
          message: "Title and due date are required",
        });
      }
  
      const task = {
        title,
        description,
        dueDate,
        status,
        assignedTo: userId,
        fileUrl,
        createdAt: new Date(),
      };
  
      const result = await tasksCollection.insertOne(task);
  
      if (!result || !result.insertedId) {
        return res
          .status(500)
          .json({ success: false, message: "Task creation failed" });
      }
  
      console.log("Task saved:", result);
  
      const savedTask = {
        _id: result.insertedId,
        ...task,
      };
  
      res.status(201).json({ success: true, task: savedTask });
    } catch (error) {
      console.error("Task creation failed:", error);
      res
        .status(500)
        .json({ success: false, message: "Task creation failed", error });
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

    // editor change only
    app.put("/tasks/:id", async (req, res) => {
      try {
        const taskId = req.params.id;
        const { title, description, priority, deadline, userId } = req.body;

        const db = client.db("collabnesttools");
        const tasksCollection = db.collection("tasks");

        const task = await tasksCollection.findOne({
          _id: new ObjectId(taskId),
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

        if (!task) {
          return res.status(404).json({ message: "Task not found" });
        }

        if (task.userId !== userId) {
          return res.status(403).json({
            message: "Unauthorized: You can only edit your own tasks",
          });
        }

        const updatedTask = {
          $set: { title, description, priority, deadline },
        };

        await tasksCollection.updateOne(
          { _id: new ObjectId(taskId) },
          updatedTask
        );
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
          return res
            .status(404)
            .json({ success: false, message: "Task not found" });
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
            createdAt: new Date(),
          };

          await userTasksCollection.insertOne(userTask);
        }

        res.status(200).json({ success: true, task: updatedTask.value });
      } catch (error) {
        res
          .status(500)
          .json({ success: false, message: "Task update failed", error });
      }
    });

    app.delete("/tasks/:id", async (req, res) => {
        const { id } = req.params;
        try {
          const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });
          if (result.deletedCount === 1) {
            res.status(200).json({ message: "Task deleted successfully" });
          } else {
            res.status(404).json({ message: "Task not found" });
          }
        } catch (error) {
          res.status(500).json({ message: "Error deleting task", error });
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


 // ✅ Route 1: Check if a task is assigned to a user
app.get('/is-assigned/:taskId/:email', async (req, res) => {
    const { taskId, email } = req.params;
  
    try {
      const existingAssignment = await userTaskCollection.findOne({
        "task._id": taskId,
        email,
      });
  
      res.status(200).json({ assigned: !!existingAssignment });
    } catch (err) {
      console.error("Error checking assignment:", err);
      res.status(500).json({ message: "Error checking assignment" });
    }
  });
  
  
  // ✅ Route 2: Delete a task only if it belongs to the user
  app.delete('/tasks/:taskId/:userId', async (req, res) => {
    const { taskId, userId } = req.params;
  
    try {
      const task = await tasksCollection.findOne({ _id: new ObjectId(taskId) });
  
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }
  
      if (task.assignedTo !== userId) {
        return res.status(403).json({
          message: "Unauthorized: You can only delete your own tasks",
        });
      }
  
      await tasksCollection.deleteOne({ _id: new ObjectId(taskId) });
      res.status(200).json({ message: "Task deleted successfully" });
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
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
    // post task
    app.post("/tasks", async (req, res) => {
      try {
        const task = req.body;
        const result = await tasksCollection.insertOne(task);
        res.status(201).json({
          message: "Task added successfully",
          taskId: result.insertedId,
        });
      } catch (error) {
        res.status(500).json({ message: "Error adding task", error });
      }
    });

    app.delete("/tasks/:id", async (req, res) => {
      const taskId = req.params.id;

      try {
        const result = await tasksCollection.deleteOne({
          _id: new ObjectId(taskId),
        });

        if (result.deletedCount === 1) {
          res.status(200).json({ message: "Task deleted successfully" });
        } else {
          res.status(404).json({ message: "Task not found" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error deleting task", error });
      }
    });

    app.put("/tasks/:id", async (req, res) => {
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
          res
            .status(404)
            .json({ message: "Task not found or no changes made" });
        }
      } catch (error) {
        res.status(500).json({ message: "Error updating task", error });
      }
    });
    // User info from database
    app.post("/user", async (req, res) => {
      const { fullName, email, photoURL, userRole, registrationDate } =
        req.body;

      try {
        const result = await userCollection.insertOne({
          fullName,
          email,
          photoURL,
          userRole,
          registrationDate,
        });
        res.status(201).json({
          message: "User saved successfully",
          userId: result.insertedId,
        });
      } catch (error) {
        res.status(500).json({ message: "Error saving user data", error });
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
    // profile related api start
    app.post("/profile/:email", async (req, res) => {
      const email = req.params.email;
      const profileInfo = req.body;

      try {
        const isExist = await profileCollection.findOne({ email });

        if (isExist) {
          const updatedProfile = await profileCollection.updateOne(
            { email },
            {
              $set: {
                bio: profileInfo.bio,
                role: profileInfo.role,
                location: profileInfo.location,
                status: profileInfo.status,
                "socialLinks.linkedin": profileInfo.socialLinks.linkedin,
                "socialLinks.portfolio": profileInfo.socialLinks.portfolio,
                "socialLinks.github": profileInfo.socialLinks.github,
              },
            }
          );

          if (updatedProfile.modifiedCount > 0) {
            res.status(200).json({ message: "profile updated successfully!" });
          } else {
            res.status(400).json({ message: "Failed to update profile" });
          }
        } else {
          const newProfile = await profileCollection.insertOne({
            email,
            bio: profileInfo.bio,
            role: profileInfo.role,
            location: profileInfo.location,
            status: profileInfo.status,
            socialLinks: profileInfo.socialLinks,
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
    // profile related api end

    // reaction related api start
  // ✅ POST: Add a reaction to a card
app.post("/reactions", async (req, res) => {
    const { cardId, reactions } = req.body;
  
    if (!cardId || !reactions) {
      return res.status(400).json({ message: "cardId and reactions are required." });
    }
  
    const update =
      reactions === "like"
        ? { $inc: { likeCount: 1 } }
        : reactions === "dislike"
        ? { $inc: { disLikeCount: 1 } }
        : null;
  
    if (!update) {
      return res.status(400).json({ message: "Invalid reaction type." });
    }
  
    try {
      const result = await tasksCollection.updateOne(
        { _id: new ObjectId(cardId) },
        update
      );
      res.status(200).json({ message: "Reaction recorded successfully", result });
    } catch (error) {
      console.error("Error updating reaction:", error);
      res.status(500).json({ message: "Server error", error });
    }
  });
  
  // ✅ GET: Fetch all users
  app.get("/user", async (req, res) => {
    try {
      const users = await userCollection.find({}).toArray();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Error fetching users", error });
    }
  });
  
  // ✅ POST: Add or check user
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
      const existingUser = await userCollection.findOne({ email });
  
      if (existingUser) {
        return res.status(200).json({
          message: "User already exists",
          userId: existingUser._id,
        });
      }
  
      const result = await userCollection.insertOne({
        fullName,
        email,
        photoURL,
        userRole,
        registrationDate,
        userImage: userImage || "n/a",
        profession: profession || "n/a",
        yearOfExperience: yearOfExperience || "n/a",
        registryType: registryType || "email",
      });
  
      res.status(201).json({
        message: "User saved successfully",
        userId: result.insertedId,
      });
    } catch (error) {
      console.error("Error saving user data:", error);
      res.status(500).json({ message: "Error saving user data", error });
    }
  });
  
  // ✅ POST: Update or add user profile
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
          res.status(200).json({ message: "Profile updated successfully!" });
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
      res.status(500).json({ message: "Server error", error });
    }
  });
  
  // ✅ GET: Get profile info by email
  app.get("/profileInfo/:email", async (req, res) => {
    const email = req.params.email;
    try {
      const result = await profileCollection.find({ email }).toArray();
      res.send(result);
    } catch (error) {
      console.error("Error fetching profile info:", error);
      res.status(500).json({ message: "Server error", error });
    }
  });
  
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

    app.get("/comment/:id", async (req, res) => {
      const taskId = req.params.id;
      const objectId = new ObjectId(taskId);
      const result = await commentCollection.find({ taskId: objectId }).toArray();
      res.status(200).send(result);
    });
   


run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("SIMPLE CRUD IS RUNNING");
});
app.listen(port, () => {
  console.log(`SIMPLE crud is running on port: ${port}`);
});






