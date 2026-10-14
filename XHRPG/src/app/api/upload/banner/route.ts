import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";


export async function POST(req:Request){

try{


const formData = await req.formData();


const file =
formData.get("file") as File;


if(!file){

return NextResponse.json({

success:false,
message:"没有文件"

});

}



const bytes =
await file.arrayBuffer();


const buffer =
Buffer.from(bytes);



const ext =
file.name.split(".").pop();



const filename =
`banner_${Date.now()}.${ext}`;



const uploadPath =
path.join(

process.cwd(),

"public/assets/banner",

filename

);



await fs.mkdir(

path.dirname(uploadPath),

{
recursive:true
}

);



await fs.writeFile(

uploadPath,

buffer

);



return NextResponse.json({

success:true,

url:

`/assets/banner/${filename}`

});



}catch(e){


return NextResponse.json({

success:false

});


}


}