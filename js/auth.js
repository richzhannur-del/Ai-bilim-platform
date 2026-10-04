const msg=(t,bad=false)=>{const e=document.getElementById('message');if(e){e.textContent=t;e.style.color=bad?'#b42318':'#087a58'}};

document.getElementById('registerForm')?.addEventListener('submit',async(e)=>{
 e.preventDefault(); msg('Тіркелуде...');
 const full_name=document.getElementById('fullName').value.trim();
 const email=document.getElementById('email').value.trim();
 const password=document.getElementById('password').value;
 const role=document.getElementById('role').value;
 const {data,error}=await sb.auth.signUp({email,password,options:{data:{full_name,role}}});
 if(error) return msg(error.message,true);
 if(!data.session) return msg('Тіркелу сәтті. Email-ға келген растау сілтемесін басыңыз.');
 location.href=role==='teacher'?'teacher/dashboard.html':'student/dashboard.html';
});

document.getElementById('loginForm')?.addEventListener('submit',async(e)=>{
 e.preventDefault(); msg('Тексерілуде...');
 const email=document.getElementById('email').value.trim();
 const password=document.getElementById('password').value;
 const {data,error}=await sb.auth.signInWithPassword({email,password});
 if(error) return msg('Email немесе құпиясөз қате.',true);
 const {data:p,error:pe}=await sb.from('profiles').select('role,full_name').eq('id',data.user.id).single();
 if(pe||!p) return msg('Профиль табылмады.',true);
 location.href=p.role==='teacher'?'teacher/dashboard.html':'student/dashboard.html';
});

async function protectPage(requiredRole){
 const {data:{session}}=await sb.auth.getSession();
 if(!session){location.href='../login.html';return}
 const {data:p}=await sb.from('profiles').select('role,full_name').eq('id',session.user.id).single();
 if(!p||p.role!==requiredRole){location.href='../login.html';return}
 const w=document.getElementById('welcome'); if(w) w.textContent=`Қош келдіңіз, ${p.full_name}!`;
}
async function logout(){await sb.auth.signOut();location.href='../login.html'}
