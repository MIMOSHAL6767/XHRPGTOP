"use client";


import {
useState
} from "react";

import {
useRouter
} from "next/navigation";




export default function NewBanner(){



const router = useRouter();



const [imageFile,setImageFile] =
useState<File|null>(null);


const [backgroundFile,setBackgroundFile] =
useState<File|null>(null);



const [preview,setPreview] =
useState("");


const [backgroundPreview,setBackgroundPreview] =
useState("");





const [form,setForm] = useState({

title:"",

description:"",

cover:"",

background:"",

titleSize:"40px",

titleColor:"#ffffff",

titleX:"50",

titleY:"30",

descSize:"18px",

descColor:"#ffffff",

descX:"50",

descY:"50",

coverWidth:"300px",

coverHeight:"300px",

coverX:"50",

coverY:"50",

coverFit:"contain",

enabled:true

});







function change(

e:React.ChangeEvent<HTMLInputElement>

){


setForm({

...form,

[e.target.name]:

e.target.value


});


}







// 封面选择

function selectImage(

e:React.ChangeEvent<HTMLInputElement>

){


const file =
e.target.files?.[0];


if(!file)return;



setImageFile(file);



setPreview(

URL.createObjectURL(file)

);


}






// 背景选择

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








// 上传图片

async function uploadFile(file:File){



const fd =
new FormData();



fd.append(

"file",

file

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





if(data.success){


return data.url;


}





return "";

}









async function save(){


try{



let cover =
form.cover;


let background =
form.background;





if(imageFile){


cover =
await uploadFile(imageFile);


}





if(backgroundFile){


background =
await uploadFile(backgroundFile);


}






const res =
await fetch(

"/api/admin/banner",

{

method:"POST",

headers:{

"Content-Type":"application/json"

},


body:JSON.stringify({

...form,

cover,

background

})


}

);





const data =
await res.json();





console.log(data);





if(data.success){


alert("轮换图添加成功");


router.push("/admin/banner");


}else{


alert(

data.message || "添加失败"

);


}




}catch(e){


console.error(e);


alert("保存失败");


}



}









return (


<main className="admin-page">



<div className="admin-box game-form">



<h1>

添加首页轮换图

</h1>







<div className="form-grid">



<label>

标题

<input

name="title"

value={form.title}

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

角色/封面图片上传


<input

type="file"

accept="image/*"

onChange={selectImage}

/>




{

preview &&


<img

src={preview}

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

标题字体大小

<input

name="titleSize"

value={form.titleSize}

onChange={change}

/>

</label>






<label>

标题颜色

<input

name="titleColor"

value={form.titleColor}

onChange={change}

/>

</label>






<label>

标题X位置 %

<input

name="titleX"

value={form.titleX}

onChange={change}

/>

</label>






<label>

标题Y位置 %

<input

name="titleY"

value={form.titleY}

onChange={change}

/>

</label>







<label>

简介

<textarea

name="description"

value={form.description}

onChange={(e)=>

setForm({

...form,

description:e.target.value

})

}

/>

</label>






<label>

简介字体大小

<input

name="descSize"

value={form.descSize}

onChange={change}

/>

</label>






<label>

简介颜色

<input

name="descColor"

value={form.descColor}

onChange={change}

/>

</label>






<label>

简介X位置 %

<input

name="descX"

value={form.descX}

onChange={change}

/>

</label>






<label>

简介Y位置 %

<input

name="descY"

value={form.descY}

onChange={change}

/>

</label>








<label>

封面宽度

<input

name="coverWidth"

value={form.coverWidth}

onChange={change}

/>

</label>







<label>

封面高度

<input

name="coverHeight"

value={form.coverHeight}

onChange={change}

/>

</label>







<label>

封面X位置 %

<input

name="coverX"

value={form.coverX}

onChange={change}

/>

</label>







<label>

封面Y位置 %

<input

name="coverY"

value={form.coverY}

onChange={change}

/>

</label>







<label>

封面适配

<input

name="coverFit"

value={form.coverFit}

onChange={change}

/>

</label>







</div>









<div className="form-buttons">



<button

onClick={save}

>

保存轮换图

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