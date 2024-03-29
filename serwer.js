let express = require('express');
let mysql = require('mysql');
let env = require('dotenv');
let crc32 = require('crc32');
const basicAuth = require('express-basic-auth')
env.config();

let app = new express();

// zmiany     
let db_conf = {    
  connectionLimit : 10,
    host: process.env.host,
    user: process.env.user,
    password: process.env.pass,
    database: process.env.db,
    port: 3306
};



var con = null
//con.connect();

function mysql_connect()
{
  console.log("łącze");
    con = mysql.createConnection(db_conf);


con.on('error', function(err) {
//    console.log("myerr",err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { 
     
      mysql_connect();
    } else { 
      throw err;
    }
  });
}
mysql_connect();

app.use(express.static('public'));
let server = app.listen(81, () => {
    console.log(`Start serwera
    `)
})

let alarm = false;

// app.use(basicAuth({
//   users: { 'admin': 'admin' }
// }))

let usersdata = {};
usersdata[process.env.auth_username]=process.env.auth_password
var staticUserAuth = basicAuth({
  users: usersdata,
  challenge: false
})


  app.get('/endis',staticUserAuth, (req,res)=>{
    con.query("select * from bell", (err, result)=>{
      if(!err)
      {
        let re = result[0];
        let data = JSON.parse(re.data);
        data.endis = !data.endis;
        let dane = JSON.stringify(data);
        con.query("update bell set `data` = '"+dane+"',  `crc32`=crc32('"+dane+"') where id=1", (err1, res1)=>{});     
      }
      res.send({status:'ok'});
    });
  });

  app.get('/addoffset',staticUserAuth, (req,res)=>{
  if(req.query.val && req.query.val=='plus')
  {
    con.query('update bell set timeoffset=timeoffset+1 where id=1')
  }
  if(req.query.val && req.query.val=='minus')
  {
    con.query('update bell set timeoffset=timeoffset-1 where id=1')
  }
  res.send({status:'ok'});
})
app.get('/login',staticUserAuth, (req, res)=>{
  res.send({status:'ok'});
})


app.get('/zapiszdzwonki',staticUserAuth, (req,res)=>{


  con.query("select * from bell", (err, result)=>{
    if(!err)
    {
      let re = result[0];
      let data = JSON.parse(re.data);
      data.bell = JSON.parse(req.query.dane)
      data.belltime=req.query.czasdzwonka;
      data.startlesson=req.query.startlekcji;
      data.timelesson=req.query.czaslekcji;

      let dane = JSON.stringify(data);
      
      con.query("update bell set `data` = '"+dane+"',  `crc32`=crc32('"+dane+"') where id=1", (err1, res1)=>{});     
    }
  });
  res.send({status:'ok'});

});


app.get('/data', (req,res)=>{

    con.query("select * from bell", (err, result)=>{
      if(err )  
      {
        console.log(err);
          res.send({status:false});
          return;
      }
        let odp = result[0];
        odp.alarm = alarm; 
        // czas serwera
        let now = new Date();
        odp.data = JSON.parse(odp.data);
        odp.time = Math.floor( now.getTime() / 1000) + odp.timeoffset;
        res.send(odp);
    })
})

app.get('/setbellday', staticUserAuth,(req, res)=>{

  con.query("select * from bell", (err, result)=>{
    if(err )  
    {
      console.log(err);
        res.send({status:false});
        return;
    }
    let re = result[0];
    let data = JSON.parse(re.data);
    data.bellday = req.query.bellday
    let dane = JSON.stringify(data);
    
    con.query("update bell set `data` = '"+dane+"',  `crc32`=crc32('"+dane+"') where id=1", (err1, res1)=>{});     
    res.send({status:true});
  });
});

app.get('/setalarm',staticUserAuth, (req, res)=>{
    
    let alarm1 = req.query.alarm?req.query.alarm:false;
    if(alarm1){
       // console.log('start alarm')
        setTimeout(()=>{
           // console.log('stop alarm')
            alarm = false;
        }, 20000);
        alarm = !alarm;
    }
    res.send({alarm:alarm});
})

const io = require('socket.io')(server,{
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
      },
});