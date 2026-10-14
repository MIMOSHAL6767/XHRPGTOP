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
// DELETE
// 删除称号模板
// owner专用
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

},


select:{

role:true

}


});








if(!operator || operator.role!=="owner"){


return NextResponse.json({

success:false,

message:"只有站长可以删除称号"

});


}









const {searchParams} =
new URL(req.url);



const id =
Number(

searchParams.get("id")

);








if(!id){


return NextResponse.json({

success:false,

message:"缺少称号ID"

});


}









const title =
await prisma.userTitle.findUnique({

where:{

id

}

});







if(!title){


return NextResponse.json({

success:false,

message:"称号不存在"

});


}









// =====================
// 检查是否正在被使用
// =====================


const users =
await prisma.user.findMany({

where:{


title:title.name


},


select:{


id:true,


nickname:true


}


});









if(users.length>0){



return NextResponse.json({

success:false,

message:

`该称号正在被 ${users.length} 个用户使用，请先收回称号`,


users


});


}









await prisma.userTitle.delete({

where:{

id

}

});









return NextResponse.json({

success:true,

message:"称号模板删除成功"

});









}catch(e:any){



console.error(

"删除称号失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "删除失败"

});


}



}