const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');



const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: 'UnAuthorized access' });
  }
  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden access' })
    }
    req.decoded = decoded;
    next();
  });
}




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uq1tk.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
  try {
    console.log('DB conneted,YAY');
    await client.connect();
    const productCollection = client.db('computer_ingredient').collection('products');
    const orderCollection = client.db('computer_ingredient').collection('order');
    const userCollection = client.db('computer_ingredient').collection('user');

    app.get('/products', async (req, res) => {

      const query = {};
      const cursor = productCollection.find(query)
      //   .project({ name: 1 });
      const products = await cursor.toArray();
      products.reverse();
      res.send(products);
    })

    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productCollection.findOne(query);
      res.send(product);
    })

    app.get('/admin/:email', async(req, res) =>{
      const email = req.params.email;
      const user = await userCollection.findOne({email: email});
      const isAdmin = user.role === 'admin';
      res.send({admin: isAdmin})
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