#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const rp = require('request-promise');

let baseUri = "";
let auth = "";

if (process.env.MODE == 'dev'){
	baseUri = 'https://vnext-api.10000ft.com/api/v1/';
	auth = process.env.VNEXT;
}
else if(process.env.MODE == "pro"){
	baseUri = 'https://api.10000ft.com/api/v1/';
	auth = process.env.TENK;
}

exports.requestOptions = {
	method: 'GET',
	resolveWithFullResponse: true,
	uri: `${baseUri}`,
	headers: {
		'cache-control': 'no-cache',
		'content-type': 'application/json',
		'auth': `${auth}`
	},
}

exports.uriToCheckWeeklyTimeEntries = () => {
	let uri = `${baseUri}` + 'time_entries?from=';
	uri += sevenDaysAgo() + '&to=' + today() + '&per_page=500&with_suggestions=true';
	return uri;
}

exports.getWeeklyTimeEntries = () => {
	this.requestOptions.uri = this.uriToCheckWeeklyTimeEntries();
	return rp(this.requestOptions)
}

exports.getUserIdsWithUnconfirmedEntries = (response) => {

	let ids = [], uniqueIds, _uniqueIds;
	let entries = JSON.parse(response.body);

	for (let entry in entries.data){
		if(entries.data[entry].is_suggestion){
			ids.push(entries.data[entry].user_id);
		}
	}

	// filter out duplicates:
	uniqueIds = new Set(ids);
	_uniqueIds = Array.from(uniqueIds);
	return _uniqueIds;
}

exports.getUserIdsAndTheirUnconfirmedDates = async(response) => {
	let ids = [], uniqueIds, _uniqueIds;
	let idsAndUnconfirmedDates = [];
	let payloads = [];

	let entries = JSON.parse(response.body);

	for (let entry in entries.data){
		if(entries.data[entry].is_suggestion){
			ids.push(entries.data[entry].user_id);
			idsAndUnconfirmedDates.push( [ entries.data[entry].user_id, entries.data[entry].date ] )
		}
	}

	uniqueIds = new Set(ids); // filter out duplicates
	_uniqueIds = Array.from(uniqueIds);

	for (let id of _uniqueIds){
		let unconfirmedDates = [], uniqueUnconfirmedDates, _uniqueUnconfirmedDates;
		for (let entry of idsAndUnconfirmedDates){
			if (entry[0] == id){
				unconfirmedDates.push(entry[1]);
			}
			uniqueUnconfirmedDates = new Set(unconfirmedDates); // filter out duplicates
			_uniqueUnconfirmedDates = Array.from(uniqueUnconfirmedDates);
		}

		let emailAddress = await this.getUserEmailFrom10KUserID(id);

		if (emailAddress != '' && emailAddress != null && emailAddress != undefined && emailAddress.includes('@ixds.com')){
			payloads.push([id, emailAddress, _uniqueUnconfirmedDates]);
		}
	}
	return payloads;
}

exports.getUserEmailFrom10KUserID = async(id) => {
	this.requestOptions.uri = `${baseUri}users/${id}`;
	let user;
	return new Promise(
		(resolve,reject) => {
			rp(this.requestOptions)
				.then(response => {
					user = JSON.parse(response.body);
				})
				.catch(err => {
					console.log('Error in getUserEmailBy10KUserID(): ' + err)
					reject(err);
				})
				.finally(function(){
					resolve(user.email)
				})
		}
	)
}

let today = () => {
	let d = new Date(),
	month = '' + (d.getMonth() + 1),
	day = '' + d.getDate(),
	year = d.getFullYear();
	if (month.length < 2){month = '0' + month};
	if (day.length < 2){day = '0' + day};
	return [year, month, day].join('-');
}

let sevenDaysAgo = () => {
	let d = new Date(),
	sevenDaysAgo = new Date(d.getTime() - (7 * 24 * 60 * 60 * 1000)),
	month = '' + (sevenDaysAgo.getMonth() + 1),
	day = '' + sevenDaysAgo.getDate(),
	year = sevenDaysAgo.getFullYear();
	if (month.length < 2){month = '0' + month};
	if (day.length < 2){day = '0' + day};
	return [year, month, day].join('-');
}