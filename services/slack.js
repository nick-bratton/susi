#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const { WebClient } = require('@slack/web-api');
let Slack;
const whitelist = require('../whitelist.js');

if (process.env.MODE == 'dev'){
	Slack = new WebClient(process.env.SLACK_DEV);
}
else if(process.env.MODE == 'pro' || process.env.MODE == 'pro_beta'){
	Slack = new WebClient(process.env.SLACK_PRO);
}

const postMessageWithPayload = async(id, payload) => {

	let listOfUnconfirmedEntries = '• ';

	for (let date of payload.dates){
		listOfUnconfirmedEntries += date + '\n• ';
	}
	
	listOfUnconfirmedEntries = listOfUnconfirmedEntries.slice(0,-3);
	
	if (process.env.MODE == 'pro_beta'){
		if (whitelist.emails.includes(payload.emailAddress)){
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
					},
					{
						"type": "section",
						"text": {
							"type": "mrkdwn",
							"text": "You received this message as you are on this bots beta testing user whitelist. Notifications will go out every working day at 1600h until the bot is officially launched.\n\nPlease report any bugs or misinformation to Nick Bratton. Thanks for participating! Feel free to checkout the code on <https://github.com/nick-bratton/susi|GitHub>." 
							}
						},
				]
			});
		}
	}
	else if (process.env.MODE == 'dev') {
		if (whitelist.devEmail.includes(payload.emailAddress)){
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
					},
					{
						"type": "section",
						"text": {
							"type": "mrkdwn",
							"text": "You received this message as you are on this bots beta testing user whitelist. Notifications will go out every working day at 1600h until the bot is officially launched.\n\nPlease report any bugs or misinformation to Nick Bratton. Thank you for participating!" 
							}
						},
				]
			});
		}
	}
	else if (process.env.MODE == 'pro'){
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
				},
			]
		});
	}
}

exports.findAndMessageUser = (payload) => {
	return new Promise(async function(resolve,reject){
		await Slack.users.lookupByEmail({
			email: `${payload.emailAddress}`
		}).then(user => {
			postMessageWithPayload(user.user.id, payload);
			resolve(user.user.id);
		})
		.catch(err => {
			console.log('Error in findAndMessageUser(): ' + err);
		})
	})
}