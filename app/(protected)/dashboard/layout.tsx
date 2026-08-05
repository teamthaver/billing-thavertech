import { ReactNode } from "react";

import { redirect } from "next/navigation";
import { ThemeToggle } from "@/components/SystemTheme/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { getCurrentUserSafe } from "@/lib/sessionCheck";
import { AuthProvider } from "@/components/Users/roleContext";

export default async function ProtectedLayout({
    children,
}: {
    children: ReactNode;
}) {
    
    const user = await getCurrentUserSafe();
    if(!user){
        redirect("/")
    }

    return (
        <div className="min-h-screen flex flex-col">
            <AuthProvider user={user} role={user.role}>

            <SidebarProvider className="flex flex-1 flex-col">

                {/* Top Bar */}

                <div className="h-12 fixed z-50 w-full bg-muted/70 backdrop-blur-md px-4 flex items-center justify-between border-b border-muted-foreground/20">
                    <SidebarTrigger className="p-2" />
                    <ThemeToggle />
                </div>
                {/* Content Area */}
                <div className="flex flex-1 min-h-0 mt-12">

                    {/* Sidebar */}
                    <AppSidebar />

                    {/* Main Content */}
                    <main className="flex-1 py-4 overflow-auto min-h-0">
                        <div className="mx-auto w-full max-w-7xl px-4 flex flex-col h-full min-h-0">
                            {children}
                        </div>
                    </main>

                </div>

            </SidebarProvider>
            </AuthProvider>
        </div>
    );
}