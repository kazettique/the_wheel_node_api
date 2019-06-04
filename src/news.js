const bodyParser = require("body-parser");
const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const moment = require("moment-timezone");
const router = express.Router();
const fs = require("fs");
const uuidv4 = require("uuid/v4");
const session = require("express-session");

var connection = mysql.createConnection({
  // host: "ec2-52-221-144-169.ap-southeast-1.compute.amazonaws.com",
  // port: 3306,
  // user: "admin1",
  // password: "iLoveayu1",
  // database: "mywheel"
  host: "localhost",
  user: "wang",
  password: "admin",
  database: "the_wheel",
  multipleStatements: true
});

connection.connect(error => {
  console.log(error);
});

//////////////NEWS////////////////////////////////////

router.get("/news_list.api", (req, res) => {
  const per_page = 7;
  let page = req.query.page;
  let type = req.query.filter;
  let search = req.query.search;
  let sql = `SELECT * FROM test WHERE disable = 0 ORDER BY sid DESC`;
  if (type) {
    sql = `SELECT * FROM test WHERE disable = 0 AND type='${type}' ORDER BY sid DESC`;
  }
  if (search) {
    sql = `SELECT * FROM test WHERE disable = 0 AND title LIKE '%${search}%' ORDER BY sid DESC`;
  }
  if (type && search) {
    sql = `SELECT * FROM test WHERE disable = 0 AND type='${type}' AND title LIKE '%${search}%' ORDER BY sid DESC`;
  }
  let limit = ` LIMIT ${(page - 1) * per_page}, ${per_page}`;

  connection.query(sql + limit, (error, results, fields) => {
    connection.query(sql, (error, result) => {
      res.json({
        data: results,
        totalPage: Math.ceil(result.length / per_page)
      });
    });
  });
});

router.get("/popular_list.api", (req, res) => {
  connection.query(
    `SELECT * FROM test WHERE disable = 0 ORDER BY views DESC LIMIT 0, 9`,
    (error, results, fields) => {
      res.send(results);
    }
  );
});

router.get("/get_article.api", (req, res) => {
  let sid = req.query.sid;
  // console.log(sid);
  connection.query(
    `SELECT * FROM test WHERE sid = ${sid}`,
    (error, results) => {
      res.send(results);
    }
  );
});

router.post("/new_comment.api", (req, res) => {
  let sid = req.body.sid;
  let comment = req.body.comment;
  connection.query(
    `UPDATE test SET comment='${comment}' WHERE sid=${sid}`,
    (error, results) => {
      res.send(results);
    }
  );
});

router.post("/views_increase.api", (req, res) => {
  let sid = req.body.sid;

  connection.query(
    `SELECT views FROM test WHERE sid=${sid}`,
    (error, results) => {
      console.log(results);
      try {
        let updatedViews = results[0].views + 1;
        connection.query(
          `UPDATE test SET views=${updatedViews} WHERE sid=${sid}`,
          (error, results) => {
            res.send(results);
          }
        );
      } catch (e) {
        e => console.log(e);
      }
    }
  );
});

router.get("/collection.api", (req, res) => {
  let sid = +req.query.sid;

  connection.query(
    `SELECT collection FROM member WHERE m_sid=${sid}`,
    (error, result) => {
      console.log(result);
      res.send(result);
    }
  );
});

router.post("/new_collection.api", (req, res) => {
  let updatedCollection = req.body.collection;
  let sid = req.body.sid;
  connection.query(
    `UPDATE member SET collection='${updatedCollection}' WHERE m_sid = ${sid}`,
    (error, result) => {
      if (result.affectedRows > 0) {
        connection.query(
          `SELECT * FROM member WHERE m_sid=${sid}`,
          (error, results) => {
            res.send(results);
          }
        );
      }
    }
  );
});
////////////////////////////////////////////////

module.exports = router;
