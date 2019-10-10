#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const rp = require('request-promise');
const _ = require('lodash');

let baseUri = '';
let auth = '';

if (process.env.MODE == 'dev'){
	baseUri = 'https://vnext-api.10000ft.com/api/v1/';
	auth = process.env.VNEXT;
}
else if(process.env.MODE == 'pro' || process.env.MODE == 'pro_beta'){
	baseUri = 'https://api.10000ft.com/api/v1/';
	auth = process.env.TENK;
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

let requestOptions = {
	method: 'GET',
	resolveWithFullResponse: true,
	uri: `${baseUri}`,
	headers: {
		'cache-control': 'no-store',
		'content-type': 'application/json',
		'auth': `${auth}`
	},
}

let uriToCheckWeeklyTimeEntries = () => {
	let uri = `${baseUri}` + 'time_entries?from=';
	uri += sevenDaysAgo() + '&to=' + today() + '&per_page=500&with_suggestions=true';
	return uri;
}

const getUserEmailFrom10KUserID = async(id) => {
	requestOptions.uri = `${baseUri}users/${id}`;
	let user;
	return new Promise(
		(resolve,reject) => {
			rp(requestOptions)
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

exports.getWeeklyEntries = () => {
	requestOptions.uri = uriToCheckWeeklyTimeEntries();
	return rp(requestOptions)
}

const getActiveIds = (weeklyEntries) => {
	let unfilteredIds = [];
	for (let e of weeklyEntries){
		unfilteredIds.push(e.user_id);
	}
	let filteredIds = new Set(unfilteredIds);
	let activeIds = Array.from(filteredIds);
	return activeIds;
}

const getWeeklySuggestionsAndConfirmations = (weeklyEntries) => {
	let weeklySuggestions = [];
	let weeklyConfirmations = [];
	let suggestionsAndConfirmations = {};
	for (let e in weeklyEntries){
		if (weeklyEntries[e].is_suggestion == true){
			weeklySuggestions.push(weeklyEntries[e]);
		}
		else {
			weeklyConfirmations.push(weeklyEntries[e]);
		}
	}
	suggestionsAndConfirmations.suggestions = weeklySuggestions;
	suggestionsAndConfirmations.confirmations = weeklyConfirmations;
	return suggestionsAndConfirmations;
}

exports.constructPayloads = async(allWeeklyEntries, unconfirmedEntries) => {
	let activeIds = getActiveIds(allWeeklyEntries);
	let payloads = [];

	for (let id of activeIds){
		if (_.filter(unconfirmedEntries, {'user_id': id }).length > 0){
			let emailAddress = await getUserEmailFrom10KUserID(id);
			let dates = [];
			for (let entry of _.filter(unconfirmedEntries, {'user_id': id })){
				dates.push(entry.date);
			}
			if (emailAddress != '' && emailAddress != null && emailAddress != undefined && emailAddress.includes('@ixds.com')){
				payloads.push({
					'emailAddress': emailAddress,
					'dates': dates
				});
			}
		}
	}
	return payloads;
}

exports.getUnconfirmedEntries = async(weeklyEntries) => {

	let suggestionsAndConfirmations = getWeeklySuggestionsAndConfirmations(weeklyEntries);
	let suggestionIndentifiers = [];
	let confirmationIndentifiers = [];

	for (let s in suggestionsAndConfirmations.suggestions){
		let suggestion = suggestionsAndConfirmations.suggestions[s];
		let suggestionIndentifier = {};
		suggestionIndentifier.date = suggestion.date;
		suggestionIndentifier.user_id = suggestion.user_id;
		suggestionIndentifier.assignable_id = suggestion.assignable_id;
		suggestionIndentifiers.push(suggestionIndentifier);
	}
	
	for (let c in suggestionsAndConfirmations.confirmations){
		let confirmation = suggestionsAndConfirmations.confirmations[c];
		let confirmationIndentifier = {};
		confirmationIndentifier.date = confirmation.date;
		confirmationIndentifier.user_id = confirmation.user_id;
		confirmationIndentifier.assignable_id = confirmation.assignable_id;
		confirmationIndentifiers.push(confirmationIndentifier);
	}

	let unconfirmedEntries = _.differenceWith(suggestionIndentifiers, confirmationIndentifiers, _.isEqual);
	return unconfirmedEntries;
}