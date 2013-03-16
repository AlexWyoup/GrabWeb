/**
 * Created with JetBrains WebStorm.
 * User: zhaojun
 * Date: 13-2-25
 * Time: 下午9:21
 * 抓取网页步骤
 * 1.抓取主页
 * 2.抓取title
 * 2.抓取head引用文件 找到head文件引用的css,js
 * 3.设置meta编码为UTF-8
 * 4.抓取a链接
 */
var http = require("http"),
    url = require("url"),
    iconv = require("iconv-lite"),
    fs = require("fs"),
    buffer = require("buffer");

var arguments = process.argv.splice(2);

var synNum = 0;//异步计数器 用于判断异步全部调用结束

var hrefUrl = "http://w3school.com.cn",
    urlInfo = url.parse(hrefUrl),
    rootDirPath = arguments + "/webRoot",//"E:/webroot",//__dirname + "/root",
    cssInfo = {
        root: rootDirPath + "/css",
        path: [],
        total: 0
    },//存放css文件计数器，文件name
    jsInfo = {
        root: rootDirPath + "/js",
        path: [],
        total: 0
    },//存放js文件计数器，文件name
    imgInfo = {
        root: rootDirPath + "/img",
        path: [],
        total: 0
    },//存放img文件计数器，文件name
    htmlInfo = {
        root: rootDirPath + "/html",
        path: [],
        total: 0
    };//存放html文件计数器，文件name
//创建 文件目录
function createDir(rootPath, dirNames){
    !fs.existsSync(rootPath) && fs.mkdirSync(rootPath);
    for(var name in dirNames){
        var path = rootPath + "/" + dirNames[name];
        !fs.existsSync(path) && fs.mkdirSync(path);
    }
}
//创建文件
function writeFile(str, dirPath){
    //console.log(dirPath);
    synNum --;
    if(synNum == 0){
        console.dir(cssInfo);
        console.dir( htmlInfo);
        console.timeEnd("grabWeb");
        console.log("html页面总数：" + htmlInfo.path.length);
    }
    !fs.existsSync(dirPath) && fs.writeFile(dirPath, str);

}
//读取指定路径的流
function readStream(urlObject, callback, path, isImg){
    //console.log(urlObject);
    http.get(urlObject, function(res){
        var htmlStr = "",
            regDir = /(.*\/)*(.*)/gim,
            result = regDir.exec(urlObject.path);
        res.setEncoding('binary');
        res.on('data', function(data){
                htmlStr += data;
            }).
            on('end', function(){
                var buf = new Buffer(htmlStr, 'binary');
                htmlStr = iconv.decode(buf, 'gbk');
                //callback 参数0为 写入数据， 1为写入路径， 2为服务器当前文件目录
                if(isImg){
                    callback && callback(buf, path, hrefUrl + result[1]);
                }else{
                    callback && callback(htmlStr, path, hrefUrl + result[1]);
                }

            }).
            on('error', function(e){
                console.log(e.message);
            });
    });
}
function run(){
    console.time("grabWeb");
    synNum ++;
    htmlInfo.path.push(hrefUrl + "/index.html");
    createDir(rootDirPath, ["css", "js", "html", "img"]);
    readStream(urlInfo, grabTitle);
}
//抓取title，并写入流到本地
function grabTitle(htmlStr, path, relativeDir){
    //抓取title信息
    var regTitle = /<title>(.*?)<\/title>/gim,
        result = regTitle.exec(htmlStr),
        dirName = result && (result[1] + htmlInfo.total + ".html"),
        //抓取CSS信息
        str = grabCss(htmlStr, relativeDir),
        //设定页面编码
        regCharset = /(<meta.*charset=\S*?)(?:(?:gbk)|(?:gb2312))(.*?>)/gim;
    str = str.replace(regCharset, "$1utf-8$2");
    //写入流到本地路径
    writeFile(str, path || htmlInfo.root + "/" + dirName);
    htmlInfo.total ++;
}
//抓取CSS信息
function grabCss(htmlStr, relativeDir){
    //检索css地址
    //cssInfo.path = [];
    var regCss = /(<link.*?href=['"])((\S+?)\.css.*?)(['"].*?\/>)/gim,//如果去掉g的话 会有bug
        isRoot = /^\//,//检测是否相对于根目录
        result = regCss.exec(htmlStr);

    while(result){
        //截取css文件名
        var regName = /(.*\/)*(.*)/gim;
        var rname = regName.exec(result[3]);
        var dirName = result && rname[2] +".css",
            dirPath = cssInfo.root + "/" + dirName;
        var grabPath = hrefUrl + result[2];
        if(!isRoot.test(result[2])){
            grabPath = relativeDir + result[2];
        }
        var oldName = isSet(grabPath, cssInfo.path);
        if(oldName){
            dirName = oldName;
        }else{
            cssInfo.path.push([grabPath, dirName]);
            readStream(url.parse(grabPath), grabImgByCSS, dirPath);
            synNum ++;
            cssInfo.total ++;
        }
        //替换href地址为本地地址
        htmlStr = htmlStr.replace(result[0], result[1] + "../css/" + dirName + result[4]);
        result = regCss.exec(htmlStr);


    }
    var str = grabJs(htmlStr, relativeDir);
    return str;
}
//检索js htmlStr中所有js链接，并且把js链接添加到jsInfo.pth记录。 所剩有
function grabJs(htmlStr, relativeDir){
    //jsInfo.path = [];
    var regJs = /(<script.*?src=['"])((\S+?)\.js)(['"].*?>)/gim,
        isRoot = /^\//,//检测是否相对于根目录
        result = regJs.exec(htmlStr);
    while(result){
        var jsName = result && result[3] + ".js",
            jsPath = jsInfo.root + "/" + jsName;
        var grabPath = hrefUrl + result[2];
        if(!isRoot.test(result[2])){
            grabPath = relativeDir + result[2];
        }
        var oldName = isSet(grabPath, jsInfo.path);
        if(oldName){
            jsName = oldName;
        }else{
            console.log("JSPATH: " + grabPath);
            jsInfo.path.push([grabPath, jsName]);
            readStream(url.parse(grabPath), writeFile, jsPath);
            synNum ++;
            jsInfo.total ++;
        }
        htmlStr = htmlStr.replace(result[0], result[1] + "../js/" + jsName + result[4]);
        result = regJs.exec(htmlStr);

    }
    var str = grabImg(htmlStr, relativeDir);
    return str;
}
function grabImg(htmlStr, relativeDir){
    var regImg = /(<img.*?src=['"])(\S+?)(['"].*\/>)/gim,
        isRoot = /^\//,//检测是否相对于根目录
        result = regImg.exec(htmlStr);
    while(result){
        var imgName = "img" + (imgInfo.total ++) + ".jpg",
            imgPath = imgInfo.root + "/" + imgName,
            grabPath = hrefUrl + result[2];
        if(!isRoot.test(result[2])){
            grabPath = relativeDir + result[2];
        }
        var oldName = isSet(grabPath, imgInfo.path);
        if(oldName){
            imgName = oldName;
            imgInfo.total --;
        }else{
            imgInfo.path.push([grabPath, imgName]);
            readStream(url.parse(grabPath), writeFile, imgPath, true);
            synNum ++;
        }
        htmlStr = htmlStr.replace(result[0], result[1] + "../img/" + imgName + result[3]);
        result = regImg.exec(htmlStr);
    }
    var str = grabHtml(htmlStr, relativeDir);
    return str;
}
//检索所有a链接
function grabHtml(htmlStr, relativeDir){
    //htmlInfo.path = [];
    var regA = /(<a.*?href=['"])([^(http)(www)(#)]\S+?)(['"].*?<\/a>)/gim,
        isRoot = /^\//,//检测是否相对于根目录
        result = regA.exec(htmlStr);
    while(result){
        var regName = /(.*\/)*(.*)/gim,
            rname = regName.exec(result[2]),
            htmlName = "web" + (htmlInfo.total ++) + ".html",//本地fileName
            htmlPath = htmlInfo.root + "/" + htmlName;//本地路径
        var grabPath = hrefUrl + result[2];//服务器路径
        if(!isRoot.test(result[2])){
            grabPath = relativeDir + result[2];
        }
        //判断该路径是否 已经存在
        var oldName = isSet(grabPath, htmlInfo.path);
        //console.log("HTMLPATH: " + result[2] + "localPath: " + htmlPath);
        if(oldName){
                htmlName = oldName;
                htmlInfo.total --;
        }else{
            console.log("HTMLPATH:" + grabPath+ "     " + result[0]);
            htmlInfo.path.push([grabPath, htmlName]);
            //readStream(url.parse(grabPath), grabTitle, htmlPath);
            synNum ++;
        }
        htmlStr = htmlStr.replace(result[0],  result[1] + "../html/" + htmlName + result[3]);
        result = regA.exec(htmlStr);

    }
    return htmlStr;
}
function grabImgByCSS(cssStr, path, relativeDir){
    var regImg = /(url.*?\(['"]*)(\S+?)(['"]*?\))/gim,
        isRoot = /^\//,//检测是否相对于根目录
        result = regImg.exec(cssStr);
    while(result){
        var imgName = "img" + (imgInfo.total ++) + ".jpg",
            imgPath = imgInfo.root + "/" + imgName,
            grabPath = hrefUrl + result[2];
        if(!isRoot.test(result[2])){
            grabPath = relativeDir + result[2];
        }
        var oldName = isSet(grabPath, imgInfo.path);
        if(oldName){
            imgName = oldName;
            imgInfo.total --;
        }else{
            console.log(grabPath);
            imgInfo.path.push([grabPath, imgName]);
            readStream(url.parse(grabPath), writeFile, imgPath, true);
            synNum ++;
        }
        cssStr = cssStr.replace(result[0], result[1] + "../img/" + imgName + result[3]);
        result = regImg.exec(cssStr);
    }
    writeFile(cssStr, path);
}
//类似java里的set集合
function isSet(obj, ary){
    var length = ary.length;
    for(var i = 0; i < length; i++){
        if(obj == ary[i][0]){
            return ary[i][1];
        }
    }
    return false;
}
function test(){
    var urlobj = url.parse("http://w3school.com.cn/tiy/t.asp?f=jsrf_date");
    http.get(urlobj, function(res){
        res.setEncoding('binary');
        var html = "";
        res.on('data', function(data){
            html += data;
            console.log(data);
        }).
            on('end', function(){
                var buf = new Buffer(html, 'binary');
                fs.writeFile(rootDirPath + "/t.asp?f=jsrf_date.html", buf);
            });
    });
}
//test();
run();
