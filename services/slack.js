#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const { WebClient } = require('@slack/web-api');
let Slack;
Slack = new WebClient(process.env.SLACK_PRO);

const whitelist = require('../whitelist.js');

const postMessageWithPayload = async(id, _payload) => {
	let payload = JSON.stringify(_payload);
	if (process.env.MODE === 'dev') {
		if (whitelist.devEmail.includes(_payload.emailAddress)){
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
	else if (process.env.MODE === 'beta'){
		if (whitelist.emails.includes(_payload.emailAddress)){
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

exports.getUserEmailAddressFromUserId = (userId) => {
	return new Promise(async function(resolve,reject){
		await Slack.users.info({
			user: `${userId}`
		}).then(response => {
			resolve(response.user.profile.email);
		})
		.catch(err => {
			console.log('Error in getUser << ' + userId + ' >> EmailAddressFromUserId(): ' + err);
			reject(err);
		})
	})
}