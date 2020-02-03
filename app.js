#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const Cron = require('cron').CronJob;
// const tenK = require('./services/tenK.js');
const tenK = require('./services/tenK.dev.js');

const slack = require('./services/slack.js');

let interval = '0 10 * * MON';

const main = async() => {
	let allWeeklyEntries = await tenK.getWeeklyEntries();
	let unconfirmedEntryIdentifiers = await tenK.getUnconfirmedEntryIdentifiers(allWeeklyEntries);
	let messagePayloads = await tenK.constructPayloads(allWeeklyEntries, unconfirmedEntryIdentifiers);
	messageContacts(messagePayloads);
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

// new Cron(interval, function() {
// 	main();
// }, null, true, 'Europe/Berlin');

main()
	.catch(err => {
		throw err;
	})