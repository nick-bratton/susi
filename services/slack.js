#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const { WebClient } = require('@slack/web-api');
let Slack;

if (process.env.MODE == 'dev'){
	Slack = new WebClient(process.env.SLACK_DEV);
}
else if(process.env.MODE == "pro" || process.env.MODE == 'pro_beta'){
	Slack = new WebClient(process.env.SLACK_PRO);
}

exports.findAndMessageUser = (payload) => {
	return new Promise(async function(resolve,reject){
		await Slack.users.lookupByEmail({
			email: `${payload[1]}`
		}).then(user => {
			postMessageWithPayload(user.user.id, payload);
			resolve(user.user.id);
		})
		.catch(err => {
			console.log('Error in findAndMessageUser(): ' + err);
		})
	})
}

const postMessageWithPayload = async(id, payload) => {

	let listOfUnconfirmedEntries = '• ';

	for (let date of payload[2]){
		listOfUnconfirmedEntries += date + '\n• ';
	}
	
	listOfUnconfirmedEntries = listOfUnconfirmedEntries.slice(0,-3);

	await Slack.chat.postMessage({
		channel: `${id}`,
		as_user: true,
		"blocks": [
			{
				"type":"section",
				"text": {
					"type": "mrkdwn",
					"text": "<https://app.10000ft.com/me/tracker|Please confirm your hours on 10000ft.>\nYou have unconfirmed time entries on the following days:"
				}
			},
			{
			"type": "section",
			"text": {
				"type": "mrkdwn",
				"text": `${listOfUnconfirmedEntries}`
				}
			}
		]
	});
}