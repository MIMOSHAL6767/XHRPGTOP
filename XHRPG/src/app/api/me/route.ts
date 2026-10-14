import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";
import { prisma } from "@/lib/prisma";





export async function GET(){



try{



const cookieStore =
await cookies();





const token =
cookieStore.get("token")?.value;







if(!token){


return NextResponse.json({

success:false,

message:"未登录"

});


}








const secret =
new TextEncoder().encode(

process.env.JWT_SECRET ||

"xhrpg-secret"

);








const {payload} =
await jwtVerify(

token,

secret

);








const id =
Number(payload.id);







if(!id){


return NextResponse.json({

success:false,

message:"用户信息错误"

});


}








// =====================
// 查询最新用户资料
// =====================


const user =
await prisma.user.findUnique({

where:{

id

},

select:{


id:true,


username:true,


nickname:true,


role:true,


avatar:true,


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








}catch(e:any){



console.error(

"获取登录用户失败:",

e

);






return NextResponse.json({

success:false,

message:"登录状态失效"

});


}



}