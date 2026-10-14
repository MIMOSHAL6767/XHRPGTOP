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
// GET
// 获取用户称号
// =====================

export async function GET(){


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


id:true,


title:true,


titleStyle:true,


showTitle:true,



userTitles:{


include:{


title:true


}


}


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







}catch(e:any){



console.error(

"获取称号失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "获取失败"

});


}


}












// =====================
// PUT
// 佩戴指定称号
// =====================

export async function PUT(

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







const body =
await req.json();





const titleId =
Number(body.titleId);







if(!titleId){


return NextResponse.json({

success:false,

message:"称号ID错误"

});


}









// 检查是否拥有

const own =

await prisma.userTitleGrant.findUnique({

where:{


userId_titleId:{


userId,


titleId


}


},


include:{


title:true


}


});







if(!own){


return NextResponse.json({

success:false,

message:"你没有这个称号"

});


}







const title =
own.title;









// 更新当前佩戴

const user =

await prisma.user.update({

where:{

id:userId

},


data:{


title:title.name,


titleStyle:{


color:title.color,


background:title.background,


border:title.border,


shadow:title.shadow,


size:title.size


},


showTitle:true


}


});








return NextResponse.json({

success:true,

message:"称号佩戴成功",

user


});







}catch(e:any){



console.error(

"佩戴称号失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "操作失败"

});


}


}












// =====================
// DELETE
// 取消佩戴
// =====================

export async function DELETE(){


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

await prisma.user.update({

where:{

id:userId

},


data:{


title:null,


titleStyle:{},


showTitle:false


}


});









return NextResponse.json({

success:true,

message:"已取消佩戴称号",

user


});







}catch(e:any){


console.error(

"取消称号失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "操作失败"

});


}



}