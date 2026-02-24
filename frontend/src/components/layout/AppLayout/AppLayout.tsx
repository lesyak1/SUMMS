import { Outlet } from "react-router-dom"


export const AppLayout = () => {

    return (
        <div className="app-layout">
            {/* navbar */}
            <Outlet />
            {/* footer */}
        </div>
    )
}