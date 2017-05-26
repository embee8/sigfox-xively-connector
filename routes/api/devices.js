const routes = require('express').Router({ mergeParams: true });

// GET: Get all devices
routes.get('/', (req, res) => {
  res.status(200).json({ message: 'Get all devices' });
});

// GET: Get specific device
routes.get('/:id', (req, res) => {
  res.status(200).json({ message: 'Get device ' + req.params.id });
});

// POST: Add new device
routes.post('/', (req, res) => {
  res.status(200).json({ message: 'New device' });
});

// PUT: Update a device
routes.put('/:id', (req, res) => {
  res.status(200).json({ message: 'Update device ' + req.params.id });
});

// DELETE: Delete a device
routes.delete('/:id', (req, res) => {
  res.status(200).json({ message: 'Delete device ' + req.params.id });
});

routes.use('*', (req, res) => {
  res.sendStatus(404);
});

module.exports = routes;