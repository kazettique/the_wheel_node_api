const express = require ('express');
const app = express();
const fs = require('fs');
const multer = require('multer')
const bluebird = require('bluebird');
const mysql  = require('mysql');
const uuidv4 = require('uuid/v4');
const bodyParser = require('body-parser')
const cors = require('cors');
const router = express.Router();

const db = mysql.createConnection({
    host: "localhost",
    user: "wang",
    password: "admin",
    database: "the_wheel"
})

db.connect();
bluebird.promisifyAll(db);

const upload = multer({dest:'tmp_uploads/'});

// var whitelist = ['http://localhost:5555', 'http:// 192.168.1.111:5555', undefined,'http://localhost:3000', 'http://localhost:3001'];
// var corsOptions = {
//     credentials: true,
//     origin: function (origin, callback) {
//         console.log('origin: '+origin);
//         if (whitelist.indexOf(origin) !== -1) {
//             callback(null, true)
//         } else {
//             callback(new Error('Not allowed by CORS'))
//         }
//     }
// };

//router.use(cors());


//---------------------------------------------------------------Read-------------!!!!! CONNENT NOT DONE YET ---------
router.get('/route/list', (req, res)=>{
    // res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    // res.setHeader("Access-Control-Allow-Origin: *");
    let page=req.query.page*7
    // let sql = "SELECT * FROM `route` ORDER BY `route`.`r_sid` " + req.query.orderby +" LIMIT "+page+" , 15";
    let sql= "SELECT r.*,m.`m_sid`,m.`m_photo`,m.`m_name` FROM `route`AS r INNER JOIN `member` AS m ON r.`m_sid` = m.`m_sid` ORDER BY r.`r_sid` " + req.query.orderby +" LIMIT "+page+" , 7";


    db.queryAsync(sql)
    .then(results=>res.json(results))
    .catch(e=>res.send(e))
});
router.get('/route/list/popular', (req, res) => {

    let page = req.query.page * 7

    let sql = "SELECT r.*,m.`m_sid`,m.`m_photo`,m.`m_name` FROM `route`AS r INNER JOIN `member` AS m ON r.`m_sid` = m.`m_sid` ORDER BY r.`r_collect_num` DESC LIMIT " + page + " , 7";


    db.queryAsync(sql)
        .then(results => res.json(results))
        .catch(e => res.send(e))
})

router.get('/route/:sid',(req,res)=>{
    const output = {
    }
    let sql = "SELECT r.*, m.`m_photo`,m.`m_name`  FROM `route` AS r LEFT JOIN `member` AS m ON r.`m_sid` = m.`m_sid` WHERE r_sid = ?";
    let sql2 = "SELECT rc.`r_c_sid`, rc.`r_c`, m.`m_name`, m.`m_photo`, rc.`r_c_time`, a.`name` FROM`route_comment` AS rc LEFT JOIN `member` AS m ON m.`m_sid` = rc.`m_sid` LEFT JOIN`admin` AS a ON a.`id` = rc.`m_sid` LEFT JOIN`route`AS r ON r.`r_sid` = rc.`r_sid` WHERE r.`r_sid` = ?";
    let sql3 = "SELECT * FROM `route_location` WHERE r_sid= ?";

    db.queryAsync(sql, req.params.sid)
    .then(results=>{
        if(results){
            output.main = results
        }
    })
    .then(
        r=>(db.queryAsync(sql3,  req.params.sid))
    )
    .then(results=>{
        output.location=results
    })
    .then(
        r=>(db.queryAsync(sql2,  req.params.sid))
    )
    .then(results=>{
        output.comment=results
        output.rsid
    })
    .then(obj=>res.json(output))
        .catch(e => res.send('Error----' + e))
});

router.get('/route/comment/:sid', (req, res) => {
    const output = {
    }
    let sql2 = "SELECT rc.`r_c_sid`, rc.`r_c`, m.`m_name`, m.`m_photo`, rc.`r_c_time`, a.`name` FROM`route_comment` AS rc LEFT JOIN `member` AS m ON m.`m_sid` = rc.`m_sid` LEFT JOIN`admin` AS a ON a.`id` = rc.`m_sid` LEFT JOIN`route`AS r ON r.`r_sid` = rc.`r_sid` WHERE r.`r_sid` = ?";

        db.queryAsync(sql2, req.params.sid)
        .then(results => {
            output.comment = results
            //console.log(output)
        })
        .then(obj => res.json(output))
        .catch(e => res.json('Error----' + e))
});

router.post('/route/search', upload.none(),(req,res)=>{
    console.log(req.body)
    const output = {
        errMsg: '路線不存在請搜尋其他路線',
        page: 0,
        aaa:0,
        data:{}
    }
  
    let sql= "SELECT r.*, m.`m_sid`, m.`m_photo`, m.`m_name` FROM  `route` AS r LEFT JOIN `member` AS m ON r.`m_sid` = m.`m_sid` WHERE ";
    let string;
    let tag;
    let country;
    let area;
    let str='';

    if (req.body.r_search) { string = req.body.r_search.trim() } else {string=''};
    if (req.body.r_tag) { tag = req.body.r_tag } else { tag = '' };
    if (req.body.r_country) { country = req.body.r_country } else { country = '' }
    if (req.body.r_area) { area = req.body.r_area } else { area = '' }

    if (!string && !tag && !country){
    output.errMsg = '未輸入關鍵字';
    res.json(output)}


    else if(string && !tag && !country){
            output.aaa = '1';
            searchtxt();
    } else if( !string && tag && !country) {
        output.aaa  = '2';
        searchtag();
    } else if( !string && !tag && country && !area) {
        output.aaa  = '3';
        searchcountry()
    } else if(string && tag && !country){
        output.aaa  = '4';
        //search_txt_tag();
        searchtag();
        sql+=" AND ("
        searchtxt();
        sql += " )"
    } else if(string && !tag && country && !area){
        output.aaa  = '5';
        //search_txt_country();
        searchcountry()
        sql += " AND ("
        searchtxt();
        sql += " )"

    } else if(!string && !tag &&country &&area){
        output.aaa  = '6';
        //search_country_area();
        searchcountry()
        sql += " AND "
        searcharea();
    

    } else if(string && !tag && country && area){
        output.aaa  = '7';
        //search_txt_country_area();
        searchcountry()
        sql += " AND "
        searcharea();
        sql += " AND ("
        searchtxt();
        sql += " )"

    } else if(!string &&tag &&country && !area){
        output.aaa  = '8';
        //search_tag_country();
        searchtag()
        sql += " AND "
        searchcountry()

    } else if(!string &&tag &&country &&area){
        output.aaa  = '9';
        //search_tag_country_area();
        searchtag()
        sql += " AND "
        searchcountry()
        sql += " AND "
        searcharea();

    } else if(string &&tag &&country && !area){
        output.aaa  = '10';
        //search_txt_tag_country();
        searchcountry()
        sql += " AND "
        searchtag()
        sql += " AND ("
        searchtxt();
        sql += " )"

    } else if(string && tag && country &&area){
        output.aaa  = '11';
        //search_txt_tag_country_area();
        searchcountry()
        sql += " AND "
        searcharea();
        sql += " AND "
        searchtag()
        sql += " AND ("
        searchtxt();
        sql += " )"


    }
    function searchtxt() {
        let keys= string.split(' ')

        sql += " `r_intro` LIKE '%" + string + "%' OR`r_name` LIKE '%" + string + "%' OR`r_country` LIKE '%" + string + "%' OR`r_area` LIKE '%" + string + "%' OR`r_depart` LIKE '%" + string + "%' OR`r_arrive` LIKE '%" + string + "%'";

        keys.forEach(function (k) {
            sql += " OR`r_intro`LIKE '%" + k + "%' OR`r_name` LIKE '%" + k + "%' OR`r_country` LIKE '%" + k + "%' OR`r_area` LIKE '%" + k + "%' OR`r_depart` LIKE '%" + k + "%' OR`r_arrive` LIKE '%" + k + "%'";
        })
       
    }
    function searchtag() {
        sql += "`r_tag`='" + tag +"'";
    }

    function searchcountry() {
        sql += "`r_country`= '" + country + "'";
    }
    function searcharea() {
        sql += "`r_area`= '" + area + "'";
    }

    sql += " ORDER BY `r_sid` DESC LIMIT " + (req.body.page*7) + " , 7"
console.log(output)
console.log(sql)
db.queryAsync(sql)
.then(obj=>{
    if(obj.length>0){
        output.data = obj
        output.errMsg = ''
        res.json(output)
    }else {
        throw new Error('路線不存在請搜尋其他路線',)
    }

})
.catch(e => {
    output.errMsg=''+e;
    res.json(output)
})



});
//---------------------------------------------------------------Create-----------------------------------------------
router.post('/route/list', upload.single('r_img'), (req,res)=>{
    console.log(req.body)
    console.log(req.file)
    let output = {
        success: false,
        errMsg: '',
        thisRoute:0
    };
    let img_name ='';
    let ext = '';
    const body = req.body;
    output.post= body;
    if (!body.r_name || !body.r_arrive || !body.r_depart || !body.r_tag || !body.r_time) {
        output.errMsg = '資料輸入不完整';
        res.json(output);
        return;
    }
    if(req.file && req.file.originalname){
        switch (req.file.mimetype){
            case 'image/png':
                ext='.png';
            case 'image/jpeg':
                if(!ext){
                    ext='.jpg';
                }
                break; 
            default:
                output.errMsg='圖像格式不正確'
                res.json(output);
                return;       
        }
        img_name=uuidv4()+ext
    }

    body.r_img = "http://localhost:5000/r_upload_img/"+img_name;

    let sql = "INSERT INTO`route` SET ?";
    db.queryAsync(sql, body)

    .then(results=>{
        let myUrl = "http://localhost:5000";
        if(results.affectedRows===1){
            if(img_name!==''){
                fs.createReadStream(req.file.path).pipe(
                    fs.createWriteStream(__dirname + '/../public/r_upload_img/'+img_name)
                )
            }
            output.success = true;
            output.thisRoute = results.insertId;
            // output.thisRoute= `${myUrl}/r_upload_img/`+img_name
        }
    })
    .then(()=>res.json(output))
    .catch(e => {
        output.errMsg=e;
        res.json(output)
    })
    
})
//--------------------insert location
router.post('/route/location',  upload.none(), (req, res)=>{
    let output = {
        success: false,
        errMsg: '',
    };

    let question='';
    let answer=[];
    const body = req.body;
    output.post = body;
    if(!body.l_name){
        output.errMsg = '沒有地點';
        res.send(output);
        return;
    }

    let num = body.l_name.length;

    if(Array.isArray(body.l_name)){
        for(i=0;i<num;i++){
            if (!body.l_name[i]) {
                output.errMsg = '地點名稱未填寫';
                res.send(output);
                return;
            }
            if (!body.l_name[i]) {
                output.errMsg = '地點所屬國家未填寫';
                res.send(output);
                return;
            }
            
            question+='(?,?,?,?,?,?),';
            answer.push(body.l_name[i], body.l_intro[i], body.r_sid[i], body.l_country[i], body.l_area[i], body.l_order[i])
    
        }  
        question=question.slice(0,-1)
    }else{
        question ='(?,?,?,?,?,?)';
        answer.push(body.l_name, body.l_intro, body.r_sid, body.l_country, body.l_area, body.l_order);
    }


    let sql = "INSERT INTO`route_location`(`l_name`, `l_intro`,`r_sid`,`l_country`,`l_area`,`l_order`) VALUES "+ question;

    db.queryAsync(sql, answer)
    .then(results=>{
        if(results.affectedRows===num){
            output.success=true;
            res.send(output)
        }
    })
    .catch(e=>{
        output.errMsg=e;
        res.send(output)
    })
})

router.post('/route/comment',  upload.none(), (req,res)=>{
    let output = {
        success: false,
        errMsg: '',
    };
    const body = req.body;
    output.post= body;
    if (!body.r_sid || !body.m_sid || !body.r_c || !body.r_c_time) {
        output.errMsg = '沒有輸入留言';
        res.send(output);
        return;
    }

    let sql= "INSERT INTO `route_comment` SET ?";

    db.queryAsync(sql, body)
    .then(r=>{
        if(r.affectedRows===1){
            output.success=true
            output.rsid = body.r_sid
            res.send(output)
        }
    })
    .catch(e=>{
        output.errMsg=e;
        res.send(output)
    })
})

//---------------------------------------------------------------Update-----------------------------------------------
router.put('/route/edit/:sid',(req,res)=>{
    let output={};

    let sql = "SELECT * FROM `route` WHERE r_sid = ?";
    let sql3 = "SELECT * FROM `route_location` WHERE r_sid= ?";

    db.queryAsync(sql, req.params.sid)
    .then(r=>output.main=r)
    .then(r=>db.queryAsync(sql3, req.params.sid))
    .then(r=>{
        output.location=r
        res.send(output)
    })
    .catch(e=>res.send('Error----' + e))
});


router.put('/route/:sid',upload.single('r_img'), (req, res)=>{
    let output = {
        success: false,
        errMsg: '',
    };
    let img_name ='';
    let ext = '';
    let img_delete='';
    const body = req.body;
    output.post= body;
    // -------------檢查------------------------
    if (!body.r_name || !body.r_arrive || !body.r_depart || !body.r_tag || !body.r_time) {
        output.errMsg = '資料輸入不完整';
        res.send(output);
        return;
    }

    let sql = "SELECT * FROM `route` WHERE r_sid="+req.params.sid
    let sql2="UPDATE `route` SET ? WHERE `r_sid`= ?;";
    
    db.queryAsync(sql)
    .then(obj=>{
        if(obj.length===0){
            throw new Error('路線不存在')
        }else{
            img_delete=obj[0].r_img
        }
    })
    // -------------圖------------------------
    .then( r =>{
        if(req.file && req.file.originalname){
            switch (req.file.mimetype){
                case 'image/png':
                    ext='.png';
                case 'image/jpeg':
                    if(!ext){
                        ext='.jpg';
                    }
                    break; 
                default:   
                    throw new Error('圖像格式不正確')
            }
            img_name=uuidv4()+ext
            
        }
        body.r_img = img_name;
        
    })
     // -------------query------------------------
    .then(r=>db.queryAsync(sql2,[body, req.params.sid]))
    .then(results=>{
        if(results.affectedRows==1){
            path=__dirname +'/../public/r_upload_img/'+img_delete
    // -------------圖------------------------
            if(img_name!==''){
                fs.createReadStream(req.file.path).pipe(
                    fs.createWriteStream(__dirname + '/../public/r_upload_img/'+img_name)
                )
            }
            if(fs.existsSync(path)){
                fs.unlink(path, (err) => {
                    if (err) throw new Error (''+err);
                  });
            }
            output.success = true;
            res.send(output)    
        }
    })
    .catch(e=>{
        output.errMsg = ''+e;
        res.send(output)})
})


router.put('/route/location/:sid', bodyParser.urlencoded({extended: false}), (req, res)=>{
    let output = {
        success: false,
        errMsg: '',
    };
    let question='';
    let answer=[];
    const body = req.body;
    // -------------檢查------------------------
    output.post = body;
    if(!body.l_name){
        output.errMsg = '沒有地點';
        res.send(output);
        return;
    }
    let num = body.l_name.length;
    if(Array.isArray(body.l_name)){
        for(i=0;i<num;i++){
            if (!body.l_name[i]) {
                output.errMsg = '地點名稱未填寫';
                res.send(output);
                return;
            }
            if (!body.l_name[i]) {
                output.errMsg = '地點所屬國家未填寫';
                res.send(output);
                return;
            }
            
            question+='(?,?,?,?,?,?,?),';
            answer.push(body.l_sid[i], body.l_name[i], body.r_sid[i], body.l_country[i], body.l_area[i],  body.l_intro[i],  body.l_order[i])
        }
        question=question.slice(0,-1) 
    }else{
        question='(?,?,?,?,?,?,?)'
        answer.push(body.l_sid, body.l_name, body.r_sid, body.l_country, body.l_area,  body.l_intro,  body.l_order)
    }

    

    let sql="INSERT INTO `route_location` (`l_sid`,`l_name`,`r_sid`,`l_country`,`l_area`,`l_intro`,`l_order`) VALUES" + question +" ON DUPLICATE KEY UPDATE l_sid=VALUES(l_sid), `l_name`=VALUES(`l_name`), `r_sid`=VALUES(`r_sid`),`l_country`=VALUES(`l_country`),`l_area`=VALUES(`l_area`),`l_intro`= VALUES(`l_intro`),`l_order`=VALUES(`l_order`);";

    db.queryAsync(sql, answer)
    .then(r=>{
        console.log(r)
        res.send(output)
    })
    .catch(e=>{
        output.errMsg = ''+e;
        res.send(output)
    })
})

router.put('/routecollect',upload.none(),(req,res)=>{
    let output={
    }
    console.log(req.body.arr)
    console.log(req.body.m_sid)
    sql = "UPDATE`member` SET`r_collection` = ? WHERE `m_sid`= ?"
    db.queryAsync(sql, [req.body.arr, req.body.m_sid])
    .then(obj => {
        console.log(obj)
        if (obj.affectedRows == 1) {
            output.success = true;
            res.send(output)    
        }else {
            throw new Error()
        }
    })
    .catch(e => {
    output.errMsg = '' + e;
        res.send(output)})
    })
router.put('/routechallenge', upload.none(), (req, res) => {
    console.log('in challenge')
    let output = {
    }
    console.log(req.body.arr)
    console.log(req.body.m_sid)
    sql = "UPDATE`member` SET`r_challengeSuccess` = ? WHERE `m_sid`= ?"
    db.queryAsync(sql, [req.body.arr, req.body.m_sid])
        .then(obj => {
            if (obj.affectedRows == 1) {
                output.success = true;
                res.send(output)
            } else {
                throw new Error()
            }
        })
        .catch(e => {
            output.errMsg = '' + e;
            res.send(output)
        })
})

//---------------------------------------------------------------Delete-----------------------------------------------

router.delete('/route/:sid', (req, res)=>{
    let output={
        success:false,
        errMsg:''
    };
    let img_delete='';
    let sql ="SELECT `r_img` FROM `route` WHERE `r_sid`=?";
    let sql2 = "DELETE FROM `route` WHERE `r_sid`=?";
    db.queryAsync(sql, req.params.sid)
    .then(r=>img_delete=r[0].r_img)
    .then(r=>db.queryAsync(sql2, req.params.sid))
    .then(r=>{

        if(r.affectedRows===1){
            path=__dirname +'/../public/r_upload_img/'+img_delete
            if(fs.existsSync(path)){
                fs.unlink(path, (err) => {
                    if (err) throw new Error (''+err);
                });
            }
            output.success=true
            res.send(output)
        }
    })
    .catch(e=>{
        output.errMsg = 'Error----'+e;
        res.send(output)
    })
})

router.delete('/route/location/:sid',  (req, res)=>{
    let output={};

    let sql = "DELETE FROM `route_location` WHERE `l_sid`=?"
    db.queryAsync(sql, req.params.sid)
    .then(r=>{
        if(r.affectedRows===1){
            output.success = true;
            res.send(output);
        };
    })
    .catch(e=>{
        output.errMsg = 'Error----'+e;
        res.send(output);
    })
})

router.delete('/route/comment/:sid',  (req, res)=>{
    let output={};

    let sql = "DELETE FROM `route_comment` WHERE `r_c_sid`=?"
    db.queryAsync(sql, req.params.sid)
    .then(r=>{
        if(r.affectedRows===1){
            output.success = true;
            res.send(output);
        };
    })
    .catch(e=>{
        output.errMsg = 'Error----'+e;
        res.send(output);
    })
})



//拿到收藏路線
router.post("/routeCollect", upload.none(), (req, res) => {
    console.log('yes in')
    //console.log(req.params)
    console.log(req.body);
    // const body = req.body;
    // data.body = body;
    if (req.body.m_sid) {
        console.log(req.body.m_sid)
        var sql = "SELECT `r_collection`,`r_challengeSuccess` FROM `member` WHERE `m_sid`=" + req.body.m_sid;
        db.query(sql, (err, rows, fields) => {
            if (!err) res.json(rows);
            else console.log(err);
        })
    } else { console.log('eerror') };

})

//route資料表管理收藏人數
router.get("/route/collection/num/:instruction/:rsid", (req,res)=>{

    let sql="SELECT `r_collect_num` FROM `route` WHERE `r_sid` = ?"
    db.queryAsync(sql, req.params.rsid)
    .then(r=>{  
        let num = r[0].r_collect_num
        if (req.params.instruction ==0){
            num--
        }else{
           num++
        }
        return num})
    .then(r=>{
        console.log('--------------')
        console.log(r)
        let sql = "UPDATE `route` SET `r_collect_num`=? WHERE `r_sid`= ?"
        db.queryAsync(sql, [r, req.params.rsid])
        .then(r=>console.log("affectedRows"+r.affectedRows))
    })
    res.send('ok')
})

router.get("/route/challenge/num/:instruction/:rsid", (req, res) => {
    // console.log('--------------')
    // console.log(req.params.instruction)
    // console.log(req.params.rsid)
    // console.log('--------------')

    let sql = "SELECT `r_challenge_num` FROM `route` WHERE `r_sid` = ?"
    db.queryAsync(sql, req.params.rsid)
        .then(r => {
            //console.log(r[0].r_collect_num)  
            let num = r[0].r_challenge_num
            if (req.params.instruction == 0) {
                num--
            } else {
                num++
            }
            return num
        })
        .then(r => {
            console.log('--------------challenge')
            console.log(r)
            let sql = "UPDATE `route` SET `r_challenge_num`=? WHERE `r_sid`= ?"
            db.queryAsync(sql, [r, req.params.rsid])
                .then(r => console.log(r))
        })
    res.send('ok')
})


router.get("/routecollectionnum/:rsid", (req,res)=>{
    console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!737")
    let sql="SELECT `r_collect_num` FROM `route` WHERE `r_sid` = ?"
    db.queryAsync(sql, req.params.rsid)
    .then(r=>{  
        //console.log(r[0].r_collect_num)
        res.json( r[0].r_collect_num)
    })

})

module.exports = router;
