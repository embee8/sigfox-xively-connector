"use strict";

var pg = require('pg');
var fs = require('fs');
const path = require('path');

var APP_DATABASE_URL;

// Get connection string from config file or environment variables
try {
    console.log("Reading connection string...");

    const configFilePath = path.join(__dirname, '../config', 'config.json');

    var envVars = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    APP_DATABASE_URL = envVars.APP_DATABASE_URL;
}
catch (e) {

    console.log("Didn't find local config file, reading environment variables.");


    APP_DATABASE_URL = process.env.APP_DATABASE_URL;

    if (APP_DATABASE_URL == null) {
        console.log("Could not find a database connection string. Exiting and leaving job undone...");
        process.exit(1);
    }
}



// We have a connection string at this point. Let's read the database script and execute it
try {
    console.log("Connecting to the database using connection string: " + APP_DATABASE_URL);
    console.log("Reading database script...");

    const tableScript = path.join(__dirname, 'tables.sql');
    var sql = fs.readFileSync(tableScript, "utf8");//.toString();

    pg.connect(APP_DATABASE_URL, function (err, client, done) {
        if (err) {
            console.log('error: ', err);
            process.exit(1);
        }

        console.log("Running database script...");
        //console.log(sql);

        client.query(sql, function(err, result) {
            done();
            if(err){
                console.log('Error: ', err);
                process.exit(1);
            }
            console.log("Database initialised!");
            process.exit(0);
        });
    });
}
catch (e) {
    console.log("Couldn't find or read database script. Exiting and leaving job undone...");
    process.exit(1);
}