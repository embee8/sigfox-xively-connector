var https = require("https");

var exports = module.exports = {};

// Initialised when module is loaded
var ACCOUNT_ID;
var USERNAME;
var PASSWORD;

var IDENTITY_API_ENDPOINT;
var BLUEPRINT_API_ENDPOINT;

// used for temporary storage
var JWT;

exports.init = function(accountId, username, password, identityApiEndpoint, blueprintApiEndpoint) {
    ACCOUNT_ID = accountId;
    USERNAME = username;
    PASSWORD = password;

    IDENTITY_API_ENDPOINT = identityApiEndpoint;
    BLUEPRINT_API_ENDPOINT = blueprintApiEndpoint;
};

exports.getJWT = function(callback) {

    var jwtRequestData = {
        emailAddress: USERNAME,
        password: PASSWORD,
        accountId: ACCOUNT_ID,
        renewalType: "short"
    };

    var jwtRequestDataString = JSON.stringify(jwtRequestData);

    //log(jwtRequestDataString);
    //log("Length = " + jwtRequestDataString.length);

    var options = {
        host: IDENTITY_API_ENDPOINT,
        port: 443,
        path: '/api/v1/auth/login-user',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': jwtRequestDataString.length
        },
    };

    // Set up the request
    var jwtRequest = https.request(options, function(res) {

        if (res.statusCode.toString().charAt(0) == "4") {
            // Error code
            log("401 - Unauthorised");
        }

        var data = "";

        // this event fires many times, each time collecting another piece of the response
        res.on("data", function (chunk) {
            // append this chunk to our growing `data` var
            data += chunk;
        });

        // this event fires *one* time, after all the `data` events/chunks have been gathered
        res.on("end", function () {
            
            //log("Response from the Xively Identity API: ");

            if (data != "") {
                
                try {
                    var jsonData = JSON.parse(data);
                    //log(jsonData);

                    if (jsonData != null && jsonData.jwt != null) {

                        // We have a JWT, let's return to the callback
                        callback(jsonData.jwt);
                    }
                } catch(e) {
                    log("Error: " + e.message);
                }
            }
            
            else {
                log("User couldn't be logged in.")
            }

        });

    });

    jwtRequest.on('error', (e) => {
        log("Error during user login: " + e);
    });

    // Send data to the API
    jwtRequest.write(jwtRequestDataString);

    // End the request
    jwtRequest.end();
}


exports.updateDeviceLocation = function(deviceId, latitude, longitude) {

    /*
        First, we have to log in the user
    */

    var jwtRequestData = {
        emailAddress: USERNAME,
        password: PASSWORD,
        accountId: ACCOUNT_ID,
        renewalType: "short"
    };

    var jwtRequestDataString = JSON.stringify(jwtRequestData);

    //log(jwtRequestDataString);
    //log("Length = " + jwtRequestDataString.length);

    var options = {
        host: IDENTITY_API_ENDPOINT,
        port: 443,
        path: '/api/v1/auth/login-user',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': jwtRequestDataString.length
        },
    };

    // Set up the request
    var jwtRequest = https.request(options, function(res) {

        var data = "";

        // this event fires many times, each time collecting another piece of the response
        res.on("data", function (chunk) {
            // append this chunk to our growing `data` var
            data += chunk;
        });

        // this event fires *one* time, after all the `data` events/chunks have been gathered
        res.on("end", function () {
            
            //log("Response from the Xively Identity API: ");

            if (data != "") {
                
                try {
                    var jsonData = JSON.parse(data);

                    if (jsonData != null && jsonData.jwt != null) {
                        //JWT = jsonData.jwt;
                        //log("User logged in, JWT = " + jsonData.jwt)

                        // User logged in, let's update the device
                        //updateDevice(deviceId, latitude, longitude);

                        /*
                            Once, we are logged in, we will get the latest device status
                        */
                        getDevice(deviceId, jsonData.jwt, latitude, longitude);
                    }
                } catch(e) {
                    log("Error: " + e.message);
                }
            }
            
            else {
                log("User couldn't be logged in.")
            }

        });

    });

    jwtRequest.on('error', (e) => {
        log("Error during user login: " + e);
    });

    // Send data to the API
    jwtRequest.write(jwtRequestDataString);

    // End the request
    jwtRequest.end();

}

function getDevice(deviceId, jwt, latitude, longitude) {
    
    //log("Get latest device status...");

    var options = {
        host: BLUEPRINT_API_ENDPOINT,
        //port: 443,
        path: '/api/v1/devices/' + deviceId,
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + jwt
        },
    };

    //log(options);

    // Set up the request
    var request = https.request(options, function(res) {

        var data = "";

        // this event fires many times, each time collecting another piece of the response
        res.on("data", function (chunk) {
            // append this chunk to our growing `data` var
            data += chunk;
        });

        // this event fires *one* time, after all the `data` events/chunks have been gathered
        res.on("end", function () {
            
            //log("Response from the Xively Identity API: ");

            //log(data);

            if (data != "") {
                var jsonData = JSON.parse(data);

                if (jsonData.device != null && jsonData.device.version) {
                    //JWT = jsonData.jwt;
                    //log("Got the latest device state, version = " + jsonData.device.version)
                    //log(this.headers.etag);

                    updateDevice(deviceId, jwt, latitude, longitude, jsonData.device.version);
                    //updateDevice(deviceId, latitude, longitude, this.headers.etag);
                }
            }
            /*
            else {
                log("User couldn't be logged in.")
            }*/

        });

    });

    request.on('error', (e) => {
        log("Error during updating device: " + e);
    });

    // Send data to the API

    // End the request
    request.end()
}



function updateDevice(deviceId, jwt, latitude, longitude, version) {

    var updateRequestData = {
        latitude: latitude,
        longitude: longitude
        //firmwareVersion: "3"
    };

    var updateRequestDataString = JSON.stringify(updateRequestData);

    //log(updateRequestDataString);
    //log("Length = " + jwtRequestDataString.length);
    
    var updateOptions = {
        host: BLUEPRINT_API_ENDPOINT,
        //port: 443,
        path: '/api/v1/devices/' + deviceId,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': updateRequestDataString.length,
            'ETag': version,
            'Authorization': 'Bearer ' + jwt
        },
    };

    //log(updateOptions);

    // Set up the request
    var updateRequest = https.request(updateOptions, function(res) {

        var data = "";

        // this event fires many times, each time collecting another piece of the response
        res.on("data", function (chunk) {
            // append this chunk to our growing `data` var
            data += chunk;
        });

        // this event fires *one* time, after all the `data` events/chunks have been gathered
        res.on("end", function () {
            
            //log("Response from the Xively Identity API: ");

            if (this.statusCode == 200) {
                log("Device location updated successfully");
            }
            else {
                log("Device location could not be updated");
            }
            //log("Response to update request:");
            //log(this.statusCode);
            //log(data);

        });

    });

    updateRequest.on('error', (e) => {
        log("Error during updating device location: " + e);
    });

    // Send data to the API
    updateRequest.write(updateRequestDataString);

    // End the request
    updateRequest.end();
}

function log(msg) {
  var date = new Date();

  var dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + ('0'  + date.getMinutes()).slice(-2) + ":" + ('0'  + date.getSeconds()).slice(-2) + "." + ('00'  + date.getMilliseconds()).slice(-3);

  console.log(dateString + ": " + msg);
}