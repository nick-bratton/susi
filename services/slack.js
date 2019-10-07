#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const { WebClient } = require('@slack/web-api');
let Slack;

if (process.env.MODE == 'dev'){
	Slack = new WebClient(process.env.SLACK_DEV);
}
else if(process.env.MODE == "pro"){
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
					"type": "plain_text",
					"text": "Please confirm your hours on 10000ft. You have unconfirmed time entries on the following days:"
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


const postSimpleMessage = async(id) => {
	await Slack.chat.postMessage({
		channel: `${id}`,
		text: `Please confirm your hours on 10000ft for this week: https://app.10000ft.com/me/tracker`,
		as_user: true
	});
}

exports.postMessageTest = async(id) => {
	await Slack.chat.postMessage({
		channel: `${id}`,
		text: `Please confirm your hours on 10000ft for this week: https://app.10000ft.com/me/tracker`,
		as_user: true,
		blocks: [
			{
				"type": "actions",
				"elements": [
					{
						"type": "button",
						"text": {
							"type": "plain_text",
							"text": "Button",
							"emoji": true
						},
						"value": "click_me_123"
					}
				]
			}
		]
	});
}