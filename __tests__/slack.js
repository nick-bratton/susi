const mockLookupByEmail = (error) => {
	return new Promise( (resolve, reject) => {
		if (error){
			resolve({
				"ok": false,
				"error": "users_not_found"
			})
		}
		resolve({
			"ok": true,
			"user": {
					"id": "W012A3CDE",
					"team_id": "T012AB3C4",
					"name": "spengler",
					"deleted": false,
					"color": "9f69e7",
					"real_name": "Egon Spengler",
					"tz": "America/New_York",
					"tz_label": "Eastern Daylight Time",
					"tz_offset": -14400,
					"profile": {
							"title": "Creative Technologist",
							"phone": "",
							"skype": "",
							"real_name": "Egon Spengler",
							"real_name_normalized": "Egon Spengler",
							"display_name": "spengler",
							"display_name_normalized": "spengler",
							"status_text": "Print is dead",
							"status_emoji": ":books:",
							"status_expiration": 1502138999,
							"avatar_hash": "ge3b51ca72de",
							"first_name": "Matthew",
							"last_name": "Johnston",
							"email": "spengler@ghostbusters.example.com",
							"image_original": "https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg",
							"image_24": "https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg",
							"image_32": "https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg",
							"image_48": "https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg",
							"image_72": "https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg",
							"image_192": "https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg",
							"image_512": "https://.../avatar/e3b51ca72dee4ef87916ae2b9240df50.jpg",
							"team": "T012AB3C4"
					},
					"is_admin": true,
					"is_owner": false,
					"is_primary_owner": false,
					"is_restricted": false,
					"is_ultra_restricted": false,
					"is_bot": false,
					"is_stranger": false,
					"updated": 1502138686,
					"is_app_user": false,
					"is_invited_user": false,
					"has_2fa": false,
					"locale": "en-US"
			}
		})
	})
}

const mockPostMessageWithPayload = (error) => {
	return new Promise( (resolve,reject) => {
		if (error){
			resolve ({
				"ok": false,
				"error": "too_many_attachments"
			})
		};
		resolve({
			"ok": true,
			"channel": "C1H9RESGL",
			"ts": "1503435956.000247",
			"message": {
					"text": "Here's a message for you",
					"username": "ecto1",
					"bot_id": "B19LU7CSY",
					"attachments": [
						{
							"text": "This is an attachment",
							"id": 1,
							"fallback": "This is an attachment's fallback"
						}
					],
					"type": "message",
					"subtype": "bot_message",
					"ts": "1503435956.000247"
			}
		})
	})
}

const mockFormatPayload = (user, payload) => {
	return {
		user: {
			id: user.ok ? user.user.id : undefined,
			team_id: user.ok ? user.user.team_id : undefined,
			name: user.ok ? user.user.profile.real_name : undefined,
			title: user.ok ? user.user.profile.title : undefined,
			email: user.ok ?  user.user.profile.email : undefined
		}, 
		payload: payload
	}
}

describe('messageUserAndReturnPayload()', () => {

	it('should return user with undefined props when Slack.user.lookupByEmail() returns an error', async() => {
		
		const messageUserAndReturnPayload = async() => {
			try {
				let user = await mockLookupByEmail(true); 			// true  	-> 	error
				await mockPostMessageWithPayload(true); 				// true 	-> 	error
				return mockFormatPayload(user, {});
			}
			catch(err){
				throw new Error(err);
			}
		}

		let user = await messageUserAndReturnPayload();

		expect(user.user.id).toBeUndefined();
		expect(user.user.team_id).toBeUndefined();
		expect(user.user.name).toBeUndefined();
		expect(user.user.title).toBeUndefined();
		expect(user.user.email).toBeUndefined();
	})



	it('should return user with defined props when Slack.user.lookupByEmail() returns successfully, even if postMessage fails', async() => {
		
		let user;

		const messageUserAndReturnPayload = async() => {
			try {
				user = await mockLookupByEmail(false); 			// false  -> 	ok
				await mockPostMessageWithPayload(true); 		// true 	-> 	error
				return mockFormatPayload(user, {});
			}
			catch(err){
				throw new Error(err);
			}
		}

		let payback = await messageUserAndReturnPayload();

		expect(payback.user).toMatchObject({
			id: user.user.id,
			team_id: user.user.team_id,
			name: user.user.profile.real_name,
			title: user.user.profile.title,
			email: user.user.profile.email 
		})
	})



	// it('')

})