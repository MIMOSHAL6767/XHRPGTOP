import {
prisma
} from "@/lib/prisma";


import {
NextResponse
} from "next/server";





// 获取全部验证题

export async function GET(){


try{


const questions =
await prisma.verifyQuestion.findMany({

orderBy:{


id:"asc"


}

});




return NextResponse.json({

success:true,

questions

});



}catch(e){


console.error(e);


return NextResponse.json({

success:false,

message:"获取验证题失败"

});


}


}









// 添加验证题

export async function POST(
req:Request
){


try{


const body =
await req.json();




if(
!body.question ||
!body.answer
){


return NextResponse.json({

success:false,

message:"问题和答案不能为空"

});


}






const question =
await prisma.verifyQuestion.create({

data:{


question:
body.question,


answer:
body.answer,


enabled:true


}


});






return NextResponse.json({

success:true,

question

});




}catch(e:any){



console.error(
"添加验证题失败:",
e
);



return NextResponse.json({

success:false,

message:
e.message ||
"添加失败"

});


}


}









// 修改启用状态

export async function PUT(
req:Request
){


try{


const body =
await req.json();





const question =
await prisma.verifyQuestion.update({

where:{


id:
Number(body.id)


},


data:{


enabled:
body.enabled


}


});





return NextResponse.json({

success:true,

question

});




}catch(e:any){



console.error(e);



return NextResponse.json({

success:false,

message:
e.message ||
"修改失败"

});


}



}









// 删除验证题

export async function DELETE(
req:Request
){


try{


const {
searchParams
}
=
new URL(req.url);



const id =
Number(
searchParams.get("id")
);






await prisma.verifyQuestion.delete({

where:{


id


}

});






return NextResponse.json({

success:true

});





}catch(e:any){



console.error(e);



return NextResponse.json({

success:false,

message:
e.message ||
"删除失败"

});


}


}