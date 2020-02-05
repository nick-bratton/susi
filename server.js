#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const rp = require('request-promise');
const tenK = require('./services/tenK.js');
const { WebClient } = require('@slack/web-api');

let port, slackAuth, slackToken, Slack;

if(process.env.MODE === 'dev'){
	port = process.env.PORT_SANDBOX;
	slackAuth = process.env.SLACK_OAUTH_TOKEN_SANDBOX;
	slackToken = process.env.SLACK_SANDBOX_REQUEST_VERIFICATION_TOKEN;
}
else{
	port = process.env.PORT;
	slackAuth = process.env.SLACK_OAUTH_TOKEN;
	slackToken = process.env.SLACK_REQUEST_VERIFICATION_TOKEN;
}

Slack = new WebClient(slackAuth);

const urlEncodedParser = bodyParser.urlencoded({extended:false});



/**
 * @desc 		Only route handler of the server
 * @return	new Promise
 */
app.post('/', urlEncodedParser, async(req, res) => {
	let payload = JSON.parse(req.body.payload);
	let verified = payload.token == slackToken && payload.token != null && payload.token !== undefined;
	try {
		switch (payload.type){
			//// 
			/// cases: 
			//  block_actions: user clicks "Confirm Now" button in message to open the modal
			//  view_submission: user clicks "Submit" button in modal
			//
			case 'block_actions':
				if (verified){
					// must respond in less than 3 seconds (forwarding back the sent
					// trigger_id) in order to open the modal
					// see here: https://api.slack.com/surfaces/modals/using#opening_modals
					res.sendStatus(200);
					await sendMessageToSlackResponseUrl(payload);
				}
				else{
					res.status(403).end("Access forbidden");
				}
				break;
			case 'view_submission':
				if (verified){
					let errors = validateInputDataFormat(payload);
					if (Object.keys(errors).length > 0){
						let body = {};
						body.errors = errors;
						body.response_action = "errors";
						res.send(body);
					}
					else {
						await confirmSubmission(res);
						handleSubmission(payload, payload.view.id);
					}
				}
				else{
					res.status(403).end("Access forbidden");
				}
				break;
		}
	}
	catch (err){
		throw new Error(err);
	}
})



app.listen(port, () => console.log(`Listening on port ${port}!`)); 



/**
 * @desc 		Checks submitted modal hours field to make sure they're numbers between 0 and 24
 * @param 	String value
 * @return 	boolean
 */
const inputIsValid = (value) => {
	if (value !== null && value !== undefined && value < 24 && value >= 0) {
		return true;
	}
	return false;
}


/**
 * @desc 		Checks submitted modal fields for validity and returns error messages if invalid
 * @param 	Object payload
 * @return 	Object
 */
const validateInputDataFormat = (payload) => {
	let errors = {};
	for (let [key, value] of Object.entries(payload.view.state.values)) {
		let valid = inputIsValid(value.plain_input.value) || key.includes('.notes');
		if (!valid){
			errors[key] = 'Input must be a number betewen 0 and 24 (e.g., 8, 0, 2.5).';
		}
	}
	return errors;
}


/**
 * @desc 		Asks Slack to delete Confirm button in original message and to replace it with 'Thanks for using the 10K Reminder!'
 * @param 	Object privateMetadata
 * @return 	new Promise
 */
const deleteConfirmButtonInOriginalMessage = async(privateMetadata) => {
	try{
		let pm = JSON.parse(privateMetadata);
		let options = {
			method: 'POST',
			uri:'https://slack.com/api/chat.update',
			headers: {
				'content-type': 'application/json; utf-8',
				'authorization': `Bearer ${slackAuth}`,
			},
			json: true,
			as_user: true,
			body: {
				"channel": `${pm.channel_id}`,
				"ts": `${pm.ts}`,
				"text": 'Thanks for using the 10K Reminder!',
				"attachments": [],
				"blocks": []
			}
		}
		let res = await rp(options);
		return res
	}
	catch(err){
		throw new Error(err)
	}
}


/**
 * @desc		Handler for passing data from Slack to 10000Ft.
 * @param 	Object payload 	(Data submitted from Slack modal when user clicks 'Confirm')
 * @param 	String viewId 	(ViewId of the Slack modal)
 * @return	new Promise			(Falls back to confirmFailure() in catch block)
 */
const handleSubmission = async(payload, viewId) => {
	try{
		let reqBodies = tenK.constructPostBodies(payload);
		let id = await tenK.getUserIdFromUserEmail(payload.user.id);
		await tenK.postSubmissions(reqBodies, id);
		await confirmSuccess(viewId);
		await deleteConfirmButtonInOriginalMessage(payload.view.private_metadata);
	}
	catch(err){
		confirmFailure(viewId)
	}
}


/**
 * @desc 		Confirms that POST request to 10000Ft. resolved successfully; updates Slack modal view with success message
 * @param 	String viewId
 * @return 	new Promise
 */
const confirmSuccess = async(viewId) => {
	try{
		let options = {
			method: 'POST',
			uri:'https://slack.com/api/views.update',
			headers: {
				'content-type': 'application/json',
				'authorization': `Bearer ${slackAuth}`
			},
			json: true,
			body: {
				"view_id": `${viewId}`,
				"view": {
					"type": "modal",
					"callback_id": "modal-with-input",
					"title": {
						"type": "plain_text",
						"text": "Success!",
						"emoji": true
					},
					"close": {
						"type": "plain_text",
						"text": "Finish",
						"emoji": true
					},
					"blocks": [
						{
							"type": "section",
							"text": {
								"type": "plain_text",
								"text": "Your hours were successfully submitted to 10000ft"
							}
						},
						{
							"type": "section",
							"text": {
								"type": "plain_text",
								"text": "Nice work :v:"
							}
						},
					]
				}
			}
		}
		let res = await rp(options);
		return res;
	}
	catch(err){
		throw new Error(err);
	}
}


/**
 * @desc 		Confirms that POST request to 10000Ft failed; updates Slack modal view with failure message
 * @param 	String viewId
 * @return 	new Promise
 */
const confirmFailure = async(viewId) => {
	try{
		let options = {
			method: 'POST',
			uri:'https://slack.com/api/views.update',
			headers: {
				'content-type': 'application/json',
				'authorization': `Bearer ${slackAuth}`
			},
			json: true,
			body: {
				"view_id": `${viewId}`,
				"view": {
					"type": "modal",
					"callback_id": "modal-with-input",
					"title": {
						"type": "plain_text",
						"text": "Oh no!"
					},
					"close": {
						"type": "plain_text",
						"text": "Cancel",
					},
					"blocks": [
						{
							"type": "section",
							"text": {
								"type": "mrkdwn",
								"text": ":face_with_head_bandage: Something seems to have gone wrong."
							}
						},
						{
							"type": "section",
							"text": {
								"type": "mrkdwn",
								"text": "*<https://app.10000ft.com/me/tracker|Go to 10000ft.>*"
							}
						},
					]
				}
			}
		}
		let res = await rp(options);
		return res;
	}
	catch(err){
		throw new Error(err);
	}
}


/**
 * @desc 		Confirms that an HTTP request has been sent out by this server; updates Slack modal with message saying so
 * @param 	Object res		(HTTP response object)
 * @return 	new Promise
 */
const confirmSubmission = async(res) => {
	await res.send({
		"response_action": "update",
		"view": {
			"type": "modal",
			"title": {
				"type": "plain_text",
				"text": `Thank you!`
			},
			"blocks": [
				{
					"type": "section",
					"text": {
						"type": "plain_text",
						"text": `I'm sending your entries over to 10000ft now... `
					}
				},
				{
					"type": "section",
					"text":{
						"emoji": true,
						"type": "plain_text",
						"text": ":rocket:"
					}
				}
			]
		}
	})
}


/**
 * @desc 		Handles opening of Slack modal and sets private_metadata prop in body of constructed HTTP response
 * @param 	Object requestPayload		(Contains Slack-generated metadata that we store for later in a private message prop)
 * @return 	Object									(HTTP Response)
 */
const sendMessageToSlackResponseUrl = async(requestPayload) => {
	try{
		let privateMetadata = {
			token: requestPayload.token,
			ts: requestPayload.container.message_ts,
			channel_id: requestPayload.container.channel_id,
			blocks: requestPayload.message.blocks,
		}
		let pm = JSON.stringify(privateMetadata);
		let options = {
			method: 'POST',
			uri:'https://slack.com/api/views.open',
			headers: {
				'content-type': 'application/json',
				'authorization': `Bearer ${slackAuth}`
			},
			json: true,
			body: {
				"trigger_id": requestPayload.trigger_id,
				"replace_original": false,
				"view": {
					"type": "modal",
					"callback_id": "modal-with-input",
					"private_metadata": pm,
					"title": {
						"type": "plain_text",
						"text": "10K Reminder",
						"emoji": true
					},
					"submit": {
						"type": "plain_text",
						"text": "Submit",
						"emoji": true
					},
					"close": {
						"type": "plain_text",
						"text": "Cancel",
						"emoji": true
					},
				},
			}
		}
		options.body.view.blocks = await compileModalBlocks(requestPayload);
		let res = await rp(options);
		return res;
	}
	catch(err){
		throw new Error(err);
	}
}



let createGreetingBlock = (userName) => {
	return {
		"type": "section",
		"text": {
			"type": "plain_text",
			"emoji": true,
			"text": `:wave: Hi ${userName},`
		}
	}
}



let createHeaderBlock = () => {
	return {
		"type": "section",
		"text": {
			"type": "plain_text",
			"text": "Please confirm your suggested time entries for last week:"
		}
	}
}



let createFooterBlock = () => {
	return {
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": "*<https://app.10000ft.com/me/tracker|Go to 10000ft.>*"
		}
	}
}


/**
 * @desc 		Creates block for modal with label containing suggestion properties: date, assignable_name, assignable_id
 * @param 	Object suggestion		(Suggested time entry object)
 * @param 	Object hash					(hash of string of concatanated properties of the suggestion; used as a unique identifier for Slack modal blocks)
 * @return 	new Object					(Section-type block)
 */
const createSuggestionLabelBlock = (suggestion, hash) => {
	let label = `${suggestion.date} ${suggestion.assignable_name} (${suggestion.assignable_id})`;
	let blockId = 'bid' + hash + '.label';
	blockId = blockId.replace('-', '');
	return {
		"type": "section",
		"block_id": `${blockId}`,
		"text": {
			"type": "mrkdwn",
			"text": `*${label}*`
		},
	}
}


/**
 * @desc 		Creates Slack modal input block for hours worked 
 * @param 	Object suggestion		(Suggested time entry object)
 * @param 	Object hash					(hash of string of concatanated properties of the suggestion; used as a unique identifier for Slack modal blocks)
 * @return 	new Object					(Input-type block)
 */
const createInputBlockHours = (suggestion, hash) => {
	let blockId = 'bid' + hash + '.hours';
	blockId = blockId.replace('-', '');
	return {
		"type": "input",
		"block_id": `${blockId}`,
		"label": {
			"type": "plain_text",
			"text": "Hours",
		},
		"element": {
			"type": "plain_text_input",
			"action_id": "plain_input",
			"placeholder": {
				"type": "plain_text",
				"text": `${suggestion.scheduled_hours}`
			}, 
		},
	}
}


/**
 * @desc 		Creates Slack modal input block for notes
 * @param 	Object hash					(hash of string of concatanated properties of the suggestion; used as a unique identifier for Slack modal blocks)
 * @return 	new Object					(Input-type block)
 */
const createInputBlockNotes = (hash) => {
	let blockId = 'bid' + hash + '.notes';
	blockId = blockId.replace('-', '');
	return {
		"type": "input",
		"block_id": `${blockId}`,
		"label": {
			"type": "plain_text",
			"text": "Notes",
		},
		"element": {
			"type": "plain_text_input",
			"action_id": "plain_input",
			"placeholder": {
				"type": "plain_text",
				"text": "Notes"
			}, 
		},
		"optional": true,
	}
}


/**
 * @desc 		Compiles blocks needed to build Slack modal view with user-specific data
 * @param 	Object payload		(Suggested time entry objects)
 * @return 	new Array					(Array of blocks needed to construct Slack modal)
 */
const compileModalBlocks = async (payload) => {
	try{
		let userName = await getUserNameFromSlackUserId(payload.user.id);
		let parsedPayload = JSON.parse(payload.actions[0].value);
		let blocks = [];
		blocks.push(createGreetingBlock(userName));
		blocks.push(createHeaderBlock());
		for (let suggestion of parsedPayload.suggestions){
			let hash = `${suggestion.date} ${suggestion.assignable_name} (${suggestion.assignable_id})`.hashCode();
			blocks.push(createSuggestionLabelBlock(suggestion, hash));
			blocks.push(createInputBlockHours(suggestion, hash));
			blocks.push(createInputBlockNotes(hash));
		}
		blocks.push(createFooterBlock());
		return blocks;
	}
	catch(err){
		throw new Error(err);
	}
}


/**
 * @desc 		Gets first name of user from Slack userId
 * @param 	String userId
 * @return 	new String
 */
const getUserNameFromSlackUserId = async(userId) => {
	let user = await Slack.users.info({user: `${userId}`});
	user = user.user.profile.real_name;
	user = user.split(' ');
	return user[0]
}



String.prototype.hashCode = function() {
	var hash = 0, i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr = this.charCodeAt(i);
		hash = ((hash << 5) - hash) + chr;
		hash |= 0;
	}
	return hash;
}