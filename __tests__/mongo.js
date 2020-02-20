const mongo = require('../services/mongo');

let messages = [];

let metadata = {
  usersMessaged: 0,
  totalUsers: 5
}

let payload = {
  messages: messages, 
  metadata: metadata
}

it('should return a document with four properties of some type', () => {
  let message = new mongo.Message(payload)
  expect(message.document).toMatchObject({
    date: expect.any(String),
    usersMessaged: expect.anything(),
    totalUsers: expect.anything(),
    messages: expect.any(Array)
  })
})