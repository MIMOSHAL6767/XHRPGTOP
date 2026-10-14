"use client";


import {
useEffect,
useState
} from "react";


import {
useRouter
} from "next/navigation";





export default function UsersAdmin(){



const router =
useRouter();



const [users,setUsers] =
useState<any[]>([]);



const [keyword,setKeyword] =
useState("");



const [loading,setLoading] =
useState(false);



const [target,setTarget] =
useState<any>(null);



const [action,setAction] =
useState("");



const [date,setDate] =
useState("");



const [time,setTime] =
useState("");



const [nickname,setNickname] =
useState("");



const [myRole,setMyRole] =
useState("");









async function load(){


try{


setLoading(true);


const res =
await fetch(

`/api/admin/users?keyword=${keyword}`

);



const data =
await res.json();





if(data.success){


setUsers(

Array.isArray(data.users)

?

data.users

:

[]

);


}



}catch(e){


console.error(e);


alert("加载用户失败");


}finally{


setLoading(false);


}


}









async function loadMe(){


try{


const res =
await fetch(

"/api/auth/me"

);



const data =
await res.json();





if(data.success){


setMyRole(

data.user.role

);


}



}catch(e){


console.log(e);


}


}









useEffect(()=>{


load();


loadMe();


},[]);









function openTime(

user:any,

type:string

){


setTarget(user);


setAction(type);


setDate("");


setTime("");


}









function openNickname(

user:any

){


setTarget(user);


setAction("nickname");


setNickname(

user.nickname || ""

);


}









async function confirmTime(){



if(!date || !time){


alert("请选择日期和时间");


return;


}



const value =
`${date} ${time}`;





const body:any={

id:target.id

};





if(action==="ban"){


body.banUntil=value;


}



if(action==="mute"){


body.muteUntil=value;


}



await update(body);



setTarget(null);


}









async function confirmNickname(){



if(!nickname.trim()){


alert("昵称不能为空");


return;


}





await update({

id:target.id,

type:"nickname",

nickname,

operatorRole:myRole

});



setTarget(null);


}









async function update(

body:any

){



const res =
await fetch(

"/api/admin/users",

{

method:"PUT",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify(body)

}

);



const data =
await res.json();





if(data.success){


alert("操作成功");


load();


}else{


alert(

data.message ||

"操作失败"

);


}



}









async function updateUser(

user:any,

type:string

){



if(type==="hide"){


update({

id:user.id,

hidden:!user.hidden

});


return;


}






if(type==="unban"){


update({

id:user.id,

banUntil:null

});


return;


}






if(type==="unmute"){


update({

id:user.id,

muteUntil:null

});


return;


}


}









async function removeUser(

user:any

){



if(user.role==="owner"){


alert(

"站长账号不可删除"

);


return;


}






if(

!confirm("确定删除该用户？")

)

return;





const res =
await fetch(

`/api/admin/users?id=${user.id}`,

{

method:"DELETE"

}

);





const data =
await res.json();





if(data.success){


alert("删除成功");


load();


}else{


alert(data.message);


}



}









function openTitleManage(

user:any

){


router.push(

`/admin/users/title/settings?uid=${user.id}`

);


}









return (


<main

className="admin-page"

>


<div

className="admin-box"

style={{

width:"1500px",

maxWidth:"95vw"

}}

>


<button

onClick={()=>router.push("/admin")}

>

← 返回后台

</button>





<h1>

用户管理

</h1>





<input

style={{

width:"320px",

padding:"10px"

}}

placeholder="搜索用户名 / 昵称 / UID"

value={keyword}

onChange={

e=>setKeyword(e.target.value)

}


/>



<button

onClick={load}

>

搜索

</button>





<table

style={{

width:"100%",

marginTop:"20px",

borderCollapse:"collapse"

}}

>


<thead>

<tr>

<th>头像</th>

<th>UID</th>

<th>用户名</th>

<th>昵称</th>

<th>权限</th>

<th>状态</th>

<th>注册时间</th>

<th>操作</th>

</tr>


</thead>



<tbody>

{
users.map(user=>(

<tr key={user.id}>

<td>

<img

src={user.avatar}

style={{

width:"50px",

height:"50px",

borderRadius:"50%"

}}

/>

</td>


<td>

{user.id}

</td>


<td>

{user.username}

</td>


<td>

{user.nickname || "-"}

</td>


<td>

{user.role}

</td>


<td>

{

user.hidden

?

"隐藏"

:

user.banUntil

?

"封禁"

:

user.muteUntil

?

"禁言"

:

"正常"

}

</td>


<td>

{
new Date(user.createdAt)
.toLocaleString()
}

</td>


<td>

<div

style={{

display:"flex",

gap:"8px",

flexWrap:"wrap"

}}

>


{

myRole==="owner"

&&

user.role!=="owner"

&&

<>

<button

onClick={()=>openNickname(user)}

>

修改昵称

</button>


<button

onClick={()=>openTitleManage(user)}

>

称号管理

</button>

</>


}







{

user.role==="owner"

?

<span>

站长保护

</span>


:

<>





{

user.banUntil

?

<button

onClick={()=>updateUser(user,"unban")}

>

解除封禁

</button>


:

<button

onClick={()=>openTime(user,"ban")}

>

封禁

</button>


}






{

user.muteUntil

?

<button

onClick={()=>updateUser(user,"unmute")}

>

解除禁言

</button>


:

<button

onClick={()=>openTime(user,"mute")}

>

禁言

</button>


}






<button

onClick={()=>updateUser(user,"hide")}

>

{

user.hidden

?

"取消隐藏"

:

"隐藏"

}

</button>





<button

onClick={()=>removeUser(user)}

>

删除

</button>




</>


}



</div>


</td>


</tr>


))


}


</tbody>


</table>








{

target &&

<div

style={{

position:"fixed",

inset:0,

background:"rgba(0,0,0,.6)",

display:"flex",

alignItems:"center",

justifyContent:"center"

}}

>


<div

style={{

background:"#222",

padding:"30px",

borderRadius:"15px"

}}

>


{

action==="nickname"

?

<>


<h2>

修改昵称

</h2>



<input

value={nickname}

onChange={

e=>setNickname(e.target.value)

}

style={{

padding:"8px"

}}

/>



<button

onClick={confirmNickname}

>

确定

</button>


</>


:

<>


<h2>

设置时间

</h2>



<input

type="date"

onChange={

e=>setDate(e.target.value)

}


/>



<input

type="time"

onChange={

e=>setTime(e.target.value)

}


/>



<button

onClick={confirmTime}

>

确定

</button>


</>


}






<button

onClick={()=>setTarget(null)}

>

取消

</button>



</div>


</div>

}



</div>


</main>


);


}