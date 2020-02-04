#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const rp = require('request-promise');
const slack = require('./slack.js');

let baseUri = 'https://api.10000ft.com/api/v1/';
let auth = process.env.TENK;

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
	let uri = `${baseUri}/time_entries?from=`;
	uri += eightDaysAgo() + '&to=' + yesterday() + '&per_page=1000&with_suggestions=true';
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
				suggestion.assignable_name = await this.getAssignableNameFromAssignableId(suggestion.assignable_id);	
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

exports.getUnconfirmedEntryIdentifiers = async(weeklyEntries) => {
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

exports.getUserIdFromUserEmail = async(payload) => {
	let userEmail = await slack.getUserEmailAddressFromUserId(payload.user.id);
	let options = {
		method: 'GET',
		resolveWithFullResponse: true,
		uri: `https://api.10000ft.com/api/v1/users?per_page=1000`,
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

const constructBodyForPOSTRequest = (payload) => {
	let body = {
		'hours': `${payload.hours}`,
		'notes': `${payload.notes}`
	};
	let subLabels = payload.label.split(' ');
	body.date = constructYYYYMMDDFromReadableDate(subLabels.slice(0,4));
	let assignable_id = subLabels.splice(subLabels.length-1)[0];
	assignable_id = assignable_id.replace('(', '');
	assignable_id = assignable_id.replace(')', '');
	body.assignable_id = assignable_id;
	return body;
}

exports.constructPostBodies = (payload) => {
	try {
		let postBodies = [];
		let entryHoursCoupledToBlockId = [];
		let entryNotesCoupledToBlockId = [];
		let entryLabelsCoupledToBlockId = [];
		let decoupledBlockIds = [];
		for (let [key, value] of Object.entries(payload.view.state.values)) {
			if (key.includes('hours')){
				let strippedKey = key.substring(0, key.length - 6);
				entryHoursCoupledToBlockId.push({
					block_id: `${strippedKey}`,
					hours: `${value.plain_input.value}`,
				});
			}
			else if (key.includes('notes')){
				let strippedKey = key.substring(0, key.length - 6);
				entryNotesCoupledToBlockId.push({
					block_id: `${strippedKey}`,
					notes: `${value.plain_input.value}`,
				});
			}
		}
		for (let block of payload.view.blocks){
			if (block.type == 'section' && block.block_id.includes('.label')){
				let strippedBlockId = block.block_id.substring(0, block.block_id.length - 6);
				let label = block.text.text.substring(1, block.text.text.length - 1);
				entryLabelsCoupledToBlockId.push({
					block_id: `${strippedBlockId}`,
					label: `${label}`,
				});
			}
		}
		entryLabelsCoupledToBlockId.forEach(entry => {
			decoupledBlockIds.push(entry.block_id);
		})
		decoupledBlockIds.forEach(id => {
			let payload = {};
			entryLabelsCoupledToBlockId.forEach(label => {if (label.block_id == id){payload.label = label.label;}});
			entryHoursCoupledToBlockId.forEach(hour => {if (hour.block_id == id){payload.hours = hour.hours;}});
			entryNotesCoupledToBlockId.forEach(note => {if (note.block_id == id){payload.notes = note.notes;}});
			let body = constructBodyForPOSTRequest(payload);
			postBodies.push(body);
		})
		return postBodies;
	}
	catch (err){
		throw new Error(err);
	}
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
	.catch(err => {
		throw new Error(err);
	})
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