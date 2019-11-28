# Susi: Third Party Extension for Slack / 10000ft

Susi is a middleware (so-to-say) for [Slack](https://slack.com) and [10000ft](https://github.com/10Kft/10kft-api). A Node script is configured to periodically check an organization's time entries on 10000ft and uses a Slack bot to:
  * directly message employees when they have unconfirmed time entries
  * provide an interactive modal through which they can view their suggested time entries and confirm them, or alter them and then confirm them, all without ever having to leave Slack.

The structure of this repository is simply one main script (`app.js`), one internal API (`server.js`), and two service scripts in the *services* directory for interacting with the Slack and 10000ft APIs (respectively, `slack.js` and `tenK.js`). 

# Table of Contents

* [Installation](#Installation)
* [Configuration](#Configuration)
* [Launch](#Launch)
* [Authorization](#Authorization)
* [Screenshots](#Screenshots)
* [Open Development Tasks](#Open-Development-Tasks)

# Installation

This package was written to use as few dependencies as possible, yet a few are required. After cloning, run 

`npm install` 

to install:

* [@slack/web-api](https://slack.dev/node-slack-sdk/web-api)
* [body-parser](https://www.npmjs.com/package/body-parser)
* [cron](https://www.npmjs.com/package/cron)
* [dotenv](https://www.npmjs.com/package/dotenv)
* [express](https://www.npmjs.com/package/express)
* [request-promise](https://www.npmjs.com/package/request-promise)

Feel free to use the Yarn package manager at your own risk. There is room for improvement in terms of limiting the amount of dependencies. 

# Configuration

First and foremost, it is necessary to serve `server.js` at a publicly available URL. Your Slack app's `Request URL` must be set to this URL. See the [Slack API documentation](https://api.slack.com/messaging/interactivity#components) on interactivity for more. 

Beyond that, the script is configurable across the following entrypoints:

## .env

The `.env` file contains your service authorization tokens. You will need to add your tokens here and change the name of the file from `.env.example` to `.env` after cloning. 

## whitelist.js

The `whitelist.js` exports an array of email addresses that will be used to define which members of the Slack workspace will receive notifications upon the script's execution. Note this only has an effect if the launch mode is `dev` or `beta`. In the production launch mode, no whitelist is configured to be used.

## cron (app.js)

Cron is used to schedule execution of the `main()` function in `app.js`. The Cron job runs on Berlin time by default.

# Launch

There are three startup scripts, as of the time of this writing. 

* For development: `npm run dev`

* For beta: `npm run beta`

* For production: `npm run pro`

The only direct consequences of running one of these scripts are [1] setting the value of `process.env.MODE` and [2] starting the runtime. This variable is then used across the scripts to make configurations (e.g., whether sandbox or production environment authorization tokens are used; when the Cron job executes; which URIs are used in HTTP requests; and which, if any, email whitelist should be used).

# Authorization

Whereas an authorization token is always included in the header of each HTTP request made to the 10000ft API, a Slack web client is initialized with an authorization token and then methods on the client are called after that (`slack.js`) or authorization tokens are passed in the HTTP request headers (`server.js`). Slack token authorization should be uniformized and updated to the more secure 'signed-secrets' paradigm in a future commit.

Store your tokens in `.env`. [See here for more.](#env)

# Screenshots

A user will receive a message from the slack bot like this: 

![Direct Message](./assets/dm.png)

When they click/tap 'Confirm Now', a personalized modal will open with the suggested time entries for last week that they have not confirmed, with placeholder text in the 'Hours' fields that display their assigned hours for that day of whatever project. Optional 'Notes' fields are present for each suggestion:

![Modal](./assets/modal.png)

While the bot is POSTing to 10000Ft via our server.js REST API, the modal view will be replaced with the following:

![POSTing](./assets/post.png)

If successful, the modal view will switch to: 

![Success](./assets/success.png)

or, if not, to this:

![Failure](./assets/failure.png)

Note that the user will be prevented from submitting incompatable data in the hours fields thusly: 

![Incorrect](./assets/incorrect.png)


# Open Development Tasks

Please cross-reference what you read below with the current [Issues](https://github.com/nick-bratton/susi/issues).

* [Handling Pagination](#handling-pagination)
* [Handling Errors](#handling-errors)
* [Upgrading Slack Authorization Paradigm](#upgrading-slack-authorization-paradigm)
* [Refactoring Calls To Slack API](#refactoring-calls-to-slack-api)

## Handling Pagination

[Paginated responses](https://github.com/10Kft/10kft-api/blob/master/sections/first-things-first.md#pagination) from 10000ft are not currently handled. For the time being, when requesting Time Entries from their API, the `per_page` parameter is set in the HTTP request URI to 500: `"&per_page=500"`.

## Handling Errors

Care was made to use Promise-based JavaScript where possible. Errors will be caught, but, for the most part just console logged instead of properly handled. `catch` and `finally` blocks should be developed throughout this code base as a starting point.

## Upgrading Slack Authorization Paradigm

As mentioned above, token authorization is 'outmoded'. Slack now recommends [using signed-secrets](https://api.slack.com/docs/verifying-requests-from-slack). 

## Refactoring Calls to Slack API

Calls to the Slack API happen in both `slack.js` and `server.js`. When possible, this functionality should be compartamentalized. Exports should be used to make these calls from the `server.js`.