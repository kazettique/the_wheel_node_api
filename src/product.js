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
  user: 'ivi',
  password: 'admin1123',
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

    module.exports = router
