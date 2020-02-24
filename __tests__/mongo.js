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


describe('Message', () => {

  it('should return a Message document with 4 props of some type', () => {
    let doc = new mongo.Message(messagePayload)
    expect(doc.document).toMatchObject({
      date: expect.any(String),
      usersMessaged: expect.anything(),
      totalUsers: expect.anything(),
      messages: expect.any(Array)
    })
  })

  it('length of this.messages should be length of this.amtUsersMessaged', () => {
    let p = {
      messages: new Array(10),
      metadata: {
        usersMessaged: 10,
        totalUsers: 20
      }
    };
    let doc = new mongo.Message(p);
    expect(doc.document.usersMessaged).toBe(p.messages.length);
  })
})



describe('Submission', () => {

  it('should return a Submission document with 3 props of some type', () => {
    let doc = new mongo.Submission(submissionPayload.payload, submissionPayload.error);
    expect(doc.document).toMatchObject({
      date: expect.any(String),
      payload: expect.anything(),
      error: undefined
    });
  })
  
  it('should return a Submission document with a defined error', ( ) => {
    let payload = submissionPayload;
    payload.error = 'Some error';
    let doc = new mongo.Submission(payload, payload.error);
    expect(doc.document).toMatchObject({
      date: expect.any(String),
      payload: expect.anything(),
      error: `${payload.error}`
    });
  })

})