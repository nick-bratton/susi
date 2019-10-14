#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const Cron = require('cron').CronJob;
const tenK = require('./services/tenK.js')
const slack = require('./services/slack.js')

let interval = ''

if (process.env.MODE == 'dev'){
	interval = '*/5 * * * * *';
}
else if (process.env.MODE == 'pro'){
	interval = '0 10 * * MON';
}
else if (process.env.MODE == 'pro_beta'){
	interval = '0 16 * * MON-THU';
}

function main(){
	let unconfirmedEntries, messagePayloads;
	tenK.getWeeklyEntries()
		.then(async function (response) {
			let r = JSON.parse(response.body);
			let allWeeklyEntries = r.data;
			unconfirmedEntries = await tenK.getUnconfirmedEntries(allWeeklyEntries);
			messagePayloads = await tenK.constructPayloads(allWeeklyEntries, unconfirmedEntries);
		})
		.catch(function (err) {
			console.log('Caught error in app.js main(): ' + err);
		})
		.finally(async function(){
			messageContacts(messagePayloads);
		})
}

const messageContacts = async(payloads) => {
	await Promise.all(payloads.map(payload => slack.findAndMessageUser(payload)))
		.then(slackUserIds => {
			// console.log('Notified Slack users: ' + slackUserIds);
		})
		.catch(err => {
			console.log('Error in notifyContacts(): ' + err)
		})
		.finally(function(){
			// console.log('Messaged contacts.');
		});
}

new Cron(interval, function() {
	main();
}, null, true, 'Europe/Berlin');