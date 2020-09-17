const app = require('express')();
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

 new CronJob('*/120 * * * * *',async ()=>{
        let url = JSON.parse(fs.readFileSync(__dirname+'/url.json','utf8')) ;
        if(url.length===0) return
        for(let i=0;i<url.length;i++){
            let idSet = await getUser(url[i])
            calculatePedoBear(idSet)
                .then((pedo)=>{
                    let data = fs.readFileSync(__dirname+'/summary.json','utf8')
                    let obj={
                        url:url[i],
                        total:idSet.size,
                        pedo:pedo
                    }
                    data = JSON.parse(data)
                    data[i] = (obj)
                    let json = JSON.stringify(data)
                    fs.writeFileSync(__dirname+'/summary.json',json,'utf8')
                })
        }

},null,true).start()



async function writeImage(total, pedo) {
    const font = await Jimp.loadFont(__dirname + '/font/TaipeiSansTCBeta-Bold.fnt');
    const image = await Jimp.read(__dirname + '/pedobear.jpg');
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
                resolve(idSet)
        }catch (err){
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
app.get('/:id',async (req, res) => {
     const json = fs.readFileSync(__dirname+'/summary.json','utf-8')
     const noimage = fs.readFileSync(__dirname+'/cry.jpg')
     const obj = JSON.parse(json)[req.params.id]
     if(obj == null) return res.status(404).end(noimage,'binary')
     const image = await writeImage(obj.total,obj.pedo)
     res.end(image,'binary')
})


app.listen(2000,()=>{
    console.log('server start')
})