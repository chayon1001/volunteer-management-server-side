require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

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

            // Ensure the volunteersNeeded field is a number (parse it)
            volunteer.volunteersNeeded = parseInt(volunteer.volunteersNeeded, 10);

            // Insert the volunteer post into the collection
            const result = await volunteerCollection.insertOne(volunteer);
            res.send(result);
        });

        // Request Volunteer - Decrement Volunteers Needed
        app.post('/request-volunteer', async (req, res) => {
            const requestData = req.body;
        
            try {
               
                const result = await requestsCollection.insertOne(requestData);
        
                if (result.insertedId) {
                  
                    const requestDoc = await requestsCollection.findOne({ _id: result.insertedId });
        
                    if (!requestDoc) {
                        return res.status(404).json({ message: 'Request not found.' });
                    }
        
                   
                    if (typeof requestDoc.volunteersNeeded !== 'number') {
                        await requestsCollection.updateOne(
                            { _id: result.insertedId },
                            { $set: { volunteersNeeded: parseInt(requestDoc.volunteersNeeded, 10) } }
                        );
                    }
        
                   
                    const updateResult = await requestsCollection.updateOne(
                        { _id: result.insertedId },
                        { $inc: { volunteersNeeded: -1 } }
                    );
        
                    if (updateResult.modifiedCount === 1) {
                        return res.status(200).json({ message: 'Request successfully submitted and updated', insertedId: result.insertedId });
                    } else {
                        return res.status(400).json({ message: 'Failed to update request count.' });
                    }
                } else {
                    return res.status(400).json({ message: 'Failed to submit request. Please try again.' });
                }
            } catch (error) {
                console.log(error);
                return res.status(500).json({ message: 'Server error while processing the request.' });
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
