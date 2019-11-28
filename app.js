#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const Cron = require('cron').CronJob;
const tenK = require('./services/tenK.js');
const slack = require('./services/slack.js');

let interval = '';
let schedule = false;

if (process.env.MODE === 'pro'){
	interval = '0 10 * * MON';
	schedule = true;
}

function main(){
	tenK.getWeeklyEntries()
		.then(async function (response) {
			let r = JSON.parse(response.body);
			let allWeeklyEntries = r.data;
			let unconfirmedEntryIdentifiers = await tenK.getUnconfirmedEntryIdentifiers(allWeeklyEntries);
			let messagePayloads = await tenK.constructPayloads(allWeeklyEntries, unconfirmedEntryIdentifiers);
			return messagePayloads;
		})
		.then(async function (payloads){
			messageContacts(payloads);
		})

		.catch(function (err) {
			console.log('Caught error in app.js main(): ' + err);
		})
		.finally(async function(){
			console.log('Main script finally() called');
		})
}

const messageContacts = async(payloads) => {
	await Promise.all(payloads.map(payload => slack.findAndMessageUser(payload)))
		.then(slackUserIds => {
			console.log('Notified Slack users: ' + slackUserIds);
		})
		.catch(err => {
			console.log('Error in notifyContacts(): ' + err)
		})
		.finally(function(){
			console.log('Done.');
		});
}

// For development purposes,
// just run the script once:
if (!schedule){
	main();
}

// For production purposes,
// schedule a Cron job:
new Cron(interval, function() {
	if (schedule){
		main();
	}
}, null, true, 'Europe/Berlin');