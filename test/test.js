#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const rp = require('request-promise');

let options = {
  method: 'GET',
  resolveWithFullResponse: true,
	uri: 'https://api.10000ft.com/api/v1/users/663635/time_entries?from=2019-10-28&to=2019-10-29&per_page=500&with_suggestions=true',
	headers: {
		'cache-control': 'no-store',
		'content-type': 'application/json',
		'auth': `${process.env.TENK}`
	},
}

const logEntries = (options) => {
  return new Promise(
		(resolve,reject) => {
			rp(options)
				.then(response => {
          let body = JSON.parse(response.body);
          console.log(body.data);
          // let body = JSON.parse(response);
          // console.log(body.data);
				})
				.catch(err => {
					console.log('Error in logEntries(): ' + err)
					reject(err);
				})
				.finally(function(){
					console.log('Got entries.');
				})
		}
	)
}

logEntries(options);