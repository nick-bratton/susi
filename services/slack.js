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
 * @desc 	Returns object for api.slack.com/methods/chat.postMessage
 * @param String channel 	(ID of user to send direct message to)
 * @param String name		 	(name of user or placeholder if no info is provided)
 * @param	Object payload 	(Contains modal content to be rendered on click)
 */
class RichMessage {
	constructor(channel, name, payload){
		return this.message = {
			"channel": channel,
			"as_user": true,
			"blocks": [
				{
					"type": "section",
					"text": {
						"type": "mrkdwn",
						"text": `Good morning ${name}, you have unconfirmed time entries last week.`
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
 * @desc 	Returns object for api.slack.com/methods/chat.postMessage
 * @param String channel 	(ID of user to send direct message to)
 * @param String name		 	(name of user or placeholder if no info is provided)
 */
class Message {
	constructor(channel, name){
		return this.message = {
			"channel": channel,
			"as_user": true,
			"blocks": [
				{
					"type": "section",
					"text": {
						"type": "mrkdwn",
						"text": `Good morning ${name}, you have more than 5 unconfirmed entries last week. \n I can't help you here, but I can forward you to *<https://app.10000ft.com/me|10000Ft>*. Have a great week!.`
					}
				},
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
const postMessageWithPayload = async(user, payload) => {
	let id = user.user.id;
	let name = user.user.profile.first_name !== null && user.user.profile.first_name != undefined && user.user.profile.first_name !== '' ? user.user.profile.first_name : 'you';
	let lengthOfSuggestions = payload.suggestions.length;
	let msg = lengthOfSuggestions < 6 ? new RichMessage(id, name, JSON.stringify(payload)) : new Message(id, name);
	try{
		return await Slack.chat.postMessage(msg);
	}
	catch(err){
		throw  {
			err: new Error(err),
			meta: {
				user: user,
				payload: payload
			},
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
		await postMessageWithPayload(user, payload);
		return formatPayload(user, payload);
	}
	catch(err){
		throw {
			err: new Error(err),
			meta: {
				payload: payload
			},
		};
	}
}



/**
 * @desc 		Formats payload as document for our MongoDB
 * @param 	Object user				User returned by Slack.users.lookupByEmail()
 * @param 	Object payload		Payload passed in from tenK.constructPayloads()
 * @returns Object 
 */
const formatPayload = (user, payload) => {
	return {
		user: {
			id: user.ok ? user.user.id : undefined,
			team_id: user.ok ? user.user.team_id : undefined,
			name: user.ok ? user.user.profile.real_name : undefined,
			title: user.ok ? user.user.profile.title : undefined,
			email: user.ok ?  user.user.profile.email : undefined
		},
		payload: payload,
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
		throw {
			err: new Error(err),
			meta: {
				function: 'slack.getUserEmailAddressFromUserID',
				userId: userId,
			}
		}
	}
}