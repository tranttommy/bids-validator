import utils from '../../utils'

/* Stub for starting work on this validator. */
const validate = (files, fileList) => {
  let issues = []
  const derivativesPromises = files.map(function(file) {
    return utils.limit(
      () =>
        new Promise((resolve, reject) => {
          resolve()
        }),
    )
  })
  return Promise.all(derivativesPromises).then(() => issues)
}

export default validate
