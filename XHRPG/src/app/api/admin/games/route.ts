import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";




// =====================
// 获取游戏列表
// =====================

export async function GET(){


try{


const games =
await prisma.game.findMany({

orderBy:{

id:"desc"

}

});



return NextResponse.json({

success:true,

games

});



}catch(e:any){


console.error(
"获取游戏失败:",
e
);



return NextResponse.json({

success:false,

message:e.message || "获取失败"

});


}


}









// =====================
// 新建游戏
// =====================

export async function POST(
req:Request
){


try{


const body =
await req.json();




// 当前日期
const now =
new Date()
.toISOString()
.split("T")[0];






const game =
await prisma.game.create({

data:{



name:
body.name || "",



en:
body.en || "",



author:
body.author || "",



category:
body.category || "",



version:
body.version || "",



description:
body.description || "",



cover:
body.cover || "",



lanzou:
body.lanzou || "",



pan123:
body.pan123 || "",



symbol:
body.symbol || "✦",



tags:
body.tags || [],



status:
body.status || "已发布",



history:
body.history || [],



// 必填字段
date:
body.date || now,



updateDate:
body.updateDate || now



}


});







return NextResponse.json({

success:true,

game

});






}catch(e:any){



console.error(

"创建游戏失败:",

e

);





return NextResponse.json({

success:false,

message:e.message || "创建失败"

});



}


}