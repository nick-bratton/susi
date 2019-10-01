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
else if(process.env.MODE == "pro"){
	interval = '0 14 * * THU';
}

function main(){
	let ids, payloads;
	tenK.getWeeklyTimeEntries()
		.then(async function (response) {
			payloads =  await tenK.getUserIdsAndTheirUnconfirmedDates(response);
			// ids = tenK.getUserIdsWithUnconfirmedEntries(response);
		})
		.catch(function (err) {
			console.log('Caught error in main():' + err);
		})
		.finally(async function(){
			// let contactList = await generateContactList(ids);
			// let filteredContactList = contactList.filter(Boolean); // removes empty entries (e.g., freelancers like D_Solid Visual Design)
			// messageContacts(filteredContactList);

			console.log(payloads);
			messageContacts(payloads);



		})
}

const messageContacts = async(payloads) => {
	// map the payloads instead of the email addresses
	// so pass payload to slack.messageUser
	// and in that function (in slack service)
	// parse out the email address. 
	// so here there should no longer be anything about email address, 
	// just payloads
	await Promise.all(payloads.map(payload => slack.sendUserDM(payload)))
		.then(slackUserIds => {
			console.log('Notified Slack users: ' + slackUserIds);
		})
		.catch(err => {
			console.log('Error in notifyContacts(): ' + err)
		})
		.finally(function(){
		});
}

const generateContactList = async(ids) => {
	return await Promise.all(ids.map(id => 
		tenK.getUserEmailFrom10KUserID(id)
		)
	)
		.then(emailAddressList => {
			return emailAddressList;
		})
		.catch(err => {
			console.log('Error in generateContactList(): ' + err)
		})
}



// const messageContacts = async(emailAddresses) => {
// 	await Promise.all(emailAddresses.map(emailAddress => slack.messageUserByEmailAddress(emailAddress)))
// 		.then(slackUserIds => {
// 			console.log('Notified Slack users: ' + slackUserIds);
// 		})
// 		.catch(err => {
// 			console.log('Error in notifyContacts(): ' + err)
// 		})
// 		.finally(function(){
// 		});
// }

new Cron(interval, function() {
	main();
	// slack.postMessageTest('U73U37JKS');
}, null, true, 'Europe/Berlin');