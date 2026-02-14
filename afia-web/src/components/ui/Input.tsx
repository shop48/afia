import { type InputHTMLAttributes, forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string
    error?: string
    icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon, type, className = '', ...props }, ref) => {
        const [showPassword, setShowPassword] = useState(false)
        const isPassword = type === 'password'

        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-navy mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {icon && (
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-platinum-dark">
                            {icon}
                        </span>
                    )}
                    <input
                        ref={ref}
                        type={isPassword && showPassword ? 'text' : type}
                        className={`
              w-full px-4 py-2.5 rounded-lg border
              font-[family-name:var(--font-body)] text-sm
              transition-all duration-150
              placeholder:text-platinum-dark
              ${icon ? 'pl-10' : ''}
              ${isPassword ? 'pr-10' : ''}
              ${error
                                ? 'border-ruby text-ruby focus:ring-ruby/20'
                                : 'border-platinum-dark text-navy focus:border-gold focus:ring-2 focus:ring-gold/20'
                            }
              ${className}
            `}
                        {...props}
                    />
                    {isPassword && (
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-platinum-dark hover:text-navy transition-colors"
                        >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    )}
                </div>
                {error && (
                    <p className="mt-1 text-xs text-ruby">{error}</p>
                )}
            </div>
        )
    }
)

Input.displayName = 'Input'
export default Input
