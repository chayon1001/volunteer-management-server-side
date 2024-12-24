require('dotenv').config();
const express = require('express');
const cors = require('cors');

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


const app = express();
const port = process.env.PORT || 5000;


// middleware

app.use(cors());
app.use(express.json());








const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.crj7d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;



const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    
    await client.connect();
    // Send a ping to confirm a successful connection


    // Database and collections

    const volunteerCollection = client.db('volunteerDB').collection('volunteer');


    const messagesCollection = client.db('volunteerDB').collection('messages')

    // contact us pages
    app.post('/contact-form', async (req, res) => {
        const { name, email, message } = req.body;
       const result =  messagesCollection.insertOne({ name, email, message })
       res.send(result)
          
      });
      


    // Get Volunteer Posts Sorted by Deadline
    app.get('/volunteers', async (req, res) => {
        const volunteers = await volunteerCollection.find().sort({ deadline: 1 }).limit(6).toArray();
        res.send(volunteers);
    });


    // volunteers details
    app.get('/volunteers/:id', async (req, res) => {
        const { id } = req.params;
            const post = await volunteerCollection.findOne({ _id: new ObjectId(id) });
            res.send(post);
        
    });
    
      
      

    // add volunteer need post
    app.post('/volunteers', async(req,res)=>{
        const volunteer = req.body;
        const result = await volunteerCollection.insertOne(volunteer);
        res.send(result);
    })

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req,res)=>{
    res.send('volunteer management server is running')
})

app.listen(port, ()=>{
    console.log(`server is running on port: ${port}`);
})