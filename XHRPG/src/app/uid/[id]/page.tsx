import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";




export default async function UserPage({

params

}:{

params:{
id:string
}

}){



const {id:idText}=await params;



const id =
Number(idText);





if(isNaN(id)){

notFound();

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

title:true,

titleStyle:true,

showTitle:true,

hidden:true,

banUntil:true,

muteUntil:true,

createdAt:true


}


});








if(!user){

notFound();

}









// =====================
// 判断本人
// =====================


let isSelf=false;



try{


const cookieStore =
await cookies();



const token =
cookieStore.get("token")?.value;




if(token){



const secret =
new TextEncoder().encode(

process.env.JWT_SECRET ||

"xhrpg-secret"

);





const {payload}=

await jwtVerify(

token,

secret

);





if(
Number(payload.id)
===
user.id
){

isSelf=true;

}


}



}catch{}









// =====================
// 状态
// =====================


let status="正常";



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











// =====================
// 称号样式
// =====================


const titleStyle:any =
user.titleStyle || {};









return (

<main

style={{

minHeight:"100vh",

backgroundImage:

`url(${user.background})`,

backgroundSize:"cover",

backgroundPosition:"center",

padding:"60px 20px"

}}

>



<div

style={{

maxWidth:"900px",

margin:"auto",

background:"rgba(0,0,0,.65)",

backdropFilter:"blur(12px)",

borderRadius:"20px",

padding:"40px",

color:"#fff"

}}

>







<div

style={{

textAlign:"center"

}}

>






<img

src={user.avatar}

style={{

width:"150px",

height:"150px",

borderRadius:"50%",

objectFit:"cover",

border:"5px solid white"

}}

/>








<h1

style={{

fontSize:"42px",

margin:"20px 0 5px"

}}

>

{user.nickname}

</h1>









{/* =====================
    用户称号
===================== */}



{

user.showTitle &&

user.title &&


<div

style={{

display:"inline-block",

padding:"6px 18px",

borderRadius:

titleStyle.radius || "20px",


background:

titleStyle.background || "#333",


color:

titleStyle.color || "#fff",



border:

titleStyle.border || "none",



boxShadow:

titleStyle.shadow || "none",



fontSize:

titleStyle.size

?

`${titleStyle.size}px`

:

"14px",



fontWeight:"bold",

marginTop:"10px"

}}

>


{user.title}


</div>


}









<p>

UID：

{user.id}

</p>









{

isSelf &&


<Link href="/uid/settings">


<button

style={{

padding:"10px 25px",

borderRadius:"8px",

cursor:"pointer"

}}

>

编辑资料

</button>



</Link>


}





</div>









<hr/>









<h2>

账号信息

</h2>









<p>

注册时间：

{

new Date(

user.createdAt

)

.toLocaleString()

}

</p>








<p>

账号状态：

<span

style={{

color:

status==="正常"

?

"#00ff88"

:

"#ff5555"

}}

>

{status}

</span>

</p>









{

user.hidden &&

<p

style={{

color:"#999"

}}

>

该用户已隐藏

</p>

}









<hr/>









<h2>

个人简介

</h2>









<p

style={{

whiteSpace:"pre-wrap",

minHeight:"50px"

}}

>


{

user.bio ||

"这个用户很懒，还没有填写简介"

}


</p>









<h2>

个性标签

</h2>








<div

style={{

display:"flex",

gap:"10px",

flexWrap:"wrap"

}}

>





{

Array.isArray(user.tags)

&&

(user.tags as any[]).map(

(tag:any,index:number)=>(


<span

key={index}

style={{

padding:"6px 15px",

background:"#333",

borderRadius:"20px"

}}

>

{tag}

</span>


)


)


}









{

(!user.tags ||

!Array.isArray(user.tags) ||

(user.tags as any[]).length===0)

&&


<span>

暂无标签

</span>


}




</div>









</div>



</main>


);


}