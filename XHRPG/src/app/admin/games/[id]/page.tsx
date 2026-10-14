"use client";


import {
useEffect,
useState
} from "react";

import Link from "next/link";

import {
useRouter
} from "next/navigation";;





export default function EditGame({

params

}:{

params:{
id:string
}

}){



const router = useRouter();



const [loading,setLoading] =
useState(false);



const [form,setForm] =
useState<any>(null);



const [coverFile,setCoverFile] =
useState<File|null>(null);



const [preview,setPreview] =
useState("");



const [history,setHistory] =
useState<any[]>([]);







// 获取游戏

useEffect(()=>{


async function load(){


const res =
await fetch(
`/api/admin/games/${params.id}`
);



const data =
await res.json();




if(data.game){


setForm(data.game);


setHistory(
data.game.history || []
);


setPreview(
data.game.cover
);


}


}



load();



},[params.id]);









function change(

e:React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>

){



setForm({

...form,

[e.target.name]:

e.target.value


});



}








function selectCover(

e:React.ChangeEvent<HTMLInputElement>

){



const file =
e.target.files?.[0];


if(!file)return;



setCoverFile(file);



setPreview(

URL.createObjectURL(file)

);



}









function changeHistory(

index:number,

key:string,

value:string

){



const list =
[...history];



list[index][key]=value;



setHistory(list);



}








function addHistory(){


setHistory([

...history,

{

version:"",

date:"",

lanzou:"",

pan123:""

}

]);


}








function removeHistory(index:number){


setHistory(

history.filter(

(_,i)=>i!==index

)

);


}









async function uploadCover(){



if(!coverFile)

return form.cover;





const fd =
new FormData();



fd.append(

"file",

coverFile

);



fd.append(

"id",

params.id

);





const res =
await fetch(

"/api/upload",

{

method:"POST",

body:fd

}

);





const data =
await res.json();




return data.url || form.cover;



}









async function save(){



setLoading(true);



try{



let cover =
form.cover;



if(coverFile){


cover =
await uploadCover();


}







const res =
await fetch(

`/api/admin/games/${params.id}`,

{


method:"PUT",


headers:{


"Content-Type":"application/json"

},


body:JSON.stringify({

...form,

cover,

history

})


}

);




const data =
await res.json();





if(data.success){


alert("修改成功");


router.push("/admin/games");


}else{


alert(

data.message || "修改失败"

);


}



}catch(e){



alert("保存失败");


}



setLoading(false);



}









// 隐藏 / 显示

async function toggleStatus(){



const newStatus =

form.status==="隐藏"

?

"已发布"

:

"隐藏";






await fetch(

`/api/admin/games/${params.id}`,

{


method:"PUT",


headers:{

"Content-Type":"application/json"

},


body:JSON.stringify({

status:newStatus

})


}

);



setForm({

...form,

status:newStatus

});



}









async function remove(){



if(
!confirm("确定永久删除这个游戏吗？")
)

return;





const res =
await fetch(

`/api/admin/games/${params.id}`,

{


method:"DELETE"


}

);




const data =
await res.json();





if(data.success){


alert("删除成功");


router.push("/admin/games");


}



}









if(!form){


return (

<main className="admin-page">

<div className="admin-box">


<h1>
加载游戏中...
</h1>


</div>

</main>

);


}









return (


<main className="admin-page">


<div className="admin-box game-form">



<h1>

编辑游戏

</h1>



<p>

当前状态：

<strong>

{form.status}

</strong>


</p>







<div className="form-grid">





<label>

游戏名称

<input

name="name"

value={form.name}

onChange={change}

/>


</label>







<label>

英文名称

<input

name="en"

value={form.en || ""}

onChange={change}

/>


</label>







<label>

作者

<input

name="author"

value={form.author}

onChange={change}

/>


</label>







<label>

版本

<input

name="version"

value={form.version}

onChange={change}

/>


</label>







<label>

分类

<input

name="category"

value={form.category}

onChange={change}

/>


</label>







<label>

重新上传封面


<input

type="file"

accept="image/*"

onChange={selectCover}

/>




{

preview &&

<img

src={preview}

style={{

width:"180px",

marginTop:"10px"

}}

/>

}



</label>







<label>

蓝奏云

<input

name="lanzou"

value={form.lanzou}

onChange={change}

/>


</label>







<label>

123云盘

<input

name="pan123"

value={form.pan123}

onChange={change}

/>


</label>





</div>









<label>

游戏简介


<textarea

name="description"

value={form.description}

onChange={change}

/>


</label>









<h2>

历史版本

</h2>







{

history.map((item,index)=>(


<div

className="history-item"

key={index}

>


<input

placeholder="版本"

value={item.version}

onChange={e=>

changeHistory(

index,

"version",

e.target.value

)

}

/>




<input

placeholder="日期"

value={item.date}

onChange={e=>

changeHistory(

index,

"date",

e.target.value

)

}

/>





<input

placeholder="蓝奏云"

value={item.lanzou}

onChange={e=>

changeHistory(

index,

"lanzou",

e.target.value

)

}

/>





<input

placeholder="123云盘"

value={item.pan123}

onChange={e=>

changeHistory(

index,

"pan123",

e.target.value

)

}

/>




<button

type="button"

onClick={()=>removeHistory(index)}

>

删除

</button>



</div>


))

}







<button

type="button"

onClick={addHistory}

>

＋ 添加历史版本

</button>









<div className="form-buttons">





<button

onClick={save}

disabled={loading}

>

保存修改

</button>








<button

onClick={toggleStatus}

>

{

form.status==="隐藏"

?

"显示游戏"

:

"隐藏游戏"

}


</button>








<button

onClick={remove}

>

永久删除

</button>








<button

onClick={()=>router.back()}

>

返回

</button>





</div>






</div>



</main>


);


}