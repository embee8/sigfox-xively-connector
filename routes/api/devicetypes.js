const routes = require('express').Router({ mergeParams: true });

// GET: Get all device types
routes.get('/', (req, res) => {
  res.status(200).json({ message: 'Get all device types' });
});

// GET: Get specific device type
routes.get('/:id', (req, res) => {
  res.status(200).json({ message: 'Get device types ' + req.params.id });
});

// POST: Add new device type
routes.post('/', (req, res) => {
  res.status(200).json({ message: 'New device types' });
});

// PUT: Update a device type
routes.put('/:id', (req, res) => {
  res.status(200).json({ message: 'Update device types ' + req.params.id });
});

// DELETE: Delete a device type
routes.delete('/:id', (req, res) => {
  res.status(200).json({ message: 'Delete device types ' + req.params.id });
});

routes.use('*', (req, res) => {
  res.sendStatus(404);
});

module.exports = routes;