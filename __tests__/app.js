
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
  
  let payloads = [resolves(), rejects()]
  
  it('should resolve even if a single call to slack.messageUserAndReturnPayload rejects', () => {
    Promise.allSettled(payloads)
    .then(results => {
      console.log(results)
    })
    .then()


    expect().toBe();
  })


})