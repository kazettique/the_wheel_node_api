const mysql = require('mysql')
const express = require('express')
const bodyparser = require('body-parser')
const moment = require('moment-timezone')
const multer = require('multer')
const fs = require('fs')
const cors = require('cors')
const uuidv4 = require('uuid/v4')
const router = express.Router()

// 查看 HTTP HEADER 的 Content-Type: application/x-www-form-urlencoded
router.use(bodyparser.urlencoded({ extended: false }))

// 查看 HTTP HEADER 的 Content-Type: application/json
router.use(bodyparser.json())

var whitelist = [
  'http://localhost:5000',
  'http:// 192.168.1.111:5000',
  undefined,
  'http://localhost:3000',
]
var corsOptions = {
  credentials: true,
  origin: function(origin, callback) {
    console.log('origin: ' + origin)
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
}
router.use(cors(corsOptions))

var mysqlConnection = mysql.createConnection({
  host: 'localhost',
  user: 'clifford',
  password: '12345',
  database: 'the_wheel',
  multipleStatements: true,
})

mysqlConnection.connect(err => {
  if (!err) console.log('DB connection succeded')
  else
    console.log(
      'DB connection failed \n Error:' + JSON.stringify(err, undefined, 2)
    )
})

//拿到所有商品資料
// app.get('/product', (req, res) => {
//   mysqlConnection.query('SELECT*FROM prouduct', (err, rows, fields) => {
//     if (!err) res.send(rows)
//     else console.log(err)
//   })
// })

router.get('/product', (req, res) => {
  // let per_page = req.body.per_page //5
  //console.log(req.query.page)
  let page = req.query.page * 5 //1

  //let per_page = 1
  let limit = `LIMIT ${page}, 5`
  let sql = `SELECT * FROM prouduct ` + limit
  console.log(sql)

  mysqlConnection.query(sql, (err, rows) => {
    if (!err) res.send(rows)
    else console.log(err)
  })
})

router.get('/prouductcarousel', (req, res) => {
  mysqlConnection.query('SELECT*FROM prouductcarousel', (err, rows, fields) => {
    if (!err) res.send(rows)
    else console.log(err)
  })
})

//拿到一個商品的資料
router.get('/product/:id', (req, res) => {
  mysqlConnection.query(
    'SELECT * FROM prouduct WHERE p_sid = ?',
    [req.params.id],
    (err, rows, fields) => {
      // if (!err) {
      //   let photos = JSON.parse(rows[0].p_photo)
      //   photos = photos.map(val => {
      //     return val
      //   })
      //   rows[0].photos = photos

      //   console.log(photos)
      //   res.send(JSON.stringify(rows[0]))
      // } else console.log(err)

      if (!err) res.send(rows)
      else console.log(err)
    }
  )
})

//拿到會員商品的定單
router.get('/orders/:id', (req, res) => {
  mysqlConnection.query(
    'SELECT * FROM orders WHERE id = ?',
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send(rows)
      else console.log(err)

      // if (!err) res.send(rows)
      // else console.log(err)
    }
  )
})

//上傳訂購單資料

router.post('/checkout', (req, res) => {
  console.log(req.body.id)
  mysqlConnection.query(
    `INSERT INTO orders (id, cart, pay, delivery, totalprice) VALUES (${
      req.body.id
    }, '${req.body.cart}', '${req.body.pay}', '${req.body.delivery}', ${
      req.body.totalprice
    })`,
    (error, result) => {
      if (!error) {
        res.json({ success: true })
      } else {
        console.log(error)
      }
    }
  )
})

//搜尋商品

router.post('/search', (req, res) => {
  //車種on
  let type = req.body.type
  // console.log(req)
  //部件
  let genre = req.body.genre
  //搜尋字
  let filter = req.body.filter
  let sql = `SELECT*FROM prouduct`
  // let sql = `SELECT * FROM prouduct WHERE p_genre='${type}'`
  if (type === null && genre === null && filter === null) {
    sql = `SELECT*FROM prouduct`
  }
  if (type) {
    console.log('has type')
    sql = `SELECT * FROM prouduct WHERE p_genre = '${type}'`
    console.log(sql)
  }
  if (genre) {
    console.log('has genre')
    sql = `SELECT * FROM prouduct WHERE p_genre2='${genre}'`
  }
  if (filter) {
    console.log('has filter')
    sql = `SELECT * FROM prouduct WHERE p_name LIKE '%${filter}%'`
  }
  if (type && filter) {
    sql = `SELECT * FROM prouduct WHERE p_genre='${type}' AND p_name LIKE '%${filter}%'`
  }
  if (type && genre) {
    sql = `SELECT * FROM prouduct WHERE p_genre='${type}' AND  p_genre2='${genre}'`
  }
  if (genre && filter) {
    sql = `SELECT * FROM prouduct WHERE p_genre2='${genre}' AND p_name LIKE '%${filter}%'`
  }

  // let page = req.query.page * 5 //1

  // //let per_page = 1
  // let limit = `LIMIT ${page}, 5`
  // let sql = `SELECT * FROM prouduct ` + limit
  // console.log(sql)

  // mysqlConnection.query(sql, (err, rows) => {
  //   if (!err) res.send(rows)
  //   else console.log(err)

  mysqlConnection.query(sql, (err, rows, fields) => {
    if (!err) res.send(rows)
    else console.log(err)
  })
})

//收藏商品
router.post("/collectionProduct",(req,res)=>{
    let collectionProduct = req.body.collectionProduct;
    let sid = req.body.sid;
    mysqlConnection.query(`UPDATE member SET c_product='${collectionProduct}' WHERE m_sid = ${sid}`,
    (error,rows)=>{
        if(rows.affectedRows >0){
            mysqlConnection.query(
                `SELECT * FROM member WHERE m_sid=${sid}`,
                (error,rows)=>{
                    res.send(rows)
                }
            )
        }
        
    })
})
router.get("/collection",(req,res)=>{
  let sid = +req.query.sid;
  console.log(req)
  // let collectionProduct = req.body.collectionProduct;
  mysqlConnection.query(`SELECT c_product FROM  member  WHERE m_sid = ${sid}`,
  (error,rows)=>{
      if (!error) res.send(rows)
      
      else console.log(error)
      
  })
})

router.get("/comment",(req,res)=>{
  let sid = req.query.sid;
  // console.log(sid)
  // let sid = 1
   let sql =`SELECT pc.p_comment_sid, pc.p_comment, m.m_name FROM prouduct_comment AS pc LEFT JOIN member AS m ON m.m_sid = pc.m_sid LEFT JOIN prouduct AS p ON p.p_sid = pc.p_sid WHERE p.p_sid = '${sid}'`;
    console.log(sql)
   mysqlConnection.query(sql, (err, rows, fields) => {
    if (!err) res.send(rows)
    else console.log(err)
    console.log(rows)
  })
})


router.post('/NEWcomment',(req,res)=>{
  let p_sid = req.body.p_sid
  let m_sid = req.body.m_sid
  let p_comment = req.body.p_comment
  // let sql= `INSERT INTO prouduct_comment SET p_sid='${p_sid}' AND m_sid='${m_sid}' AND p_comment='${p_comment}'`;
  let sql =`INSERT INTO prouduct_comment (p_sid, m_sid, p_comment) VALUES ('${p_sid}','${m_sid}','${p_comment}')`
  console.log(req)
  mysqlConnection.query(sql, (err, rows, fields) => {
    if (!err) res.send(rows)
    else console.log(err)
  })
})
//
//"SELECT rc.`r_c_sid`, rc.`r_c`, m.`m_name`, m.`m_photo`, rc.`r_c_time`, a.`name` FROM`route_comment` AS rc LEFT JOIN member AS m ON m.`m_sid` = rc.`m_sid` LEFT JOIN`admin` AS a ON a.`id` = rc.`m_sid` LEFT JOIN`route`AS r ON r.`r_sid` = rc.`r_sid` WHERE r.`r_sid` = ?";

//rc 宣告留言那張表的稱
//SELECT rc.`r_c_sid`, rc.`r_c`, m.`m_name`, m.`m_photo`, rc.`r_c_time`, a.`name` FROM`route_comment` AS rc
//m是meber那張表
//LEFT JOIN member AS m ON m.`m_sid` = rc.`m_sid`
//r是路線那張表
//LEFT JOIN`route`AS r ON r.`r_sid` = rc.`r_sid` WHERE r.`r_sid` = ?";
    module.exports = router
