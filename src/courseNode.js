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
const faker = require('faker')
// const faker = require('faker/locale/zh_TW')

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
  user: 'root',
  password: '',
  database: 'the_wheel',
  multipleStatements: true,
})

mysqlConnection.connect(err => {
  if (!err) console.log('[courseNode] DB connection succeeded')
  else
    console.log(
      'DB connection failed \n Error:' + JSON.stringify(err, undefined, 2)
    )
})

// 拿到所有課程資料
router.get('/course', (req, res) => {
  console.log('/course')
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
  console.log('/course/:id')
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
router.post('/course/search', (req, res) => {
  console.log('/course/search')
  // 課程難度
  let search_level = req.body.search_level
  // 地區
  let search_region = req.body.search_region
  // 集資截止時間
  let search_date = req.body.search_date
  // 搜尋關鍵字
  let search_input = req.body.search_input

  // 若有其中一項搜尋條件：
  if (search_level || search_region || search_date || search_input) {
    let result_array = []
    if (search_level) result_array.push(`c_level = '${search_level}'`)
    if (search_region) result_array.push(`c_courseLocation ='${search_region}'`)
    if (search_date) {
      search_date = search_date.split('-')
      let monthStart = search_date[0]
      let monthEnd = search_date[1]
      result_array.push(`c_endDate BETWEEN '${monthStart}' AND '${monthEnd}'`)
    }
    if (search_input)
      result_array.push(
        `c_title LIKE '${search_input}' OR c_subtitle LIKE '${search_input}' OR c_intro LIKE '${search_input}' OR c_coachName LIKE '${search_input}' OR c_coachNationality LIKE '${search_input}'`
      )

    // 將最終sql查找指令串接
    let result_command = result_array.join(' AND ')

    // 放入處理完的sql語法
    sql = `select * from course where ${result_command}`
  } else {
    // 若沒有設定搜尋條件，則顯示所有資料
    sql = `SELECT * FROM course`
  }
  console.log("the sql command is: '" + sql + "'")

  mysqlConnection.query(sql, (err, rows, fields) => {
    for (let s in rows) {
      rows[s].c_courseDate = moment(rows[s].c_courseDate).format('YYYY-MM-DD')
      rows[s].c_startDate = moment(rows[s].c_startDate).format('YYYY-MM-DD')
      rows[s].c_endDate = moment(rows[s].c_endDate).format('YYYY-MM-DD')
    }
    if (!err) res.send(rows)
    else console.log(err)
    console.log(res)
  })
})

// 新增贊助訂單
router.post('/course/backIt/:id', (req, res) => {
  console.log('/course/backIt/:id')
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
        console.log('error: ' + error)
      }
    }
  )
})

// 更新集資課程欄位資訊
//（c_sid: 課程ID ,c_backers: 贊助人數; c_fundNow: 目前集資金額）
// SQL Command Examples: UPDATE `course` SET `c_backers`=35 ,`c_fundNow`=3500 WHERE `c_sid`=?
router.post('/course/dataUpdate/', (req, res) => {
  console.log('enter /course/dataUpdate/')
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

// 取得「收藏」狀態
router.get('/collectionCourse', (req, res) => {
  console.log('enter /collectionCourse')
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
router.post('/collectionCourse_update', (req, res) => {
  console.log('/enter collection_update')
  // console.log(req.body)
  let updatedCollection = req.body.collectionCourse
  let sid = req.body.sid
  console.log('sid: ' + sid)
  console.log('updatedCollection: ' + updatedCollection)
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

// 讀取留言
router.get('/courseComment', (req, res) => {
  let sid = req.query.sid
  let sql = `SELECT
                cc.c_c_sid,
                cc.c_comment,
                m.m_name,
                m.m_photo
            FROM
                course_comment AS cc
                LEFT JOIN member AS m
            ON
                m.m_sid = cc.m_sid
                LEFT JOIN course AS c
            ON
                c.c_sid = cc.c_sid
            WHERE
                c.c_sid = '${sid}'`

  console.log(sql)
  mysqlConnection.query(sql, (err, rows, fields) => {
    if (!err) res.send(rows)
    else console.log(err)
    console.log(rows)
  })
})

// 新增留言
router.post('/NewCourseComment', (req, res) => {
  let c_sid = req.body.c_sid
  let m_sid = req.body.m_sid
  let c_comment = req.body.c_comment
  let sql = `INSERT INTO course_comment (c_sid, m_sid, c_comment)
  VALUES('${c_sid}','${m_sid}','${c_comment}')`
  console.log(req)
  mysqlConnection.query(sql, (err, rows, fields) => {
    if (!err) res.send(rows)
    else console.log(err)
  })
})

// Fake Data Generator
router.post('/fakeDataInsert', (req, res) => {
  let result_array = []
  result_command = ''
  for (let i = 0; i < 30; i++) {
    let c_title = faker.lorem.words()
    let c_subtitle = faker.lorem.words()
    let c_intro = faker.lorem.paragraphs()
    // let c_cover = faker.image.sports()
    // generate course level
    let levelArr = ['入門', '中級', '高級']
    let c_level = levelArr[Math.floor(Math.random() * 3)]
    // let c_courseDate
    // generate random location
    let locationArr = [
      '台北市',
      '新北市',
      '桃園市',
      '台中市',
      '彰化縣',
      '台南市',
      '高雄市',
    ]
    let c_courseLocation = locationArr[Math.floor(Math.random() * 7)]
    let c_coachName = `${faker.name.findName()}`
    // generate random gender
    let genderArr = ['men', 'women']
    let randomGender = Math.floor(Math.random() * 2)
    let randomNumber = Math.floor(Math.random() * 99)
    let c_coachAvatar = `https://randomuser.me/api/portraits/${
      genderArr[randomGender]
    }/${randomNumber}.jpg`
    let c_coachNationality = `${faker.address.country()}`
    let c_backers = Math.floor(Math.random() * 50)
    let c_fundNow = c_backers * 1000
    let c_fundGoal = Math.floor(Math.random() * 5 + 1) * 50000
    let c_endDate = `2019/${Math.floor(Math.random() * 7) + 6}/${Math.floor(
      Math.random() * 30
    ) + 1}`
    result_array.push(
      `('${c_title}', '${c_subtitle}', '${c_intro}', '${c_level}', '${c_courseLocation}', '${c_coachName}',
    '${c_coachAvatar}', '${c_coachNationality}', '${c_backers}', '${c_fundNow}', '${c_fundGoal}', '${c_endDate}')`
    )
  }
  result_command = result_array.join(', ')
  // console.log('result_command: ' + result_command)
  // console.log(sqlCommand)
  mysqlConnection.query(
    `INSERT INTO course
      (c_title, c_subtitle, c_intro, c_level, c_courseLocation, c_coachName,
        c_coachAvatar, c_coachNationality, c_backers, c_fundNow, c_fundGoal, c_endDate)
      VALUES ${result_command}`,
    (error, result) => {
      if (!error) {
        res.json({ success: true })
      } else {
        console.log('error: ' + error)
      }
    }
  )
})

// Fake Member Photo Generator
router.post('/fakeMemberPhoto', (req, res) => {
  let result_array = []
  result_command = ''
  for (let i = 0; i < 500; i++) {
    let genderArr = ['men', 'women']
    let randomGender = Math.floor(Math.random() * 2)
    let randomNumber = Math.floor(Math.random() * 99)
    let m_photo = `https://randomuser.me/api/portraits/${
      genderArr[randomGender]
    }/${randomNumber}.jpg`
    
    result_array.push(
      `UPDATE member SET m_photo ='${m_photo}' WHERE m_sid=${i+1};`
    )
  }

  result_command = result_array.join(' ')
  // console.log('result: ' + result_command)
  // `UPDATE member SET m_photo ='${m_photo}' WHERE m_sid=${i};`
  mysqlConnection.query(
    `${result_command}`,
    (error, result) => {
      if (!error) {
        res.json({ success: true })
      } else {
        console.log('error: ' + error)
      }
    }
  )
})


// UPDATE `course` SET `c_cover`='123' WHERE `c_sid`=15;
// UPDATE `course` SET `c_cover`='321' WHERE `c_sid`=14;
// UPDATE `course` SET `c_cover`='224' WHERE `c_sid`=13;

module.exports = router
