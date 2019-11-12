#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const rp = require('request-promise');

// uri: 'https://api.10000ft.com/api/v1/users/496565/time_entries?from=2019-11-09&to=2019-11-12&per_page=500&with_suggestions=true',

let options = {
	method: 'DELETE',
	resolveWithFullResponse: true,
	uri: 'https://api.10000ft.com/api/v1/users/496565/time_entries/1568050084',
	headers: {
		'auth': `${process.env.TENK}`
	},
}

// let ids = ['1568050084'];

const deleteEntry = (options) => {
	return new Promise(
		(resolve,reject) => {
			rp(options)
				.then(response => {
					console.log(response);
					resolve(response);
					// let body = JSON.parse(response.body);
					// console.log(body.data);
					// let body = JSON.parse(response);
					// console.log(body.data);
				})
				.catch(err => {
					console.log('Error in deleteEntry(): ' + err);
					reject(err);
				})
				.finally(function(){
					console.log('Got entries.');
				})
		}
	)
}

deleteEntry(options);

// const logEntries = (options) => {
//   return new Promise(
// 		(resolve,reject) => {
// 			rp(options)
// 				.then(response => {
//           let body = JSON.parse(response.body);
//           console.log(body.data);
//           // let body = JSON.parse(response);
//           // console.log(body.data);
// 				})
// 				.catch(err => {
// 					console.log('Error in logEntries(): ' + err)
// 					reject(err);
// 				})
// 				.finally(function(){
// 					console.log('Got entries.');
// 				})
// 		}
// 	)
// }

// logEntries(options);