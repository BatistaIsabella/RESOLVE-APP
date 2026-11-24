import { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  // asChild?: boolean;  
}

const variantStyles = {
  primary: "bg-purple-600 text-white hover:bg-purple-700 disabled:bg-purple-400 focus-visible:ring-purple-500",
  secondary: "bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100 focus-visible:ring-gray-500",
  outline: "border border-purple-600 text-purple-600 hover:bg-purple-50 disabled:opacity-50 focus-visible:ring-purple-500",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  // asChild, 
  ...props
}: ButtonProps) {
  // focus-visible: o anel de foco aparece só na navegação por teclado, sem
  // alterar o visual em cliques com mouse ou toque.
  const baseStyles =
    "font-semibold rounded-md transition-colors duration-200 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2";
  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];

  return (
    <button
      className={`${baseStyles} ${variantStyle} ${sizeStyle} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}