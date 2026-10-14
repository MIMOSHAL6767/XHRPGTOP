"use client";


import {useState} from "react";
import {useRouter} from "next/navigation";


export default function Login(){


const router = useRouter();


const [username,setUsername] = useState("");

const [password,setPassword] = useState("");

const [error,setError] = useState("");





async function login(){


try{


const res = await fetch("/api/login",{


method:"POST",


headers:{


"Content-Type":"application/json"


},


body:JSON.stringify({

username,

password

})


});



const data = await res.json();





if(data.success){



localStorage.setItem(

"user",

JSON.stringify(data.user)

);




alert(

"登录成功，欢迎 "+data.user.username

);



router.replace("/");



}

else{


setError(

data.message || "登录失败"

);


}



}catch(e){


console.log(e);


setError(

"请求失败："+String(e)

);


}



}







return (

<main className="auth-page">


<div className="auth-box">



<h1>

喜灰RPG 资源交流站 登录

</h1>





<input


placeholder="账号"


value={username}


onChange={

e=>setUsername(e.target.value)

}


/>





<input


type="password"


placeholder="密码"


value={password}


onChange={

e=>setPassword(e.target.value)

}


/>






<button


type="button"


onClick={login}

>


登录


</button>






<p className="auth-message">


{error}


</p>



</div>



</main>

);


}