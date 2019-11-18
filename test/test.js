#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const rp = require('request-promise');
const tenK = require('../services/tenK.js');
const operands = require('./data/ISSUE_8/operands.js');

let auth = process.env.TENK;
let baseUri = 'https://api.10000ft.com/api/v1/';

const getUnconfirmedEntryIdentifiers = (weeklyEntries) => {
	let suggestionsAndConfirmations = getWeeklySuggestionsAndConfirmations(weeklyEntries);
	const hasConfirmedEntry = (suggestion) => {
		for (let confirmation of suggestionsAndConfirmations.confirmations){
			if (suggestion.assignable_id == confirmation.assignable_id && suggestion.date == confirmation.date && suggestion.user_id == confirmation.user_id){
				return false;
			}
		}
		return true;
	}
	let unconfirmedEntryIdentifiers = suggestionsAndConfirmations.suggestions.filter(hasConfirmedEntry);
	return unconfirmedEntryIdentifiers;
}

const getWeeklySuggestionsAndConfirmations = (weeklyEntries) => {
	let weeklySuggestions = [];
	let weeklyConfirmations = [];
	let suggestionsAndConfirmations = {};
	for (let e in weeklyEntries){
		if (weeklyEntries[e].is_suggestion === true){
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

const constructPayloads = async(allWeeklyEntries, unconfirmedEntryIdentifiers) => {
	let activeIds = getActiveIds(allWeeklyEntries);
	let payloads = [];
	for (let id of activeIds){
		let suggestedTimeEntriesWithThisUserId = [];
		for (let entryIdentifier of unconfirmedEntryIdentifiers){
			if (entryIdentifier.user_id == id){
				suggestedTimeEntriesWithThisUserId.push(entryIdentifier);
			}
		}
		if(suggestedTimeEntriesWithThisUserId.length > 0){
			let emailAddress = await getUserEmailFrom10KUserID(id);
			for (let suggestion of suggestedTimeEntriesWithThisUserId){
				suggestion.date = makeDateReadable(suggestion.date);
				suggestion.assignable_name = await tenK.getAssignableNameFromAssignableId(suggestion.assignable_id);	
			}
			if (emailAddress != '' && emailAddress != null && emailAddress != undefined && ( emailAddress.includes('@ixds.com') || emailAddress.includes('@ixds.de'))){
				payloads.push({
					'emailAddress': emailAddress,
					'suggestions': suggestedTimeEntriesWithThisUserId
				})
			}
		}
	}
	return payloads;
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

const getWeekdayFromYYYYMMDD = (yyyymmdd) => {
	let weekday = new Date(yyyymmdd).getDay();
	return isNaN(weekday) ? null : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][weekday];
}

const getYearFromYYYYMMDD = (yyyymmdd) => {
	let parsed = yyyymmdd.split('-');
	return(parsed[0]);
}

const getMonthFromYYYYMMDD = (yyyymmdd) => {
	let parsed = yyyymmdd.split('-');
	return(['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August','September', 'October','November', 'December'][parsed[1] - 1]);
}

const getDateFromYYYYMMDD = (yyyymmdd) => {
	let parsed = yyyymmdd.split('-');
	let date = parsed[2];
	if (date[0] == '0'){
		date = date.slice(1);
		return(date);
	}
	else{
		return(date);
	}
}

const makeDateReadable = (yyyymmdd) => {
	let weekday = getWeekdayFromYYYYMMDD(yyyymmdd);
	let year = getYearFromYYYYMMDD(yyyymmdd);
	let month = getMonthFromYYYYMMDD(yyyymmdd);
	let date = getDateFromYYYYMMDD(yyyymmdd);
	let readableDate = `${weekday} ${date}. ${month} ${year}`;
	return readableDate;
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

constructPayloads(operands.operands, getUnconfirmedEntryIdentifiers(operands.operands))

// let options = {
// 	method: 'GET',
// 	resolveWithFullResponse: true,
// 	uri: 'https://api.10000ft.com/api/v1/users/244135/time_entries?from=2019-11-09&to=2019-11-12&per_page=500&with_suggestions=true',
// 	headers: {
// 		'auth': `${process.env.TENK}`
// 	},
// }

// const logEntries = async(options) => {
//   return new Promise(
// 		(resolve,reject) => {
// 			rp(options)
// 				.then(response => {
//           let body = JSON.parse(response.body);
// 					let weeklySAndC = getWeeklySuggestionsAndConfirmations(body.data);
//           // let body = JSON.parse(response);
// 					// console.log(body.data);
// 					return weeklySAndC
// 				})
// 				.then(weeklySAndC => {
// 					// console.log(weeklySAndC);
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
// // logEntries(options);