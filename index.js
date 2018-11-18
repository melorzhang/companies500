const puppeteer = require('puppeteer');
const axios=require("axios");
const util=require("./util.js");
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
getChinaCompanies500FromWeb().then(()=>{
    process.exit();
})