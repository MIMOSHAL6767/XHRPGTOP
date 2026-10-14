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
// 获取称号模板列表
// owner专用
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


role:true


}


});








if(!user || user.role!=="owner"){


return NextResponse.json({

success:false,

message:"只有站长可以访问"

});


}









const titles =
await prisma.userTitle.findMany({

orderBy:{


createdAt:"desc"


}


});









return NextResponse.json({

success:true,

titles

});









}catch(e:any){



console.error(

"获取称号列表失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "获取失败"

});


}



}