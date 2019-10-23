#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const express = require('express');
const bodyParser = require('body-parser');
const rp = require('request-promise');
const app = express();
const port = 8080;
const slackAuth = process.env.SLACK_PRO;
const slackToken = process.env.SLACK_REQUEST_VERIFICATION_TOKEN;

const urlEncodedParser = bodyParser.urlencoded({extended:false});

app.post('/', urlEncodedParser, (req, res) => {
	res.sendStatus(200); 
	let payload = JSON.parse(req.body.payload);
	// https://api.slack.com/docs/verifying-requests-from-slack#about
	//
	// Uing the 'token' request verification method is deprecated
	// and we should move towards validating with signed secrets.
	if (payload.token == slackToken && payload.token != null && payload.token != undefined){
		sendMessageToSlackResponseUrl(payload);
	}
	else{
		res.status(403).end("Access forbidden");
	}
})

app.listen(port, () => console.log(`Listening on port ${port}!`)); 

const sendMessageToSlackResponseUrl = (requestPayload) => {
	constructInputBlocksFromPayload(requestPayload);

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

	options.body.view.blocks = constructInputBlocksFromPayload(requestPayload);

	console.log(options.body.view.blocks);

	return new Promise(
		(resolve,reject) => {
			console.log(options);
			rp(options)
				.then(response => {
					console.log(response);
					resolve(response);
				})
				.catch(err => {
					console.log('Error in sendMessageToSlackResponseUrl(): ' + err)
					reject(err);
				})
				.finally(function(){
					console.log('Finally sendMessageToSlackResponseUrl()');
				})
		}
	)
}

const constructInputBlocksFromPayload = (payload) => {

	let parsedPayload = JSON.parse(payload.actions[0].value);

	let headerBlock = {
		"type": "section",
		"text": {
			"type": "plain_text",
			"emoji": true,
			"text": "Please confirm your suggested time entries for last week:"
		}
	}
	
	let footerBlock = {
		"type": "section",
		"text": {
			"type": "mrkdwn",
			"text": "*<https://app.10000ft.com/me/tracker|Go to 10000ft.>*"
		}
	}

	let createInputBlock = (suggestion) => {
		let label = `${suggestion.date} ${suggestion.assignable_name} (${suggestion.assignable_id})`;
		let blockId = label.hashCode();
		return {
			"type": "input",
			"block_id": `${blockId}`,
			"label": {
				"type": "plain_text",
				"text": label,
			},
			"hint": {
				"type": "plain_text",
				"text": "Enter your hours above or leave if correct."
			},
			"element": {
				"type": "plain_text_input",
				"action_id": "plain_input",
				"placeholder": {
					"type": "plain_text",
					"text": `${suggestion.scheduled_hours}`
				}
			}
		}
	}

	let blocks = []
	blocks.push(headerBlock);
	
	for (let suggestion of parsedPayload.suggestions){
		let inputBlock = createInputBlock(suggestion);
		blocks.push(inputBlock);
	}

	blocks.push(footerBlock);
	return blocks;
}

String.prototype.hashCode = function() {
	var hash = 0, i, chr;
	if (this.length === 0) return hash;
	for (i = 0; i < this.length; i++) {
		chr   = this.charCodeAt(i);
		hash  = ((hash << 5) - hash) + chr;
		hash |= 0; // Convert to 32bit integer
	}
	return hash;
};