const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config()
const app = express();
const port = process.env.PROT || 5000;

app.use(cors())
app.use(express.json())





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.a2ulpwj.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const newsCollection = client.db('theDailyPulse').collection('news')
    const usersCollection = client.db('theDailyPulse').collection('menu')
    const publishersCollection = client.db('theDailyPulse').collection('reviews')



    // news collection related apis here 

              //insert item on new
      
              app.post("/news", async(req, res) => {
                const data = req.body;
                const result = await newsCollection.insertOne(data)
                res.send(result)
              })


              // get item from newsCollection

                      // find all news from news collection
      
          app.get('/news', async(req, res) => {
      
            const result = await newsCollection.find().toArray()
            res.send(result)
        })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);















app.get('/', async(req, res) => {
    res.send(`the daily pulse server is running on prot ${port}`)
})

app.listen(port,() => { 
    console.log(`the daily pulse server is running on prot ${port}`)
    
})