"use client";


import {
use,
useEffect,
useState
} from "react";

import {
useRouter
} from "next/navigation";




export default function EditBanner({

params

}:{

params:Promise<{
id:string
}>

}){


const {
id

}=use(params);



const router = useRouter();



const [loading,setLoading] =
useState(false);



const [uploading,setUploading] =
useState(false);



const [form,setForm] =
useState<any>(null);



const [coverFile,setCoverFile] =
useState<File|null>(null);



const [backgroundFile,setBackgroundFile] =
useState<File|null>(null);



const [coverPreview,setCoverPreview] =
useState("");



const [backgroundPreview,setBackgroundPreview] =
useState("");









useEffect(()=>{


async function load(){


const res =
await fetch(

`/api/admin/banner/${id}`

);



const data =
await res.json();



if(data.banner){


setForm(data.banner);


setCoverPreview(
data.banner.cover || ""
);


setBackgroundPreview(
data.banner.background || ""
);


}


}


load();


},[id]);









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



setCoverPreview(

URL.createObjectURL(file)

);


}









function selectBackground(

e:React.ChangeEvent<HTMLInputElement>

){


const file =
e.target.files?.[0];


if(!file)return;



setBackgroundFile(file);



setBackgroundPreview(

URL.createObjectURL(file)

);


}









async function uploadFile(file:File){


setUploading(true);



const fd =
new FormData();



fd.append(
"file",
file
);



const res =
await fetch(

"/api/upload/banner",

{

method:"POST",

body:fd

}

);



const data =
await res.json();



setUploading(false);



return data.url || "";

}









async function save(){


setLoading(true);



try{


let cover =
form.cover || "";



let background =
form.background || "";





if(coverFile){


cover =
await uploadFile(coverFile);


}





if(backgroundFile){


background =
await uploadFile(backgroundFile);


}







const res =
await fetch(

`/api/admin/banner/${id}`,

{

method:"PUT",

headers:{

"Content-Type":"application/json"

},


body:JSON.stringify({

...form,

cover,

background,


titleSize:Number(form.titleSize),

titleX:Number(form.titleX),

titleY:Number(form.titleY),


descSize:Number(form.descSize),

descX:Number(form.descX),

descY:Number(form.descY),


coverWidth:Number(form.coverWidth),

coverHeight:Number(form.coverHeight),

coverX:Number(form.coverX),

coverY:Number(form.coverY)

})


}

);



const data =
await res.json();




if(data.success){


alert("保存成功");


router.push("/admin/banner");


}else{


alert(
data.message || "保存失败"
);


}



}catch(e){


console.error(e);


alert("保存失败");


}



setLoading(false);


}









async function remove(){



if(
!confirm("确定删除这个轮换吗？")
)

return;



const res =
await fetch(

`/api/admin/banner/${id}`,

{

method:"DELETE"

}

);



const data =
await res.json();



if(data.success){


alert("删除成功");


router.push("/admin/banner");


}


}









if(!form){


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









return (


<main className="admin-page">


<div className="admin-box game-form">



<h1>

编辑首页轮播

</h1>







<div className="form-grid">



<label>

标题

<input

name="title"

value={form.title || ""}

onChange={change}

/>

</label>







<label>

背景图片上传


<input

type="file"

accept="image/*"

onChange={selectBackground}

/>



{

backgroundPreview &&


<img

src={backgroundPreview}

style={{

width:"400px",

height:"220px",

objectFit:"cover",

marginTop:"10px"

}}

/>

}



</label>








<label>

封面图片上传


<input

type="file"

accept="image/*"

onChange={selectCover}

/>



{

coverPreview &&


<img

src={coverPreview}

style={{

width:"300px",

height:"300px",

objectFit:"contain",

marginTop:"10px"

}}

/>

}



</label>









<label>

状态


<select

value={
form.enabled
?
"true"
:
"false"
}

onChange={e=>

setForm({

...form,

enabled:
e.target.value==="true"

})

}

>


<option value="true">

启用

</option>


<option value="false">

关闭

</option>


</select>

</label>



</div>









<label>

简介

<textarea

name="description"

value={form.description || ""}

onChange={change}

/>

</label>









<h2>

标题设置

</h2>



<div className="form-grid">



{

[

["titleSize","标题大小"],

["titleColor","标题颜色"],

["titleX","标题X位置"],

["titleY","标题Y位置"]

].map(([name,text])=>(


<label key={name}>

{text}


<input

name={name}

value={form[name] ?? ""}

onChange={change}

/>


</label>


))

}



</div>









<h2>

简介设置

</h2>



<div className="form-grid">


{

[

["descSize","简介大小"],

["descColor","简介颜色"],

["descX","简介X位置"],

["descY","简介Y位置"]

].map(([name,text])=>(


<label key={name}>

{text}


<input

name={name}

value={form[name] ?? ""}

onChange={change}

/>


</label>


))

}



</div>









<h2>

封面设置

</h2>



<div className="form-grid">


{

[

["coverWidth","封面宽度"],

["coverHeight","封面高度"],

["coverX","封面X位置"],

["coverY","封面Y位置"],

["coverFit","显示模式"]

].map(([name,text])=>(


<label key={name}>

{text}


<input

name={name}

value={form[name] ?? ""}

onChange={change}

/>


</label>


))

}


</div>









<div className="form-buttons">


<button

onClick={save}

disabled={loading || uploading}

>

{

uploading

?

"上传中..."

:

"保存修改"

}

</button>







<button

onClick={remove}

>

删除轮播

</button>







<button

onClick={()=>router.push("/admin/banner")}

>

返回

</button>


</div>







</div>


</main>


);


}