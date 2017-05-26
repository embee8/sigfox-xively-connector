const routes = require('express').Router({ mergeParams: true });

// GET: Get all mappings
routes.get('/', (req, res) => {
  res.status(200).json({ message: 'Get all mappings' });
});

// GET: Get specific mapping
routes.get('/:id', (req, res) => {
  res.status(200).json({ message: 'Get mapping ' + req.params.id });
});

// POST: Add new mapping
routes.post('/', (req, res) => {
  res.status(200).json({ message: 'New mapping' });
});

// PUT: Update a mapping
routes.put('/:id', (req, res) => {
  res.status(200).json({ message: 'Update mapping ' + req.params.id });
});

// DELETE: Delete a mapping
routes.delete('/:id', (req, res) => {
  res.status(200).json({ message: 'Delete mapping ' + req.params.id });
});

routes.use('*', (req, res) => {
  res.sendStatus(404);
});

module.exports = routes;