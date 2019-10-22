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

const getEntryIdentifiers = (entries, includeScheduledHours = false) => {
	let identifiers = [];
	for (let e of entries){
		let identifier = {};
		identifier.date = e.date;
		identifier.user_id = e.user_id;
		identifier.assignable_id = e.assignable_id;
		if (includeScheduledHours){
			identifier.scheduled_hours = e.scheduled_hours;
		}
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

exports.getWeeklyEntries = () => {
	requestOptions.uri = uriToCheckWeeklyTimeEntries();
	return rp(requestOptions)
}

exports.constructPayloads = async(allWeeklyEntries, unconfirmedEntryIdentifiers) => {

	let activeIds = getActiveIds(allWeeklyEntries);
	let payloads = [];

	for (let id of activeIds){
		if (_.filter(unconfirmedEntryIdentifiers, {'user_id': id }).length > 0){
			let emailAddress = await getUserEmailFrom10KUserID(id);
			let suggestions = [];
			for (let entry of _.filter(unconfirmedEntryIdentifiers, {'user_id': id })){
				entry = appendScheduledHoursToUnconfirmedEntryIdentifier(entry, allWeeklyEntries);
				entry.date = makeDateReadable(entry.date);
				entry.assignable_name = await this.getAssignableNameFromAssignableId(entry.assignable_id)
				suggestions.push({
					'date': entry.date,
					'assignable_id': entry.assignable_id,
					'assignable_name': entry.assignable_name,
					'scheduled_hours': entry.scheduled_hours
				});
			}
			if (emailAddress != '' && emailAddress != null && emailAddress != undefined && emailAddress.includes('@ixds.com')){
				payloads.push({
					'emailAddress': emailAddress,
					'suggestions': suggestions
				});
			}
		}
	}
	return payloads;
}

const appendScheduledHoursToUnconfirmedEntryIdentifier = (unconfirmedEntryIdentifier, allWeeklyEntries) => {
	let match = _.find(allWeeklyEntries, unconfirmedEntryIdentifier);
	unconfirmedEntryIdentifier.scheduled_hours = match.scheduled_hours;
	return unconfirmedEntryIdentifier;
}

exports.getUnconfirmedEntryIdentifiers = async(weeklyEntries) => {
	let suggestionsAndConfirmations = getWeeklySuggestionsAndConfirmations(weeklyEntries);
	let suggestionIdentifiers = getEntryIdentifiers(suggestionsAndConfirmations.suggestions);
	let confirmationIndentifiers = getEntryIdentifiers(suggestionsAndConfirmations.confirmations);
	let unconfirmedEntryIdentifiers = _.differenceWith(suggestionIdentifiers, confirmationIndentifiers, _.isEqual);
	return unconfirmedEntryIdentifiers;
}


exports.postEntry = async() => {

	let options = {
		method: 'POST',
		resolveWithFullResponse: true,
		uri: 'https://api.10000ft.com/api/v1/users/496565/time_entries',
		headers: {
			'cache-control': 'no-store',
			'content-type': 'application/json',
			'auth': `${process.env.TENK}`
		},
		body: {
			'assignable_id': '2514677',
			'date': `2019-10-15`,
			'hours': 8.0,
		},
		json: true
	}

	return new Promise(
		(resolve,reject) => {
			rp(options)
				.then(response => {
					console.log(response.body);
				})
				.catch(err => {
					console.log('Error in postEntry(): ' + err)
					reject(err);
				})
				.finally(function(){
					console.log('Posted time entry.');
				})
		}
	)
}


exports.getAssignableNameFromAssignableId = async(assignableId) => {
	// let uri = baseUri + 'projects/' + assignableId;
	let uri = baseUri + 'assignables/' + assignableId;
	let options = {
		method: 'GET',
		resolveWithFullResponse: true,
		uri: `${uri}`,
		headers: {
			'cache-control': 'no-store',
			'content-type': 'application/json',
			'auth': `${auth}`
		}
	};
	return new Promise(
		(resolve,reject) => {
			rp(options)
				.then(response => {
					let body = JSON.parse(response.body);
					resolve(body.name);
				})
				.catch(err => {
					console.log('Error caught in Promise returned from getProjectNameFromAssignableId(): ' + err)
					reject(err);
				})
				.finally(function(){
					// console.log('');
				})
		}
	)
}