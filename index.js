const puppeteer = require('puppeteer');
const axios=require("axios");
const program=require("commander");
const util=require("./util.js");
program
    .version('0.0.1')
    .option('-r, --run <programName>','run specific program, default is none, should be one of "test"',/^(none|test)$/i,'none')
    .option('-o, --openBrowser','open browser or not,default is false')
    .parse(process.argv);
const PROGRAM_NAME=program.run;
const OPEN_BRWOSER=program.openBrowser;

const launchConfig={
    headless:!OPEN_BRWOSER
};
// console.log(PROGRAM_NAME);
// this function will get 500 companies of china
async function getChinaCompanies500FromWeb(){
    function pageInject () {
        const res=[];
        function getNodeText(node,selector){
            return node.querySelector(selector)&&node.querySelector(selector).innerText||selector
        }
        document.querySelectorAll('.m-result').forEach(node=>{
            const title=getNodeText(node,'.tit');
            const tags=[];
            node.querySelectorAll('.tags a').forEach(tag=>{
                tags.push(tag.innerText)
            });
            const address=getNodeText(node,'.contact li:nth-child(1)');
            const tel=getNodeText(node,'.contact li:nth-child(2)');
            const mail=getNodeText(node,'.contact li:nth-child(3)');
            const homepage=getNodeText(node,'.contact li:nth-child(4)');
            res.push({
                title,
                tags,
                address,
                tel,
                mail,
                homepage
            })
        });
        return res;
    }
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
        if (interceptedRequest.url().endsWith('.png') || interceptedRequest.url().endsWith('.jpg'))
            interceptedRequest.abort();
        else
            interceptedRequest.continue();
    });
    const urlGen=(pageNum)=>`http://114.163.com/search/0/0/?q=%E4%B8%AD%E5%9B%BD%E4%BA%94%E7%99%BE%E5%BC%BA&s=10&p=${pageNum}&from=pager`;
    await util.promiseChain(new Array(500/10).fill(1).map((val,index)=>index),async (i)=>{
        await page.goto(urlGen(i),{waitUntil:'domcontentloaded'});
        const postData=await page.evaluate(pageInject).catch(err=>{
            console.log(err)
        });
        console.log('get data',i,page.url());
        await util.promiseChain(postData,async (data)=>{
            await axios.post('http://localhost:3000/companies',data);
        },1,0);
    },1,500);
    await browser.close();
}
// getChinaCompanies500FromWeb().then(()=>{
//     process.exit();
// })
async function getCompaniesConsoleLog() {
    const urlList=[];
    const browser = await puppeteer.launch(launchConfig);
    const ctx={errLog:[]};
    await util.promiseChain(new Array(500).fill(1).map((val,idx)=>idx+1),async (idx)=>{
        const data=await axios.get(`http://localhost:3000/companies/${idx}`);
        // console.log(data);
        if(data.data){
            // console.log(data.data)
            if(data.data.homepage.startsWith('http')){
                urlList.push(data.data.homepage)
            }else if(data.data.mail.startsWith('http')) {
                urlList.push(data.data.mail)
            }else if(data.data.tel.startsWith('http')) {
                urlList.push(data.data.tel)
            }

        }
    },10,0);
    await util.promiseChain(urlList,async (url)=>{
        // console.log(url);
        await getCompanyConsoleLog({browser,url,ctx})
    },5,500)
    console.log(ctx.errLog);
}
async function getCompanyConsoleLog({browser,url,ctx}) {
    const page=await browser.newPage();
    await page.setRequestInterception(true);
    page.on('request', interceptedRequest => {
        if (interceptedRequest.url().endsWith('.png') || interceptedRequest.url().endsWith('.jpg'))
            interceptedRequest.abort();
        else
            interceptedRequest.continue();
    });
    page.on('console', msg => {
        for (let i = 0; i < msg.args().length; ++i)
            console.log(`${url}${i}: ${msg.args()[i]}`);
    });
    if(url.startsWith('http')){
        await Promise.race([
            page.goto(url),
            page.waitFor(10*1000)
        ]).catch(err=>{
            console.log(url,err);
            Array.isArray(ctx.errLog)&&ctx.errLog.push(url);
            return;
        });
    }
    await page.close();
}
async function runAndExit(fn) {
    if(typeof fn==='function'){
       await fn();
    }
    process.exit();
}
switch (PROGRAM_NAME){
    case 'none':{
        console.log(`no specific program, use -h for more information`);
        break;
    }
    case 'test':{
        runAndExit(getCompaniesConsoleLog);
        break;
    }
}