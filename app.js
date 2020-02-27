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
		return await Promise.allSettled(payloads.map(payload => slack.messageUserAndReturnPayload(payload)))
			.then(results => {
				return formatMessageDocument(results, tenK.getActiveIds(allWeeklyEntries).length)
			})
	}
	catch(err){
		throw new Error(err);
	}
}



/**
 * @desc 		Constructs payload to pass to mogno.Message constructor
 * @param 	Object results			(Payload passed in from mapped Promise.allSettled callback (Promises were calls to slack.messageUserAndReturnPayload))
 * @param 	Number totalUsers		(Amount of users that had assignments on 10000ft in the observed time frame)
 * @returns Object 
 */
const formatMessageDocument = (results, totalUsers) => {
	return {
		messages: results.map(result => formatMessagePropForMessageDocument(result)),
		metadata: {
			usersMessaged: results.length,
			totalUsers: totalUsers
		}
	}
}



/**
 * @desc 		Formats subdocument for Mongo storage re: result of a Promised slack.messageUserAndReturnPayload
 * @param 	Object payload		(Payload passed in from mapped Promise.allSettled callback)
 * @returns Object 
 */
const formatMessagePropForMessageDocument = (payload) => {
	return {
		recipient: payload.value !== undefined ? payload.value.user : null,
		payload: payload.value !== undefined ? payload.value.payload : null,
		success: payload.status == 'fulfilled',
		reason: payload.value !== undefined ? null : payload.reason,
	}
}



if (process.env.MODE === 'dev'){
	main()
		.then(result => {
			await mongo.insert(new mongo.Message(result));
		})
		.catch(err => {
			throw new Error(err);
		}) 
}
else{
	new Cron(process.env.CRON, () => {
		main()
			.then(result => {
				await mongo.insert(new mongo.Message(result));
			})
			.catch(err => {
				throw new Error(err);
			}) 
	}, null, true, 'Europe/Berlin');
}