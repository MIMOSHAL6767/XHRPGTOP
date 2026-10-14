import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";




// =====================
// 获取当前用户
// =====================

async function getUser(){


const cookieStore =
await cookies();



const token =
cookieStore.get("token")?.value;



if(!token){

return null;

}



try{


const secret =
new TextEncoder().encode(

process.env.JWT_SECRET || "xhrpg-secret"

);



const {payload} =
await jwtVerify(

token,

secret

);



return Number(payload.id);



}catch{


return null;


}


}












// =====================
// 获取自己的资料
// =====================

export async function GET(){



const id =
await getUser();



if(!id){


return NextResponse.json({

success:false,

message:"未登录"

});


}







const user =
await prisma.user.findUnique({

where:{

id

},


select:{


id:true,


username:true,


nickname:true,


avatar:true,


background:true,


bio:true,


tags:true,



// =====================
// 称号
// =====================

title:true,

titleStyle:true,

showTitle:true



}


});







if(!user){


return NextResponse.json({

success:false,

message:"用户不存在"

});


}






return NextResponse.json({

success:true,

user

});


}












// =====================
// 修改个人资料
// =====================

export async function PUT(

req:Request

){



try{


const id =
await getUser();



if(!id){


return NextResponse.json({

success:false,

message:"未登录"

});


}






const body =
await req.json();









// =====================
// 昵称检测
// =====================


let nickname =
body.nickname;



if(nickname!==undefined){



nickname =
String(nickname)
.trim();





if(
nickname.length < 2 ||
nickname.length > 12
){


return NextResponse.json({

success:false,

message:"昵称长度需要2-12个字符"

});


}







const existNickname =
await prisma.user.findUnique({

where:{

nickname

}

});







if(

existNickname &&

existNickname.id!==id

){


return NextResponse.json({

success:false,

message:"该昵称已经被使用"

});


}



}









// =====================
// 标签处理
// =====================


let tags =
body.tags;



if(Array.isArray(tags)){



tags =

tags

.map(

(t:any)=>

String(t).trim()

)

.filter(Boolean)

.slice(0,5);


}









// =====================
// 更新资料
// 注意：
// 称号字段不在这里修改
// =====================


const user =
await prisma.user.update({

where:{

id

},


data:{


nickname,


avatar:body.avatar,


background:body.background,


bio:body.bio,


tags


},


select:{


id:true,

username:true,

nickname:true,

avatar:true,

background:true,

bio:true,

tags:true,


// 返回称号

title:true,

titleStyle:true,

showTitle:true


}



});








return NextResponse.json({

success:true,

message:"保存成功",

user

});








}catch(e:any){



console.error(

"修改资料失败:",

e

);




return NextResponse.json({

success:false,

message:

e.message ||

"修改失败"

});


}



}