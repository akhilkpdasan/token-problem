# Token Problem

## Installation

1) Clone the repository
2) Change directory into the repo and install required dependencies
```
npm install
```
3) Run database migrations
```
npx knex migrate:latest
```
4) Start server
```
node index.js
```

## Available APIs
Note: I am using httpie cli available at https://httpie.io/ to test the APIs the same can be acheived using tool that supports sending GET and POST HTTP requests

1) Generate Token - Adds a new token to the token pool. Returns a unique guid
```
http localhost:3000/generate-token
```

2) Assign token - Assigns the token to a user and make it unavailable until freed
```
http localhost:3000/assign-token
```

3) Free token - Frees the the token and makes it available for assignment in the pool
```
http POST localhost:3000/free-token token=[guid]
```

4) Delete token - Permanenty removes the token from the pool
```
http POST localhost:3000/delete-token token=[guid]
```

5) Keep token alive - This request should be made every 5 mins to keep the token available in the pool
```
http POST localhost:3000/keep-alive token=[guid]
```

6) Refresh token assignment - This request should be made every 60s to keep the token assignment intact. Otherwise the token becomes available for reassignment
```
http POST localhost:3000/assignment-refresh token=[guid]
```