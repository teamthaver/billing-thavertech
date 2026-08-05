import { LoginForm } from "@/components/login-form"
import { ThemeToggle } from "@/components/SystemTheme/theme-toggle"
import { getCurrentUserSafe } from "@/lib/sessionCheck";
import { redirect } from "next/navigation";
import Image from "next/image"

export default async function LoginPage() {

  const user = await getCurrentUserSafe();

  if(user && user.iss === "thaverTechInvoiceGenerator"){
    redirect("/dashboard")
  }

  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div className="flex justify-between">
          <div className="flex items-center font-medium">
            <div className="flex items-center justify-center rounded-md text-primary-foreground">
              <Image
                src="/logo.png"
                height={60}
                width={60}
                alt="logo"
              />
            </div>
            <div className="flex flex-col space-y-0">
              <p className="font-bold text-2xl leading-none">
                Thaver<span className="text-red-700">tech</span>
              </p>

              <p className="italic font-semibold text-xs tracking-tight leading-none -ml-2">
                Your Thought Our Invention
              </p>
            </div>
          </div>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-xs">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="relative hidden bg-muted lg:block">
        <img
          src="/bg-3.png"
          alt="Image"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
    </div>
  )
}