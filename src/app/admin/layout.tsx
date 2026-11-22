import './admin.css';
export const metadata={title:'内容管理 · 柠汐网络科技',robots:{index:false,follow:false}};
export default function Layout({children}:{children:React.ReactNode}){return <div className="admin-page">{children}</div>}
