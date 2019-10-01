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

exports.messageUserByEmailAddress = (address) => {
	// console.log(address);
	return new Promise(async function(resolve, reject){
		await Slack.users.lookupByEmail({
			email: `${address}`
		}).then(user => {
			postMessageBySlackId(user.user.id);
			resolve(user.user.id);
		})
		.catch(err => {
			console.log('Error in getSlackIdByEmailAddress(): ' + err);
			reject(err);
		})
	})
}

const postMessageBySlackId = async(id) => {
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