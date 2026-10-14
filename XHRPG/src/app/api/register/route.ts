import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";



export async function POST(
  req: Request
) {


try{


const body =
await req.json();





const username =
String(body.username || "").trim();



const password =
String(body.password || "").trim();



const questionId =
body.questionId;



const answer =
String(body.answer || "").trim();






// 获取注册IP

const ip =
req.headers.get("x-forwarded-for")
||
req.headers.get("x-real-ip")
||
"unknown";








// =====================
// 基础检查
// =====================


if(
!username ||
!password
){


return NextResponse.json({

success:false,

message:"账号和密码不能为空"

});


}





if(username.length < 3){


return NextResponse.json({

success:false,

message:"账号至少3个字符"

});


}





if(password.length < 6){


return NextResponse.json({

success:false,

message:"密码至少6位"

});


}








// =====================
// 注册验证
// =====================


if(
!questionId ||
!answer
){


return NextResponse.json({

success:false,

message:"请完成注册验证"

});


}







const question =
await prisma.verifyQuestion.findUnique({

where:{

id:Number(questionId)

}

});







if(
!question ||
!question.enabled
){


return NextResponse.json({

success:false,

message:"验证问题不存在"

});


}







if(

question.answer
.trim()
.toLowerCase()

!==

answer
.toLowerCase()

){


return NextResponse.json({

success:false,

message:"验证答案错误"

});


}









// =====================
// 检查用户名
// =====================


const exist =
await prisma.user.findUnique({

where:{

username

}

});





if(exist){


return NextResponse.json({

success:false,

message:"用户名已经存在"

});


}









// =====================
// 自动生成昵称
// 喜r玩家#xxxx
// =====================


let nickname = "";



for(
let i=0;
i<20;
i++
){



const random =
Math.floor(

1000 +
Math.random()*9000

);



const temp =
`喜r玩家#${random}`;





const check =
await prisma.user.findUnique({

where:{

nickname:temp

}

});





if(!check){


nickname=temp;

break;


}



}







if(!nickname){


return NextResponse.json({

success:false,

message:"昵称生成失败，请重试"

});


}









// =====================
// 密码加密
// =====================


const hashPassword =
await bcrypt.hash(

password,

10

);









// =====================
// 创建用户
// =====================


const user =
await prisma.user.create({

data:{


username,


nickname,


password:hashPassword,


role:"user",



registerIp:ip


}


});









return NextResponse.json({

success:true,


message:"注册成功",



user:{


id:user.id,


username:user.username,


nickname:user.nickname,


role:user.role


}


});









}catch(error:any){



console.error(
"注册错误:",
error
);





return NextResponse.json({

success:false,

message:
error.message ||
"服务器错误"

});


}


}