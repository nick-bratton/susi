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

app.post('/', urlEncodedParser, async(req, res) => {
	let payload = JSON.parse(req.body.payload);
	let verified = payload.token == slackToken && payload.token != null && payload.token !== undefined;
	try {
		switch (payload.type){
			case 'block_actions':
				if (verified){
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
						handleSubmission(payload, payload.view.id, res);
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

const inputIsValid = (value) => {
	if (value !== null && value !== undefined && value < 24 && value >= 0) {
		return true;
	}
	return false;
}

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

const handleSubmission = async(payload, viewId) => {
	try{
		let reqBodies = tenK.constructPostBodies(payload);
		let id = await tenK.getUserIdFromUserEmail(payload);
		await tenK.postSubmissions(reqBodies, id);
		await confirmSuccess(viewId);
		await deleteConfirmButtonInOriginalMessage(payload.view.private_metadata);
	}
	catch(err){
		confirmFailure(viewId)
	}
}

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
		options.body.view.blocks = await constructInputBlocksFromPayload(requestPayload);
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

let createSuggestionLabelBlock = (suggestion, hash) => {
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

let createInputBlockHours = (suggestion, hash) => {
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

let createinputBlockNotes = (suggestion, hash) => {
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

const constructInputBlocksFromPayload = async (payload) => {
	try{
		let userName = await getUserNameFromUserIdFromParsedPayload(payload);
		let parsedPayload = JSON.parse(payload.actions[0].value);
		let blocks = [];
		blocks.push(createGreetingBlock(userName));
		blocks.push(createHeaderBlock());
		for (let suggestion of parsedPayload.suggestions){
			let hash = `${suggestion.date} ${suggestion.assignable_name} (${suggestion.assignable_id})`.hashCode();
			blocks.push(createSuggestionLabelBlock(suggestion, hash));
			blocks.push(createInputBlockHours(suggestion, hash));
			blocks.push(createinputBlockNotes(suggestion, hash));
		}
		blocks.push(createFooterBlock());
		return blocks;
	}
	catch(err){
		throw new Error(err);
	}
}

const getUserNameFromUserIdFromParsedPayload = async(payload) => {
	let user = await Slack.users.info({user: `${payload.user.id}`});
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