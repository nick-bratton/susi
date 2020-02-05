#!/usr/bin/env nodejs
'use strict';
require('dotenv').config()
const rp = require('request-promise');
const slack = require('./slack.js');

let baseUri, auth;

if (process.env.MODE === 'dev'){
	baseUri = 'https://vnext-api.10000ft.com/api/v1/';
	auth = process.env.VNEXT_TOKEN;
}
else {
	baseUri = 'https://api.10000ft.com/api/v1/';
	auth = process.env.TENK_TOKEN;
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
	let uri = `${baseUri}/time_entries?from=`;
	uri += eightDaysAgo() + '&to=' + yesterday() + '&per_page=1000&with_suggestions=true';
	return uri;
}


/**
 * @desc 		Gets email address associated with ID
 * @param 	String id 		(10000Ft. user ID)
 * @return	new Promise		(Resolves to String)
 */
const getUserEmailFrom10KUserID = async(id) => {
	try {
		let options = requestOptions;
		requestOptions.uri = `${baseUri}users/${id}`;
		let res = await rp(options);
		let user = JSON.parse(res.body);
		return user.email
	}
	catch(err) {
		throw new Error(err);
	}
}


/**
 * @desc 		Gets array of all IDs (without duplicates) from passed-in time entries
 * @param 	Array weeklyEntries 
 * @return 	Array
 */
const getActiveIds = (weeklyEntries) => {
	let unfilteredIds = weeklyEntries.map(entry => entry.user_id);
	let filteredIds = new Set(unfilteredIds);
	return Array.from(filteredIds);
}

/**
 * @desc 		Returns object of passed-in time entries keyed by whether or not they are confirmations
 * @param 	Array weeklyEntries
 * @return	Object
 */
const getWeeklySuggestionsAndConfirmations = (weeklyEntries) => {
	let weeklySuggestions = weeklyEntries.filter(entry => entry.is_suggestion === true);
	let weeklyConfirmations = weeklyEntries.filter(entry => entry.is_suggestion === false);
	return { suggestions: weeklySuggestions, confirmations: weeklyConfirmations }
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

/**
 * @desc 		Requests all time entries from endpoint returned by uriToCheckWeeklyTimeEntries()
 * @return 	Promise (Resolves to parsed body.data JSON object)
 */
exports.getWeeklyEntries = async() => {
	try{ 
		let options = requestOptions;
		options.uri = uriToCheckWeeklyTimeEntries();
		let res = await rp(options);
		let body = JSON.parse(res.body);
		return body.data
	}
	catch(err) {
		throw new Error(err);
	}
}

/**
 * @desc 		Generates payloads containing unconfirmed time entries per user that the slack.js service will send to team members
 * @param 	Object allWeeklyEntries								(All time entry objects returned from endpoint returned by uriToCheckWeeklyTimeEntries())
 * @param 	Object unconfirmedEntryIdentifiers		(Unconfirmed time entries returned by getUnconfirmedEntryIdentifiers())
 * @return 	new Promise 													(Resolves to Array containing n {emailAddress, suggestions} objects)
 */
exports.constructPayloads = async(allWeeklyEntries, unconfirmedEntryIdentifiers) => {
	try{
		let activeIds = getActiveIds(allWeeklyEntries);
		let payloads = [];
		for (let id of activeIds){
			let suggestedTimeEntriesWithThisUserId = unconfirmedEntryIdentifiers.filter(identifier => identifier.user_id === id);
			if(suggestedTimeEntriesWithThisUserId.length > 0){
				let emailAddress = await getUserEmailFrom10KUserID(id);
				for (let suggestion of suggestedTimeEntriesWithThisUserId){
					suggestion.date = makeDateReadable(suggestion.date);
					suggestion.assignable_name = await this.getAssignableNameFromAssignableId(suggestion.assignable_id);	
				}
				if (emailAddress !== '' && emailAddress !== null && emailAddress !== undefined && ( emailAddress.includes('@ixds.com') || emailAddress.includes('@ixds.de'))){
					payloads.push({'emailAddress': emailAddress, 'suggestions': suggestedTimeEntriesWithThisUserId})
				}
			}
		}
		return payloads;
	}
	catch(err){
		throw new Error(err);
	}
}

/**
 * @desc 		Returns an array of suggested time entries for which there are no correlated confirmed time entries
 * @param 	Object weeklyEntries 		(All time entry objects returned from endpoint returned by uriToCheckWeeklyTimeEntries())
 * @return 	Array 									(Of time entries that meet these conditions: 1. have a true "suggestion" prop; 2. have no correlated entry with false "suggestion" prop)
 */
exports.getUnconfirmedEntryIdentifiers = (weeklyEntries) => {
	let suggestionsAndConfirmations = getWeeklySuggestionsAndConfirmations(weeklyEntries);
	const hasConfirmedEntry = (suggestion) => {
		for (let confirmation of suggestionsAndConfirmations.confirmations){
			if (suggestion.assignable_id == confirmation.assignable_id && suggestion.date == confirmation.date && suggestion.user_id == confirmation.user_id){
				return false;
			}
		}
		return true;
	}
	return suggestionsAndConfirmations.suggestions.filter(hasConfirmedEntry)
}

/**
 * @desc 		Returns 10000Ft user ID from email address associated with passed-in Slack user ID
 * @param 	String slackId 			(Slack user ID)
 * @return 	new Promise 				(Resolves to String)
 */
exports.getUserIdFromUserEmail = async(slackId) => {
	try{
		let userEmail = await slack.getUserEmailAddressFromUserId(slackId);
		let options = requestOptions;
		options.uri = `${baseUri}users?per_page=1000`;
		let res = await rp(options);
		let body = JSON.parse(res.body);
		for(let user of body.data){
			if (user.email === userEmail){
				return user.id
			}
		}
	}
	catch(err) {
		throw new Error(err);
	}
}

/**
 * @desc 		Constructs HTTP body from Slack modal user input payload; to be POST-ed in postSubmissions()
 * @param 	Object payload 		(Payload defining time entry as submitted by user via Slack modal)
 * @return 	Object 						({assignable_id: String, date: String, hours: String, notes: String})
 */
const constructBodyForPOSTRequest = (payload) => {
	let body = { 'hours': `${payload.hours}`, 'notes': `${payload.notes}` };
	let subLabels = payload.label.split(' ');
	body.date = constructYYYYMMDDFromReadableDate(subLabels.slice(0,4));
	let assignable_id = subLabels.splice(subLabels.length-1)[0];
	assignable_id = assignable_id.replace('(', '');
	assignable_id = assignable_id.replace(')', '');
	body.assignable_id = assignable_id;
	return body;
}

/**
 * @desc 		Returns HTTP bodies for use as 1st arg to postSubmissions(); see spec at https://github.com/10Kft/10kft-api/blob/master/sections/time-entries.md
 * @param 	Object payload 		(Payload containing user submitted data linked to Slack modal blocks)
 * @return 	Array 						(Of one HTTP body per time entry submitted by a user via Slack modal)
 */
exports.constructPostBodies = (payload) => {
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
	decoupledBlockIds = entryLabelsCoupledToBlockId.map(label => label.block_id)
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


/**
 * @desc 		Makes a POST request to 10000Ft. to a user's time entries
 * @param 	Array bodies			(An array of objects per entry to submit as defined by spec here: https://github.com/10Kft/10kft-api/blob/master/sections/time-entries.md)
 * @param 	String id 				(User's 10000Ft. ID)
 * @return 	new Promise
 */
exports.postSubmissions = async(bodies, id) => {
	let options = requestOptions;
	options.uri = `${baseUri}users/${id}/time_entries`;
	options.method = 'POST';
	options.json = true;
	for(let body of bodies){
		options.body = body;
		try{
			await rp(options);
		}
		catch(err){
			throw new Error(err);
		}
	}
}

/**
 * @desc 		Gets name of project (or other type of assignable) by its assignable ID
 * @param 	String assignableId		(https://github.com/10Kft/10kft-api/blob/master/sections/assignables.md)
 * @return 	new Promise 					(resolves to String representation of assignable; e.g., project name)
 */
exports.getAssignableNameFromAssignableId = async(assignableId) => {
	try{
		let options = requestOptions;
		options.uri = `${baseUri}assignables/${assignableId}`;
		let res = await rp(options);
		let body = JSON.parse(res.body);
		return body.name;
	}
	catch(err){
		throw new Error(err);
	}
}