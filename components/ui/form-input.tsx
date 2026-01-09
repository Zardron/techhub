import * as React from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";

export interface FormInputProps extends React.ComponentProps<"input"> {
    label: string;
    error?: string;
    helperText?: string;
    required?: boolean;
    containerClassName?: string;
    multiline?: boolean;
    rows?: number;
}

const FormInput = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, FormInputProps>(
    (
        {
            label,
            error,
            helperText,
            required = false,
            containerClassName,
            className,
            id,
            multiline,
            rows = 4,
            ...props
        },
        ref
    ) => {
        const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

        return (
            <div className={cn("space-y-2", containerClassName)}>
                <label
                    htmlFor={inputId}
                    className="text-sm font-medium text-foreground block"
                >
                    {label}
                    {required && <span className="text-destructive ml-1">*</span>}
                </label>
                {multiline ? (
                    <textarea
                        ref={ref as React.ForwardedRef<HTMLTextAreaElement>}
                        id={inputId}
                        rows={rows}
                        className={cn(
                            "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                            error && "border-destructive focus-visible:ring-destructive",
                            className
                        )}
                        {...(props as any)}
                    />
                ) : (
                    <Input
                        ref={ref as React.ForwardedRef<HTMLInputElement>}
                        id={inputId}
                        className={cn(
                            error && "border-destructive focus-visible:ring-destructive",
                            className
                        )}
                        {...props}
                    />
                )}
                {error && (
                    <p className="text-xs text-destructive mt-1.5">{error}</p>
                )}
                {!error && helperText && (
                    <p className="text-xs text-muted-foreground mt-1.5">
                        {helperText}
                    </p>
                )}
            </div>
        );
    }
);

FormInput.displayName = "FormInput";

export { FormInput };

