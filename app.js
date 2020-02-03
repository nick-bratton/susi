#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const Cron = require('cron').CronJob;
// const tenK = require('./services/tenK.js');
const tenK = require('./services/tenK.dev.js');

const slack = require('./services/slack.js');

let interval = '0 10 * * MON';

const main = async() => {
	try{
		let allWeeklyEntries = await tenK.getWeeklyEntries();
		let unconfirmedEntryIdentifiers = await tenK.getUnconfirmedEntryIdentifiers(allWeeklyEntries);
		let payloads = await tenK.constructPayloads(allWeeklyEntries, unconfirmedEntryIdentifiers);
		await Promise.all(payloads.map(payload => slack.findAndMessageUser(payload)))
	}
	catch(err){
		throw err;
	}
}

// new Cron(interval, function() {
// 	main();
// }, null, true, 'Europe/Berlin');

main()