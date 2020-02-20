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

/*exports.insert = async(doc) => {
	try{
		let client = await getClient();
		let session = await getSession(client);
		await session.withTransaction(async session => {
			const coll = client.db(`${process.env.DB}`).collection(`${process.env.COLL}`);
			await coll.insertOne(doc, session)
		})
	}
	catch(err){
		throw new Error(err);
	}
}*/




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
			payload: payload,
			error: error
		}
	}
}



class Message {
	constructor(payload){
		this.collection = 'messages';
		this.payload = payload;
	}
	get document(){
		try{
			var usersMessaged = this.payload.length;
			var totalUsers = tenK.getActiveIds(await tenK.getWeeklyEntries()).length;
		}
		catch(err){

		}
		finally{
			return {
				date: Date().toString(),
				usersMessaged: usersMessaged ? usersMessaged : undefined, 
				totalUsers: totalUsers ? totalUsers : undefined,
				messages: this.payload
			}
		}
	}
}



exports.Submission = Submission;
exports.Message = Message;