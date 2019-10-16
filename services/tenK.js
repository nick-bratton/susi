#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const rp = require('request-promise');
const _ = require('lodash');

let baseUri = 'https://api.10000ft.com/api/v1/';
let auth = process.env.TENK;

// if (process.env.MODE == 'dev'){
// 	baseUri = 'https://vnext-api.10000ft.com/api/v1/';
// 	auth = process.env.VNEXT;
// }

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

let yesterday = () => {
	let d = new Date(),
	month = '' + (d.getMonth() + 1),
	day = '' + d.getDate() - 1,
	year = d.getFullYear();
	if (month.length < 2){month = '0' + month};
	if (day.length < 2){day = '0' + day};
	return [year, month, day].join('-');
}

let eightDaysAgo = () => {
	let d = new Date(),
	eightDaysAgo = new Date(d.getTime() - (8 * 24 * 60 * 60 * 1000)),
	month = '' + (eightDaysAgo.getMonth() + 1),
	day = '' + eightDaysAgo.getDate(),
	year = eightDaysAgo.getFullYear();
	if (month.length < 2){month = '0' + month};
	if (day.length < 2){day = '0' + day};
	return [year, month, day].join('-');
}

let uriToCheckWeeklyTimeEntries = () => {
	let uri = `${baseUri}` + 'time_entries?from=';
	uri += eightDaysAgo() + '&to=' + yesterday() + '&per_page=500&with_suggestions=true';
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

const getEntryIdentifiers = (entries) => {
	let identifiers = [];
	for (let e of entries){
		let identifier = {};
		identifier.date = e.date;
		identifier.user_id = e.user_id;
		identifier.assignable_id = e.assignable_id;
		identifiers.push(identifier);
	}
	return identifiers;
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

const convertYYYYMMDDToNumber = (yyyymmdd) => {
	yyyymmdd = yyyymmdd.split('-');
	return Number(yyyymmdd[2]+yyyymmdd[1]+yyyymmdd[0]);
}

const sortDatesTemporally = (dates) => {
	dates.sort(function(a,b){
		return convertYYYYMMDDToNumber(a) - convertYYYYMMDDToNumber(b);
	});
}

exports.getWeeklyEntries = () => {
	requestOptions.uri = uriToCheckWeeklyTimeEntries();
	return rp(requestOptions)
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
			sortDatesTemporally(dates);
			for (let entry of dates){
				makeDateReadable(entry);
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
	let suggestionIdentifiers = getEntryIdentifiers(suggestionsAndConfirmations.suggestions);
	let confirmationIndentifiers = getEntryIdentifiers(suggestionsAndConfirmations.confirmations);
	let unconfirmedEntries = _.differenceWith(suggestionIdentifiers, confirmationIndentifiers, _.isEqual);
	return unconfirmedEntries;
}