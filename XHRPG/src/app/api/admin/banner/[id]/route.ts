import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";




// 获取单个 Banner

export async function GET(

req: NextRequest,

context: {
params:{
id:string
}
}

){


try{


const banner = await prisma.banner.findUnique({

where:{

id:Number(context.params.id)

}

});



if(!banner){

return NextResponse.json({

success:false,

message:"Banner不存在"

});

}



return NextResponse.json({

success:true,

banner

});



}catch(e){


return NextResponse.json({

success:false,

message:"获取失败"

});


}



}









// 修改 Banner

export async function PUT(

req:NextRequest,

context:{
params:{
id:string
}
}

){



try{



const body = await req.json();



const banner = await prisma.banner.update({

where:{

id:Number(context.params.id)

},


data:{

title:
body.title,


description:
body.description,


background:
body.background,


cover:
body.cover,


enabled:
body.enabled,


titleSize:
Number(body.titleSize || 40),


titleColor:
body.titleColor,


titleX:
Number(body.titleX || 50),


titleY:
Number(body.titleY || 30),



descSize:
Number(body.descSize || 18),


descColor:
body.descColor,


descX:
Number(body.descX || 50),


descY:
Number(body.descY || 50),



coverWidth:
Number(body.coverWidth || 300),


coverHeight:
Number(body.coverHeight || 300),


coverX:
Number(body.coverX || 50),


coverY:
Number(body.coverY || 50),


coverFit:
body.coverFit || "contain"



}

});





return NextResponse.json({

success:true,

banner

});




}catch(e){



console.log(e);



return NextResponse.json({

success:false,

message:"修改失败"

});


}



}









// 删除 Banner

export async function DELETE(

req:NextRequest,

context:{
params:{
id:string
}
}

){


try{


await prisma.banner.delete({

where:{

id:Number(context.params.id)

}

});



return NextResponse.json({

success:true

});




}catch(e){


return NextResponse.json({

success:false,

message:"删除失败"

});


}



}