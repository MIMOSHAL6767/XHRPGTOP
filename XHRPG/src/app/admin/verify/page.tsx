"use client";


import {
useEffect,
useState
} from "react";

import {
useRouter
} from "next/navigation";



export default function VerifyAdmin(){



const router = useRouter();



const [list,setList] =
useState<any[]>([]);



const [question,setQuestion] =
useState("");



const [answer,setAnswer] =
useState("");



const [loading,setLoading] =
useState(false);









async function load(){


const res =
await fetch(
"/api/admin/verify"
);



const data =
await res.json();



if(data.success){


setList(
data.questions
);


}



}









useEffect(()=>{


load();


},[]);









async function add(){



if(!question || !answer){


alert("问题和答案不能为空");


return;


}




setLoading(true);



const res =
await fetch(

"/api/admin/verify",

{


method:"POST",


headers:{


"Content-Type":"application/json"


},


body:JSON.stringify({


question,

answer


})


}

);



const data =
await res.json();



if(data.success){


setQuestion("");

setAnswer("");

load();


}else{


alert(
data.message || "添加失败"
);


}



setLoading(false);


}









async function remove(id:number){



if(
!confirm("确定删除这个验证题吗？")
)

return;



const res =
await fetch(

"/api/admin/verify?id="+id,

{


method:"DELETE"


}

);



const data =
await res.json();



if(data.success){


load();


}



}









async function toggle(item:any){



await fetch(

"/api/admin/verify",

{


method:"PUT",


headers:{


"Content-Type":"application/json"


},


body:JSON.stringify({


id:item.id,


enabled:
!item.enabled


})


}

);



load();


}









return (


<main className="admin-page">


<div className="admin-box">



<button

onClick={()=>router.back()}

>

← 返回

</button>





<h1>

注册验证题库管理

</h1>








<h2>

添加验证问题

</h2>





<div className="form-grid">



<label>

问题


<input


value={question}


onChange={

e=>

setQuestion(
e.target.value
)

}


/>

</label>







<label>

答案


<input


value={answer}


onChange={

e=>

setAnswer(
e.target.value
)

}


/>

</label>




</div>








<button

onClick={add}

disabled={loading}

>

添加问题

</button>









<hr/>








<h2>

已有验证问题

</h2>







{

list.map(item=>(



<div

key={item.id}

className="verify-item"

>



<h3>

{item.question}

</h3>



<p>

答案：

{item.answer}

</p>





<p>

状态：

{
item.enabled
?
"启用"
:
"关闭"
}

</p>







<button

onClick={()=>toggle(item)}

>

切换状态

</button>







<button

onClick={()=>remove(item.id)}

>

删除

</button>







</div>



))


}






</div>


</main>


);


}