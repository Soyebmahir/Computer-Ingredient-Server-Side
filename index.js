const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');



const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());



// const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uq1tk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        console.log('DB conneted,YAY');
        await client.connect();
        const productCollection = client.db('computer_ingredient').collection('products');

        app.get('/products',async(req,res)=>{
            
            const query = {};
      const cursor = productCollection.find(query)
    //   .project({ name: 1 });
      const products = await cursor.toArray();
      products.reverse();
      res.send(products);
        })
    }
    finally {

    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Computer Ingredients app portal Running!')
})

app.listen(port, () => {
    console.log(`Computer Ingredients  App listening on port ${port}`)
})