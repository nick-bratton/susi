#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const { WebClient } = require('@slack/web-api');
let Slack;
Slack = new WebClient(process.env.SLACK_PRO);

const whitelist = require('../whitelist.js');

class Message {
	constructor(channel, payload){
		this.message = {
			"channel": channel,
			"as_user": true,
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
		}
	}
}

const postMessageWithPayload = async(id, _payload) => {
	try{
		let payload = JSON.stringify(_payload);
		if (process.env.MODE === 'dev' || process.env.MODE === 'beta') {
			if (whitelist.devEmail.includes(_payload.emailAddress)){
				await Slack.chat.postMessage(new Message(id, payload).message);
			}
		}
		else if (process.env.MODE  === 'pro'){
			await Slack.chat.postMessage(new Message(id, payload).message);
		}
	}
	catch(err){
		throw new Error(err);
	}
}

exports.messageUserAndReturnPayload = async(payload) => {
	try{
		let user = await Slack.users.lookupByEmail({email: `${payload.emailAddress}`});
		await postMessageWithPayload(user.user.id, payload);
		return {
			user: {
				id: user.user.id,
				team_id: user.user.team_id,
				name: user.user.profile.real_name,
				title: user.user.profile.title,
				email: user.user.profile.email
			}, 
			payload: payload
		}
	}
	catch(err){
		throw new Error(err);
	}
}

exports.getUserEmailAddressFromUserId = async(userId) => {
	try{
		let userInfo = await Slack.users.info({user: `${userId}`});
		return userInfo.user.profile.email;
	}
	catch(err){
		throw new Error(err);
	}
}