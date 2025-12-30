"use client"

import Link from "next/link"
import Image from "next/image"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { usePathname } from "next/navigation"

const Navbar = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false)
    const pathname = usePathname()

    // Hide navbar on sign-in page
    if (pathname === '/sign-in') {
        return null
    }

    const navLinks = [
        { href: "/", label: "Home" },
        { href: "/events", label: "Events" },
        { href: "/sign-in", label: "Sign in" },
    ]

    const isActive = (href: string) => {
        if (href === "/") {
            return pathname === "/"
        }
        return pathname?.startsWith(href)
    }

    return (
        <header className="fixed top-0 left-0 right-0 z-50 w-full glass border-b border-blue/10">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-transparent border border-blue/30 flex items-center justify-center p-2 shadow-[0_0_15px_rgba(148,234,255,0.15)]">
                            <Image
                                src="/icons/logo.png"
                                alt="TechHub Logo"
                                width={24}
                                height={24}
                                className="w-6 h-6"
                            />
                        </div>
                        <span className="text-xl font-bold text-foreground font-schibsted-grotesk">
                            TechHub
                        </span>
                    </Link>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-4">
                        {navLinks.map((link) => {
                            const active = isActive(link.href)
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className={`
                                        relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-200 min-w-[80px] text-center
                                        ${active
                                            ? "bg-blue/20 text-blue shadow-[0_0_20px_rgba(148,234,255,0.3)] border border-blue/30"
                                            : "text-foreground hover:text-light-200"
                                        }
                                    `}
                                >
                                    {link.label}
                                </Link>
                            )
                        })}
                    </div>

                    {/* Mobile Menu Button */}
                    <button
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="md:hidden p-2 text-foreground"
                        aria-label="Toggle menu"
                        aria-expanded={isMenuOpen}
                    >
                        {isMenuOpen ? (
                            <X className="w-6 h-6" />
                        ) : (
                            <Menu className="w-6 h-6" />
                        )}
                    </button>
                </div>

                {/* Mobile Menu */}
                {isMenuOpen && (
                    <div className="md:hidden absolute top-full left-0 right-0 mt-2 glass rounded-lg border border-blue/20 p-2">
                        {navLinks.map((link) => {
                            const active = isActive(link.href)
                            return (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    onClick={() => setIsMenuOpen(false)}
                                    className={`
                                        block px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200
                                        ${active
                                            ? "bg-blue/20 text-blue shadow-[0_0_20px_rgba(148,234,255,0.3)] border border-blue/30"
                                            : "text-foreground"
                                        }
                                    `}
                                >
                                    {link.label}
                                </Link>
                            )
                        })}
                    </div>
                )}
            </nav>
        </header>
    )
}

export default Navbar