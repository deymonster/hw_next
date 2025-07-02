import { HeaderMenu } from "./HeaderMenu";
import { Logo } from "./Logo";



export function Header() {
  return (
      <header className="flex h-full items-center 
        gap-x-4 border-border bg-card p-4">
          <Logo />
          <HeaderMenu />
      </header>
  )
}
