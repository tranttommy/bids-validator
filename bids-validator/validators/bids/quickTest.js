import utils from '../../utils'
import path from 'path'
/**
 * Quick Test
 *
 * A quick test to see if it could be a BIDS
 * dataset based on structure/naming. If it
 * could be it will trigger the full validation
 * otherwise it will throw a callback with a
 * generic error.
 */
const quickTest = fileList => {
  const keys = Object.keys(fileList)
  const couldBeBIDS = keys.some(key => {
    const file = fileList[key]
    let pathName = file.relativePath
    if (pathName) {
      pathName = pathName.split(path.sep)
      pathName = pathName.reverse()

      const isCorrectModality = utils.modalities.isCorrectModality(pathName)
      let pathIsSesOrSub =
      pathName[2] &&
        (pathName[2].indexOf('ses-') == 0 || pathName[2].indexOf('sub-') == 0)

      return pathIsSesOrSub && isCorrectModality
    }
  })
  return couldBeBIDS
}

export default quickTest
