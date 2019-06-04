const express = require ('express');
const app = express();
const fs = require('fs');
const multer = require('multer')
const bluebird = require('bluebird');
const mysql  = require('mysql');
const uuidv4 = require('uuid/v4');
const bodyParser = require('body-parser')
const cors = require('cors');


const db = mysql.createConnection({
    host: "localhost",
    user: "wang",
    password: "admin",
    database: "the_wheel"
})

db.connect();
bluebird.promisifyAll(db);

const upload = multer({dest:'tmp_uploads/'});

app.use(cors())
//---------------------------------------------------------------Read-------------!!!!! CONNENT NOT DONE YET ---------
app.get('/route', (req, res)=>{
    // res.setHeader("Access-Control-Allow-Origin", "http://localhost:3000");
    let page=req.query.page*15
    // let sql = "SELECT * FROM `route` ORDER BY `route`.`r_sid` " + req.query.orderby +" LIMIT "+page+" , 15";
    let sql= "SELECT r.*,m.`m_sid`,m.`m_photo`,m.`m_name` FROM `route`AS r INNER JOIN `member` AS m ON r.`m_sid` = m.`m_sid` ORDER BY r.`r_sid` " + req.query.orderby +" LIMIT "+page+" , 15";
    db.queryAsync(sql)
    .then(results=>res.send(results))
    .catch(e=>res.send(e))
});

app.get('/route/:sid',(req,res)=>{
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
    })
    .then(obj=>res.send(output))
        .catch(e => res.send('Error----' + e))
});
//---------------------------------------------------------------Create-----------------------------------------------
app.post('/route', upload.single('r_img'), (req,res)=>{
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
        res.send(output);
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
                res.send(output);
                return;       
        }
        img_name=uuidv4()+ext
    }

    body.r_img = img_name;

    let sql = "INSERT INTO`route` SET ?";
    db.queryAsync(sql, body)

    .then(results=>{
        if(results.affectedRows===1){
            if(img_name!==''){
                fs.createReadStream(req.file.path).pipe(
                    fs.createWriteStream(__dirname + '/../public/r_upload_img/'+img_name)
                )
            }
            output.success = true;
            output.thisRoute = results.insertId;
        }
    })
    .then(()=>res.send(output))
    .catch(e => {
        output.errMsg=e;
        res.send(output)
    })
    
})
//--------------------insert location
app.post('/route/location',  upload.none(), (req, res)=>{
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
    // console.log(body)
    // console.log(body.l_name)
    // console.log(body.l_name[0])
    let num = body.l_name.length;
    // console.log(num)
    // console.log(body.r_sid.length)
    
    // if (!body.r_sid.length!==num) {
    //     output.errMsg = '無法確定地點歸屬路線';
    //     res.send(output);
    //     return;
    // }
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

app.post('/route/comment',  bodyParser.urlencoded({extended: false}), (req,res)=>{
    let output = {
        success: false,
        errMsg: '',
    };
    const body = req.body;
    output.post= body;
    if (!body.r_sid || !body.m_sid || !body.r_c || !body.r_c_time) {
        output.errMsg = '資料輸入不完整';
        res.send(output);
        return;
    }

    let sql= "INSERT INTO `route_comment` SET ?";

    db.queryAsync(sql, body)
    .then(r=>{
        if(r.affectedRows===1){
            output.success=true
            res.send(output)
        }
    })
    .catch(e=>{
        output.errMsg=e;
        res.send(output)
    })
})

//---------------------------------------------------------------Update-----------------------------------------------
app.get('/route/edit/:sid',(req,res)=>{
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


app.put('/route/:sid',upload.single('r_img'), (req, res)=>{
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


app.put('/route/location/:sid', bodyParser.urlencoded({extended: false}), (req, res)=>{
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


// app.put('/route/comment',  bodyParser.urlencoded({extended: false}), (req,res)=>{
//     let output = {
//         success: false,
//         errMsg: '',
//     };
//     const body = req.body;
//     output.post= body;
//     if (!body.r_sid || !body.m_sid || !body.r_c || !body.r_c_time) {
//         output.errMsg = '資料輸入不完整';
//         res.send(output);
//         return;
//     }

//     let sql= "UPDATE INTO `route_comment` SET ?";

//     db.queryAsync(sql, body)
//     .then(r=>{
//         if(r.affectedRows===1){
//             output.success=true
//             res.send(output)
//         }
//     })
//     .catch(e=>{
//         output.errMsg=e;
//         res.send(output)
//     })
// })
//---------------------------------------------------------------Delete-----------------------------------------------

app.delete('/route/:sid', (req, res)=>{
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

app.delete('/route/location/:sid',  (req, res)=>{
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

app.delete('/route/comment/:sid',  (req, res)=>{
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



app.listen(5000,function(){
    console.log('server start poot number 5000')
});