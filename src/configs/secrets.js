export default {
  env: process.env.ENV || 'dev',
  mongo: process.env.MONGO_URL || 'mongodb://localhost/booster'
}
