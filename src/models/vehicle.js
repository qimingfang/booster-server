import mongoose from 'mongoose'
import uuid from 'node-uuid'

const VehicleSchema = new mongoose.Schema({
  _id: {
    type: String,
    unique: true,
    default: uuid.v4
  },
  make: String,
  model: String,
  year: Number
})

module.exports = mongoose.model('Vehicle', VehicleSchema)
