import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";




// 获取用户列表
// 支持用户名 / UID / 昵称搜索


export async function GET(
req:Request
){


try{


const {searchParams} =
new URL(req.url);



const keyword =
searchParams.get("keyword") || "";





const users =
await prisma.user.findMany({


where:

keyword

?

{

OR:[


{


username:{

contains:keyword,

mode:"insensitive"

}

},




{


nickname:{

contains:keyword,

mode:"insensitive"

}

},




{


id:

isNaN(Number(keyword))

?

undefined

:

Number(keyword)

}


]


}


:

undefined,





select:{


id:true,


username:true,


nickname:true,


avatar:true,


role:true,


hidden:true,


banUntil:true,


muteUntil:true,


createdAt:true


},





orderBy:{


id:"asc"


}


});







return NextResponse.json({

success:true,

users

});






}catch(e:any){


console.error(

"获取用户失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "获取用户失败"

});


}


}













// 修改用户


export async function PUT(

req:Request

){



try{


const body =
await req.json();



const id =
Number(body.id);





if(!id){


return NextResponse.json({

success:false,

message:"用户ID错误"

});


}







const targetUser =
await prisma.user.findUnique({

where:{

id

}

});






if(!targetUser){


return NextResponse.json({

success:false,

message:"用户不存在"

});


}









// =====================
// 权限修改
// =====================


if(body.type==="role"){



if(targetUser.role==="owner"){


return NextResponse.json({

success:false,

message:"站长账号不可修改权限"

});


}






const user =
await prisma.user.update({

where:{

id

},

data:{


role:body.role


}


});






return NextResponse.json({

success:true,

user

});



}









// =====================
// 强制修改昵称
// 只有owner调用
// =====================


if(body.type==="nickname"){





const nickname =
String(body.nickname || "")
.trim();






if(!nickname){


return NextResponse.json({

success:false,

message:"昵称不能为空"

});


}






const exist =
await prisma.user.findUnique({

where:{

nickname

}

});







if(

exist &&

exist.id!==id

){


return NextResponse.json({

success:false,

message:"昵称已经被使用"

});


}








const user =
await prisma.user.update({

where:{

id

},


data:{


nickname


}


});






return NextResponse.json({

success:true,

user

});



}












// =====================
// owner保护
// admin不能操作owner
// =====================


if(targetUser.role==="owner"){


return NextResponse.json({

success:false,

message:"管理员不能操作站长账号"

});


}









const user =
await prisma.user.update({

where:{

id

},


data:{



banUntil:

body.banUntil

?

new Date(body.banUntil)

:

undefined,






muteUntil:

body.muteUntil

?

new Date(body.muteUntil)

:

undefined,






hidden:

body.hidden ?? undefined



}


});








return NextResponse.json({

success:true,

user

});







}catch(e:any){



console.error(

"修改用户失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "修改失败"

});


}


}















// 删除用户


export async function DELETE(

req:Request

){



try{


const {searchParams} =
new URL(req.url);




const id =
Number(

searchParams.get("id")

);






if(!id){


return NextResponse.json({

success:false,

message:"缺少用户ID"

});


}







const user =
await prisma.user.findUnique({

where:{

id

}

});








if(!user){


return NextResponse.json({

success:false,

message:"用户不存在"

});


}







if(user.role==="owner"){


return NextResponse.json({

success:false,

message:"站长账号不可删除"

});


}







await prisma.user.delete({

where:{

id

}

});








return NextResponse.json({

success:true,

message:"删除成功"

});







}catch(e:any){



console.error(

"删除用户失败:",

e

);



return NextResponse.json({

success:false,

message:e.message || "删除失败"

});


}



}