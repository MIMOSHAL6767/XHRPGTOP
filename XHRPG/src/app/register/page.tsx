"use client";


import {
useState,
useEffect
} from "react";

import {
useRouter
} from "next/navigation";



export default function Register(){


const router = useRouter();



const [username,setUsername] =
useState("");



const [password,setPassword] =
useState("");



const [answer,setAnswer] =
useState("");



const [question,setQuestion] =
useState<any>(null);



const [message,setMessage] =
useState("");







// 获取随机验证问题

useEffect(()=>{


async function loadQuestion(){


try{


const res =
await fetch(
"/api/register/question"
);



const data =
await res.json();



if(data.question){


setQuestion(
data.question
);


}



}catch(e){


console.log(e);


}



}



loadQuestion();



},[]);









async function submit(){



try{


const res =
await fetch("/api/register",{


method:"POST",


headers:{


"Content-Type":"application/json"


},


body:JSON.stringify({


username,


password,


questionId:
question?.id,


answer



})


});






const data =
await res.json();





if(data.success){



alert(

"注册成功 UID:" 
+
data.user.id

);



router.push("/login");



}else{


setMessage(

data.message ||
"注册失败"

);


}



}catch(e){


setMessage(

"请求失败："+String(e)

);


}



}









return (


<main className="auth-page">


<div className="auth-box">



<h1>

注册喜灰RPG资源交流站账号

</h1>








<input


placeholder="账号"


value={username}


onChange={

e=>

setUsername(
e.target.value
)

}


/>








<input


placeholder="密码"


type="password"


value={password}


onChange={

e=>

setPassword(
e.target.value
)

}


/>









{

question &&


<div className="verify-box">


<p>

人机验证：

</p>


<h3>

{question.question}

</h3>





<input


placeholder="请输入答案"


value={answer}


onChange={

e=>

setAnswer(
e.target.value
)

}


/>



</div>



}









<button


type="button"


onClick={submit}

>


注册


</button>







<p className="auth-message">


{message}


</p>



</div>



</main>


);


}