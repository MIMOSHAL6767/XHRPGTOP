"use client";


import {
useState
} from "react";

import {
useRouter
} from "next/navigation";



export default function NewGame(){


const router = useRouter();



const [loading,setLoading] =
useState(false);



const [form,setForm] = useState({

name:"",

en:"",

author:"",

category:"",

version:"",

description:"",

cover:"",

lanzou:"",

pan123:"",

symbol:"✦",

tags:[] as string[],

status:"已发布"

});




const [history,setHistory] =
useState<any[]>([]);



const [coverFile,setCoverFile] =
useState<File|null>(null);



const [preview,setPreview] =
useState("");









function change(
e:React.ChangeEvent<
HTMLInputElement | HTMLTextAreaElement
>
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


if(!file)
return;



setCoverFile(file);



setPreview(

URL.createObjectURL(file)

);


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









function removeHistory(

index:number

){


setHistory(

history.filter(

(_,i)=>i!==index

)

);


}









async function uploadCover(

id:number

){


if(!coverFile)

return "";





const fd =
new FormData();



fd.append(

"file",

coverFile

);



fd.append(

"id",

String(id)

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





if(!data.success){

throw new Error(

"封面上传失败"

);

}



return data.url;



}









async function submit(){



if(loading)
return;



setLoading(true);



try{



const res =
await fetch(

"/api/admin/games",

{

method:"POST",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

...form,

cover:"",

history,

date:new Date()
.toISOString()
.split("T")[0],

updateDate:new Date()
.toISOString()
.split("T")[0]

})

}

);





const data =
await res.json();





if(!data.success){


alert(

data.message ||

"添加失败"

);


return;


}





const id =
data.game.id;






if(coverFile){


const coverUrl =
await uploadCover(id);





await fetch(

`/api/admin/games/${id}`,

{

method:"PUT",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

cover:coverUrl

})

}

);


}






alert(

"游戏发布成功"

);



router.push(

"/admin/games"

);





}catch(e:any){



console.error(e);


alert(

e.message ||

"保存失败"

);



}finally{


setLoading(false);


}



}









return (


<main className="admin-page">


<div

className="admin-box game-form"

>



<h1>

添加游戏

</h1>








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

value={form.en}

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

游戏封面


<input

type="file"

accept="image/png,image/jpeg,image/webp"

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

蓝奏云链接


<input

name="lanzou"

value={form.lanzou}

onChange={change}

/>


</label>







<label>

123云盘链接


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









<div className="history-editor">



<h2>

历史版本

</h2>








{

history.map((item,index)=>(


<div

key={index}

className="history-item"

>



<input

placeholder="版本号"

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



</div>









<div className="form-buttons">



<button

disabled={loading}

onClick={submit}

>

{

loading

?

"保存中..."

:

"保存游戏"

}

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