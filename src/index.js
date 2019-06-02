const mysql = require("mysql");
const express = require("express");
const bodyparser = require("body-parser");
const moment = require("moment-timezone");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const uuidv4 = require("uuid/v4");
const session = require("express-session");

var app = express();

app.use(bodyparser.urlencoded({ extended: false }));
app.use(bodyparser.json());
app.use(express.static("public"));

// ++++++++++++++++++++++++++++++++++++++++++++++
const bluebird = require("bluebird");

//========================================================
var whitelist = [
  "http://localhost:5555",
  "http:// 192.168.1.111:5555",
  undefined,
  "http://localhost:3000",
  "http://localhost:3001"
];
var corsOptions = {
  credentials: true,
  origin: function(origin, callback) {
    console.log("origin: " + origin);
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
};

app.use(cors(corsOptions));

const upload = multer({ dest: "tmp_uploads/" });

app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: "sdgdsf ;ldkfg;ld",
    cookie: {
      maxAge: 1800000
    }
  })
);

var mysqlConnection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "the_wheel",
  multipleStatements: true
});
// ++++++++++++++++++++++++++++++++++++++++++++++
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "the_wheel",
  multipleStatements: true
});
//========================================================

mysqlConnection.connect(err => {
  if (!err) console.log("DB connection succeded");
  else
    console.log(
      "DB connection failed \n Error:" + JSON.stringify(err, undefined, 2)
    );
});

// ++++++++++++++++++++++++++++++++++++++++++++++
db.connect();
bluebird.promisifyAll(db);
//========================================================

app.post("/fml", upload.none(), (req, res) => {
  res.json("FMLFMLFMLFMLFMFLMFLMFLMFLMFLMFL");
});

// ++++++++++++++++++++++++++++++++++++++++++++++
app.use("/", require("./routeNode"));
app.use("/", require("./memberNode"));
app.use("/", require("./news"));
app.use("/", require("./product"));
app.use("/", require("./courseNode"));

//========================================================

app.listen(5000, function() {
  console.log("server start port number 5000");
});
