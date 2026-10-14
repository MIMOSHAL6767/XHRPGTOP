import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";




// 获取当前用户

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



const {payload}=

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
// 收回称号
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

message:"没有权限"

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










// 查询称号

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









// 删除拥有记录

await prisma.userTitleGrant.delete({

where:{

userId_titleId:{

userId,

titleId

}

}

});











// 如果当前佩戴的是该称号
// 一并取消

const user =

await prisma.user.findUnique({

where:{

id:userId

},


select:{

title:true

}

});







if(

user &&

user.title===title.name

){


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