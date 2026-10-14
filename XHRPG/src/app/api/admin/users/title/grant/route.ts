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
// 授予用户称号
// owner专用
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








// =====================
// 检查管理员权限
// =====================

const operator =

await prisma.user.findUnique({

where:{

id:operatorId

},


select:{

role:true

}


});








if(!operator || operator.role!=="owner"){


return NextResponse.json({

success:false,

message:"只有站长可以授予称号"

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

message:"用户ID或称号ID错误"

});


}









// =====================
// 检查目标用户
// =====================

const targetUser =

await prisma.user.findUnique({

where:{

id:userId

}

});





if(!targetUser){


return NextResponse.json({

success:false,

message:"目标用户不存在"

});


}









// =====================
// 检查称号模板
// =====================

const title =

await prisma.userTitle.findUnique({

where:{

id:titleId

}

});







if(!title){


return NextResponse.json({

success:false,

message:"称号不存在"

});


}









// =====================
// 检查是否已经拥有
// =====================

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

message:"该用户已经拥有这个称号"

});


}









// =====================
// 写入拥有称号
// =====================

const grant =

await prisma.userTitleGrant.create({

data:{


userId,


titleId


},


include:{


title:true


}


});









// =====================
// 不修改当前佩戴
// 用户自行选择
// =====================



return NextResponse.json({

success:true,


message:"称号授予成功，用户可以在个人设置中选择佩戴",


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