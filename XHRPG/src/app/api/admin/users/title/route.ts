import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";




// =====================
// 获取当前登录用户
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
// 获取指定用户称号
// =====================

export async function GET(

req:Request

){


try{


const {searchParams} =
new URL(req.url);



const userId =
Number(

searchParams.get("uid")

);





if(!userId){


return NextResponse.json({

success:false,

message:"缺少用户ID"

});


}







const user =
await prisma.user.findUnique({

where:{

id:userId

},


select:{


id:true,


username:true,


nickname:true,


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

"获取用户称号失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "获取失败"

});


}


}











// =====================
// POST
// 创建称号模板
// =====================

export async function POST(

req:Request

){


try{


const operatorId =
await getUser();



if(!operatorId){

return NextResponse.json({

success:false,

message:"未登录"

});

}





const operator =
await prisma.user.findUnique({

where:{

id:operatorId

}

});





if(

!operator ||

operator.role!=="owner"

){


return NextResponse.json({

success:false,

message:"只有站长可以创建称号"

});


}







const body =
await req.json();






const title =
await prisma.userTitle.create({

data:{


name:String(body.name),


color:

body.color || "#ffffff",



background:

body.background || "#333333",



border:

body.border || "none",



shadow:

body.shadow || null,



size:

Number(body.size) || 14



}


});







return NextResponse.json({

success:true,

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











// =====================
// PUT
// 授予称号
// =====================

export async function PUT(

req:Request

){


try{


const operatorId =
await getUser();





if(!operatorId){

return NextResponse.json({

success:false,

message:"未登录"

});

}





const operator =
await prisma.user.findUnique({

where:{

id:operatorId

}

});





if(

!operator ||

operator.role!=="owner"

){


return NextResponse.json({

success:false,

message:"权限不足"

});


}







const body =
await req.json();



const userId =
Number(body.userId);



const titleId =
Number(body.titleId);






if(!userId || !titleId){


return NextResponse.json({

success:false,

message:"参数错误"

});


}









const exists =
await prisma.userTitleGrant.findUnique({

where:{


userId_titleId:{


userId,


titleId


}


}


});






if(exists){


return NextResponse.json({

success:false,

message:"用户已经拥有该称号"

});


}








const grant =
await prisma.userTitleGrant.create({

data:{


userId,


titleId


}

});








return NextResponse.json({

success:true,

message:"称号授予成功",

grant

});







}catch(e:any){



console.error(

"授予称号失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "授予失败"

});


}


}











// =====================
// DELETE
// 收回称号
// =====================

export async function DELETE(

req:Request

){


try{


const operatorId =
await getUser();





if(!operatorId){

return NextResponse.json({

success:false,

message:"未登录"

});

}





const operator =
await prisma.user.findUnique({

where:{

id:operatorId

}

});





if(

!operator ||

operator.role!=="owner"

){


return NextResponse.json({

success:false,

message:"权限不足"

});


}







const {searchParams} =
new URL(req.url);



const userId =
Number(

searchParams.get("userId")

);



const titleId =
Number(

searchParams.get("titleId")

);







if(!userId || !titleId){


return NextResponse.json({

success:false,

message:"参数错误"

});


}









await prisma.userTitleGrant.delete({

where:{


userId_titleId:{


userId,


titleId


}


}


});









// 如果删除的是当前佩戴称号

const user =
await prisma.user.findUnique({

where:{

id:userId

}

});






const remain =
await prisma.userTitleGrant.count({

where:{

userId

}

});






if(

remain===0

){


await prisma.user.update({

where:{

id:userId

},

data:{


title:null,


titleStyle:null,


showTitle:false


}


});


}








return NextResponse.json({

success:true,

message:"称号已收回"

});








}catch(e:any){



console.error(

"收回称号失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "收回失败"

});


}


}