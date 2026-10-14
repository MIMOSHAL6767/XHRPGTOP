import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { jwtVerify } from "jose";




export default async function AdminPage(){



const cookieStore =
await cookies();



const token =
cookieStore.get("token")?.value;





if(!token){

redirect("/login");

}







try{



const secret =
new TextEncoder().encode(

process.env.JWT_SECRET ||
"xhrpg-secret"

);





const {payload} =
await jwtVerify(

token,

secret

);







// =====================
// 权限检查
// owner 或 UID=1
// =====================


if(

Number(payload.id)!==1 &&

payload.role!=="owner"

){


redirect("/");


}









return (


<main

className="admin-page"

>


<div

className="admin-box"

>







<Link href="/">

<button

className="back-btn"

>

← 返回首页

</button>

</Link>









<h1>

喜灰RPG资源交流站 站长后台

</h1>







<p>

欢迎站长：

<strong>

{String(payload.username)}

</strong>

</p>









<hr/>









<h2>

游戏管理

</h2>







<div

className="admin-actions"

>





<Link href="/admin/games">

<button>

进入游戏管理

</button>

</Link>







<Link href="/admin/banner">

<button>

首页轮换管理

</button>

</Link>







</div>















<h2>

用户管理

</h2>







<div

className="admin-actions"

>





<Link href="/admin/users">

<button>

用户列表

</button>

</Link>







<Link href="/admin/users/title">

<button>

称号管理

</button>

</Link>









</div>












<h2>

注册验证管理

</h2>







<div

className="admin-actions"

>





<Link href="/admin/verify">

<button>

验证题库管理

</button>

</Link>







</div>









</div>





</main>


);







}catch(e){



redirect("/login");


}



}