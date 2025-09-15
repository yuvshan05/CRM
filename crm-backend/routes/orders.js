
const express =require('express');
const Order = require('../models/Order');
const router = express.Router();


router.post('/orders', async (req, res) => {
  try {
    const order = new Order(req.body);
    await order.save();
    res.status(201).json({ success: true, message: 'Order data received' });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error storing order data', error });
  }
});


router.get('/orders', async (req, res) => {
  try {
    const orders = await Order.find();
    res.status(200).json(orders);
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error fetching orders', error });
  }
});

// Delete all orders
router.delete('/', async (req, res) => {
  try {
    const result = await Order.deleteMany({});
    res.status(200).json({ success: true, deleted: result.deletedCount });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Error deleting orders', error });
  }
});

module.exports = router;
