const mysql = require("mysql");
const express = require("express");
const bodyparser = require("body-parser");
const moment = require("moment-timezone");
const multer = require("multer");
const fs = require("fs");
const cors = require("cors");
const uuidv4 = require("uuid/v4");
const session = require("express-session");
const router = express.Router();

const upload = multer({ dest: "tmp_uploads/" });

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
router.use(cors(corsOptions));

var mysqlConnection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "the_wheel",
  multipleStatements: true
});

mysqlConnection.connect(err => {
  if (!err) console.log("DB connection succeded");
  else
    console.log(
      "DB connection failed \n Error:" + JSON.stringify(err, undefined, 2)
    );
});

// 拿到所有會員資料
router.get('/member', (req, res) => {
  mysqlConnection.query('SELECT*FROM member', (err, rows, fields) => {

      for (let s in rows) {
          rows[s].m_birthday2 = moment(rows[s].m_birthday).format('YYYY-MM-DD');
      }

      if (!err)
          res.send(rows)
      else
          console.log(err);
  })
});



//拿到一個會員資料
router.get("/member/:id", (req, res) => {
  mysqlConnection.query(
    "SELECT*FROM member WHERE m_sid = ?",
    [req.params.id],
    (err, rows, fields) => {
      for (let s in rows) {
        rows[s].m_birthday2 = moment(rows[s].m_birthday).format("YYYY-MM-DD");
      }
      if (!err) res.send(rows);
      else console.log(err);
    }
  );
});

//刪除會員資料
router.delete("/member/:id", (req, res) => {
  mysqlConnection.query(
    "DELETE FROM member WHERE m_sid = ?",
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send("Delete successfully.");
      else console.log(err);
    }
  );
});

//上傳會員資料
router.post("/member", upload.single("avatar"), (req, res) => {
  const data = {
    success: false,
    message: {
      type: "danger",
      text: "",
      info: "",
      file: ""
    }
  };
  const body = req.body;
  data.body = body;

  let ext = "";
  let fname = uuidv4();

  if (req.file && req.file.originalname) {
    let myUrl = "http://localhost:5000";
    switch (req.file.mimetype) {
      case "image/png":
        ext = ".png";
      case "image/jpeg":
        if (!ext) {
          ext = ".jpg";
        }
        console.log(req.file.mimetype);
        fs.createReadStream(req.file.path).pipe(
          fs.createWriteStream(__dirname + "/../public/img/" + fname + ext)
        );
        // __dirname +
        // /../public/img/

        data.message.file = `${myUrl}/img/` + fname + ext;
        data.info = "圖片上傳成功";
        req.body.m_photo = data.message.file;

        var sql = "INSERT INTO `member` SET ?";
        mysqlConnection.query(sql, body, (err, rows, fields) => {
          console.log(body);

          if (rows) {
            data.success = true;
            data.message.type = "success";
            data.message.text = "註冊成功";
            res.send(data);
          } else {
            // console.log(err);
            data.message.text = "E-mail重複使用";
            data.message.type = "danger";
            res.send(data);
          }
        });

        return;

      default:
        data.message.info = "檔案格式不符";
        data.message.text = "檔案格式不符,註冊失敗";
        res.send(data);
    }
  } else {
    data.message.info = "沒有選擇檔案";

    var sql = "INSERT INTO `member` SET ?";
    mysqlConnection.query(sql, body, (err, rows, fields) => {
      console.log(body);

      if (rows) {
        data.success = true;
        data.message.type = "success";
        data.message.text = "註冊成功";
        res.send(data);
      } else {
        // console.log(err);
        data.message.text = "E-mail重複使用";
        data.message.type = "danger";
        res.send(data);
      }
    });
  }

  // console.log(req.body.files && req.body.files.originalname);
  console.log(req.file);
  // console.log(req.files[0].originalname)

  // (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  // (`m_name`, `m_mobile`, `m_email`,`m_photo`,`m_address`,`m_birthday`,`m_active`,`m_password`,`m_city`,`m_town`)
  // [body.m_name,body.m_mobile,body.m_email,body.m_photo,body.m_address,body.m_birthday,true,body.m_password,body.m_city,body.m_town]
  // let body=req.body;

  // console.log(req);
  // if(! body.m_name || ! body.m_email || ! body.m_mobile){
  //     data.message.text = '資料不足';
  //     res.send(data);
  //     return;
  // }
});

//更改會員資料
// router.put('/member/:id',(req,res)=>{
//     var sid = 'm_sid'?'m_sid' : 0;
//     let emp=req.body;
//     var sql="UPDATE `member` SET `m_name`=?, `m_mobile`=?, `m_email`=?,`m_photo`=?,`m_address`=?,`m_birthday`=?,`m_active`=?,`m_password`=?,`m_city`=?,`m_town`=?  WHERE `m_sid`=?;";
//     mysqlConnection.query(sql,[emp.m_name,emp.m_mobile,emp.m_email,emp.m_photo,emp.m_address,emp.m_birthday,true,emp.m_password,emp.m_city,emp.m_town,req.params.id],(err,rows,fields)=>{
//         if(!err)
//         res.send(rows)
//         else
//         console.log(err);
//     })
// });

router.put("/member/:id", upload.single("avatar"), (req, res) => {
  var sid = "m_sid" ? "m_sid" : 0;
  const data = {
    success: false,
    message: {
      type: "danger",
      text: "資料輸入不完整",
      info: "",
      errorCode: 0,
      file: ""
    }
  };
  const body = req.body;
  data.body = body;

  let ext = "";
  let fname = uuidv4();

  if (req.file && req.file.originalname) {
    let myUrl = "http://localhost:5000";
    switch (req.file.mimetype) {
      case "image/png":
        ext = ".png";
      case "image/jpeg":
        if (!ext) {
          ext = ".jpg";
        }

        fs.createReadStream(req.file.path).pipe(
          fs.createWriteStream(__dirname + "/../public/img/" + fname + ext)
        );

        data.message.file = `${myUrl}/img/` + fname + ext;
        data.message.info = "圖片上傳成功";
        req.body.m_photo = data.message.file;

        var sql = "UPDATE `member` SET ? WHERE `m_sid`=?";
        mysqlConnection.query(
          sql,
          [body, req.params.id],
          (err, rows, fields) => {
            console.log(body);

            if (rows.changedRows == 0) {
              data.success = true;
              data.message.type = "warning";
              data.message.text = "資料沒有修改";
              res.send(data);
              return;
            }
            if (rows.changedRows !== 0) {
              data.success = true;
              data.message.type = "success";
              data.message.text = "資料修改成功";
              req.session.m_name = data.body.m_name;
              req.session.m_photo = data.body.m_photo;
              res.send(data);
              return;
            }

            if (err) {
              data.message.text = "E-mail重複使用,資料修改失敗";
              data.message.type = "danger";
              res.send(data);
              console.log(err);
            }
          }
        );

        return;

      default:
        data.message.info = "檔案格式不符";
        data.message.text = "檔案格式不符,資料修改失敗";
        res.send(data);
    }
  } else {
    data.info = "沒有變更圖片";
    var sql = "UPDATE `member` SET ? WHERE `m_sid`=?";
    mysqlConnection.query(sql, [body, req.params.id], (err, rows, fields) => {
      console.log(body);

      if(rows){

      if (rows.changedRows == 0) {
        data.success = true;
        data.message.type = "warning";
        data.message.text = "資料沒有修改";
        res.send(data);
        return;
      }
      if (rows.changedRows !== 0) {
        data.success = true;
        data.message.type = "success";
        data.message.text = "資料修改成功";
        req.session.m_name = data.body.m_name;
        res.send(data);
        return;
      }
    }

      if (err) {
        data.message.text = "E-mail重複使用,資料修改失敗";
        data.message.type = "danger";
        res.send(data);
        console.log(err);
      }
    });

    return;
  }

  // console.log(req.body.files && req.body.files.originalname);
  console.log(req.files);
  // console.log(req.files[0].originalname)

  // (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  // (`m_name`, `m_mobile`, `m_email`,`m_photo`,`m_address`,`m_birthday`,`m_active`,`m_password`,`m_city`,`m_town`)
  // [body.m_name,body.m_mobile,body.m_email,body.m_photo,body.m_address,body.m_birthday,true,body.m_password,body.m_city,body.m_town]
  // let body=req.body;

  // console.log(req);
});

// 會員登入

router.post("/login", (req, res) => {
  const data = {
    success: false,
    message: {
      type: "danger",
      text: "",
      info: "",
      views: "",
      loginUser: "",
      isLogined: "",
      user_id: ""
    }
  };

  console.log(req.body);
  // res.json(req.body); //----

  const body = req.body;
  data.body = body;

  var sql = "SELECT * FROM `member` WHERE `m_email`=? AND `m_password`=?";
  mysqlConnection.query(
    sql,
    [body.m_email, body.m_password],
    (err, rows, fields) => {
      // if(!err)
      // res.send(rows)
      // else
      // console.log(err);

      // if(rows[0].m_active=="停權"){
      //     res.json({"WARNING":"您的帳號已被停權"});
      //     return;
      // }

      if (rows[0]) {
        if (rows[0].m_active == "停權") {
          res.json({ WARNING: "您的帳號已被停權" });
          return;
        }

        if (rows[0].m_active == "正常") {
          req.session.views = req.session.views || 0;
          req.session.views++;
          var id = rows[0].m_sid;

          req.session.loginUser = body.m_email;
          req.session.user_id = rows[0].m_sid.toString();
          req.session.m_name = rows[0].m_name;
          req.session.m_photo = rows[0].m_photo;
          req.session.c_course = rows[0].c_course;
          req.session.isLogined = true;

          data.message.views = req.session.views;
          data.success = true;
          data.message.type = "success";
          data.message.text = "登入成功";
          data.message.loginUser = req.session.loginUser;
          data.message.isLogined = req.session.isLogined;
          data.message.user_id = req.session.user_id;

          res.send(data);
          return;
        }
      } else {
        req.session.isLogined = false;
        data.success = false;
        data.message.type = "danger";
        data.message.text = "帳號或密碼錯誤";
        res.send(data);
        console.log(err);
      }
    }
  );
});

//查看是否是登入狀態
router.get("/is_logined", (req, res) => {
  res.json({
    loginUser: req.session.loginUser,
    user_id: req.session.user_id,
    isLogined: req.session.isLogined,
    session_name: req.session.m_name,
    session_photo: req.session.m_photo,
    session_collect: req.session.c_course
  });
});

//登出
router.get("/logout", (req, res) => {
  req.session.destroy();
  res.json({
    loginUser: "",
    isLogined: "",
    user_id: ""
  });
});
//檢查是否為會員
// User.getUserNumByName = function getUserNumByName(username, callback) {
//     //使用username 來檢查是否有資料

//      var cmd = “select COUNT(1) AS num from user info where username = ?";
//      connection.query(cmd, [username], function (err, result) {
//          if (err) {
//              return;
//          }
//          connection.release();
//          //查詢結果使用 callback 呼叫，並將 err, result 參數帶入
//          callback(err,result);
//      });
// };
// //透過帳號取得使用者資料
// User.getUserByUserName = function getUserNumByName(username, callback) {
//      var cmd = “select * from userinfo where username = ?";
//      connection.query(cmd, [username], function (err, result) {
//          if (err) {
//              return;
//          }
//          connection.release();
//          callback(err,result);
//      });
//  };

// 拿到所有課程資料
router.get("/course", (req, res) => {
  mysqlConnection.query("SELECT * FROM course", (err, rows, fields) => {
    for (let s in rows) {
      rows[s].c_courseDate = moment(rows[s].c_courseDate).format("YYYY-MM-DD");
      rows[s].c_startDate = moment(rows[s].c_startDate).format("YYYY-MM-DD");
      rows[s].c_endDate = moment(rows[s].c_endDate).format("YYYY-MM-DD");
    }

    if (!err) res.send(rows);
    else console.log(err);
  });
});

// 拿到一個課程的資料
router.get("/course/:id", (req, res) => {
  mysqlConnection.query(
    "SELECT * FROM course WHERE c_sid = ?",
    [req.params.id],
    (err, rows, fields) => {
      for (let s in rows) {
        rows[s].c_courseDate = moment(rows[s].c_courseDate).format(
          "YYYY-MM-DD"
        );
        rows[s].c_startDate = moment(rows[s].c_startDate).format("YYYY-MM-DD");
        rows[s].c_endDate = moment(rows[s].c_endDate).format("YYYY-MM-DD");
      }
      if (!err) res.send(rows);
      else console.log(err);
    }
  );
});

//更新收藏的課程
router.put("/collect", (req, res) => {
  console.log(req.body);
  const body = req.body;
  // data.body = body;

  var sql = "UPDATE `member` SET `c_course`=? WHERE `m_sid`=?";
  mysqlConnection.query(
    sql,
    [JSON.stringify(body.sid), body.user_id],
    (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    }
  );
});

//拿到收藏的課程
router.post("/myCollect", (req, res) => {
  console.log(req.body.arr);
  // const body = req.body;
  // data.body = body;

  if (req.body.arr.length > 0) {
    var sql = "SELECT * FROM `course` WHERE ";
    for (let i = 0; i < req.body.arr.length; i++) {
      if (i === 0) {
        sql += `c_sid = ` + req.body.arr[i];
      } else {
        sql += ` OR c_sid = ` + req.body.arr[i];
      }
    }
    console.log(sql);

    // res.send(sql);
    mysqlConnection.query(sql, (err, rows, fields) => {
      for (let s in rows) {
        rows[s].c_courseDate = moment(rows[s].c_courseDate).format(
          "YYYY-MM-DD"
        );
        rows[s].c_startDate = moment(rows[s].c_startDate).format("YYYY-MM-DD");
        rows[s].c_endDate = moment(rows[s].c_endDate).format("YYYY-MM-DD");
      }

      if (!err) res.send(rows);
      else console.log(err);
    });
  } else {
    res.send([]);
  }
});

//拿到收藏的新聞
router.post("/newsCollect", (req, res) => {
  console.log(req.body.arr);
  // const body = req.body;
  // data.body = body;

  if (req.body.arr.length > 0) {
    var sql = "SELECT * FROM `test` WHERE ";
    for (let i = 0; i < req.body.arr.length; i++) {
      if (i === 0) {
        sql += `sid = ` + req.body.arr[i];
      } else {
        sql += ` OR sid = ` + req.body.arr[i];
      }
    }
    console.log(sql);

    // res.send(sql);
    mysqlConnection.query(sql, (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    });
  } else {
    res.send([]);
  }
});

//更新收藏的新聞
router.put("/sqlcollect", (req, res) => {
  console.log(req.body);
  const body = req.body;
  // data.body = body;

  var sql = "UPDATE `member` SET `collection`=? WHERE `m_sid`=?";
  mysqlConnection.query(
    sql,
    [JSON.stringify(body.sid), body.user_id],
    (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    }
  );
});


//拿到收藏的路線
router.post("/myrouter", (req, res) => {
  console.log(req.body.arr);
  // const body = req.body;
  // data.body = body;

  if (req.body.arr.length > 0) {
    var sql = "SELECT * FROM `route` WHERE ";
    for (let i = 0; i < req.body.arr.length; i++) {
      if (i === 0) {
        sql += `r_sid = ` + req.body.arr[i];
      } else {
        sql += ` OR r_sid = ` + req.body.arr[i];
      }
    }
    console.log(sql);

    // res.send(sql);
    mysqlConnection.query(sql, (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    });
  } else {
    res.send([]);
  }
});

//更新收藏的路線
router.put("/c_route", (req, res) => {
  console.log(req.body);
  const body = req.body;
  // data.body = body;

  var sql = "UPDATE `member` SET `r_collection`=? WHERE `m_sid`=?";
  mysqlConnection.query(
    sql,
    [JSON.stringify(body.sid), body.user_id],
    (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    }
  );
});


//拿到收藏的商品
router.post("/productsCollect", (req, res) => {
  console.log(req.body.arr);
  // const body = req.body;
  // data.body = body;

  if (req.body.arr.length > 0) {
    var sql = "SELECT * FROM `prouduct` WHERE ";
    for (let i = 0; i < req.body.arr.length; i++) {
      if (i === 0) {
        sql += `p_sid = ` + req.body.arr[i];
      } else {
        sql += ` OR p_sid = ` + req.body.arr[i];
      }
    }
    console.log(sql);

    // res.send(sql);
    mysqlConnection.query(sql, (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    });
  } else {
    res.send([]);
  }
});


//更新收藏的商品
router.put("/c_product", (req, res) => {
  console.log(req.body);
  const body = req.body;
  // data.body = body;

  var sql = "UPDATE `member` SET `c_product`=? WHERE `m_sid`=?";
  mysqlConnection.query(
    sql,
    [JSON.stringify(body.sid), body.user_id],
    (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    }
  );
});


//取消訂單

router.post("/cancelOrder",(req,res)=>{
  mysqlConnection.query(
    "DELETE FROM `orders` WHERE `orders`.`sid` = ?",
    [req.body.id],
    (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    }
  )
})

//會員發起的路線
router.get('/routeRaise/:id', (req, res) => {
  mysqlConnection.query(
    'SELECT * FROM route WHERE m_sid = ?',
    [req.params.id],
    (err, rows, fields) => {
      if (!err) res.send(rows)
      else console.log(err)

      // if (!err) res.send(rows)
      // else console.log(err)
    }
  )
})


router.post('/routeDelete', (req, res)=>{
  mysqlConnection.query(
    "DELETE FROM `route` WHERE `r_sid`=?",
    [req.body.id],
    (err, rows, fields) => {
      if (!err) res.send(rows);
      else console.log(err);
    }
  ) 
})



module.exports = router;
