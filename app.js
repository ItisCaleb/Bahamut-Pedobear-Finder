const app=require('express')();
const cheerio = require('cheerio');
const webdriver = require('selenium-webdriver');
const fs = require('fs');
const CronJob = require('cron').CronJob;
const chrome = require('selenium-webdriver/chrome');
const chromedriver = require('chromedriver');
const {until,By} = require("selenium-webdriver");
const Jimp = require('jimp');
const axios = require('axios');
const spawn = require('child_process').spawn;

chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

const driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

 new CronJob('* 2 * * * *',async ()=>{
        let url = JSON.parse(fs.readFileSync(__dirname+'/url.json','utf8')) ;
        const idSet = await getUser(url[0])
        calculatePedoBear(idSet)
            .then((pedo)=>{
                let obj={
                    total:idSet.size,
                    pedo:pedo
                }
                let json = JSON.stringify(obj)
                fs.writeFileSync(__dirname+'/summary.json',json,'utf8')
            })
},null,false).start()



async function writeImage(total, pedo) {
    const font = await Jimp.loadFont(__dirname + '/font/TaipeiSansTCBeta-Bold.fnt');
    const image = await Jimp.read(__dirname + '/pedobear.jpg');
    image.print(font, 0, 350, "這串共有"+total+"個巴友");
    image.print(font, 0, 400, "其中有"+pedo+"個熊頭");
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
    try {
        let blacklist = JSON.parse(fs.readFileSync(__dirname+'/blacklist.json','utf8')) ;
            await driver.get(url);
            const pageSource = await driver
                .wait(until.elementLocated(By.css('body')), 100)
                .getAttribute('innerHTML');
            let $ = cheerio.load(pageSource);
            const page = $('.BH-pagebtnA').last().children('a').last().text();
            const idSet = new Set();
            for (let n=1;n<=page;n++){
                if(n!==1){
                    await driver.get(url+`&page=${n}`);
                    const thisPage = await driver
                        .wait(until.elementLocated(By.css('body')), 100)
                        .getAttribute('innerHTML');
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
            return idSet
    }catch (err){
        console.log(err)
    }
}
function calculatePedoBear(idSet){
        return new Promise(async (resolve) => {
                let pedo=0;
                let sum=0;
                for(let [i, user] of idSet.entries()){
                    const process = spawn('python',['pedo.py'])
                    process.stdout.on('data',(data)=>{
                        data = parseInt(data);
                        if(data>2){
                            pedo++;
                        }
                        sum++
                        if(sum === idSet.size-1){
                            resolve(pedo)
                        }
                    })
                    process.stdin.write(await getCard(user))
                    process.stdin.end()
                }



        })
}


app.get('/',async (req, res, next) => {
     const json = fs.readFileSync(__dirname+'/summary.json','utf-8')
     const obj = JSON.parse(json)
     const image = await writeImage(obj.total,obj.pedo)
     res.end(image,'binary')



})


app.listen(3000,()=>{
    console.log('server start')
})