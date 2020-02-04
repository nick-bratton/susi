#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()

const ngrok = require('ngrok');

const runTunnel = async() => {
	try{
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
		}, {
			authtoken: process.env.NGROK,
			proto: 'http',
			addr: process.env.PORT_SANDBOX,
			subdomain: process.env.SUBDOMAIN_SANDBOX,
			onStatusChange: status => {
				if(status == 'closed'){
					runTunnel();
				}
			}
		})
	}
	catch(err){
		throw new Error(err);
	}
}

runTunnel();