"use client";


import {
useEffect,
useState
} from "react";


import {
useRouter
} from "next/navigation";





export default function UserDetail({

params

}:{

params:{
id:string
}

}){



const router = useRouter();



const [user,setUser] =
useState<any>(null);



const [loading,setLoading] =
useState(true);







useEffect(()=>{


async function load(){


const res =
await fetch(

`/api/admin/users/${params.id}`

);



const data =
await res.json();



if(data.success){


setUser(
data.user
);


}



setLoading(false);


}



load();


},[params.id]);








if(loading){


return (

<main className="admin-page">

<div className="admin-box">

<h1>

加载中...

</h1>

</div>

</main>

);


}






if(!user){


return (

<main className="admin-page">

<div className="admin-box">


<h1>

用户不存在

</h1>


</div>

</main>

);


}









return (


<main className="admin-page">


<div className="admin-box">






<button

onClick={()=>router.back()}

>

← 返回用户列表

</button>







<h1>

用户详情

</h1>








<section className="user-detail">





<h2>

基本信息

</h2>





<div>


头像：

{

user.avatar

?

<img

src={user.avatar}

style={{

width:"80px",

height:"80px",

borderRadius:"50%"

}}

/>


:

"暂无头像"

}



</div>







<p>

UID：

<strong>

{user.id}

</strong>

</p>






<p>

用户名：

<strong>

{user.username}

</strong>

</p>







<p>

权限：

{user.role}

</p>








<p>

注册时间：

{

new Date(

user.createdAt

)

.toLocaleString()

}

</p>







</section>









<hr/>








<section>



<h2>

账号状态

</h2>







<p>

当前状态：

{

user.hidden

?

"隐藏用户"

:

user.banUntil

?

"封禁中"

:

user.muteUntil

?

"禁言中"

:

"正常"

}

</p>







<p>

封禁结束：

{

user.banUntil ||

"无"

}

</p>







<p>

禁言结束：

{

user.muteUntil ||

"无"

}

</p>





</section>









<hr/>









<section>



<h2>

IP记录

</h2>






{

user.ipRecords?.length

?

user.ipRecords.map(

(ip:string,index:number)=>(


<p key={index}>

{ip}

</p>


)

)

:

<p>

暂无IP记录

</p>


}





</section>









<hr/>









<section>



<h2>

游戏下载记录

</h2>







{

user.downloads?.length

?

user.downloads.map(

(item:any)=>(


<div key={item.id}>


游戏：

{item.gameName}


<br/>

时间：

{item.createdAt}


</div>


)

)

:

<p>

暂无下载记录

</p>



}





</section>









<hr/>








<section>



<h2>

封禁历史

</h2>





{

user.banHistory?.length

?

user.banHistory.map(

(item:any)=>(


<div key={item.id}>


时间：

{item.createdAt}

<br/>

原因：

{item.reason}


</div>


)

)

:

<p>

暂无记录

</p>



}





</section>









<hr/>









<section>



<h2>

禁言历史

</h2>







{

user.muteHistory?.length

?

user.muteHistory.map(

(item:any)=>(


<div key={item.id}>


时间：

{item.createdAt}

<br/>

原因：

{item.reason}


</div>


)

)

:

<p>

暂无记录

</p>



}





</section>









<hr/>









<section>



<h2>

管理员备注

</h2>






<textarea


value={

user.adminNote || ""

}


readOnly


style={{

width:"100%",

height:"120px"

}}


/>





</section>








</div>


</main>


);


}