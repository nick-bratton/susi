#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const { WebClient } = require('@slack/web-api');
let Slack;
Slack = new WebClient(process.env.SLACK_PRO);

const whitelist = require('../whitelist.js');

const postMessageWithPayload = async(id, payload) => {

	let payload = JSON.stringify(payload);

	if (process.env.MODE == 'dev') {
		if (whitelist.devEmail.includes(payload.emailAddress)){
			await Slack.chat.postMessage({
				channel: `${id}`,
				as_user: true,
				"blocks": [
					{
						"type": "section",
						"text": {
							"type": "mrkdwn",
							"text": "Please confirm your hours on 10000ft"
						}
					},
					{
						"type": "actions",
						"block_id": "confirm_button",
						"elements": [
							{
								"type": "button",
								"text": {
									"type":"plain_text",
									"text": "Confirm Now"
								},
								"value": `${payload}`,
								"action_id": "confirm_button_action_id"
							}
						]
					}
				]
			});
		}
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


// https://api.slack.com/tutorials/intro-to-message-buttons
// https://api.slack.com/block-kit/surfaces/modals#updating_views
// https://api.slack.com/web#posting_json
// https://api.slack.com/reference/block-kit/views