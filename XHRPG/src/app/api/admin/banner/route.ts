import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";



// 获取全部轮换图
export async function GET(){


const banners =
await prisma.banner.findMany({

orderBy:{
id:"asc"
}

});


return NextResponse.json({

success:true,

banners

});


}








// 新增轮换图
export async function POST(req:Request){


try{


const body =
await req.json();





console.log("收到Banner数据:",body);






const banner =
await prisma.banner.create({

data:{



name:
body.title || "未命名轮换图",



title:
body.title || "未命名轮换图",



cover:
body.cover || null,



background:
body.background || body.cover || "",



description:
body.description || "",



enabled:
body.enabled ?? true,






titleSize:
Number(
String(
body.titleSize || 40
)
.replace("px","")
),



titleColor:
body.titleColor || "#ffffff",



titleX:
Number(body.titleX || 50),



titleY:
Number(body.titleY || 30),






descSize:
Number(
String(
body.descSize || 18
)
.replace("px","")
),



descColor:
body.descColor || "#ffffff",



descX:
Number(body.descX || 50),



descY:
Number(body.descY || 65),






coverWidth:
Number(
String(
body.coverWidth || 300
)
.replace("px","")
),



coverHeight:
Number(
String(
body.coverHeight || 300
)
.replace("px","")
),



coverX:
Number(body.coverX || 50),



coverY:
Number(body.coverY || 50),



coverFit:
body.coverFit || "contain",



sort:
Number(body.sort || 0)


}

});





return NextResponse.json({

success:true,

banner

});





}catch(e:any){



console.error(
"创建Banner失败:",
e
);



return NextResponse.json({

success:false,

message:
e.message ||
"创建轮换失败"

});


}


}