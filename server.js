#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const tenK = require('./services/tenK.js');
const app = express();
const port = 8080;
const slackAuth = process.env.SLACK_PRO;
const slackToken = process.env.SLACK_REQUEST_VERIFICATION_TOKEN;
const { WebClient } = require('@slack/web-api');
let Slack;
Slack = new WebClient(process.env.SLACK_PRO);

const urlEncodedParser = bodyParser.urlencoded({extended:false});

// is it ok for these to be a global variable
// or will we have collisions? 
//
let viewId;
// let payloadForUpdatingMessageAfterConfirmation = {};
//
// i highly doubt this is acceptable but let's see....
//
// 	//	//	//	//	//	//	//	//	//	//	//

app.post('/', urlEncodedParser, async(req, res) => {
	
	let payload = JSON.parse(req.body.payload);
	let verified = payload.token == slackToken && payload.token != null && payload.token != undefined; 	// Using the 'token' request verification method is deprecated and we should move towards validating with signed secrets.
	switch (payload.type){																																							// See here: https://api.slack.com/docs/verifying-requests-from-slack#about
		case 'block_actions':
			if (verified){
				res.sendStatus(200);

				// console.log('payload containing response url?:');
				// console.log(payload.response_url);
				// console.log(payload.message.blocks);
				// console.log();

				payloadForUpdatingMessageAfterConfirmation.response_url = payload.response_url;
				payloadForUpdatingMessageAfterConfirmation.blocks = payload.message.blocks.filter(block => block.block_id != 'confirm_button');

				console.log(payloadForUpdatingMessageAfterConfirmation);





				let viewOpenResponse = await sendMessageToSlackResponseUrl(payload);
				viewId = viewOpenResponse.view.id;
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
					console.log('handling a view_submission:');
					console.log(payloadForUpdatingMessageAfterConfirmation);
					console.log();
					handleSubmission(payload, viewId, res, payloadForUpdatingMessageAfterConfirmation);
				}
			}
			else{
				res.status(403).end("Access forbidden");
			}
			break;
	}
})

app.listen(port, () => console.log(`Listening on port ${port}!`)); 

const inputIsValid = (value) => {
	let valid;
	if (value != null && value != undefined && value < 24 && value >= 0) {
		valid = true;
	}
	else {
		valid = false;
	}

	return valid;
}

const validateInputDataFormat = (payload) => {
	let errors = {};
	for (let [key, value] of Object.entries(payload.view.state.values)) {
		let form_id = key;
		let input = value.plain_input.value;
		let valid = inputIsValid(input);
		if (!valid){
			errors[form_id] = 'Input must be a number betewen 0 and 24 (e.g., 8, 0, 2.5).';
		}
	}
	return errors;
}

const removeButtonInOriginalMessage = async(payload) => {
	let options = {
		method: 'POST',
		uri: `${payload.response_url}`,
		headers: {
			'content-type': 'application/json',
			'authorization': `Bearer ${slackAuth}`
		},
		json: true,
		body: {
				"blocks": payload.blocks
		}
	}
	return new Promise(
		(resolve,reject) => {
			rp(options)
				.then(response => {
					resolve(response);
				})
				.catch(err => {
					console.log('Error in removeButtonInOriginalMessage(): ' + err)
					reject(err);
				})
				.finally(function(){
				})
		}
	)
}

const handleSubmission = async(payload, viewId, res, payloadForUpdatingOriginalMessage) => {
	let reqBodies = tenK.constructPostBodies(payload);
	let id = await tenK.getUserIdFromUserEmail(payload);
	await tenK.postSubmissions(reqBodies, id)
	.then(value => {
		confirmSuccess(viewId);
		//
		// patch for https://github.com/nick-bratton/susi/issues/5
		// -->
		removeButtonInOriginalMessage(payloadForUpdatingOriginalMessage);
		// <--
	})
	.catch(err => {
		confirmFailure(viewId);
	})
}

const confirmSuccess = async(viewId) => {
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
	return new Promise(
		(resolve,reject) => {
			rp(options)
				.then(response => {
					resolve(response);
				})
				.catch(err => {
					console.log('Error in confirmSuccess(): ' + err)
					reject(err);
				})
				.finally(function(){
				})
		}
	)
}

const confirmFailure = async(viewId) => {
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
	return new Promise(
		(resolve,reject) => {
			rp(options)
				.then(response => {
					resolve(response);
				})
				.catch(err => {
					console.log('Error in confirmFailure(): ' + err)
					reject(err);
				})
				.finally(function(){
				})
		}
	)
}


const confirmSubmission = async(res) => {
	res.send({
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
			}
		}
	}
	options.body.view.blocks = await constructInputBlocksFromPayload(requestPayload);
	return new Promise(
		(resolve,reject) => {
			rp(options)
				.then(response => {
					resolve(response);
				})
				.catch(err => {
					console.log('Error in sendMessageToSlackResponseUrl(): ' + err)
					reject(err);
				})
				.finally(function(){
				})
		}
	)
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

let createInputBlock = (suggestion) => {
	let label = `${suggestion.date} ${suggestion.assignable_name} (${suggestion.assignable_id})`;
	let blockId = 'bid' + label.hashCode();
	blockId = blockId.replace('-', '');
	return {
		"type": "input",
		"block_id": `${blockId}`,
		"label": {
			"type": "plain_text",
			"text": label,
		},
		"hint": {
			"type": "plain_text",
			"text": "Enter your hours here."
		},
		"element": {
			"type": "plain_text_input",
			"action_id": "plain_input",
			"placeholder": {
				"type": "plain_text",
				"text": `${suggestion.scheduled_hours}`
			}, 
		}
	}
}

const constructInputBlocksFromPayload = async (payload) => {
	return new Promise(async function(resolve,reject){
		await getUserNameFromUserIdFromParsedPayload(payload)
			.then(userName => {
				let parsedPayload = JSON.parse(payload.actions[0].value);
				let greetingBlock = createGreetingBlock(userName);
				let headerBlock = createHeaderBlock();
				let footerBlock = createFooterBlock();
				let blocks = []
				blocks.push(greetingBlock);
				blocks.push(headerBlock);
				for (let suggestion of parsedPayload.suggestions){
					let inputBlock = createInputBlock(suggestion);
					blocks.push(inputBlock);
				}
				blocks.push(footerBlock);
				resolve(blocks);
			})
			.catch(err => {
				console.log('Error in constructInputBlocksFromPayload(): ' + err);
			})
			.finally(function(){
			})
	})
}

const getUserNameFromUserIdFromParsedPayload = async(payload) => {
	return new Promise(async function(resolve,reject){
		await Slack.users.info({
			user: `${payload.user.id}`
		}).then(user => {
			let userName = user.user.profile.real_name;
			let bothNames = userName.split(' ');
			let firstName = bothNames[0];
			resolve(firstName);
		})
		.catch(err => {
			console.log('Error in getUserNameFromUserIdFromParsedPayload(): ' + err);
		})
	})
}

String.prototype.hashCode = function() {
	var hash = 0, i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0;
	}
	return hash;
}