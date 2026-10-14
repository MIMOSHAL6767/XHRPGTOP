import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";




// =====================
// 获取当前登录用户
// =====================

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








return NextResponse.json({

success:true,


user:{


id:Number(payload.id),


username:String(payload.username),


role:String(payload.role)



}



});







}catch(e){



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