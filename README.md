# Susi: Third Party Extension for Slack / 10000ft

Susi is a Node script that periodically checks an organization's [10000ft](https://github.com/10Kft/10kft-api) time entries and notififies the organization's employees via [Slack](https://slack.com) when they have unconfirmed entries. Whereas 10000ft offers a web interface for time-tracking, it is mostly just a database. This script treats it as such, and aims to integrate API calls to the 10000ft backend into a Slack bot's interactive messages. 

The structure of the repository is simply one main script (`app.js`) and two service scripts in the *services* directory for interacting with an organization's 10000ft data (`tenK.js`) and its Slack workspace (`slack.js`). 

Two releases are planned as of the time of this writing (October 2019). The main features that define the releases are: 

## 1.0 (Currently in beta)

* Check organizations time entries weekly and send individuals a direct message if they had unconfirmed time entries over the last week. The message includes the dates they have not yet confirmed and a link to 10000ft. 

## 2.0 (In planning)

* Include message blocks that display details about suggested (unconfirmed) time entries 
* Include buttons to confirm suggested hours (without alterations)
* Include input fields to submit amounts of hours that were different than what was suggested for a given time entry.

# Installation

This package was written to use as few dependencies as possible, yet a few are required. After cloning, run 

`npm install` 

to install the [@slack/web-api](https://slack.dev/node-slack-sdk/web-api) package, [lodash](https://www.npmjs.com/package/lodash), [cron](https://www.npmjs.com/package/cron), and [dotenv](https://www.npmjs.com/package/dotenv). Feel free to use the Yarn package manager at your own risk.

# Configuration

The script is configurable across the following entrypoints:

## .env

The `.env` file contains your service authorization tokens. You will need to add your tokens here and change the name of the file from `.env.example` to `.env` before launching.

## whitelist.js

The `whitelist.js` exports an array of email addresses that will be used to define which members of the Slack workspace will receive notifications upon the script's execution. Note this only has an effect if the launch mode is `dev` or `pro_beta`. In production, no whitelist is necessary.

## cron (app.js)

Cron is used to schedule execution of the `main()` script. As defined in `app.js`, in `pro_beta` mode the script runs every Monday - Thursday at 16:00 and in `pro` mode it is scheduled to run every Monday at 10:00. This can be changed by setting the `interval` variable in the corresponding conditional. The Cron job runs on Berlin time by default.

# Launch

There are three startup scripts, as of the time of this writing. 

* For development: `npm run dev`

* For beta: `npm run beta`

* For production: `npm run pro`

The only direct consequences of running one of these scripts are setting the value of `process.env.MODE` and starting the runtime. This value is then used across the scripts to make configurations (e.g., whether sandbox or production environment authorization tokens are used; when the Cron job executes; which URIs are used in HTTP requests; which, if any, email whitelist should be used to filter the address list before message delivery).

# Authorization

Whereas an authorization token is included in the header of each HTTP request made to the 10000ft API, a Slack web client is initialized with an authorization token and then methods on the client are called simply after that. 

Store your tokens in `.env`. [See here for more.](#.env)

# Open Development Tasks

* [Handling Pagination](#handling-pagination)
* [Building Interactivity](#building-interactivity)
* [Handling Errors](#handling-errors)

## Handling Pagination

[Paginated responses](https://github.com/10Kft/10kft-api/blob/master/sections/first-things-first.md#pagination) from 10000ft are not currently handled. For the time being, when requesting Time Entries from their API, the `per_page` parameter is set in the HTTP request URI to 500: `"&per_page=500"`.

## Building Interactivity 

The magic of this project will come in when the Slack notifications become interactive. As described [above](#2.0-in-planning), the goal of this development task is to enable users to confirm their suggested time entries without leaving Slack and to enable them to confirm a given entry after entering the hours they theoretically actually worked.

In theory, no API should be required to pass requests between Slack and 10000ft. The idea here is that:

1. The user gets a message with a dialog and a confirm button.
2. The user either confirms what was suggested, or enters a number in the dialog, and then confirms. 
3. Upon confirming, a POST request is sent from Slack to 10000ft. 
4. The user is notified that their request was sent (and ideally, submitted successfully).

See the Slack API documentation on [handling responses from dialogs](https://api.slack.com/dialogs#response) but note that this information is 'outmoded' but not yet deprecated.

The 10000ft endpoint would be `POST /api/v1/users/<user_id>/time_entries` and, nominally, the payload needs to include the following three key/value pairs: 

```
  {
    "assignable_id": 1001,
    "date": "2019-10-10",
    "hours": 8.0
  }
```

but other fields can be included like `tasks` and `notes`. (It is probably a good idea to include a note like `Submitted via Slack`.) 

Care must be taken to ensure that POST requests with `Content-Type: application/x-www-form-urlencoded` are properly handled/decoded by the 10000ft API. Payloads constructed from Slack would be encoded thusly. 

## Handling Errors

Care was made to use Promise based JavaScript where possible. Errors will be caught, but just console logged. The `catch` and `finally` blocks should be developed throughout the code base as a starting point.