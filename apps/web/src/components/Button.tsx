import { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

const Button = ({ variant = "primary", className, ...props }: ButtonProps) => {
  const classes = ["button", variant === "secondary" ? "button-secondary" : "", className]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} {...props} />;
};

export default Button;
