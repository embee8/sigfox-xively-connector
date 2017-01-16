var https = require("https");

var exports = module.exports = {};

exports.postToPowerBi = function(datapointJSON) {

    // The Power BI endpoint expects an array of datapoints, even if we just submit one
    var datapoints = [];

    datapoints.push(datapointJSON);

    // Set up the POST request
    var options = {
        host: "api.powerbi.com",
        //port: 443,
        path: "/beta/39f40895-8ecb-4d1f-9a54-28dc46bdc385/datasets/7573f190-7a6d-414d-8783-7bcbf70b2d32/rows?key=VJQEGxPpntYKECOinyJcNWPLapXl7EVfy%2BKV72wjD580OV7qQk2Mu140Przihe%2FSM97e1mhM9xnVITVgm1Xpmw%3D%3D",
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            //'Content-Length': datapoints.length
        },
    };

    var request = https.request(options, function(res) {

        log("Power BI HTTP response code: " + res.statusCode.toString());

        /*if (res.statusCode.toString().charAt(0) == "4") {
            // Error code
            log("401 - Unauthorised");
        }*/

        var data = "";

        // this event fires many times, each time collecting another piece of the response
        res.on("data", function (chunk) {
            // append this chunk to our growing `data` var
            data += chunk;
        });

        // this event fires *one* time, after all the `data` events/chunks have been gathered
        res.on("end", function () {
            
            //log("Response end");

            /*if (data != "") {
                
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
            }*/

        });

    });

    request.on('error', (e) => {
        log("Error during posting data to Power BI: " + e);
    });

    // Send data to the API
    request.write(JSON.stringify(datapoints));

    // End the request
    request.end();
};


function log(msg) {
  var date = new Date();

  var dateString = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " + date.getHours() + ":" + ('0'  + date.getMinutes()).slice(-2) + ":" + ('0'  + date.getSeconds()).slice(-2) + "." + ('00'  + date.getMilliseconds()).slice(-3);

  console.log(dateString + ": " + msg);
}