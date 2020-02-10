#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const Cron = require('cron').CronJob;
const tenK = require('./services/tenK.js');
const mongo = require('./services/mongo.js')
const slack = require('./services/slack.js');

const main = async() => {
	try{
		let allWeeklyEntries = await tenK.getWeeklyEntries();
		let unconfirmedEntryIdentifiers = await tenK.getUnconfirmedEntryIdentifiers(allWeeklyEntries);
		let payloads = await tenK.constructPayloads(allWeeklyEntries, unconfirmedEntryIdentifiers);
		Promise.allSettled(payloads.map(payload => slack.messageUserAndReturnPayload(payload)))
			.then(results => {
				results.forEach(result => {
					mongo.insert({
						date: Date().toString(),
						recipient: result.value.user,
						payload: result.value.payload,
						success: result.status == 'fulfilled'
					})
				})
			})
	}
	catch(err){
		throw new Error(err);
	}
}

if (process.env.MODE === 'dev'){
	main();
}
else{
	new Cron(process.env.CRON, () => {
		main()
	}, null, true, 'Europe/Berlin');
}