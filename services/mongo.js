require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;

getClient = async() => {
	try{
		const client = new MongoClient(`${process.env.MONGO_URL}`, {
			useUnifiedTopology: true
		});
		return await client.connect();
	}
	catch(err){
		throw new Error(err);
	}
}

getSession = async(client) => {
	try{ 
		return await client.startSession();
	}
	catch(err){
		throw new Error(err);
	}
}


// does the callback to session need to be async actually?
//
exports.insert = async(doc) => {
	try{
		let client = await getClient();
		let session = await getSession(client);
		await session.withTransaction(async session => {
			let coll = client.db(`${process.env.DB}`).collection(doc.collection);
			if(doc){
				coll.insertOne(await doc.document, session);
			}
		})
	}
	catch(err){
		throw new Error(err);
	}
}



class Submission {
	constructor(payload, error){
		this.collection = 'submissions';
		this.payload = payload;
		this.error = error;
	}
	get document(){
		return {
			date: Date().toString(),
			payload: this.payload,
			error: this.error
		}
	}
}



class Message {
	constructor(payload){
		this.collection = 'messages';
		this.messages = payload.messages;
		this.amtUsersMessaged = payload.metadata.usersMessaged;
		this.totalUserCount = payload.metadata.totalUsers;
		this.usersMessagedByPercent = 100 * (payload.metadata.usersMessaged /  payload.metadata.totalUsers)
	}
	get document(){
		return {
			date: Date().toString(),
			usersMessaged: this.amtUsersMessaged, 
			totalUsers: this.totalUserCount,
			usersMessagedByPercent: this.usersMessagedByPercent,
			messages: this.messages
		}
	}
}



exports.Submission = Submission;
exports.Message = Message;