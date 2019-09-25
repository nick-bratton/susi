const cred = require('../private/credentials.json');
const { WebClient } = require('@slack/web-api');
const Slack = new WebClient(cred.slackbot_token);

exports.messageUserByEmailAddress = (address) => {
	return new Promise(async function(resolve, reject){
		await Slack.users.lookupByEmail({
			email: `${address}`
		}).then(user => {
			postMessageBySlackId(user.user.id);
			resolve(user.user.id);
		})
		.catch(err => {
			console.log('Error in getSlackIdByEmailAddress(): ' + err);
			reject(err);
		})
	})
}

const postMessageBySlackId = async(id) => {
	await Slack.chat.postMessage({
		channel: `${id}`,
		text: `Please confirm your hours on 10000ft for this week: https://app.10000ft.com/me/tracker`,
		as_user: true // this way it comes from 'Susi' and not 'Slackbot'
	});							// but i'm not sure exactly how/why
}