const express = require('express');
const knex = require('knex');
const { v4: uuidv4 } = require('uuid');
const TokenExpiryService = require('./token-expiry-service').TokenExpiryService;
const TimerEnum = require('./token-expiry-service').TimerEnum;
const config = require('./knexfile').development;


const app = express();
const port = 3000;
app.use(express.json());

const database = knex(config);
const tokenExpiryService = new TokenExpiryService();

app.get('/generate-token', (_, res) => {
  const token = uuidv4();
  const timestamp = new Date().getTime();
  database('token').insert({guid: token, isAssigned: false, assignedAt: null, refreshedAt: timestamp})
    .then(() => console.log(`Generated new token: ${token}`));

  // Set timer to check for token expiry after 5 mins
  tokenExpiryService.setTokenExpiryChecker(token);

  res.send({token});
})

app.get('/assign-token', (_, res) => {
  database.select('guid').from('token').where('isAssigned', false).first()
    .then((result) => {
      if (!result) {
        // if there are no more token available in the pool we send a 404 to the user
        res.status(404).send({'message': 'No token available in the pool'});
        return;
      }

      //assigning token to user
      console.log(`Assigning token: ${result.guid}`);
      database('token').update({isAssigned: true}).where('guid', result.guid).then(() => {
        // Set timer to check for token assignment expiry
        tokenExpiryService.setTokenAssignmentChecker(result.guid);
        res.send({'token': result.guid});
      });
    })
})

app.post('/delete-token', (req, res) => {
  if (!req.body.token) {
    res.status(400).send({'message': 'Token missing'});
    return;
  }
  const token = req.body.token
  database('token')
    .where('guid', token)
    .del()
    .then(() => {
      console.log(`Deleted token: ${token}`);
      // We clear all intervals associated with that token on token deletion
      tokenExpiryService.clearTimer(token, TimerEnum.Expiry);
      tokenExpiryService.clearTimer(token, TimerEnum.Assignment);
      res.send({'message': 'Token Deleted'});
    })
})

app.post('/keep-alive', (req, res) => {
  if (!req.body.token) {
    res.status(400).send({'message': 'Token missing'});
  }

  const token = req.body.token;
  const timestamp = new Date().getTime();
  database('token')
    .where('guid', token)
    .update({'refreshedAt': timestamp})
    .then(() => {
      // We remove old timers and start a new timer to check for token expiry every 5 mins from now
      tokenExpiryService.setTokenExpiryChecker(token);
      console.log(`Update time to live for token: ${token}`);
      res.send({'message': 'Updated token time to live'});
    });
})

app.post('/assignment-refresh', (req, res) => {
  if (!req.body.token) {
    res.status(400).send({'message': 'Token missing'});
  }

  const token = req.body.token;
  const timestamp = new Date().getTime();
  database('token')
    .where('guid', token)
    .update({'assignedAt': timestamp})
    .then(() => {
      // We remove old timers and start a new timer to check for token assignment expiry every minute from now
      tokenExpiryService.setTokenAssignmentChecker(token);
      console.log(`Update token assignment expiry: ${token}`);
      res.send({'message': 'Updated token assignment expiry'});
    });
})

app.post('/free-token', (req, res) => {
  if (!req.body.token) {
    res.status(400).send({'message': 'Token missing'});
  }

  const token = req.body.token;
  database('token')
    .where('guid', token)
    .update({'isAssigned': false})
    .then(() => {
      console.log(`Token assignment removed: ${token}`)
      tokenExpiryService.clearTimer(token, tokenExpiryService.Assignment);
      res.send({'message': 'Token freed'});
    })
})

var server = app.listen(port, () => {
  console.log(`Token management app listening at http://localhost:${port}`);
})

module.exports = server;