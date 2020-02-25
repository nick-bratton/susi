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



const formatMessageDocument = (results, totalUsers) => {
	return {
		messages: results.map(result => formatMessagePropForMessageDocument(result)),
		metadata: {
			usersMessaged: results.length,
			totalUsers: totalUsers
		}
	}
}



const formatMessagePropForMessageDocument = (payload) => {
	return {
		recipient: payload.value !== undefined ? payload.value.user : null,
		payload: payload.value !== undefined ? payload.value.payload : null,
		success: payload.status == 'fulfilled',
		reason: payload.value !== undefined ? null : payload.reason,
	}
}



const store = async(result) => {
	try{
		console.log(result);
		await mongo.insert(new mongo.Message(result));
	}
	catch(err){
		throw new Error(err);
	}
}



if (process.env.MODE === 'dev'){
	main()
		.then(result => {
			store(result);
		})
		.catch(err => {
			throw new Error(err);
		}) 
}
else{
	new Cron(process.env.CRON, () => {
		main()
			.then(result => {
				store(result);
			})
			.catch(err => {
				throw new Error(err);
			}) 
	}, null, true, 'Europe/Berlin');
}