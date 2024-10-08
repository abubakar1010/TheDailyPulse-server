const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const app = express();
const port = process.env.PROT || 5000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://thedailypulse-d0a33.web.app",
      "https://thedailypulse-d0a33.firebaseapp.com"
    ],
    credentials: true
  })
);
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a2ulpwj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const newsCollection = client.db("theDailyPulse").collection("news");
    const usersCollection = client.db("theDailyPulse").collection("users");
    const publishersCollection = client
      .db("theDailyPulse")
      .collection("publishers");

    // jwt related apis

    // middleware

    // middleware

    const verifyToken = (req, res, next) => {
      // console.log("verify token",req.headers.authorization);

      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err)
          return res.status(401).send({ message: "unauthorized access" });
        req.decoded = decoded;
        next();
      });
    };

    //verify admin middleware

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;

      const query = { email };
      const result = await usersCollection.findOne(query);
      const isAdmin = result?.role === "admin";
      if (!isAdmin)
        return res.status(403).send({ message: "forbidden access" });

      next();
    };

    // make jwt token

    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // user related apis

    // get all user

    app.get("/users", verifyToken, verifyAdmin, async (req, res) => {
      // console.log(req.headers);

      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.get("/length", async (req, res) => {
      // console.log(req.headers);

      const query = { isPremium: true };

      const allUser = await usersCollection.find().toArray();
      const allPremiumUsers = await usersCollection.find(query).toArray();

      const totalUsers = allUser.length;
      const premiumUsers = allPremiumUsers.length;
      const normalUsers = totalUsers - premiumUsers;

      // console.log(typeof(totalUsers));

      res.send({ totalUsers, premiumUsers, normalUsers });
    });
    app.get("/premiumUser/:email", async (req, res) => {

      const emailId = req.params.email
      const query = { email: emailId };
      console.log(query);
      

      const result = await usersCollection.findOne(query);
      res.send(result);
    });

    //admin user

    app.get("/users/admin/:email", verifyToken, async (req, res) => {
      const email = req.params.email;

      if (email !== req.decoded.email)
        return res.status(403).send({ message: "forbidden access" });
      const filter = { email: email };
      const result = await usersCollection.findOne(filter);

      let admin = false;
      if (result) {
        admin = result?.role === "admin";
      }
      res.send({ admin });
    });

    // insert a user

    app.post("/users", async (req, res) => {
      const user = req.body;

      const query = { email: user.email };
      const isExist = await usersCollection.findOne(query);
      // console.log(user, query, isExist);
      if (isExist)
        return res.send({ message: "user already exist", insertedId: null });
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

    // delete users

    app.delete("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });

    //update user

    app.patch(
      "/users/admin/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const filter = { _id: new ObjectId(id) };
        const updatedDocs = {
          $set: {
            role: "admin",
          },
        };
        const result = await usersCollection.updateOne(filter, updatedDocs);
        res.send(result);
      }
    );

    app.patch("/users/payment/:email", verifyToken, async (req, res) => {
      const email = req.params.email;
      const filter = { email };
      const updatedDocs = {
        $set: {
          isPremium: true,
        },
      };
      const result = await usersCollection.updateOne(filter, updatedDocs);
      res.send(result);
    });

    // news collection related apis here

    //insert item on new

    app.post("/news", verifyToken, async (req, res) => {
      const data = req.body;
      // console.log(data);

      const filter = { name: data.publisher };
      console.log(filter);

      const update = {
        $inc: {
          totalNews: 1,
        },
      };
      const publisherResult = await publishersCollection.updateOne(
        filter,
        update
      );
      console.log(publisherResult);

      const result = await newsCollection.insertOne(data);
      res.send(result);
    });

    // get item from newsCollection

    // find all news from news collection

    app.get("/news", async (req, res) => {
      const result = await newsCollection.find().toArray();
      res.send(result);
    });
    // find all news from news collection

    app.get("/news/user/:email", verifyToken, async (req, res) => {
      const emailId = req.params.email;
      // console.log(emailId);

      const query = { authorEmail: emailId };
      const result = await newsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/news/status", async (req, res) => {
      const query = { status: "Approved" };
      
      const result = await newsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/news/premium", verifyToken, async (req, res) => {
      const query = { subscription: true };
      const result = await newsCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/news/title/:name", async (req, res) => {
      const name = req.params.name;
      // console.log(name);
      const query = { title: { $regex: new RegExp(name, "i") } };
      const result = await newsCollection.find(query).toArray();

      res.send(result);
    });
    app.get("/news/publisher/:name", async (req, res) => {
      const name = req.params.name;
      // console.log(name);
      const query = { publisher: { $regex: new RegExp(name, "i") } };
      const result = await newsCollection.find(query).toArray();

      res.send(result);
    });

    // get specific item from news collection

    app.get("/news/:id", async (req, res) => {
      const id = req.params.id;

      const query = { _id: new ObjectId(id) };

      const update = {
        $inc: {
          views: 1,
        },
      };

      // console.log(id);

      const updateNews = await newsCollection.updateOne(query, update);

      const result = await newsCollection.findOne(query);
      res.send({ result, update });
    });

    // get top 6 trending articles

    app.get("/trendingNews", async (req, res) => {
      const query = { status: "Approved" };
      const trendingNews = await newsCollection
        .find(query)
        .sort({ views: -1 })
        .limit(6)
        .toArray();

      res.send(trendingNews);
    });

    //update news status

    app.patch(
      "/news/updateStatus/:id",
      verifyToken,
      verifyAdmin,
      async (req, res) => {
        const id = req.params.id;
        const data = req.body;
        // console.log("id = ", id, "status = ", status);

        const filter = { _id: new ObjectId(id) };
        let updatedDocs = {};
        if(data.status == "premium"){

           updatedDocs = {
            $set: {
              subscription: true,
            },
          };
        }else{
           updatedDocs = {
            $set: {
              status: data.status,
            },
          };
        }
        const result = await newsCollection.updateOne(filter, updatedDocs);
        res.send(result);
      }
    );

    //delete news
    app.delete("/news/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await newsCollection.deleteOne(query);
      res.send(result);
    });

    //update news

    app.patch("/news/:id", verifyToken, async (req, res) => {
      const id = req.params.id;
      // console.log("id ---> ",id);
      // console.log("data ----> ", req.body);

      const { title, tags, publisher, description, image } = req.body;
      const filter = { _id: new ObjectId(id) };
      const updatedDocs = {
        $set: {
          title,
          tags,
          publisher,
          description,
          image,
        },
      };
      const result = await newsCollection.updateOne(filter, updatedDocs);
      res.send(result);
    });

    //insert publisher on publisher collection

    app.post("/publisher", verifyToken, verifyAdmin, async (req, res) => {
      const data = req.body;
      const result = await publishersCollection.insertOne(data);
      res.send(result);
    });

    // find all publishers from publishers collection

    app.get("/publisher", async (req, res) => {
      const result = await publishersCollection.find().toArray();
      res.send(result);
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!"
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", async (req, res) => {
  res.send(`the daily pulse server is running on prot ${port}`);
});

app.listen(port, () => {
  console.log(`the daily pulse server is running on prot ${port}`);
});
