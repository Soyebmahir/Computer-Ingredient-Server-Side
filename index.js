const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);



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
    const paymentCollection = client.db('computer_ingredient').collection('payment')
    const reviewCollection = client.db('computer_ingredient').collection('review')


    const verifyAdmin = async (req, res, next) => {
      const requester = req.decoded.email;
      const requesterAccount = await userCollection.findOne({ email: requester });
      if (requesterAccount.role === 'admin') {
        next();
      }
      else {
        res.status(403).send({ message: 'forbidden' });
      }
    }

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
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const user = await userCollection.findOne(query);
      res.send(user);
    })

    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin })
    })

    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      // const requester = req.decoded.email;
      // const requesterAccount = await userCollection.findOne({ email: requester });
      // if (requesterAccount.role === 'admin') {
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
      // } else {
      //   res.status(403).send({ message: 'forbidden' });
      // }

    })


    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body
      console.log(user);
      const filter = { email: email }
      const options = { upsert: true }
      const updateDoc = {
        $set: user
      }
      const result = await userCollection.updateOne(filter, updateDoc, options)
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '30d' })
      res.send({ result, token });
    })

    app.delete('/orders/:id',  async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    })
    app.delete('/products/:id',  async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productCollection.deleteOne(query);
      res.send(result);
    })






    app.put('/orders/:id', async (req, res) => {
      const id = req.params.id;

      console.log(id);
      const query = { _id: ObjectId(id) };
      const options = { upsert: true }
      const updateDoc = {
        $set: { status: true },
      }
      const result = await orderCollection.updateOne(query, updateDoc, options)

      res.send(result);
    })


    app.get('/orders', verifyJWT, async (req, res) => {
      const email = req.query.email;

      const decodedEmail = req.decoded.email
      if (email === decodedEmail) {
        const query = { email: email };
        const orders = await orderCollection.find(query).toArray();
        return res.send(orders);
      } else {
        return res.status(403).send({ message: 'forbidden access' });
      }

    })

    app.patch('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      }

      const result = await paymentCollection.insertOne(payment);
      const updatedordering = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedordering);
    })

    app.get('/orders/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const order = await orderCollection.findOne(query);
      res.send(order);
    })

    //all orders

    app.get('/order', verifyJWT, async (req, res) => {
      const query = {};
      const orders = await orderCollection.find(query).toArray();
      res.send(orders);
    });

    //stripe payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const order = req.body;
      const price = order.total_price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    })


    app.post('/orders', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      res.send(result);
    });
    app.post('/products', async (req, res) => {
      const order = req.body;
      const result = await productCollection.insertOne(order);
      res.send(result);
    });
    app.post('/reviews', async (req, res) => {
      const order = req.body;
      const result = await reviewCollection.insertOne(order);
      res.send(result);
    });



    app.get('/user', verifyJWT, async (req, res) => {
      const users = await userCollection.find().toArray();
      res.send(users);
    })
    app.get('/reviews',  async (req, res) => {
      const reviews = await reviewCollection.find().toArray();
      res.send(reviews);
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