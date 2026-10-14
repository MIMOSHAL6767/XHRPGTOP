"use client";


import {
useEffect,
useState
} from "react";


import {
useRouter
} from "next/navigation";





export default function UserSettings(){


const router =
useRouter();



const [user,setUser] =
useState<any>(null);



const [titles,setTitles] =
useState<any[]>([]);



const [loading,setLoading] =
useState(false);



const [avatarFile,setAvatarFile] =
useState<File|null>(null);



const [backgroundFile,setBackgroundFile] =
useState<File|null>(null);



const [avatarPreview,setAvatarPreview] =
useState("");



const [backgroundPreview,setBackgroundPreview] =
useState("");









// =====================
// 加载资料和称号
// =====================

async function load(){


try{


const profileRes =
await fetch(
"/api/uid/profile"
);



const profileData =
await profileRes.json();



if(!profileData.success){


router.push("/login");


return;


}







const titleRes =
await fetch(

"/api/uid/title"

);



const titleData =
await titleRes.json();







let titleInfo:any={};



if(titleData.success){


titleInfo={


title:titleData.user.title,


titleStyle:titleData.user.titleStyle,


showTitle:titleData.user.showTitle


};





const list =
titleData.user.userTitles || [];





setTitles(list);


}else{


setTitles([]);


}









setUser({

...profileData.user,

...titleInfo

});




setAvatarPreview(

profileData.user.avatar || ""

);



setBackgroundPreview(

profileData.user.background || ""

);



}catch(e){


console.error(e);


router.push("/login");


}



}








useEffect(()=>{


load();


},[]);









function change(e:any){


setUser({

...user,

[e.target.name]:

e.target.value

});


}









function selectAvatar(e:any){


const file =
e.target.files?.[0];


if(!file)
return;



setAvatarFile(file);



setAvatarPreview(

URL.createObjectURL(file)

);


}









function selectBackground(e:any){


const file =
e.target.files?.[0];



if(!file)
return;



setBackgroundFile(file);



setBackgroundPreview(

URL.createObjectURL(file)

);


}









async function upload(

file:File,

type:string

){


const fd =
new FormData();



fd.append(

"file",

file

);





const res =
await fetch(

`/api/upload/${type}`,

{

method:"POST",

body:fd

}

);



const data =
await res.json();





if(!data.success){


throw new Error(

data.message ||

"上传失败"

);


}





return data.url;


}









// =====================
// 佩戴称号
// =====================

async function wearTitle(

titleId:number

){


try{


const res =
await fetch(

"/api/uid/title",

{

method:"PUT",

headers:{

"Content-Type":"application/json"

},

body:JSON.stringify({

titleId

})

}

);





const data =
await res.json();





if(data.success){


alert("称号佩戴成功");


await load();


}else{


alert(

data.message ||

"佩戴失败"

);


}



}catch(e){


alert("操作失败");


}



}

// =====================
// 取消佩戴
// =====================

async function removeTitle(){


try{


const res =
await fetch(

"/api/uid/title",

{

method:"DELETE"

}

);



const data =
await res.json();





if(data.success){


alert("已取消佩戴");


await load();


}else{


alert(

data.message ||

"取消失败"

);


}



}catch(e){


alert("操作失败");


}



}









// =====================
// 保存资料
// =====================

async function save(){


try{


setLoading(true);



let avatar =
user.avatar;



let background =
user.background;






if(avatarFile){


avatar =
await upload(

avatarFile,

"avatar"

);


}





if(backgroundFile){


background =
await upload(

backgroundFile,

"background"

);


}








const res =
await fetch(

"/api/uid/profile",

{

method:"PUT",

headers:{

"Content-Type":"application/json"

},


body:JSON.stringify({

nickname:user.nickname,

bio:user.bio,

tags:user.tags,

avatar,

background

})

}

);





const data =
await res.json();





if(data.success){


alert("保存成功");



router.push(

`/uid/${user.id}`

);



}else{


alert(

data.message ||

"保存失败"

);


}





}catch(e:any){


alert(

e.message ||

"保存失败"

);



}finally{


setLoading(false);


}



}







if(!user){


return (

<main>

加载中...

</main>

);


}









return (

<main

className="admin-page"

>


<div

className="admin-box"

style={{

width:"900px",

maxWidth:"95%"

}}

>



<h1>

个人资料设置

</h1>








<h2>

头像

</h2>



<img

src={avatarPreview}

style={{

width:"140px",

height:"140px",

borderRadius:"50%",

objectFit:"cover",

border:"3px solid #fff"

}}

/>



<br/>





<input

type="file"

accept="image/*"

onChange={selectAvatar}

/>








<h2>

主页背景

</h2>



<img

src={backgroundPreview}

style={{

width:"400px",

height:"180px",

objectFit:"cover",

borderRadius:"10px"

}}

/>



<br/>





<input

type="file"

accept="image/*"

onChange={selectBackground}

/>








<h2>

昵称

</h2>



<input

name="nickname"

value={user.nickname || ""}

onChange={change}

style={{

width:"100%",

padding:"10px"

}}

/>









<h2>

个人简介

</h2>



<textarea

name="bio"

value={user.bio || ""}

onChange={change}

style={{

width:"100%",

height:"120px"

}}

/>








<h2>

个性标签

</h2>



<input

value={

Array.isArray(user.tags)

?

user.tags.join(",")

:

""

}


placeholder="例如：恐怖游戏,RMVA玩家"



onChange={e=>

setUser({

...user,

tags:e.target.value

.split(",")

.map((v:string)=>

v.trim()

)

.filter(Boolean)

})

}



style={{

width:"100%",

padding:"10px"

}}

/>








<hr/>









<h2>

我的称号

</h2>









{

user.title && user.showTitle

?

<div

style={{

display:"inline-block",

padding:"8px 20px",

borderRadius:"20px",

background:

user.titleStyle?.background || "#333",

color:

user.titleStyle?.color || "#fff",

border:

user.titleStyle?.border || "none",

boxShadow:

user.titleStyle?.shadow || "none",

fontSize:

user.titleStyle?.size || 14,

fontWeight:"bold"

}}

>


{user.title}


</div>


:

<p>

当前没有佩戴称号

</p>

}









<button

onClick={removeTitle}

style={{

marginTop:"15px"

}}

>

取消佩戴

</button>









<h3>

拥有的全部称号

</h3>







{

titles.length===0

?

<p>

暂无拥有称号

</p>



:

<div

style={{

display:"flex",

gap:"12px",

flexWrap:"wrap"

}}

>


{

titles.map(item=>(


<button

key={item.id}

onClick={()=>


wearTitle(

item.title.id

)

}

style={{

padding:"8px 18px",

borderRadius:"20px",

cursor:"pointer",

background:

item.title.background || "#333",

color:

item.title.color || "#fff",

border:

item.title.border || "none",

boxShadow:

item.title.shadow || "none",

fontSize:

item.title.size || 14

}}

>


{item.title.name}


</button>



))


}



</div>

}









<br/><br/>








<button

disabled={loading}

onClick={save}

>

{

loading

?

"保存中..."

:

"保存资料"

}


</button>








<button

onClick={()=>router.back()}

>

返回

</button>







</div>


</main>

);


}