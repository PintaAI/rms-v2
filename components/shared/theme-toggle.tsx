"use client"
import * as React from "react"
import { RiMoonLine, RiSunLine } from "@remixicon/react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"

export function ModeToggle({ onClick }: { onClick?: (e: React.MouseEvent) => void }) {
  const { theme, setTheme } = useTheme()

  React.useEffect(() => {
    if (theme === "system") setTheme("light")
  }, [setTheme, theme])

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick?.(e)
    if (theme === "light") {
      setTheme("dark")
    } else {
      setTheme("light")
    }
  }

  const getIcon = () => {
    return (
      <>
        <RiSunLine className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <RiMoonLine className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      </>
    )
  }

  return (
    <Button variant="ghost" size="icon" onClick={toggleTheme}>
      {getIcon()}
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}
