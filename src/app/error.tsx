'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main style={{padding:'15vh 8vw',fontFamily:'system-ui'}}><h1>暂时无法载入页面。</h1><p>请稍后重试。如果刚完成部署，请确认 PostgreSQL 已启动并完成初始化。</p><button onClick={reset} style={{padding:'12px 24px'}}>重新载入</button></main>}
