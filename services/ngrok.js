#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const ngrok = require('ngrok');

const runTunnel = async() => {
	await ngrok.connect({
		authtoken: process.env.NGROK,
		proto: 'http',
		addr: process.env.PORT,
		subdomain: process.env.SUBDOMAIN,
		onStatusChange: status => {
			if(status == 'closed'){
				runTunnel();
			}
		}
	})
	.catch(err => {
		throw(err);
	})
}

runTunnel();