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
	let msg = {
		"text": "Hello world",
	}
	let options = {
		method: 'POST',
		uri: requestPayload.response_url,
		headers: {
			'content-type': 'application/json'
		},
		json: msg
	}
	return new Promise(
		(resolve,reject) => {
			rp(options)
				.then(response => {
					console.log(response.body);
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