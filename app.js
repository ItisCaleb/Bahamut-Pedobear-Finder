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
const cv = require('opencv')


chrome.setDefaultService(new chrome.ServiceBuilder(chromedriver.path).build());

const driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

async function writeImage(res) {
    const font = await Jimp.loadFont(__dirname + '/font/TaipeiSansTCBeta-Bold.fnt');
    const image = await Jimp.read(__dirname + '/pedobear.jpg');
    image.print(font, 0, 300, "現在的時間是:");
    image.print(font, 0, 450, new Date().toISOString()
        .replace(/T/, ' ')
        .replace(/\..+/, '')
    );
    res.writeHead(200, {'Content-Type': 'image/jpeg'});
    image.getBuffer(Jimp.MIME_JPEG, (err, value) => {
        res.end(value, 'binary');
    })
}

async function getCard(id){
    return axios.get(`https://avatar2.bahamut.com.tw/avataruserpic/${id[0]}/${id[1]}/${id}/${id}.png`,
        {
            responseType:'arraybuffer'
        })
        .then((res) => {
            return Buffer.from(res.data).toString('base64')
        })
        .catch(err=>{
            console.log(err)
        })
}
async function getUser(url){
    try {
        let blacklist = JSON.parse(fs.readFileSync(__dirname+'/blacklist.json','utf8')) ;
            await driver.get(url[i]);
            const pageSource = await driver
                .wait(until.elementLocated(By.css('body')), 100)
                .getAttribute('innerHTML');
            let $ = cheerio.load(pageSource);
            const page = $('.BH-pagebtnA').last().children('a').last().text();
            const idSet = new Set();
            for (let n=1;n<=page;n++){
                await driver.get(url[i]+`&page=${n}`);
                const thisPage = await driver
                    .wait(until.elementLocated(By.css('body')), 100)
                    .getAttribute('innerHTML');
                $ = cheerio.load(thisPage);
                const img = $('.gamercard')
                img.each((i)=>{
                    let userId = img[i].attribs['data-gamercard-userid'].toLowerCase();
                    if(!idSet.has(userId) && !blacklist.includes(userId)){
                        idSet.add(userId);
                    }
                })
            }
            console.log(idSet)
            return idSet
    }catch (err){
        console.log(err)
    }
}

app.get('/',async (req, res, next) => {
        //let url = JSON.parse(fs.readFileSync(__dirname+'/url.json','utf8')) ;
        //const idSet = getUser(url[0])
        res.send('<img src=data:image/png;base64,'+await getCard('itiscaleb')+'>');

})



app.listen(3000,()=>{
    console.log('server start')
})