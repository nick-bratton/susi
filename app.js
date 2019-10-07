#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const Cron = require('cron').CronJob;
const tenK = require('./services/tenK.js')
const slack = require('./services/slack.js')

let interval = ''

if (process.env.MODE == 'dev'){
	interval = '*/5 * * * * *'
}
else if (process.env.MODE == 'pro'){
	interval = '0 10 * * MON';
}
else if (process.env.MODE == 'pro_beta'){
	interval = '0 15 * * MON-THU';
	// interval = '*/30 * * * * *';
}

function main(){
	let payloads;
	tenK.getWeeklyTimeEntries()
		.then(async function (response) {
			payloads =  await tenK.getUserIdsAndTheirUnconfirmedDates(response);
		})
		.catch(function (err) {
			console.log('Caught error in main():' + err);
		})
		.finally(async function(){
			// messageContacts(payloads);
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
		});
}

new Cron(interval, function() {
	main();
}, null, true, 'Europe/Berlin');