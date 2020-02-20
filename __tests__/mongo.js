const mongo = require('../services/mongo');

let messagePayload = {
  messages: [], 
  metadata: {
    usersMessaged: 0,
    totalUsers: 5
  }
}


let submissionPayload = {
  payload: {},
  error: undefined
}


it('should return a Message document with 4 props of some type', () => {
  let doc = new mongo.Message(messagePayload)
  expect(doc.document).toMatchObject({
    date: expect.any(String),
    usersMessaged: expect.anything(),
    totalUsers: expect.anything(),
    messages: expect.any(Array)
  })
})

it('should return a Submission document with 3 props of some type', () => {
  let doc = new mongo.Submission(submissionPayload);
  expect(doc.document).toMatchObject({
    date: expect.any(String),
    payload: expect.anything(),
    error: undefined
  });
})

// it('should return a Submission document with a defined error', ( ) => {

//   expect();
// })