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
    fs = require("fs");

var synNum = 0;//异步计数器 用于判断异步全部调用结束

var hrefUrl = "http://w3school.com.cn",
    urlInfo = url.parse(hrefUrl),
    rootDirPath = __dirname + "/root",
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
        !fs.existsSync(path) && fs.mkdir(path);
    }
}
//创建文件
function writeFile(str, dirPath){
    //console.log(dirPath);
    synNum --;
    if(synNum == 0){
        console.timeEnd("grabWeb");
        console.dir("cssInfo: " + cssInfo);
        console.dir("htmlInfo: " + htmlInfo);
    }
    !fs.existsSync(dirPath) && fs.writeFile(dirPath, str);

}
//读取指定路径的流
function readStream(urlObject, callback, path){
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
                callback && callback(htmlStr, path, hrefUrl + result[1]);

            }).
            on('error', function(e){
                console.log(e.message);
            });
    });
}
function run(){
    console.time("grabWeb");
    synNum ++;
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
        regCharset = /(<meta.*charset=)(?:(?:gbk)|(?:gb2312))(.*?\/>)/gim;
    str = str.replace(regCharset, "$1utf-8$2");
    //写入流到本地路径
    writeFile(str, path || htmlInfo.root + "/" + dirName);
    htmlInfo.total ++;
}
//抓取CSS信息
function grabCss(htmlStr, relativeDir){
    //检索css地址
    //cssInfo.path = [];
    var regCss = /(<link.*?href=['"])((.+?)\.css.*?)(['"].*?\/>)/gim,//如果去掉g的话 会有bug
        result = regCss.exec(htmlStr);

    while(result){
        //截取css文件名
        var regName = /(.*\/)*(.*)/gim;
        var rname = regName.exec(result[3]);
        var dirName = result && rname[2] +".css",
            dirPath = cssInfo.root + "/" + dirName;
        //console.log("CSSPATH: " + result[2]);
        if(isSet(result[2], cssInfo.path)){
            console.log("CSSPATH: " + result[2]);
            cssInfo.path.push(result[2]);
            readStream(url.parse(hrefUrl + result[2]), writeFile, dirPath);
            synNum ++;
        }
        //替换href地址为本地地址
        htmlStr = htmlStr.replace(new RegExp(result[2], "g"), "../css/" + dirName);
        result = regCss.exec(htmlStr);
        cssInfo.total ++;

    }
    var str = grabJs(htmlStr, relativeDir);
    return str;
}
//检索js htmlStr中所有js链接，并且把js链接添加到jsInfo.pth记录。 所剩有
function grabJs(htmlStr, relativeDir){
    //jsInfo.path = [];
    var regJs = /(<script.*?src=['"])((.+?)\.js)(['"].*?>)/gim,
        result = regJs.exec(htmlStr);
    while(result){
        var jsName = result && result[3] + ".js",
            jsPath = jsInfo.root + "/" + jsName;
        if(isSet(result[2], jsInfo.path)){
            jsInfo.path.push(result[2]);
            readStream(url.parse(hrefUrl + result[2]), writeFile, jsPath);
            synNum ++;
        }
        htmlStr = htmlStr.replace(result[0], result[1] + "../js/" + jsName + result[4]);
        result = regJs.exec(htmlStr);
        jsInfo.total ++;

    }
    var str = grabHtml(htmlStr, relativeDir);
    return str;
}
//检索所有
function grabHtml(htmlStr, relativeDir){
    //htmlInfo.path = [];
    var regA = /(<a.*?href=['"])([^(http)(www)(#)].*?)(['"].*?<\/a>)/gim,
        isRoot = /^\//,//检测是否相对于根目录
        result = regA.exec(htmlStr);
    while(result){
        var regName = /(.*\/)*(.*)/gim,
            rname = regName.exec(result[2]),
            htmlName = rname && rname[2] + (htmlInfo.total ++) + ".html",
            htmlPath = htmlInfo.root + "/" + htmlName;
        var grabPath = hrefUrl + result[2];
        if(!isRoot.test(result[1])){
            grabPath = relativeDir + "/" + result[2];
        }
        //console.log("HTMLPATH: " + result[2] + "localPath: " + htmlPath);
        if(isSet(result[2], htmlInfo.path)){
            console.log("HTMLPATH:" + result[2] + "     " + result[0]);
            htmlInfo.path.push(result[2]);
            console.log();
            readStream(url.parse(grabPath), grabTitle, htmlPath);
            synNum ++;
        }
        htmlStr = htmlStr.replace(result[0], result[1] + "../html/" + htmlName + result[3] );
        result = regA.exec(htmlStr);

    }

    return htmlStr;
}
//类似java里的set集合
function isSet(obj, ary){
    var length = ary.length;
    for(var i = 0; i < length; i++){
        if(obj == ary[i]){
            return false;
        }
    }
    return true;
}
//createDir(rootDirPath, ["css", "js", "html", "img"]);
run();

//var root = "http://w3school.com.cn";
//var rootFile = __dirname + "/root";
//var urlInfo = url.parse(root),
//    html = "";
//var run = function(){
//    http.get(urlInfo, function(res){
//        console.log(res.statusCode);
//        res.setEncoding('binary');
//        res.on('data', function(data){
//            html += data;
//        }).
//            on('end', function(){
//                var buf = new Buffer(html, 'binary');
//                var str = iconv.decode(buf, 'gbk');
//                var htmlStream = str;
//                str = str.replace(/\s/gim, "");
//                str = str.replace(/'/, "\"");
//                var cssAry = regExps.regCss(str);
//                createFile(rootFile + '/w3c/index.html', htmlStream)
//                for(var i in cssAry){
//                    var reg = /[^(href=")].*.css/;
//                    var path = reg.exec(cssAry[i]);
//                    grabFile(path[0]);
//                }
////        fs.writeFile("index.html", str, function(){
////            console.log("参数:" +  arguments.length);
////        });
//            });
//    }).on("error", function(e){
//            console.log(e.message);
//        });
//}
///**
//* 抓取文件 如果文件路径带/则按/分割路径字符串 分割获取到的字符则按层级创建文件夹
//* 如果路径首字符是/则把文件创建到根目录
//* @param filePath 链接文件路径
//*/
//var grabFile = function(filePath){
//    var urlInfo = url.parse(root + filePath);
//    console.log(urlInfo);
//    var fileStream = "";
//    http.get(urlInfo, function(res){
//        res.setEncoding('binary');
//        res.on('data', function(data){
//            fileStream += data;
//        }).
//        on('end', function(){
//            var dirpath = createDirectory(filePath);
//            createFile(dirpath + filePath, fileStream)
//        });
//    }).on('error', function(e){
//        console.log(e.message);
//    });
//}
////按路径层级创建文件夹
//var createDirectory = function(filePath){
//    //分解路径
//    var dirPath = rootFile + "/w3c";
//    var aryfile = filePath.split("/");
//    var fileName = aryfile.pop();
////    (aryfile[0] == "") && a(ryfile[0] = rootFile);
//    //创建文件夹
//    for(var i = 0; i < aryfile.length; i++){
//        var item = aryfile[i];
//        if(item != ""){
//            dirPath += "/" + item;
//            console.log(dirPath);
//            !fs.existsSync(dirPath) && fs.mkdirSync(dirPath);
//        }else{
//            dirPath = rootFile;
//        }
//    }
//    return dirPath;
//}
////创建文件
//var createFile = function(path, fileStream){
//    console.log(fileStream);
//    console.log(path);
//    fs.writeFile(path, fileStream);
//}
//var headMap = [];
//var regExps = {
//    regCss: function(str){
//        var regHead = /<head>.*<\/head>/gim;
//        var headStr = regHead.exec(str)[0];
//        headStr.replace(/\s/gim, "");
//        var grabCss = /href.*?.css/gim;
//        var cssPath = grabCss.exec(headStr);
//        var cssAry = [];
//        while(cssPath){
//            console.log(cssPath);
//            cssPath != null && cssAry.push(cssPath[0]);
//            cssPath = grabCss.exec(headStr);
//        }
//        return cssAry;
//    }
//};
//
//run();
function test(){
    var reg = /href=['"](.+?)['"]/im;
    var str = '<link rel="stylesheet" type="text/ss" href="/c4.css" />';
    var result = reg.exec(str);
    var i = 1;
    while(i < 10){
        writeFile(imgInfo.root + "/a" + i + ".txt", i );
        i ++;
    }
}
function test1(){
    var ary = [];
}
//console.log(url.parse("http://w3school.com.cn"));
//test();
