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

process.env.JWT_SECRET ||
"xhrzyz-secret"

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
// POST
// 创建称号模板
// owner专用
// =====================

export async function POST(

req:Request

){



try{


const userId =
await getUser();






if(!userId){


return NextResponse.json({

success:false,

message:"未登录"

});


}








const user =
await prisma.user.findUnique({

where:{

id:userId

},


select:{


role:true


}


});








if(!user || user.role!=="owner"){


return NextResponse.json({

success:false,

message:"只有站长可以创建称号"

});


}









const body =
await req.json();






const name =
String(

body.name || ""

)
.trim();






if(!name){


return NextResponse.json({

success:false,

message:"称号名称不能为空"

});


}









// 防止重复

const exists =
await prisma.userTitle.findUnique({

where:{

name

}

});







if(exists){


return NextResponse.json({

success:false,

message:"该称号已经存在"

});


}









const title =
await prisma.userTitle.create({

data:{


name,


color:

body.color ||

"#ffffff",



background:

body.background ||

"#333333",



border:

body.border ||

"none",



shadow:

body.shadow ||

null,



size:

Number(body.size)
||
14



}


});









return NextResponse.json({

success:true,

message:"称号创建成功",

title

});









}catch(e:any){



console.error(

"创建称号失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "创建失败"

});


}



}