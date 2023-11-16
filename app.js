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
        request.username = username;
        next();
      }
    });
  }
};

app.get("/user/tweets/feed/", authenticate, async (request, response) => {
  const dbQuery = `SELECT username,tweet,date_time FROM user INNER JOIN tweet ON user.user_id=tweet.user_id AS T INNER JOIN follower ON T.user_id=follower.following_user_id WHERE username.user='${username}' ORDER BY DESC LIMIT 4;`;
});
