require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const segmentationRoutes = require('./routes/segmentation');
const campaignsRoutes = require('./routes/campaign');
const nlpParserRoutes =require('./routes/nlpParser');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(bodyParser.json());

app.use('/api', customerRoutes);
app.use('/api', orderRoutes);
app.use('/api', segmentationRoutes);
app.use('/api', campaignsRoutes);
app.use('/api/campaigns', campaignsRoutes);
app.use('/api', nlpParserRoutes);

mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.log('MongoDB connection error:', err));
  
app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running at http://localhost:${process.env.PORT || 5000}`);
});
