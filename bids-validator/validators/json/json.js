import utils from '../../utils'
import Ajv from 'ajv'
import ajvErrors from 'ajv-errors'
let ajv = new Ajv({ allErrors: true, jsonPointers: true })
ajv.addSchema(require('./schemas/common_definitions.json'))
ajv = ajvErrors(ajv)

const Issue = utils.issues.Issue

/**
 * JSON
 *
 * Takes a JSON file as a string and a callback
 * as arguments. And callsback with any errors
 * it finds while validating against the BIDS
 * specification.
 */
export default function(file, jsonContentsDict, callback) {
  // primary flow --------------------------------------------------------------------
  let issues = []
  const potentialSidecars = utils.files.potentialLocations(file.relativePath)
  const mergedDictionary = utils.files.generateMergedSidecarDict(
    potentialSidecars,
    jsonContentsDict,
  )
  if (mergedDictionary) {
    issues = issues.concat(checkUnits(file, mergedDictionary))
    issues = issues.concat(compareSidecarProperties(file, mergedDictionary))
  }
  callback(issues, mergedDictionary)
}

// individual checks ---------------------------------------------------------------

function checkUnits(file, sidecar) {
  let issues = []
  const schema = selectSchema(file)
  issues = issues.concat(validateSchema(file, sidecar, schema))

  issues = issues.concat(
    checkSidecarUnits(file, sidecar, { field: 'RepetitionTime', min: 100 }, 2),
  )

  issues = issues.concat(
    checkSidecarUnits(file, sidecar, { field: 'EchoTime', min: 1 }, 3),
  )
  issues = issues.concat(
    checkSidecarUnits(file, sidecar, { field: 'EchoTime1', min: 1 }, 4),
  )
  issues = issues.concat(
    checkSidecarUnits(file, sidecar, { field: 'EchoTime2', min: 1 }, 4),
  )
  issues = issues.concat(
    checkSidecarUnits(file, sidecar, { field: 'TotalReadoutTime', min: 10 }, 5),
  )

  return issues
}

const compareSidecarProperties = (file, sidecar) => {
  const issues = []

  // check that EffectiveEchoSpacing < TotalReadoutTime
  if (
    sidecar.hasOwnProperty('TotalReadoutTime') &&
    sidecar.hasOwnProperty('EffectiveEchoSpacing') &&
    sidecar['TotalReadoutTime'] < sidecar['EffectiveEchoSpacing']
  ) {
    issues.push(
      new Issue({
        file: file,
        code: 93,
      }),
    )
  }
  return issues
}

// TODO: add /events.json schema loading/validation
const selectSchema = file => {
  let schema = null
  if (file.name) {
    if (file.name.endsWith('participants.json')) {
      schema = require('./schemas/data_dictionary.json')
    } else if (
      file.name.endsWith('bold.json') ||
      file.name.endsWith('sbref.json')
    ) {
      schema = require('./schemas/bold.json')
    } else if (file.name.endsWith('asl.json')) {
      schema = require('./schemas/asl.json')
    } else if (file.relativePath === '/dataset_description.json') {
      schema = require('./schemas/dataset_description.json')
    } else if (file.name.endsWith('meg.json')) {
      schema = require('./schemas/meg.json')
    } else if (file.name.endsWith('ieeg.json')) {
      schema = require('./schemas/ieeg.json')
    } else if (file.name.endsWith('eeg.json')) {
      schema = require('./schemas/eeg.json')
    } else if (
      file.relativePath.includes('/meg/') &&
      file.name.endsWith('coordsystem.json')
    ) {
      schema = require('./schemas/coordsystem_meg.json')
    } else if (
      file.relativePath.includes('/ieeg/') &&
      file.name.endsWith('coordsystem.json')
    ) {
      schema = require('./schemas/coordsystem_ieeg.json')
    } else if (
      file.relativePath.includes('/eeg/') &&
      file.name.endsWith('coordsystem.json')
    ) {
      schema = require('./schemas/coordsystem_eeg.json')
    } else if (file.name.endsWith('genetic_info.json')) {
      schema = require('./schemas/genetic_info.json')
    } else if (
      file.name.endsWith('physio.json') ||
      file.name.endsWith('stim.json')
    ) {
      schema = require('./schemas/physio.json')
    }
  }
  return schema
}

const errorKeywordIgnore = ['if', 'not']

const validateSchema = (file, sidecar, schema) => {
  const issues = []
  if (schema) {
    const validate = ajv.compile(schema)
    const valid = validate(sidecar)
    if (!valid) {
      /*
      validate.errors.map(error => {
        console.log("----------------------")
        console.log(error)
        if (error.params.errors) {
          console.log(error.params.errors[0])
        }
      })
      */
      let errors = validate.errors.filter(
        error => !errorKeywordIgnore.includes(error.keyword),
      )
      errors.map(error => {
        if (error.message === 'RECOMMENDED') {
          issues.push(
            new Issue({
              file: file,
              code: 194,
              evidence: error.params.errors[0].params.missingProperty,
            }),
          )
        } else if (error.message === 'PROHIBITED') {
          issues.push(
            new Issue({
              file: file,
              code: 195,
              evidence: error.params.errors[0].params.propertyName,
            }),
          )
        } else {
          issues.push(
            new Issue({
              file: file,
              code: 55,
              evidence: error.dataPath + ' ' + error.message,
            }),
          )
        }
      })
    }
  }
  return issues
}

const checkSidecarUnits = (file, sidecar, fieldObj, errCode) => {
  const issues = []
  const field = fieldObj.field
  const min = fieldObj.min
  if (sidecar.hasOwnProperty(field) && sidecar[field] > min) {
    issues.push(
      new Issue({
        code: errCode,
        file: file,
      }),
    )
  }
  return issues
}
