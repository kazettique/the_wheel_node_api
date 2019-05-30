const mysql = require('mysql')
const express = require('express')
const bodyparser = require('body-parser')
const moment = require('moment-timezone')
const multer = require('multer')
const fs = require('fs')
const cors = require('cors')
const uuidv4 = require('uuid/v4')
const session = require('express-session')
const router = express.Router()

// 查看 HTTP HEADER 的 Content-Type: application/x-www-form-urlencoded
router.use(bodyparser.urlencoded({ extended: false }))

// 查看 HTTP HEADER 的 Content-Type: application/json
router.use(bodyparser.json())

router.use(express.static('public'))

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

const upload = multer({ dest: 'tmp_uploads/' })

router.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: 'sdgdsf ;ldkfg;ld',
    cookie: {
      maxAge: 600000,
    },
  })
)

var mysqlConnection = mysql.createConnection({
  host: 'localhost',
  user: 'clifford',
  password: '12345',
  database: 'the_wheel',
  multipleStatements: true,
})

mysqlConnection.connect(err => {
  if (!err) console.log('DB connection succeeded')
  else
    console.log(
      'DB connection failed \n Error:' + JSON.stringify(err, undefined, 2)
    )
})

// 拿到所有課程資料
router.get('/course', (req, res) => {
  mysqlConnection.query('SELECT * FROM course', (err, rows, fields) => {
    for (let s in rows) {
      rows[s].c_courseDate = moment(rows[s].c_courseDate).format('YYYY-MM-DD')
      rows[s].c_startDate = moment(rows[s].c_startDate).format('YYYY-MM-DD')
      rows[s].c_endDate = moment(rows[s].c_endDate).format('YYYY-MM-DD')
    }

    if (!err) res.send(rows)
    else console.log(err)
  })
})

// 拿到一個課程的資料
router.get('/course/:id', (req, res) => {
  mysqlConnection.query(
    'SELECT * FROM course WHERE c_sid = ?',
    [req.params.id],
    (err, rows, fields) => {
      for (let s in rows) {
        rows[s].c_courseDate = moment(rows[s].c_courseDate).format('YYYY-MM-DD')
        rows[s].c_startDate = moment(rows[s].c_startDate).format('YYYY-MM-DD')
        rows[s].c_endDate = moment(rows[s].c_endDate).format('YYYY-MM-DD')
      }
      if (!err) res.send(rows)
      else console.log(err)
    }
  )
})

// 拿到條件過濾後的課程資料
// not done
// 時間範圍限定查詢：select * from `course` where `c_courseDate` BETWEEN '2019/08/01' AND '2019/08/31'
// 地區範圍限定查詢：select * from `course` where `c_courseLocation`='台北市'
// 難度範圍限定查詢：select * from `course` where `c_level`='入門'
// 依照時間順序排列：select * from `course` order by `c_courseDate`
// 依照地點排列：select * from `course` order by `c_courseLocation`
// 以下暫時無法使用
// 綜合搜尋：select * from `course` where `c_title` OR `c_subtitle` OR `c_intro` OR `c_coachName` OR `c_coachNationality` like '%史大巴%'
router.post('/course/search', (req, res) => {
  // 課程難度
  let search_level = req.body.search_level
  // 地區
  let search_region = req.body.search_region
  // 集資截止時間
  let search_date = req.body.search_date
  // 搜尋關鍵字
  let search_input = req.body.search_input

  let sql = `SELECT * FROM course`
  if (
    search_level === null &&
    search_region === null &&
    search_date === null &&
    search_input === null
  ) {
    sql = `SELECT * FROM course`
  }

  if (search_level || search_region || search_date || search_input) {
    let condition_1 = ''
    let condition_2 = ''
    let condition_3 = ''
    let condition_4 = ''

    if (search_level) condition_1 = `c_level = '${search_level}'`
    if (search_region) condition_2 = ` AND c_courseLocation ='${search_region}'`
    if (search_date) {
      search_date = search_date.split('-')
      let monthStart = search_date[0]
      let monthEnd = search_date[1]
      condition_3 = ` AND c_endDate BETWEEN '${monthStart}' AND '${monthEnd}'`
    }
    if (search_input)
      condition_4 = ` AND c_title LIKE '${search_input}' OR c_subtitle LIKE '${search_input}' OR c_intro LIKE '${search_input}' OR c_coachName LIKE '${search_input}' OR c_coachNationality LIKE '${search_input}'`

    // 將最終sql查找指令串接
    let result_command = condition_1 + condition_2 + condition_3 + condition_4

    // 放入處理完的sql語法
    sql = `select * from course where ${result_command}`
  }

  mysqlConnection.query(sql, (err, rows, fields) => {
    console.log('connection:' + sql)
    if (!err) res.send(rows)
    else console.log(err)
    console.log(res)
  })
})

// 新增贊助訂單
router.post('/course/backIt/:id', (req, res) => {
  // console.log(req.body)
  mysqlConnection.query(
    `INSERT INTO funding (m_sid, c_sid, payment_method, fund_price, backer_name, comment) VALUES ('${
      req.body.m_sid
    }', '${req.body.c_sid}', '${req.body.payment_method}', '${
      req.body.fund_price
    }', '${req.body.backer_name}', '${req.body.comment}')`,
    (error, result) => {
      if (!error) {
        res.json({ success: true })
      } else {
        console.log(error)
      }
    }
  )
})

// 更新集資課程欄位資訊
//（c_sid: 課程ID ,c_backers: 贊助人數; c_fundNow: 目前集資金額）
// SQL Command Examples: UPDATE `course` SET `c_backers`=35 ,`c_fundNow`=3500 WHERE `c_sid`=?
router.post('/course/dataUpdate/', (req, res) => {
  console.log('line136:')
  console.log(req.body)
  mysqlConnection.query(
    `UPDATE course SET c_backers='${req.body.c_backers}' ,c_fundNow='${
      req.body.c_fundNow
    }' WHERE c_sid= ${req.body.c_sid}`,
    (error, result) => {
      if (!error) {
        res.json({ success: true })
      } else {
        console.log(error)
      }
    }
  )
})

// 加入「收藏」狀態
router.get('/collection/', (req, res) => {
  console.log('line202:')
  // console.log('req.query: ' + req.query)
  let sid = +req.query.sid
  mysqlConnection.query(
    `SELECT c_course FROM member WHERE m_sid='${sid}'`,
    (error, result) => {
      res.send(result)
    }
  )
})

// 更新「收藏」狀態
router.post('/collection_update', (req, res) => {
  console.log('line215:')
  // console.log(req.body)
  let updatedCollection = req.body.collection
  let sid = +req.body.sid
  mysqlConnection.query(
    `UPDATE member SET c_course='${updatedCollection}' WHERE m_sid = ${sid}`,
    (error, result) => {
      if (result.affectedRows > 0) {
        mysqlConnection.query(
          `SELECT * FROM member WHERE m_sid=${sid}`,
          (error, results) => {
            res.send(results)
          }
        )
      }
    }
  )
})

module.exports = router
