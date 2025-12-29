import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
}

export default function Button({ variant = "primary", ...props }: ButtonProps) {
  const className = ["button", variant === "secondary" ? "secondary" : ""]
    .filter(Boolean)
    .join(" ");
  return <button className={className} {...props} />;
}
