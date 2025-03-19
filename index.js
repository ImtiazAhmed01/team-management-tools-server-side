const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');
const port = process.env.PORT || 5000;
const app = express();
app.use(cors());
app.use(express.json());
const { ObjectId } = require('mongodb');

