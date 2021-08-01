const knex = require('knex');
const config = require('./knexfile').development;
const database = knex(config);

var TimerEnum = {
  Expiry: "expiry",
  Assignment: "assignment"
}

var TokenExpiryService = class {

  constructor() {
    this.tokenExpiryTimers = {};
    this.tokenAssignmentTimers = {};
  }

  expireToken(token) {
    database
      .from('token')
      .select('refreshedAt')
      .where('guid', token)
      .then((result) => {

        if (result.length === 0) {
          // The token has been deleted
          return;
        }
        const refreshedAt = result[0].refreshedAt;
        const difference = new Date().getTime() - refreshedAt;

        // If token was last refreshed more than allowed mins ago we delete the
        // token from the pool
        if ((difference/1000/60) > 2) {
          database('token')
            .where('guid', token)
            .del()
            .then(() => console.log(`Deleted expired token: ${token}`));
        } else {
          this.setTokenExpiryChecker(token);
        }
      })
  }

  expireAssignment(token) {
    database
      .from('token')
      .select('assignedAt')
      .where('guid', token)
      .then((result) => {

        if (result.length === 0) {
          // The token has been deleted
          return;
        }
        const assignedAt = result[0].assignedAt;
        const difference = new Date().getTime() - assignedAt;

        // If token's assignment was last refreshed more than allowed mins ago we remove the
        // assignment from the token
        if ((difference/1000/60) > 1) {
          database('token')
            .where('guid', token)
            .update({isAssigned: false})
            .then(() => console.log(`Remove assignment for token: ${token}`));
        } else {
          this.setTokenAssignmentChecker(token);
        }
      })  
  }

  keepAliveToken(token) {
    database(token)
      .where('guid', token)
      .update({refreshedAt: new Date().getTime()});
    
    this.setTokenExpiryChecker(token);
  }

  keepAliveAssignment(token) {
    database(token)
      .where('guid', token)
      .update({assignedAt: new Date().getTime()});

    this.setTokenAssignmentChecker(token);
  }

  setTokenExpiryChecker(token) {
    // if a timer for checking the expiry this token already exists we clear it and set a new timer
    // this is done because if we get a token keep alive request we would want to clear previous
    // timers and set a new timer from this point
    this.clearTimer(token, false);
    this.tokenExpiryTimers[token] = setTimeout(this.expireToken.bind(this, token), 60000*5);
  }

  setTokenAssignmentChecker(token) {
    this.clearTimer(token, true);
    this.tokenAssignmentTimers[token] = setTimeout(this.expireAssignment.bind(this, token), 60000);
  }

  clearTimer(token, timerType) {
    if (timerType === TimerEnum.Assignment) {
      clearInterval(this.tokenAssignmentTimers[token]);
    } else if (timerType === TimerEnum.Expiry) {
      clearInterval(this.tokenExpiryTimers[token]);
    }
  }
}


module.exports = {TokenExpiryService, TimerEnum};