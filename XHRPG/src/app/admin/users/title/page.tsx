"use client";


import {
useEffect,
useState
} from "react";


import {
useRouter
} from "next/navigation";





export default function TitleAdmin(){



const router =
useRouter();



const [titles,setTitles] =
useState<any[]>([]);



const [loading,setLoading] =
useState(false);



// 创建称号

const [name,setName] =
useState("");

const [color,setColor] =
useState("#ffffff");

const [background,setBackground] =
useState("#333333");

const [border,setBorder] =
useState("none");

const [shadow,setShadow] =
useState("");

const [size,setSize] =
useState(14);



// 授予

const [userId,setUserId] =
useState("");

const [titleId,setTitleId] =
useState("");









async function load(){


try{


const res =
await fetch(

"/api/admin/users/title/list"

);


const data =
await res.json();



if(data.success){

setTitles(
data.titles
);

}


}catch(e){

console.log(e);

}


}








useEffect(()=>{


load();


},[]);









async function createTitle(){



if(!name.trim()){


alert("请输入称号名称");


return;


}





const res =
await fetch(

"/api/admin/users/title/create",

{

method:"POST",

headers:{

"Content-Type":"application/json"

},


body:JSON.stringify({

name,

color,

background,

border,

shadow,

size

})


}

);



const data =
await res.json();



if(data.success){


alert("创建成功");


setName("");

load();


}else{


alert(data.message);


}



}









async function deleteTitle(

id:number

){



if(
!confirm("确定删除该称号？")
)

return;






const res =
await fetch(

`/api/admin/users/title/delete?id=${id}`,

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









async function grant(){



if(!userId || !titleId){


alert("请输入用户ID和称号ID");


return;


}






const res =
await fetch(

"/api/admin/users/title/grant",

{

method:"POST",

headers:{

"Content-Type":"application/json"

},


body:JSON.stringify({

userId:Number(userId),

titleId:Number(titleId)

})


}

);



const data =
await res.json();



if(data.success){


alert("授予成功");


}else{


alert(data.message);


}



}









return (


<main

className="admin-page"

>



<div

className="admin-box"

style={{

width:"1200px",

maxWidth:"95%"

}}

>



<button

onClick={()=>router.push("/admin")}

>

← 返回后台

</button>





<h1>

用户称号管理

</h1>









<h2>

创建称号

</h2>





<div

style={{

display:"grid",

gap:"10px",

maxWidth:"500px"

}}

>


<input

placeholder="称号名称"

value={name}

onChange={e=>setName(e.target.value)}

/>




<label>

文字颜色

</label>


<input

type="color"

value={color}

onChange={e=>setColor(e.target.value)}

/>




<label>

背景颜色

</label>


<input

type="color"

value={background}

onChange={e=>setBackground(e.target.value)}

/>




<input

placeholder="边框，例如 1px solid gold"

value={border}

onChange={e=>setBorder(e.target.value)}

/>




<input

placeholder="阴影，例如 0 0 10px red"

value={shadow}

onChange={e=>setShadow(e.target.value)}

/>




<input

type="number"

value={size}

onChange={e=>setSize(Number(e.target.value))}

/>




</div>









<h3>

预览

</h3>


<span

style={{

display:"inline-block",

padding:"6px 18px",

borderRadius:"20px",

background,

color,

border,

boxShadow:shadow,

fontSize:size,

fontWeight:"bold"

}}

>

{name || "示例称号"}

</span>









<br/><br/>





<button

onClick={createTitle}

>

创建称号

</button>









<hr/>









<h2>

称号列表

</h2>






<table

style={{

width:"100%",

borderCollapse:"collapse"

}}

>



<thead>

<tr>

<th>ID</th>

<th>名称</th>

<th>预览</th>

<th>操作</th>

</tr>

</thead>



<tbody>



{

titles.map(title=>(


<tr

key={title.id}

>


<td>

{title.id}

</td>



<td>

{title.name}

</td>




<td>


<span

style={{

padding:"5px 15px",

borderRadius:"20px",

background:title.background,

color:title.color,

border:title.border,

boxShadow:title.shadow,

fontSize:title.size

}}

>

{title.name}

</span>


</td>





<td>


<button

onClick={()=>deleteTitle(title.id)}

>

删除

</button>


</td>



</tr>


))


}



</tbody>


</table>









<hr/>







<h2>

授予用户

</h2>




<input

placeholder="用户UID"

value={userId}

onChange={e=>setUserId(e.target.value)}

/>





<select

value={titleId}

onChange={e=>setTitleId(e.target.value)}

>


<option value="">

选择称号

</option>



{

titles.map(title=>(


<option

key={title.id}

value={title.id}

>

{title.id} - {title.name}

</option>


))


}



</select>







<button

onClick={grant}

>

授予

</button>







<p>

授予后不会自动显示，用户需要在个人设置中自行开启佩戴。

</p>







</div>


</main>


);


}