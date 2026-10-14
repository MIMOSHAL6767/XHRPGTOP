import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";




// 获取公开用户主页资料
// /api/uid/1


export async function GET(

req:Request,

{
params

}:{

params:
Promise<{
id:string
}>

}

){


try{



const {
id: idText

}=await params;



const id =
Number(idText);






if(

isNaN(id)

){


return NextResponse.json({

success:false,

message:"用户ID错误"

});


}









const user =

await prisma.user.findUnique({

where:{

id

},



select:{



id:true,


nickname:true,


avatar:true,


background:true,


bio:true,


tags:true,



// 称号系统

title:true,

showTitle:true,

titleColor:true,

titleBg:true,

titleBorder:true,





banUntil:true,


muteUntil:true,


createdAt:true



}


});








if(!user){


return NextResponse.json({

success:false,

message:"用户不存在"

});


}









// =====================
// 用户状态
// =====================


let status =
"正常";



if(

user.banUntil &&

new Date(user.banUntil)>new Date()

){


status="封禁";


}

else if(

user.muteUntil &&

new Date(user.muteUntil)>new Date()

){


status="禁言";


}









return NextResponse.json({

success:true,


user:{


...user,


status


}


});








}catch(e:any){



console.error(

"获取用户主页失败:",

e

);




return NextResponse.json({

success:false,

message:

e.message ||

"服务器错误"

});


}



}