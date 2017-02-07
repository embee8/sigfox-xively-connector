# XiFox - Connecting Xively and Sigfox
XiFox is an experimental application that connects Sigfox and Xively. The application is written in Node.js.

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/embee8/sigfox-xively-connector/tree/master)

## What it does
XiFox is a bridge between the Sigfox and the Xively Connected Product Management service ([Trial Account Setup](https://xively.com)). It links the upward communication between given Sigfox device types and Xively device templates and matching device instances. Each Sigfox device is mapped to a Xively device. All data passed in the payload of a Sigfox callback is mapped to channels defined in a Xively template. The geographical location of the sending Sigfox device is also mapped automatically to the device's longitude, lattitude meta data fields.

## Deployment
Use the button below to deploy the application to a new Heroku instance. The Postgres add-on that will be installed alongside the Node.js application will be provisioned as a free `hobby-dev` instance [plan info](https://devcenter.heroku.com/articles/heroku-postgres-plans).  

[![Deploy](https://www.herokucdn.com/deploy/button.svg)](https://heroku.com/deploy?template=https://github.com/embee8/sigfox-xively-connector/tree/master)

You can also clone the project and run it locally with the command `node server.js`, but you need to make sure that the application database is set up and accessible. For local installations, refer to the database provisioning scripts in the `database` folder.

## Configuration
During the deployment process, you will be asked to set an application username and password.  These credentials are used to access the web interface of the application which is used purely for administration purposes. These credentials can be later changed by modifying the environment variables.

All connection settings (Xively connection parameters, Sigfox callback templates, etc.) are configured through the administrator interface at the URL of this application.

A detailed summary and setup guide can be found in the [Wiki](https://github.com/embee8/sigfox-xively-connector/wiki).