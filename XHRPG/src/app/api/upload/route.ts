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



const id =
formData.get("id") as string;



if(!file || !id){


return NextResponse.json({

success:false,

message:"缺少文件或游戏ID"

});


}





const ext =
file.name.split(".").pop();




const filename =

`games${id}.${ext}`;







const uploadDir =

path.join(

process.cwd(),

"public",

"assets",

"games"

);





await fs.mkdir(

uploadDir,

{
recursive:true
}

);






const buffer =

Buffer.from(

await file.arrayBuffer()

);





await fs.writeFile(

path.join(

uploadDir,

filename

),

buffer

);








return NextResponse.json({

success:true,

url:

`/assets/games/${filename}`

});





}catch(e){


console.log(e);


return NextResponse.json({

success:false,

message:"上传失败"

});


}



}