import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";




// 获取单个游戏

export async function GET(

req:Request,

context:{
params:Promise<{
id:string
}>
}

){


try{


const {

id

}=await context.params;



const game =

await prisma.game.findUnique({

where:{

id:Number(id)

}

});




if(!game){


return NextResponse.json({

success:false,

message:"游戏不存在"

});


}





return NextResponse.json({

success:true,

game

});






}catch(e){


console.log(e);


return NextResponse.json({

success:false,

message:"获取失败"

});


}



}







// 修改游戏

export async function PUT(

req:Request,

context:{
params:Promise<{
id:string
}>
}

){


try{


const {

id

}=await context.params;



const body =
await req.json();





const game =

await prisma.game.update({

where:{

id:Number(id)

},


data:{


...(body.name!==undefined && {

name:body.name

}),



...(body.en!==undefined && {

en:body.en

}),



...(body.author!==undefined && {

author:body.author

}),



...(body.category!==undefined && {

category:body.category

}),



...(body.version!==undefined && {

version:body.version

}),



...(body.description!==undefined && {

description:body.description

}),



...(body.cover!==undefined && {

cover:body.cover

}),



...(body.lanzou!==undefined && {

lanzou:body.lanzou

}),



...(body.pan123!==undefined && {

pan123:body.pan123

}),



...(body.history!==undefined && {

history:body.history

}),



...(body.status!==undefined && {

status:body.status

}),



updateDate:

new Date()

.toISOString()

.split("T")[0]


}


});





return NextResponse.json({

success:true,

game

});





}catch(e){


console.log(e);


return NextResponse.json({

success:false,

message:"修改失败"

});


}



}










// 删除游戏

export async function DELETE(

req:Request,

context:{
params:Promise<{
id:string
}>
}

){


try{


const {

id

}=await context.params;




await prisma.game.delete({

where:{

id:Number(id)

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