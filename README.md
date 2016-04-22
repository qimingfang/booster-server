Booster-Server
=====================

The server portion of the React Native demo app. This server handles three main routes:
* Adding a Vehicle
* Removing a Vehicle
* Searching for a Vehicle

### Installation
After you clone the server, be sure to
```
npm install
```
### Dependencies
The server uses Mongo as a backend data store. Be sure you have mongo running via
```
sudo mongod
```
Consider updating `src/configs/secrets` accordingly if your mongo instance has a user and a password.

### Tests
No tests yet.

### Deployment
This instance is not deployed to anywhere. To deploy it somewhere, ensure that ```MONGO_URL``` is set as an environment variable when the server is run.
