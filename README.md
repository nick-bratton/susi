# Basics

This project uses a few node modules so make sure to run npm install.

THere are a couple startup scripts, one for a development environment using 10000Ft's playground V-Next, and another for production use with 10000Ft itself. These can be respectively launched by running:

`npm run dev`

or

`npm run pro`

The differences affect the timing of the Cron job to execute the main() JavaScript in app.js (in dev mode it's every 5 seconds, in pro mode it's every Thursday at 14:00). Also affected are the API endpoints in 10000Ft and the tokens used in authorizing both requests to 10000Ft and Slack.

These tokens should be provided in a .env file in the same directory containing app.js. See .env.example for how this file should look like. 

# Open Tasks

1. Handle [pagination](https://github.com/10Kft/10kft-api/blob/master/sections/first-things-first.md#pagination) in 10000ft responses. Note the '&per_page=500' in the exports.uriToCheckWeeklyTimeEntries() in tenK.js. 500 was chosen as its well above what we could expect in a given week (i.e., 80 employees * 7 time entries in a week = 500 results). We should never have more than one page returned then. This is solution for the time being only. What would be better would be to handle pagination dynamically.

2. Install, configure, and launch a process manager like [PM2](https://www.digitalocean.com/community/tutorials/how-to-set-up-a-node-js-application-for-production-on-ubuntu-18-04#step-3-%E2%80%94-installing-pm2) or [forever](https://www.npmjs.com/package/forever). 