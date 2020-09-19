const app = require('express')();
const cheerio = require('cheerio');
const fs = require('fs');
const cron = require('node-cron');
const Jimp = require('jimp');
const axios = require('axios');
const spawn = require('child_process').spawn;

app.set('view engine', 'ejs')
app.use(function (req, res, next) {
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    next()
});

async function getAllThePedo(){
    let url = JSON.parse(fs.readFileSync(__dirname+'/url.json','utf8')) ;
    if(url.length===0) return
    for(let i=0;i<url.length;i++){
        if(url[i].start ===false) continue;
        let idSet = await getUser(url[i].url)
        calculatePedoBear(idSet)
            .then((pedo)=>{
                console.log("writing result...")
                url[i] = {
                    url: url[i].url,
                    start: url[i].start,
                    total: idSet.size,
                    pedo: pedo
                }
                let json = JSON.stringify(url)
                fs.writeFileSync(__dirname+'/url.json',json,'utf8')
                console.log('write complete!')
            })
        }

}
getAllThePedo()

cron.schedule('*/6 * * * *',getAllThePedo, {timezone: "Asia/Taipei"}).start();



async function writeJPG(total, pedo) {
    const font = await Jimp.loadFont(__dirname + '/font/TaipeiSansTCBeta-Bold.fnt');
    const image = await Jimp.read(__dirname + '/0.jpg');
    image.print(font, 0, 350, "這串共有"+total+"個巴友");
    image.print(font, 0, 400, "其中有大約"+pedo+"個熊頭");
    if(pedo >= total/3) image.print(font, 0, 450, "FBI正在密切關注這個討論串");
    else image.print(font, 0, 450, "這個討論串非常正常");
    return image.getBufferAsync(Jimp.MIME_JPEG)
        .then(value => {
            return value;
        })
        .catch(err=>{
          console.log(err)
        });
}
async function getCard(id){
    return axios.get(`https://avatar2.bahamut.com.tw/avataruserpic/${id[0]}/${id[1]}/${id}/${id}.png`,
        {
            responseType:'arraybuffer'
        })
        .then((res) => {
            return Buffer.from(res.data).toString('base64');
        })
        .catch(err=>{
            console.log(err)
        })
}
async function getUser(url){
    return new Promise(async (resolve,reject)=>{
         try {
            let blacklist = JSON.parse(fs.readFileSync(__dirname+'/blacklist.json','utf8')) ;
                const pageSource = (await axios.get(url)).data
                let $ = cheerio.load(pageSource);
                const page = $('.BH-pagebtnA').last().children('a').last().text();
                const idSet = new Set();
                for (let n=1;n<=page;n++){
                    if(n!==1){
                        let thisPage = (await axios.get(url+`&page=${n}`)).data
                        $ = cheerio.load(thisPage);
                    }
                    const img = $('.gamercard')
                    img.each((i)=>{
                        let userId = img[i].attribs['data-gamercard-userid'].toLowerCase();
                        if(!idSet.has(userId) && !blacklist.includes(userId)){
                            idSet.add(userId);
                        }
                    })
                }
                console.log('getUser success!')
                resolve(idSet)
        }catch (err){
            console.log(err)
            reject(err)
        }
    })

}
function calculatePedoBear(idSet){
        return new Promise(async (resolve) => {
                let pedo=0;
                let sum=0;
                for(let user of idSet){
                    const process = spawn('python',['pedo.py'])
                    process.stdout.on('data',(data)=>{
                        data = parseInt(data);
                        if(data>2){
                            pedo++;
                        }
                        sum++
                        if(sum === idSet.size-1){
                            console.log('calculate complete!')
                            resolve(pedo)
                        }
                    })
                    process.stdin.write(await getCard(user))
                    process.stdin.end()
                }



        })
}

app.get('/',async (req, res) => {
     res.send('這裡沒有任何東西');
})
app.get('/jpg/:id',async (req, res) => {
     const json = fs.readFileSync(__dirname+'/summary.json','utf-8')
     const noimage = fs.readFileSync(__dirname+'/1.jpg')
     const obj = JSON.parse(json)[req.params.id.split('.')[0]]
     if(obj == null) return res.status(404).end(noimage,'binary')
     const image = await writeJPG(obj.total,obj.pedo)
     res.status(200).end(image,'binary')
})
function getRandomInt(max) {
         return Math.floor(Math.random() * Math.floor(max));
     }
app.get('/svg/:id',async (req, res) => {
     const json = fs.readFileSync(__dirname+'/url.json','utf-8')
     const int = getRandomInt(3)
     const image = fs.readFileSync(__dirname+`/${int}.jpg`).toString('base64')
     const noimage = fs.readFileSync(__dirname+'/1.jpg')
     const obj = JSON.parse(json)[req.params.id.split('.')[0]]
     if(obj == null) return res.status(404).end(noimage,'binary')
     res.header('Content-Type', 'image/svg+xml');
     res.status(200).render('svg',{
         img: image,
         total:obj.total,
         pedo:obj.pedo,
         text:(obj.pedo>=obj.total/3)?'這裡正在被FBI關注':'這裡十分正常'
     })
})


// error handler
app.use(function (req,res) {
    // render the error page
    const noimage = fs.readFileSync(__dirname+'/1.jpg')
    res.status(404);
    res.end(noimage,'binary')
});

app.listen(2000,()=>{
    console.log('server start')
})