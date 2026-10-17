import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";



export async function POST(
req:Request
){


try{


const formData =
await req.formData();



const file =
formData.get("file") as File;





if(!file){


return NextResponse.json({

success:false,

message:"没有上传文件"

});


}







if(
!file.type.startsWith("image/")
){


return NextResponse.json({

success:false,

message:"只能上传图片"

});


}







// 背景限制10MB

if(
file.size > 10 * 1024 * 1024
){


return NextResponse.json({

success:false,

message:"背景图片不能超过10MB"

});


}









const bytes =
await file.arrayBuffer();



const buffer =
Buffer.from(bytes);







const ext =
file.name.split(".").pop()
||
"jpg";







const filename =
`background_${Date.now()}.${ext}`;








const dir =
path.join(

process.cwd(),

"public/assets/background"

);








await fs.mkdir(

dir,

{

recursive:true

}

);








await fs.writeFile(

path.join(

dir,

filename

),

buffer

);







return NextResponse.json({

success:true,


url:

`/assets/background/${filename}`


});








}catch(e:any){


console.error(
"背景上传失败:",
e
);



return NextResponse.json({

success:false,

message:
e.message || "上传失败"

});


}


}