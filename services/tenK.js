#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const rp = require('request-promise');
const _ = require('lodash');
const slack = require('./slack.js');


let baseUri = 'https://api.10000ft.com/api/v1/';
let auth = process.env.TENK;
// if (process.env.MODE === 'dev'){
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
	let uri = `${baseUri}time_entries?from=`;
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

const constructYYYYMMDDFromReadableDate = (dateStringArray) => {
	let yyyymmdd;
	let number = dateStringArray[1];
	number = number.replace('.', '');
	let year = dateStringArray[3];
	let month = '';
	let monthLookup = {
		'January': '01',
		'February': '02',
		'March': '03',
		'April': '04',
		'May': '05',
		'June': '06',
		'July': '07',
		'August': '08',
		'September': '09',
		'October': '10',
		'November': '11',
		'December': '12'
	}
	for (let [key, value] of Object.entries(monthLookup)){
		if (key == dateStringArray[2]){
			month = value;
		}
	}
	yyyymmdd = `${year}` + '-' + `${month}` + '-' + `${number}`;
	return yyyymmdd;
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

exports.getUserIdFromUserEmail = async(payload) => {
	let userEmail = await slack.getUserEmailAddressFromUserId(payload.user.id);
	let options = {
		method: 'GET',
		resolveWithFullResponse: true,
		uri: `https://api.10000ft.com/api/v1/users?per_page=500`,
		headers: {
			'cache-control': 'no-store',
			'content-type': 'application/json',
			'auth': `${process.env.TENK}`
		}
	};
	return new Promise(
		(resolve,reject) => {
			rp(options)
				.then(response => {
					let body = JSON.parse(response.body);
					for (let user of body.data){
						if (user.email == userEmail){
							resolve(user.id);
						}
					}
				})
				.catch(err => {
					console.log('Error in getUserIdFromUserEmail(): ' + err)
					reject(err);
				})
				.finally(function(){
				})
		}
	)
}

exports.constructPostBodies = (payload) => {
	let postBodies = [];
	let submittedHoursWithBoundBlockIds = []
	for (let [key, value] of Object.entries(payload.view.state.values)) {
		submittedHoursWithBoundBlockIds.push({
			block_id: `${key}`,
			hours: `${value.plain_input.value}`
		});
	}
	for (let block of payload.view.blocks){
		let hours;
		if (block.type == 'input'){
			for (let submission of submittedHoursWithBoundBlockIds){
				if (submission.block_id == block.block_id){
					hours = submission.hours;
				}
			}
			let body = constructBodyForPOSTRequest(block.label.text, hours);
			postBodies.push(body); 
		}
	}
	return postBodies;
}

exports.postSubmissions = async(bodies, id) => {
	let uri = 'https://api.10000ft.com/api/v1/' + 'users/' + id + '/time_entries';
	await Promise.all(bodies.map(body => 
		rp({
			method: 'POST',
			uri: `${uri}`,
			headers: {
				'cache-control': 'no-store',
				'content-type': 'application/json',
				'auth': `${process.env.TENK}`
			},
			body: body,
			json: true
		}))
	)
}

const constructBodyForPOSTRequest = (metadata, hours) => {
	let body = {
		'hours': `${hours}`
	};
	let subs = metadata.split(' ');
	body.date = constructYYYYMMDDFromReadableDate(subs.slice(0,4));
	let assignable_id = subs.splice(subs.length-1)[0];
	assignable_id = assignable_id.replace('(', '');
	assignable_id = assignable_id.replace(')', '');
	body.assignable_id = assignable_id;
	return body;
}

exports.getAssignableNameFromAssignableId = async(assignableId) => {
	let uri = `${baseUri}` + 'assignables/' + assignableId;
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
				})
		}
	)
}