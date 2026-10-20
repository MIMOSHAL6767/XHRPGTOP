import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";





async function getUserId(){


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
"xhrpg-secret"

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
// 获取个人资料
// =====================


export async function GET(){


try{


const id =
await getUserId();




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

role:true

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


return NextResponse.json({

success:false,

message:e.message || "获取失败"

});


}


}









// =====================
// 修改个人资料
// =====================


export async function PUT(

req:Request

){


try{


const id =
await getUserId();




if(!id){


return NextResponse.json({

success:false,

message:"未登录"

});


}







const body =
await req.json();







const nickname =
String(
body.nickname || ""
).trim();








if(!nickname){


return NextResponse.json({

success:false,

message:"昵称不能为空"

});


}








// =====================
// 检查昵称重复
// =====================


const same =
await prisma.user.findFirst({

where:{


nickname,


NOT:{

id

}


}

});






if(same){


return NextResponse.json({

success:false,

message:"该昵称已经被使用"

});


}









const user =
await prisma.user.update({

where:{

id

},


data:{


nickname,



avatar:
body.avatar || undefined,



background:
body.background || undefined,



bio:
body.bio || null,



tags:
body.tags || []



}


});







return NextResponse.json({

success:true,

message:"修改成功",

user:{

id:user.id,

nickname:user.nickname,

avatar:user.avatar,

background:user.background,

bio:user.bio,

tags:user.tags

}

});








}catch(e:any){


console.error(
"修改资料失败:",
e
);



return NextResponse.json({

success:false,

message:e.message || "修改失败"

});


}


}