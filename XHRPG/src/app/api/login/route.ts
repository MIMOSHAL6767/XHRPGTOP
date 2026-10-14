import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";



const prisma = new PrismaClient();



const SECRET =
process.env.JWT_SECRET || "xhrpg-secret";





export async function POST(
request: Request
){


try{



const {
username,
password
} =
await request.json();






if(!username || !password){


return NextResponse.json({

success:false,

message:"请输入账号和密码"

});


}








const user =
await prisma.user.findUnique({

where:{

username

}

});








if(!user){


return NextResponse.json({

success:false,

message:"账号不存在"

});


}









const ok =
await bcrypt.compare(

password,

user.password

);








if(!ok){


return NextResponse.json({

success:false,

message:"密码错误"

});


}











// =====================
// 生成 JWT
// =====================


const token =
jwt.sign(

{

id:user.id,

role:user.role,

username:user.username

},

SECRET,

{

expiresIn:"7d"

}

);











// =====================
// 返回用户信息
// =====================


const response =
NextResponse.json({

success:true,

user:{


id:user.id,


username:user.username,


nickname:user.nickname,


role:user.role


}


});












// =====================
// 写入 Cookie
// =====================


response.cookies.set(

"token",

token,

{


httpOnly:true,


secure:
process.env.NODE_ENV==="production",


sameSite:"lax",


maxAge:
60 * 60 * 24 * 7,


path:"/"


}

);










return response;









}catch(error){



console.error(

"登录错误:",

error

);






return NextResponse.json({

success:false,

message:"服务器错误"

});


}



}