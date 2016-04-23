import express from 'express'
import mongoose from 'mongoose'
import bodyParser from 'body-parser'
import jsonfile from 'jsonfile'
import { Promise } from 'es6-promise'

import Vehicle from './models/vehicle'
import {INFO, count, insert, find, findOne, remove} from './common'
import secrets from './configs/secrets'

export const app = express()

mongoose.Promise = Promise
mongoose.connect(secrets.mongo, function (err, res) {
  if (err) {
    INFO('Error connecting to: ' + secrets.mongo + '. ' + err)
  } else {
    INFO('Succeeded connected to: ' + secrets.mongo)
  }
})

// TODO: send these logs to LogEntries or Loggly
// TODO: set up monitoring for these
function logError (err) {
  console.log(err)
}

function handleError (err, res) {
  // TODO: log errors here and pipe into slack / pager duty
  logError(err)
  return res.sendStatus(500)
}

app.use(bodyParser.json())

/**
 * Removes a vehicle by id (supplied in body)
 */
app.delete('/vehicles', (req, res) => {
  const id = req.body.id
  if (!id) {
    return res.sendStatus(403).send({ error: 'Expected \'id\' to be in the params' })
  }

  return remove(Vehicle, { _id: req.body.id })
    .then(() => res.sendStatus(200))
    .catch((err) => handleError(err, res))
})

/**
 * Adds a vehicle by info
 */
app.put('/vehicles', (req, res) => {
  console.log('put request')

  const vehicle = req.body.vehicle
  if (!vehicle) {
    return res.status(403).send({ error: 'Expected \'vehicle\' to be in the params' })
  }
  console.log('vehicle')

  const {make, model, year} = vehicle
  if (!make || !/^[\w\d]+/.test(make) || !model || !/^[\w\d]+/.test(model) || !year || !/^\d{4}$/.test(year)) {
    return res.status(400).send({ error: 'Invalid input. Please double check.' })
  }

  return findOne(Vehicle, { make, model, year })
  .then((vehicle) => {
    if (vehicle) {
      // throw 430 when a vehicle exists with the supplied make/model/year
      return res.sendStatus(430)
    }

    return insert(new Vehicle({make, model, year}))
      .then(() => res.sendStatus(200))
  })
  .catch((err) => handleError(err, res))
})

/**
 * Search vehicles via fuzzy search.
 *
 * Basic search goes like:
 * 1) Parse input string into tokens, group tokens that match year regex into one group, everything
 * else into another group
 * 2) For all non-year token pairs, generate a query option matching one as make and other as model
 * 3) For all year tokens, generate a query option matching that against year
 * 4) Combine the make/model query with the year query, issue to get JSON result
 */
app.post('/vehicles', (req, res) => {
  const query = req.body.query
  if (query === undefined) {
    return res.status(403).send({ error: 'Expected \'query\' to be in the params' })
  }

  // step 1
  const makeModelTokens = query.split(' ').filter((token) => {
    return !/^\d{4}$/.test(token)
  })

  // step 2
  const makeModelOptions = []
  if (makeModelTokens.length === 1) {
    const [makeOrModel] = makeModelTokens
    makeModelOptions.push({ make: new RegExp(makeOrModel, 'i') })
    makeModelOptions.push({ model: new RegExp(makeOrModel, 'i') })
  } else {
    makeModelTokens.forEach((make) => {
      makeModelTokens.forEach((model) => {
        if (make !== model) {
          makeModelOptions.push({
            make: new RegExp(make, 'i'),
            model: new RegExp(model, 'i')
          })
        }
      })
    })
  }

  // step 3
  const yearOptions = query.split(' ').filter((token) => {
    return /^\d{4}$/.test(token)
  }).map((year) => {
    return { year }
  })

  // step 4
  return find(Vehicle, { $and: [
    yearOptions.length > 0 ? { $or: yearOptions } : {},
    makeModelOptions.length > 0 ? { $or: makeModelOptions } : {}
  ]}, {}, { limit: 20 })
  .then((vehicles) => {
    return res.status(200).json(vehicles)
  })
  .catch((err) => handleError(err, res))
})

// initialize the DB if needed
count(Vehicle).then((count) => {
  return count > 0 ? Promise.resolve() : Promise.all(
    jsonfile.readFileSync('./src/data/vehicleInfo.json').map((info) => {
      return insert(new Vehicle(info))
    })
  )
})
.then(() => {
  app.listen((process.env.PORT || 3000), (err) => {
    if (err) {
      return logError(err)
    }
    console.log('server started')
  })
})
.catch((err) => handleError(err))
