const sleep = (time) => {
    return new Promise((resolve) => setTimeout(resolve, time));
};
const promiseChainArr=(array,cb,lengthPerChain=10,timeGap=300)=>{
    console.log('promiseChain',array.length);
    if(array.length>lengthPerChain){
        return Promise.all(cb(array.slice(0,lengthPerChain)))
            .then(res=>{
                console.log(`${lengthPerChain} done, after ${timeGap} start next chain`);
                return sleep(timeGap)
            }).then(res=>{
                return promiseChainArr(array.slice(lengthPerChain),cb,lengthPerChain,timeGap)
            })
    }else {
        return Promise.all(cb(array))
    }
};
const promiseChain=(array,cb,lengthPerChain=10,timeGap=300)=>{
    // console.log('promiseChain',array.length);
    if(array.length>lengthPerChain){
        return Promise.all(array.slice(0,lengthPerChain).map((value,index,arr)=>{
            return new Promise(resolve => resolve(cb(value,index,arr)))
        }))
            .then(res=>{
                // console.log(`${lengthPerChain} done, after ${timeGap} start next chain`);
                return sleep(timeGap)
            }).then(res=>{
                return promiseChain(array.slice(lengthPerChain),cb,lengthPerChain,timeGap)
            })
    }else {
        return Promise.all(array.map((value,index,arr)=>{
            return new Promise(resolve => resolve(cb(value,index,arr)))
        }))
    }
};

module.exports={
    promiseChain,
    sleep,
    promiseChainArr,
};