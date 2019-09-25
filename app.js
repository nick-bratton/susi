#!/usr/bin/env nodejs
'use strict';

// require('dotenv').config()
const Cron = require('cron').CronJob;

const tenK = require('./services/tenK.js')
const slack = require('./services/slack.js')

function go(options){
	let ids;
	tenK.getWeeklyTimeEntries()
		.then(function (response) {
			ids = tenK.getUserIdsWithUnconfirmedEntries(response);
		})
		.catch(function (err) {
			console.log('Caught error in go():' + err);
		})
		.finally(async function(){
			let contactList = await generateContactList(ids);
			messageContacts(contactList);
		})
}

const generateContactList = async(ids) => {
	return await Promise.all(ids.map(id => tenK.getUserEmailFrom10KUserID(id)))
		.then(emailAddressList => {
			return emailAddressList;
		})
		.catch(err => {
			console.log('Error in generateContactList(): ' + err)
		})
}

const messageContacts = async(emailAddresses) => {
	await Promise.all(emailAddresses.map(emailAddress => slack.messageUserByEmailAddress(emailAddress)))
		.then(slackUserIds => {
			console.log('Notified Slack users: ' + slackUserIds);
		})
		.catch(err => {
			console.log('Error in notifyContacts(): ' + err)
		})
		.finally(function(){
		});
}

// change interval to 11AM every Thursday...'0 11 * * THU'
new Cron('*/2 * * * * *', function() {
	go(tenK.requestOptions);
}, null, true, 'Europe/Berlin');