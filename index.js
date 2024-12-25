require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin : ['http://localhost:5174'],
    credentials : true
}));
app.use(express.json());
app.use(cookieParser());

// MongoDB URI
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
        console.log("Connected to MongoDB");

        // Database and collections
        const volunteerCollection = client.db('volunteerDB').collection('volunteer');
        const requestsCollection = client.db('volunteerDB').collection('requests');
        const messagesCollection = client.db('volunteerDB').collection('messages');


        // auth related APIs
        app.post('/jwt', (req,res)=>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET,{expiresIn : '25h'});

            res.cookie('token', token,{
                httpOnly : true,
                secure : false
            })
            .send({success: true})
        })

        app.post('/logout', (req,res)=>{
            res.clearCookie('token',{
                httpOnly: true,
                secure: false
            })
            .send({success : true})
        })
      

        // Contact Us Page
        app.post('/contact-form', async (req, res) => {
            const { name, email, message } = req.body;
            const result = await messagesCollection.insertOne({ name, email, message });
            res.send(result);
        });

        // Get Volunteer Posts Sorted by Deadline
        app.get('/volunteers', async (req, res) => {
            const volunteers = await volunteerCollection.find().sort({ deadline: 1 }).limit(6).toArray();
            res.send(volunteers);
        });




        // Fetch all posts or search by title
        app.get('/volunteersAll', async (req, res) => {
            const searchQuery = req.query.search || '';
            const regex = new RegExp(searchQuery, 'i');
            const query = searchQuery ? { title: { $regex: regex } } : {};
            const volunteers = await volunteerCollection.find(query).toArray();
            res.send(volunteers);
        });


        // Get Volunteer Post Details
        app.get('/volunteers/:id', async (req, res) => {
            const { id } = req.params;
            const post = await volunteerCollection.findOne({ _id: new ObjectId(id) });
            res.send(post);
        });

        // Add Volunteer Post (Ensure volunteersNeeded is numeric)
        app.post('/volunteers', async (req, res) => {
            const volunteer = req.body;

           
            volunteer.volunteersNeeded = parseInt(volunteer.volunteersNeeded, 10);

           
            const result = await volunteerCollection.insertOne(volunteer);
            res.send(result);
        });

        // Request Volunteer - Decrement Volunteers Needed
        app.post('/request-volunteer', async (req, res) => {
            const requestData = req.body;
        
            try {
                const { volunteerPostId } = requestData;
        
               
                if (!ObjectId.isValid(volunteerPostId)) {
                    return res.status(400).json({ message: 'Invalid Volunteer Post ID format.' });
                }
        
                // Fetch the volunteer post
                const volunteerPost = await volunteerCollection.findOne({ _id: new ObjectId(volunteerPostId) });
        
                if (!volunteerPost) {
                    return res.status(404).json({ message: 'Volunteer post not found.' });
                }
        
            
                let volunteersNeeded = parseInt(volunteerPost.volunteersNeeded, 10);
        
                if (isNaN(volunteersNeeded)) {
                    return res.status(400).json({ message: 'The volunteersNeeded field is not a valid number.' });
                }
        
             
                if (volunteersNeeded > 0) {
                    
                    const updateResult = await volunteerCollection.updateOne(
                        { _id: new ObjectId(volunteerPostId) },
                        { $set: { volunteersNeeded: volunteersNeeded - 1 } }
                    );
        
                    if (updateResult.modifiedCount === 0) {
                        return res.status(400).json({ message: 'Failed to update volunteersNeeded.' });
                    }
                } else {
                    return res.status(400).json({ message: 'No more volunteers needed for this post.' });
                }
        
                const result = await requestsCollection.insertOne(requestData);
        
                if (result.insertedId) {
                    res.status(200).json({
                        message: 'Volunteer request successfully submitted.',
                        insertedId: result.insertedId,
                    });
                } else {
                    res.status(400).json({ message: 'Failed to submit volunteer request.' });
                }
            } catch (error) {
                console.error('Error processing volunteer request:', error);
                res.status(500).json({ message: 'Internal Server Error' });
            }
        });
        
        
        
        
        
        
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");

    } catch (error) {
        console.error('MongoDB connection error:', error);
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}

run().catch(console.dir);

// Root route
app.get('/', (req, res) => {
    res.send('Volunteer management server is running');
});

// Start server
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
});
