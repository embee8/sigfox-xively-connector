const routes = require('express').Router({ mergeParams: true });

const deviceTypesRouter = require('./devicetypes');
const devicesRouter = require('./devices');
const mappingsRouter = require('./mappings');

var expressJWT = require('express-jwt');
var jwt = require('jsonwebtoken');

/*routes.get('/', (req, res) => {
  res.status(200).json({ message: 'Connected!' });
});*/

routes.use(expressJWT({ secret: "mycypher" }).unless( { path: "/api/v2/login" } ));


// Login
routes.post('/login', (req, res) => {
  console.log(req.body.username);
  var token = jwt.sign( { username: req.body.username }, "mycypher");
  res.status(200).json(token);
});

// Logout
routes.post('/logout', (req, res) => {
  res.sendStatus(200);
});

// Device types
routes.use('/devicetypes', deviceTypesRouter);

// Devices
routes.use('/devices', devicesRouter);

// Mappings
routes.use('/mappings', mappingsRouter);

// Fallback route
routes.use('*', (req, res) => {
  res.sendStatus(404);
});

module.exports = routes;