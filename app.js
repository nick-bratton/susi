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
// else if (process.env.MODE === 'beta'){
// 	interval = '0 10 * * MON-THU';
// 	schedule = true;
// }

const testData = require('./test/fo.example.js');
console.log('erroneous source data: ');
console.log(testData.fo);

function main(){
	// run main as normal and check to see that testdata is formatted just like allWEeklyEntries would be
	// 
	// unconfirmedEntryIdentifiers = await tenK.getUnconfirmedEntryIdentifiers(allWeeklyEntries);


	let unconfirmedEntryIdentifiers, messagePayloads;
	tenK.getWeeklyEntries()
		.then(async function (response) {
			let r = JSON.parse(response.body);
			let allWeeklyEntries = r.data;
			//
			//
			// here is where we should add fabian's test data: 
			// console.log('allWeeklyEntries: ');
			// console.log(allWeeklyEntries);
			unconfirmedEntryIdentifiers = await tenK.getUnconfirmedEntryIdentifiers(testData.fo);
			console.log();console.log();console.log();
			console.log(unconfirmedEntryIdentifiers);
			//
			messagePayloads = await tenK.constructPayloads(testData.fo, unconfirmedEntryIdentifiers);
			console.log(messagePayloads);
		})
		.catch(function (err) {
			console.log('Caught error in app.js main(): ' + err);
		})
		.finally(async function(){
			// messageContacts(messagePayloads);
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