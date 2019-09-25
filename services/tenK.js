const rp = require('request-promise');

const cred = require('../private/credentials.json');

exports.requestOptions = {
	method: 'GET',
	resolveWithFullResponse: true,
	uri: 'https://vnext-api.10000ft.com/api/v1/',
	headers: {
		'cache-control': 'no-cache',
		'content-type': 'application/json',
		'auth': `${cred.vnext_token}`,
		'per-page': 80,
	},
}

exports.uriToCheckWeeklyTimeEntries = () => {
	let uri = "https://vnext-api.10000ft.com/api/v1/time_entries?from=";
	uri += sevenDaysAgo() + "&to=" + today();
	return uri;
}

exports.getWeeklyTimeEntries = () => {
	this.requestOptions.uri = this.uriToCheckWeeklyTimeEntries();
	return rp(this.requestOptions)
}

exports.getUserIdsWithUnconfirmedEntries = (response) => {
	let ids = [];
	let uniqueIds, _uniqueIds;
	let entries = JSON.parse(response.body);
	for (let entry in entries.data){
		if(!entries.data[entry].is_suggestion){								// change this to check true, not false, before production
			ids.push(entries.data[entry].user_id);
		}
	}
	// Sets intrinsically remove duplicate entries...
	uniqueIds = new Set(ids);
	// Bbt we want to return an array:
	_uniqueIds = Array.from(uniqueIds);
	return _uniqueIds
}

exports.getUserEmailFrom10KUserID = (id) => {
	this.requestOptions.uri = `https://vnext-api.10000ft.com/api/v1/users/${id}`;
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