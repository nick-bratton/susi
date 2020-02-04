require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;

getClient = async() => {
	try{
		const client = new MongoClient(`${process.env.MONGOURL}`, {
			useUnifiedTopology: true
		});
		return await client.connect();
	}
	catch(err){
		throw err;
	}
}

getSession = async(client) => {
	try{ 
		return await client.startSession();
	}
	catch(err){
		throw (err);
	}
}

exports.insert = async(doc) => {
	try{
		let client = await getClient();
		let session = await getSession(client);
		await session.withTransaction(async session => {
			const coll = client.db(`${process.env.DB}`).collection(`${process.env.COLL}`);
			await coll.insertOne(doc, session)
		})
	}
	catch(err){
		throw err;
	}
}