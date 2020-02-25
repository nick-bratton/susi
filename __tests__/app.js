
const resolves = () => {
  return new Promise( (resolve, reject) => {
    resolve({
      user: 'foo'
    })
  })
}

const rejects = () => {
  return new Promise( (resolve, reject) => {
    reject({

    })
  })
}



describe('Payloads for resolutions and rejections all collected', () => {
  
  let payloads = [resolves(), rejects()];
  
  it('should resolve even if a single call to slack.messageUserAndReturnPayload rejects', () => {
    
    let main = Promise.allSettled(payloads)
    .then(results => {
      console.log(results)
      // return {messages, metadata}
      return {
        messages: results,
        metadata: {
          usersMessaged: results.length,
          totalUsers: results.length 
        }
      }
    })

    console.log(main)


    expect(main.length).toBe(2);
  })

})