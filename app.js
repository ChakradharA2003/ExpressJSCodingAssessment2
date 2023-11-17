const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
app.use(express.json());
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const jwt = require("jsonwebtoken");
const filePath = path.join(__dirname, "twitterClone.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    (db = await open({
      filename: filePath,
      driver: sqlite3.Database,
    })),
      app.listen(3000, () => {
        console.log("Server is running at port 3000");
      });
  } catch (error) {
    console.log(`DB Error - ${error.message}`);
  }
};
initializeDBAndServer();

//API 1
app.post("/register/", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const checkInDbQuery = `SELECT * FROM user WHERE username='${username}';`;
  const checkInDb = await db.get(checkInDbQuery);
  if (checkInDb === undefined) {
    if (password.length < 6) {
      response.status(400);
      response.send("Password is too short");
    } else {
      const hashedPassword = bcrypt.hash(password, 15);
      const addUserQuery = `INSERT INTO user (name,username,password,gender) VALUES ('${name}','${username}','${hashedPassword}','${gender}');`;
      const addedUser = await db.run(addUserQuery);
      response.status(200);
      response.send("User created successfully");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//API 2
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const checkUserAccQuery = `SELECT * FROM user WHERE username = '${username}';`;
  const checkUserAcc = await db.get(checkUserAccQuery);
  if (checkUserAcc === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const checkPassword = await bcrypt.compare(password, checkUserAcc.password);
    if (checkPassword === true) {
      const jwtToken = jwt.sign(username, "secret_key");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

const authenticate = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let token;
  if (authHeader !== undefined) {
    token = authHeader.split(" ")[1];
  }
  if (token === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(token, "secret_key", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload;
        next();
      }
    });
  }
};

//API 3
app.get("/user/tweets/feed/", authenticate, async (request, response) => {
  const { username } = request;
  const dbQuery = `SELECT username,tweet,date_time FROM user INNER JOIN tweet ON user.user_id=tweet.user_id WHERE tweet.user_id = (SELECT following_user_id FROM follower WHERE follower_user_id = (SELECT user_id FROM user WHERE username='${username}')) ORDER BY tweet.date_time DESC LIMIT 4 OFFSET 0;`;
  const dbResponse = await db.all(dbQuery);
  response.send(dbResponse);
});

//API 4
app.get("/user/following/", authenticate, async (request, response) => {
  let { username } = request;
  console.log(username);
  const dbQuery = `SELECT username FROM user WHERE user_id = (SELECT following_user_id FROM follower WHERE follower_user_id= (SELECT user_id FROM user WHERE username='${username}'));`;
  const dbResponse = await db.all(dbQuery);
  response.send(dbResponse);
});

//API 5
app.get("/user/followers/", authenticate, async (request, response) => {
  let { username } = request;
  const dbQuery = `SELECT username FROM user WHERE user_id = (SELECT follower_user_id FROM follower WHERE following_user_id= (SELECT user_id FROM user WHERE username='${username}'));`;
  const dbResponse = await db.all(dbQuery);
  response.send(dbResponse);
});

//API 6
app.get("/tweets/:tweetId/", authenticate, async (request, response) => {
  const { tweetId } = request.params;
  const { username } = request;
  const dbQuery = `SELECT tweet,COUNT(like_id) AS likes,COUNT(reply_id) AS replies,date_time FROM tweet INNER JOIN like ON tweet.user_id=like.user_id INNER JOIN reply ON tweet.user_id=reply.user_id WHERE tweet.tweet_id=${tweetId} AND tweet.user_id=(SELECT following_user_id FROM follower WHERE follower_user_id=(SELECT user_id FROm user WHERE username='${username}'));`;
  const dbResponse = await db.get(dbQuery);
  if (dbResponse === undefined) {
    response.status(401);
    response.send("Invalid Request");
  } else {
    response.send(dbResponse);
  }
});

//API 7
app.get('/tweets/:tweetId/likes/',authenticate,async(request,response)=>{
    const {tweetId} = request.params;
    const {username} = request;
    const dbQuery = `SELECT username FROM user WHERE user_id = (SELECT user_id FROM like WHERE user_id = (SELECT following_user_id FROM follower WHERE follower_user_id = (SELECT user_id FROM user WHERE username = '${username}')));`
});
