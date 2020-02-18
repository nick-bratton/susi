#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const { WebClient } = require('@slack/web-api');
const whitelist = require('../whitelist.js');

let Slack;

// if (process.env.MODE === 'dev'){
// 	Slack = new WebClient(process.env.SLACK_OAUTH_TOKEN_SANDBOX);
// }
// else{
	Slack = new WebClient(process.env.SLACK_OAUTH_TOKEN);
// }



/**
 * @desc 	Returns object for api.slack.com/methods/chat.postMessage
 * @param String channel 	(ID of user to send direct message to)
 * @param	Object payload 	(Contains modal content to be rendered on click)
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
 * @desc 		Stringifies payload and promises Slack.chat.postMessage() 
 * @param 	String id					(ID of user to send direct message to)
 * @param 	Object _payload		(Contains modal content to be rendered on click)
 * @returns new Promise 
 */
const postMessageWithPayload = async(id, _payload) => {
	// console.log()
	let payload;
	try{
		payload = JSON.stringify(_payload);
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
		throw  {
			err: 	new Error(err),
			source: 'postMessageWithPayload',
			id: id,
			_payload: payload
		};
	}
}



/**
 * @desc 		Messages Slack user with payload.emailAddress and returns payload and user info to be stored in Mongo database
 * @param 	Object payload		(Contains modal content to be rendered on click)
 * @returns Object
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
		console.log(err);
		throw {
			err: new Error(err),
			payload: payload,
			user: user
		};
	}
}



/**
 * @desc 		Gets email address of Slack profile linked to passed-in user ID
 * @param 	String userId			(Slack user ID
 * @return 	Promise						(Resolves to a string)
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