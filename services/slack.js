#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const { WebClient } = require('@slack/web-api');
const whitelist = require('../whitelist.js');

let Slack;

if (process.env.MODE === 'dev'){
	Slack = new WebClient(process.env.SLACK_OAUTH_TOKEN_SANDBOX);
}
else{
	Slack = new WebClient(process.env.SLACK_OAUTH_TOKEN);
}

/**
 * @desc returns object for api.slack.com/methods/chat.postMessage
 * @param $string - channel - ID of user to send direct message to.
 * @param	$object - payload - Contains modal content to be rendered on click
 */
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

/**
 * @desc stringifies payload and promises Slack.chat.postMessage() 
 * @param $string - id				- ID of user to send direct message to.
 * @param $object - _payload	- Contains modal content to be rendered on click.
 * @returns new Promise 
 */
const postMessageWithPayload = async(id, _payload) => {
	try{
		let payload = JSON.stringify(_payload);
		if (process.env.MODE === 'dev') {
			if (whitelist.devEmail.includes(_payload.emailAddress)){
				await Slack.chat.postMessage(new Message(id, payload).message);
			}
		}
		else {
			await Slack.chat.postMessage(new Message(id, payload).message);
		}
	}
	catch(err){
		throw new Error(err);
	}
}

/**
 * @desc messages Slack user with payload.emailAddress and returns payload and user info to be stored in Mongo database
 * @param $object - payload - Contains modal content to be rendered on click.
 * @returns object
 */
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

/**
 * @desc gets email address of Slack profile linked to passed-in user ID
 * @param $string userId 	- Slack user ID
 * @return Promise (resolves to a string)
 */
exports.getUserEmailAddressFromUserId = async(userId) => {
	try{
		let userInfo = await Slack.users.info({user: `${userId}`});
		return userInfo.user.profile.email;
	}
	catch(err){
		throw new Error(err);
	}
}