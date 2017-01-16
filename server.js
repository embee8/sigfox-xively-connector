"use strict";

var mqtt = require("mqtt"); // mqtt.js for Xively
var fs = require("fs"); // file system
var pg = require("pg"); // database
var pgConnStringParser = require('pg-connection-string');

var http = require("http");
var https = require("https");
var path = require("path");

var xiapi = require("./app/xively"); // Xively API
var analytics = require("./app/analytics"); // Analytics library

var express = require("express"); // server
var expressSession = require('express-session');
var bodyParser = require("body-parser")
var passport = require('passport'), LocalStrategy = require('passport-local').Strategy;

var app = express();

// Get port from the environment or use 8080 locally
var port = process.env.PORT || 8080;


/*
  READ CONFIGURATION
*/

// Connection parameters (filled from the database)
var xivelyBrokerUrl;
var xivelyBrokerPort;

var xivelyAccountId;
var xivelyIdUsername;
var xivelyIdPassword;

var xivelyIdentityApiEndpoint;
var xivelyBlueprintApiEndpoint;

// Connector credentials (can be set during the setup process)
var CONNECTOR_USERNAME;
var CONNECTOR_PASSWORD;
var APP_DATABASE_URL;



// Reading environment variables (containing app credentials)

try {
    log("Reading configuration...");

    var envVars = JSON.parse(fs.readFileSync("config/config.json", "utf8"));

    CONNECTOR_USERNAME = envVars.CONNECTOR_USERNAME;
    CONNECTOR_PASSWORD = envVars.CONNECTOR_PASSWORD;
    APP_DATABASE_URL = envVars.APP_DATABASE_URL;
}
catch (e) {

    if (e.code === "ENOENT") {
        log("Local config file not found, reading environment variables.");

        CONNECTOR_USERNAME = process.env.CONNECTOR_USERNAME;
        CONNECTOR_PASSWORD = process.env.CONNECTOR_PASSWORD;
        APP_DATABASE_URL = process.env.APP_DATABASE_URL;
    }
    else {
        log("Error code: " + e.code);
    }
}

var XIVELY_CLIENT;

/*
  CREATE DATABASE CONFIGURATION

  The environment (or config.json) contains a connection string.
  we need to transform that to a config object, using the pg-connection-string parser
*/
var pgConfig = pgConnStringParser.parse(APP_DATABASE_URL);

// In addition to the connection parameters, we set the max number of pool clients and timeout
pgConfig.max = 20;
pgConfig.idleTimeoutMillis = 30000;

log("Connecting to the database using config: " + JSON.stringify(pgConfig));

//this initializes a connection pool
//it will keep idle connections open for a 30 seconds
//and set a limit of maximum 10 idle clients
var databaseClientPool = new pg.Pool(pgConfig);

databaseClientPool.on('error', function (err, client) {
    // if an error is encountered by a client while it sits idle in the pool 
    // the pool itself will emit an error event with both the error and 
    // the client which emitted the original error 
    // this is a rare occurrence but can happen if there is a network partition 
    // between your application and the database, the database restarts, etc. 
    // and so you might want to handle it and at least log it out 
    log('Database pool/client error', err.message, err.stack)
})



/*
  SET UP SERVER AND ROUTES
*/


passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {

    var user = {
        id: 1,
        name: "admin"
    };

    done(null, user);
    /*User.findById(id, function(err, user) {
      done(err, user);
    });*/
});


/*var users = {
  'admin': {
    email: '',
    website: ' ',
    blog: ' '
  }
};

var findUserByUsername = function (username, callback) {
  // Perform database query that calls callback when it's done
  // This is our fake database
  if (!users[username])
    return callback(new Error(
      'No user matching '
       + username
      )
    );
  return callback(null, users[username]);
};*/


passport.use(new LocalStrategy(
    function (username, password, done) {
        //console.log(username + " " + password);
        if (username == CONNECTOR_USERNAME && password == CONNECTOR_PASSWORD) {

            var user = {
                id: 1,
                name: "admin"
            };

            return done(null, user);
        }
        else {
            return done(null, false, { message: "Incorrect credentials" });
        }



        /*User.findOne({ username: username }, function(err, user) {
          if (err) { return done(err); }
          if (!user) {
            return done(null, false, { message: 'Incorrect username.' });
          }
          if (!user.validPassword(password)) {
            return done(null, false, { message: 'Incorrect password.' });
          }
          return done(null, user);
        });*/
    }
));


app.set('port', port);
app.set('view engine', 'ejs');
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // for parsing application/x-www-form-urlencoded

// Express session middleware setup
app.use(expressSession(
    {
        secret: "mySecretKey",
        resave: "false",
        saveUninitialized: "false"
    }
));
app.use(passport.initialize());
app.use(passport.session());


// Serve static files from css and img directories
app.use('/css', express.static(__dirname + '/static/css/'));
app.use('/img', express.static(__dirname + '/static/img/'));




// HOME PAGE
app.get("/", function (req, res) {
    var authenticated = req.isAuthenticated();
    res.render("pages/index", { authenticated: authenticated });
});


// LOGIN (GET)
app.get('/login', function (req, res) {

    var formAction = "login";

    if (req.query != null) {
        if (req.query.fw != null && req.query.fw != "") {
            formAction += "?fw=" + req.query.fw
        }
    }

    res.render("pages/login", { formAction: formAction })
});


// LOGIN (POST)
app.post('/login', function (req, res, next) {
    passport.authenticate('local', function (err, user, info) {
        if (err) { return next(err); }
        if (!user) {
            return res.render('pages/login', { formAction: "login", badcredentials: true });
        }

        req.logIn(user, function (err) {
            if (err) { return next(err); }

            // check if we have a callback in the URL
            if (req.query != null) {
                var callback = req.query.fw;

                if (callback != null && callback != "") {
                    res.redirect(callback);
                }
                else {
                    res.redirect("/");
                }
            }
            else {
                res.redirect("/");
            }

            //return res.render('pages/index', { authenticated: true });
        });
    })(req, res, next);
});


// NOT AUTHORISED (GET)
app.get('/notauthorised', function (req, res) {
    res.render("pages/401");
});


// LOGOUT (GET)
app.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});


// DASHBOARD (GET)
app.get('/dashboard', function (req, res) {
    if (req.isAuthenticated()) {
        res.render("pages/dashboard", { authenticated: true });
        //renderAdminView(req, res, "configuration.html");
    }
    else {
        res.redirect('/login?fw=dashboard');
    }
});

// CONFIGURATION (GET)
app.get('/configuration', function (req, res) {
    if (req.isAuthenticated()) {
        res.render("pages/configuration", { authenticated: true });
        //renderAdminView(req, res, "configuration.html");
    }
    else {
        res.redirect('/login?fw=configuration');
    }
});


// MAPPING (GET)
app.get('/mapping', function (req, res) {
    if (req.isAuthenticated()) {
        res.render("pages/mapping", { authenticated: true });
    }
    else {
        res.redirect('/login?fw=mapping');
    }
});






/*
  SETTINGS API
*/

app.get("/api/settings", function (req, res) {

    queryDb("SELECT * FROM settings ORDER BY setting_id ASC", function (err, results) {
        if (results.rowCount == 0) {
            res.json({});
        }
        else {
            var settingsRow = results.rows[0];

            var settings = {
                xi_broker_url: settingsRow.xi_broker_url
            };

            res.json(settingsRow);
        }
    });
});

app.put("/api/settings", function (req, res) {

    var params = [];
    params.push(req.body.xi_broker_url, req.body.xi_broker_port, req.body.xi_api_endpoint_id, req.body.xi_api_endpoint_bp, req.body.xi_account_id, req.body.xi_id_username, req.body.xi_id_password, req.body.setting_id);

    if (req.body.setting_id == null || req.body.setting_id == "" || req.body.setting_id == 0) {

        // Looks like there is no setting in the database yet, let's create a new one

        log("Creating settings (Setting ID = " + req.body.setting_id + ", Xively broker URL = " + req.body.xi_broker_url + ", Xively broker port = " + req.body.xi_broker_port + ", Xively ID API = " + req.body.xi_api_endpoint_id + ", Xively BP API = " + req.body.xi_api_endpoint_bp + ", Xively Account ID = " + req.body.xi_account_id + ", Xively username = " + req.body.xi_id_username + ", Xively PW = ***)");

        // This is the first time the settings are saved, let's create a new row
        queryDb("INSERT INTO settings (xi_broker_url, xi_broker_port, xi_api_endpoint_id, xi_api_endpoint_bp, xi_account_id, xi_id_username, xi_id_password) VALUES ($1, $2, $3, $4, $5, $6, $7)", function (err, result) {
            if (err) {
                log("Couldn't create new settings row: " + JSON.stringify(err));
                res.sendStatus(400);
            } else {
                res.sendStatus(200);
            }
        }, params);
    }

    else {

        log("Updating settings (Setting ID = " + req.body.setting_id + ", Xively broker URL = " + req.body.xi_broker_url + ", Xively broker port = " + req.body.xi_broker_port + ", Xively ID API = " + req.body.xi_api_endpoint_id + ", Xively BP API = " + req.body.xi_api_endpoint_bp + ", Xively Account ID = " + req.body.xi_account_id + ", Xively username = " + req.body.xi_id_username + ", Xively PW = ***)");

        // We have some settings already, but we are going to update them
        queryDb("UPDATE settings SET xi_broker_url = $1, xi_broker_port = $2, xi_api_endpoint_id = $3, xi_api_endpoint_bp = $4 ,xi_account_id = $5, xi_id_username = $6, xi_id_password = $7 WHERE setting_id = $8", function (err, result) {

            if (err) {
                log("Couldn't update settings: " + JSON.stringify(err));

                res.sendStatus(400);
            } else {
                res.sendStatus(200);
            }
        }, params);

    }

});



/*
  DEVICE TYPES API
*/

app.get("/api/devicetypes", function (req, res) {
    queryDb("SELECT * FROM device_types ORDER BY device_type_id ASC", function (err, results) {
        res.json(results.rows);
    });
});

app.put("/api/devicetypes", function (req, res) {

    log("Creating new device type (Name = " + req.body.name + ")");

    var params = [];
    params.push(req.body.name);

    queryDb("INSERT INTO device_types (name) VALUES ($1)", insertCallback, params);

    function insertCallback(err, result) {

        if (err) {
            log("Couldn't create new device type: " + JSON.stringify(err));

            res.sendStatus(400);
        } else {
            res.sendStatus(200);
        }
    }
});

app.put("/api/devicetypes/update", function (req, res) {
    log("Updating device type (ID = " + req.body.device_type_id + ", Name = " + req.body.name + ")");

    var params = [];
    params.push(req.body.name, req.body.device_type_id);

    queryDb("UPDATE device_types SET name = $1 WHERE device_type_id = $2",
        function (err, result) {

            if (err) {
                log("Couldn't update app: " + JSON.stringify(err));

                res.sendStatus(400);
            } else {
                res.sendStatus(200);
            }
        }, params);
});

app.delete("/api/devicetypes/", function (req, res) {

    log("Deleting device type (ID = " + req.body.device_type_id + ")");

    var params = [];
    params.push(req.body.device_type_id);

    queryDb("DELETE FROM device_types WHERE device_type_id = $1", function (err, result) {

        if (err) {
            log("Couldn't delete device type: " + JSON.stringify(err));

            res.sendStatus(400);
        } else {
            res.sendStatus(200);
        }
    }, params);
});






/*
  DEVICES API
*/


app.get("/api/devices", function (req, res) {

    if (req.query.device_type_id == null) {
        res.status(400).send("Bad Request");
    }
    else {

        var params = [];
        params.push(req.query.device_type_id);


        queryDb("SELECT * FROM devices WHERE device_type_id = $1 ORDER BY device_id ASC", function (err, results) {
            /*var result = {
                app_eui: req.query.appeui
                //devices: JSON.parse(results.rows)
            };*/

            res.json(results.rows);
        }, params);
    }
});


app.put("/api/devices", function (req, res) {

    log("Creating new device (Sigfox Device ID = " + req.body.sigfox_device_id + ", Xively Device ID = " + req.body.xi_device_id + ", Device type ID = " + req.body.device_type_id + ", Device name = " + req.body.device_name + ")");

    var params = [];
    params.push(req.body.sigfox_device_id, req.body.xi_device_id, req.body.device_type_id, req.body.device_name);

    queryDb("INSERT INTO devices (sigfox_device_id, xi_device_id, device_type_id, device_name) VALUES ($1, $2, $3, $4)", insertCallback, params);

    function insertCallback(err, result) {

        if (err) {
            log("Couldn't create new device: " + JSON.stringify(err));

            res.sendStatus(400);
        } else {
            res.sendStatus(200);
        }
    }
});


app.put("/api/devices/update", function (req, res) {

    log("Updating device (ID = " + req.body.device_id + ", Sigfox ID = " + req.body.sigfox_device_id + ", Xively Device ID = " + req.body.xi_device_id + ", Device name = " + req.body.device_name + ")");

    var params = [];
    params.push(req.body.sigfox_device_id, req.body.xi_device_id, req.body.device_name, req.body.device_id);

    queryDb("UPDATE devices SET sigfox_device_id = $1, xi_device_id = $2, device_name = $3 WHERE device_id = $4",
        function (err, result) {

            if (err) {
                log("Couldn't update app: " + JSON.stringify(err));

                res.sendStatus(400);
            } else {
                res.sendStatus(200);
            }
        }, params);
});


app.delete("/api/devices/", function (req, res) {

    log("Deleting device (ID = " + req.body.device_id + ")");

    var params = [];
    params.push(req.body.device_id);

    queryDb("DELETE FROM devices WHERE device_id = $1", function (err, result) {

        if (err) {
            log("Couldn't delete device: " + JSON.stringify(err));

            res.sendStatus(400);
        } else {
            res.sendStatus(200);
        }
    }, params);
});





/*
  MAPPINGS API
*/

app.get("/api/mappings", function (req, res) {

    var params = [];
    params.push(req.query.device_type_id);

    queryDb("SELECT * FROM mappings WHERE device_type_id = $1 ORDER BY mapping_id ASC", function (err, results) {
        res.json(results.rows);
    }, params);
});


app.put("/api/mappings", function (req, res) {

    log("Creating new data mapping (Device type ID = " + req.body.device_type_id + ", JSON source field = " + req.body.json_field + ", Xively topic = " + req.body.xi_topic + ", Time series = " + req.body.time_series + ", Category = " + req.body.category + ")");

    var params = [];
    params.push(req.body.device_type_id, req.body.json_field, req.body.xi_topic, req.body.time_series, req.body.category);

    queryDb("INSERT INTO mappings (device_type_id, json_field, xi_topic, time_series, category) VALUES ($1, $2, $3, $4, $5)", insertCallback, params);

    function insertCallback(err, result) {

        if (err) {
            log("Couldn't create new mapping: " + JSON.stringify(err));

            res.sendStatus(400);
        } else {
            res.sendStatus(200);
        }
    }
});


app.put("/api/mappings/update", function (req, res) {

    log("Updating mapping (ID = " + req.body.mapping_id + ", JSON source field = " + req.body.json_field + ", Xively topic = " + req.body.xi_topic + ", Time series = " + req.body.time_series + ", Category = " + req.body.category + ")");

    var params = [];
    params.push(req.body.json_field, req.body.xi_topic, req.body.time_series, req.body.category, req.body.mapping_id);

    queryDb("UPDATE mappings SET json_field = $1, xi_topic = $2, time_series = $3, category = $4 WHERE mapping_id = $5",

        function (err, result) {

            if (err) {
                log("Couldn't update mapping: " + JSON.stringify(err));

                res.sendStatus(400);
            } else {
                res.sendStatus(200);
            }
        }, params);
});


app.delete("/api/mappings", function (req, res) {

    log("Deleting mapping (ID = " + req.body.mapping_id + ")");

    var params = [];
    params.push(req.body.mapping_id);

    queryDb("DELETE FROM mappings WHERE mapping_id = $1", function (err, result) {

        if (err) {
            log("Couldn't delete mapping: " + JSON.stringify(err));

            res.sendStatus(400);
        } else {
            res.sendStatus(200);
        }
    }, params);
});


app.get("/api/restart", function (req, res) {

    log("---Restarting service...");

    //disconnectFromAllApps();

    if (XIVELY_CLIENT != null) {

        XIVELY_CLIENT.end(true, function () {
            log("Connection to Xively closed");
        });
    }

    readSettings();
    res.sendStatus(200);
});


app.get('*', function (req, res) {
    res.render("pages/404");
    //res.status(404).send("Not found");
});

// Start listening to requests
app.listen(process.env.PORT || 8080, function () {
    log('Express server listening on port ' + app.get('port'));
});















/*
  START BRIDGING FUNCTION
*/

readSettings();

function readSettings() {

    log("Reading Xively connection parameters from database...");

    queryDb("SELECT * FROM settings ORDER BY setting_id ASC", function (err, results) {

        if (results.rowCount == 0) {
            log("No Xively settings found. Please update the connection settings and restart the service");
        }

        else {

            var settings = results.rows[0];

            log("Xively configuration loaded from the database");

            xivelyBrokerUrl = settings.xi_broker_url;
            xivelyBrokerPort = Number(settings.xi_broker_port);

            xivelyAccountId = settings.xi_account_id;
            xivelyIdUsername = settings.xi_id_username;
            xivelyIdPassword = settings.xi_id_password;

            xivelyIdentityApiEndpoint = settings.xi_api_endpoint_id;
            xivelyBlueprintApiEndpoint = settings.xi_api_endpoint_bp;

            //TTN_BROKER_URL = settings.ttn_broker_url;
            //TTN_BROKER_PORT = Number(settings.ttn_broker_port);

            // Initialise the Xively API module
            xiapi.init(xivelyAccountId, xivelyIdUsername, xivelyIdPassword, xivelyIdentityApiEndpoint, xivelyBlueprintApiEndpoint);

            log("Trying to get a login JWT from Xively to connect to the broker...");

            xiapi.getJWT(startBridge);
            //startBridge();
        }
    });

}

function startBridge(jwt) {

    //console.log("Received JWT: " + jwt);

    // In case it's a restart, disconnect all TTN connection before
    //disconnectFromAllApps();

    // Connect to Xively
    log("Trying to connect to Xively...");

    var xivelyOptions = {
        port: xivelyBrokerPort,
        //clientId: xivelyDeviceId,
        //username: xivelyDeviceId,
        //password: xivelyPassword,
        clientId: "",
        username: "Auth:JWT",
        password: jwt

        //protocolId: "MQIsdp",
        //protocolVersion: 3

        // see: https://developer.xively.com/docs/connecting-and-disconnecting
    };



    XIVELY_CLIENT = mqtt.connect("tls://" + xivelyBrokerUrl, xivelyOptions);

    XIVELY_CLIENT.on("connect", function () {
        //xivelyClient.subscribe("xi/blue/v1/" + xivelyAccountId + "/d/" + xivelyDeviceId + "/light")
        //xivelyClient.publish("xi/blue/v1/" + xivelyAccountId + "/d/" + xivelyDeviceId + "/light", "Hello mqtt")
        log("Connected to Xively");
    });

    XIVELY_CLIENT.on("reconnect", function () {
        log("Trying to reconnect to Xively");
    });

    XIVELY_CLIENT.on("close", function () {
        log("Lost connection to Xively, won't attempt to reconnect. Please restart the service through the API.");
        this.end();
    });

    XIVELY_CLIENT.on("message", function (topic, message) {
        log("Xively message received: " + message.toString())
    });

    XIVELY_CLIENT.on("error", function (error) {
        log("An error with the Xively client occured: " + error);
    });

}

// Establish a route for Sigfox callbacks
app.post('/sigfox/uplink', function (req, res) {

    // Write message to log
    log("Received a message from device '" + req.body.device + "'");
    log(JSON.stringify(req.body, null, 2));

    // Handle message
    handleUplinkMessage(req.body);

    // Return HTTP 200 - OK
    res.sendStatus(200);
});


/*function handleUplinkMessage(msg) {

    // First, we need to check whether the device is registered in our connector
    queryDb("SELECT * FROM sigfox_devices WHERE device_eui = '" + deviceEUI + "'", foundMatchingDevice);

    function foundMatchingDevice() {

    }

    if (XIVELY_CLIENT != null) {

        try {

            var lat, lng;

            for (var key in v) {

                if (key != "device" && key != "time" && key != "lat" && key != "lng" && msg[key] != null) {

                    var topicPath = "xi/blue/v1/dc92460c-544d-4f29-aba0-98c8bea362e4/d/afea5343-d2ea-4629-9f7d-17fc40a3c9c4/" + key;

                    log("Sending value for '" + key + "' to Xively: " + msg[key].toString());
                    XIVELY_CLIENT.publish(topicPath, msg[key].toString());
                }

                if (key == "lat") {
                    lat = msg[key];
                }
                else if (key == "lng") {
                    lng = msg[key];
                }
            }

            if (lat != null && lng != null) {
                xiapi.updateDeviceLocation(sourceDevice.xi_device_id, msg.metadata.gateways[0].latitude, msg.metadata.gateways[0].longitude);
            }
            /*if (body.temperature != null) {
              
      
              var topicPath = "xi/blue/v1/dc92460c-544d-4f29-aba0-98c8bea362e4/d/afea5343-d2ea-4629-9f7d-17fc40a3c9c4/temperature";
      
              XIVELY_CLIENT.publish(topicPath, body.temperature.toString());
            }*
        }
        catch (e) {
            log("Error while forwarding Sigfox message to Xively: " + e);
        }
    }
}*/


function handleUplinkMessage(msg) {

    // We received a message. Let's see what device it came from
    var sigfox_device_id = msg.device;

    // First, we need to check whether the device is registered in our connector
    queryDb("SELECT * FROM devices WHERE sigfox_device_id = '" + sigfox_device_id + "'", searchedDevices);

    function searchedDevices(err, devices) {

        var sourceDevice;

        if (devices.rowCount > 0) {

            // Since the device_eui is a unique primary key in the database, we found exactly one record
            sourceDevice = devices.rows[0];

            log("Found matching devices (Name = " + sourceDevice.device_name + ", Sigfox Device ID = " + sourceDevice.sigfox_device_id + ", Xively Device ID = " + sourceDevice.xi_device_id + "), checking mappings next...");

            // Let's check the application mappings to see what data we have to extract from the message and send to Xively
            //queryDb("SELECT * FROM mappings WHERE app_eui = '" + sourceDevice.app_eui + "'", sendToXively);
            queryDb("SELECT * FROM mappings WHERE device_type_id = '" + sourceDevice.device_type_id + "'", sendToXively);

            // If a location is provided, update the device's location on Xively with the location of the device
            if (msg.lat != null && msg.lng != null) {

                log("Updating device location...");
                //log("Requesting JWT for Xively API");

                xiapi.updateDeviceLocation(sourceDevice.xi_device_id, msg.lat, msg.lng);
            }
        }

        else {
            // The device that has sent the data is not registered in our connector, so we are not going to forward any data to Xively
            log("The sending Sigfox device is not registered in the connector.");
            return;
        }



        function sendToXively(err, mappings) {

            if (mappings.rowCount > 0) {

                // We found matching mappings, let's go through all of them and send the data to Xively

                // Real-time analytics datapoint
                var analyticsDatapoint = {};

                for (var i = 0; i < mappings.rowCount; i++) {

                    var mapping = mappings.rows[i];

                    log("Found mapping: " + mapping.json_field + " -> " + mapping.xi_topic);

                    // Try to get payload fields JSON
                    var payload = msg[mapping.json_field];

                    if (payload != null) {

                        analyticsDatapoint[mapping.json_field] = payload;

                        log("Mapped field was found in the payload fields. Bridging to Xively...");

                        var topicPath = "xi/blue/v1/" + xivelyAccountId + "/d/" + sourceDevice.xi_device_id + "/" + mapping.xi_topic;

                        // Check if field is a time series field
                        if (mapping.time_series == true) {

                            // Send time series payload to Xively (refer to: https://developer.xively.com/docs/storing-timeseries-data)
                            // Timestamp,Category,Value,String

                            var date = new Date();
                            var category = mapping.category != null ? mapping.category : "";

                            // ISO date format
                            //var timeseriesPayload = date.toISOString() + "," + category + "," + payload;

                            // Timestamp date format
                            var timeseriesPayload = date.getTime() + "," + category + "," + payload + ",";

                            if (XIVELY_CLIENT != null) {

                                // Send payload to Xively
                                XIVELY_CLIENT.publish(topicPath, timeseriesPayload);
                                log("Sent payload '" + timeseriesPayload + "' to topic '" + topicPath + "'");
                            
                            }
                            else {
                                log("ERROR: Xively client not initialised.");
                            }
                            
                        }
                        else {

                            if (XIVELY_CLIENT != null) {

                                // Send payload to Xively
                                XIVELY_CLIENT.publish(topicPath, payload.toString());
                                log("Sent payload '" + payload.toString() + "' to topic '" + topicPath + "'");
                            
                            }
                            else {
                                log("ERROR: Xively client not initialised.");
                            }
                            
                        }

                    }
                    else {
                        log("Field was not found in the payload fields, skipping the current mapping.");
                    }

                } // end for

                // We looped through all fields, let's send the datapoint to Power BI
                analyticsDatapoint["date"] = new Date().toISOString();

                //console.log(analyticsDatapoint);
                analytics.postToPowerBi(analyticsDatapoint);

            }
            else {
                log("No mappings were found for the source device.");
            }
        }

    }

}




/*
  DATA ACCESS HELPER FUNCTIONS
*/

// Executes a query on the database, using a client from the pool
function queryDb(query, callback, params) {

    databaseClientPool.connect(function (err, client, done) {

        if (err) {
            return console.error("Error fetching database client from pool", err);
        }

        //console.log("Running query: " + query + ", Params: " + params);

        client.query(query, params, function (err, result) {
            //call `done()` to release the client back to the pool
            done();

            if (err) {
                return console.error("Error running query", err);
            }

            // Return result object: https://github.com/brianc/node-postgres/wiki/Query#result-object
            //console.log(result);
            callback(err, result);
            //return result;
        });
    });
}


function log(msg) {
    var date = new Date();

    var dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + ('0' + date.getMinutes()).slice(-2) + ":" + ('0' + date.getSeconds()).slice(-2) + "." + ('00' + date.getMilliseconds()).slice(-3);

    console.log(dateString + ": " + msg);
}