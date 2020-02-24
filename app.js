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
				return {
					messages: results.map(result => {
						return {
							recipient: result.value !== undefined ? result.value.user : null,
							payload: result.value !== undefined ? result.value.payload : null,
							success: result.status == 'fulfilled',
							reason: result.value !== undefined ? null : result.reason
						}
					}),
					metadata: {
						usersMessaged: results.length,
						totalUsers: tenK.getActiveIds(allWeeklyEntries).length
					}
				}
			})
	}
	catch(err){
		throw new Error(err);
	}
}



const store = async(result) => {
	try{
		await mongo.insert(new mongo.Message(result));
	}
	catch(err){
		throw new Error(err);
	}
}



if (process.env.MODE === 'dev'){
	main().then(result => {
		store(result);
	})
}
else{
	new Cron(process.env.CRON, () => {
		main().then(result => {
			store(result);
		})
	}, null, true, 'Europe/Berlin');
}