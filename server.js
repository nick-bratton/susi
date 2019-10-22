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

	// let msg = {
	// 	"text": "hello",
	// 	"replace_original": "false"
	// }

	
	let options = {
		method: 'POST',
		// uri: requestPayload.response_url,
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
				"blocks": [
					{
						"type": "section",
						"text": {
							"type": "plain_text",
							"emoji": true,
							"text": "Please confirm your suggested time entries for last week:"
						}
					},
							
					{
						"type": "divider"
					},
			
					{
						"type": "input",
						"block_id": "unique1",
						"label": {
							"type": "plain_text",
							"text": "10. Oct 2019: Biotronik GTM Strategy (44690)"
						},
						"hint":{
								"type":"plain_text",
								"text":"Enter your hours above or leave if correct"
						},
						"element": {
							"type": "plain_text_input",
							"action_id": "plain_input",
							"placeholder": {
								"type": "plain_text",
								"text": "8.0"
							}
						}
					},
			
					{
						"type": "input",
						"block_id": "unique2",
									
						"label": {
							"type": "plain_text",
							"text": "11. Oct 2019: Biotronik GTM Strategy (44690)"
						},
						"hint":{
								"type":"plain_text",
								"text":"Enter your hours above or leave if correct"
						},
						"element": {
							"type": "plain_text_input",
							"action_id": "plain_input",
							"placeholder": {
								"type": "plain_text",
								"text": "8.0"
							}
						}
					},
							
					{
						"type": "section",
						"text": {
							"type": "mrkdwn",
							"text": "*<https://app.10000ft.com/me/tracker|Go to 10000ft.>*"
						}
					}
				]
			}
		}
	}

	return new Promise(
		(resolve,reject) => {
			rp(options)
				.then(response => {
					console.log(response);
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