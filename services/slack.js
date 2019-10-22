#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const { WebClient } = require('@slack/web-api');
let Slack;
Slack = new WebClient(process.env.SLACK_PRO);

const whitelist = require('../whitelist.js');

const postMessageWithPayload = async(id, payload) => {

	let dummy = JSON.stringify(payload);

	if (process.env.MODE == 'dev') {
		if (whitelist.devEmail.includes(payload.emailAddress)){
			await Slack.chat.postMessage({
				channel: `${id}`,
				as_user: true,
				"blocks": [
					// {
					// 	"type":"section",
					// 	"text": {
					// 		"type": "mrkdwn",
					// 		"text": "<https://app.10000ft.com/me/tracker|Please confirm your hours on 10000ft.>\nYou have unconfirmed time entries on the following days:"
					// 	}
					// },
					{
						"type": "section",
						"text": {
							"type": "mrkdwn",
							"text": `${dummy}`
						}
					},
					{
						"type": "actions",
						"block_id": "some_id",
						"elements": [
							{
								"type": "button",
								"text": {
									"type":"plain_text",
									"text": "Confirm Now"
								},
								"value": "confirm",
								"action_id": "confirm_button_action_id"
							}
						]
					}
				]
			});
		}
	}
}

const constructInputBlock = (entry) => {
	let block = {
		"type": "input",
		"block_id": "unique1",
		"label": {
			"type": "plain_text",
			"text": "10. Oct 2019: Biotronik GTM Strategy (44690)"
		},
		"hint":{
				"type":"plain_text",
				"text":"Enter your hours above or leave if correct"
		},
		"element": {
			"type": "plain_text_input",
			"action_id": "plain_input",
			"placeholder": {
				"type": "plain_text",
				"text": "8.0"
			}
		}
	};
	console.log(block);
	return block;
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