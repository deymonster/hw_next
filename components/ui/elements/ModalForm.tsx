import { useState } from "react";
import { useForm, DefaultValues } from "react-hook-form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../form";
import { Input } from "../input";
import { Button } from "../button";
import { Loader2 } from "lucide-react";
import { Path } from "react-hook-form";
import { cn } from "@/utils/tw-merge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../select";

interface ModalFormField<T> {
    name: Path<T>;
    label: string;
    placeholder?: string;
    type?: 'text' | 'email' | 'tel' | 'select';
    required?: boolean;
    options?: Array<{
        value: string;
        label: string;
    }>;
}

interface ModalFormProps<T extends Record<string, any>> {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fields: ModalFormField<T>[];
    onSubmit: (data: T) => Promise<void>;
    submitText: string;
    submittingText: string;
    defaultValues?: DefaultValues<T>;
}

export function ModalForm<T extends Record<string, any>>({
    isOpen,
    onClose,
    title,
    fields,
    onSubmit,
    submitText,
    submittingText,
    defaultValues
}: ModalFormProps<T>) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm<T>({
        defaultValues: defaultValues ?? 
            (fields.reduce((acc, field) => ({
                ...acc,
                [field.name]: ''
            }), {}) as DefaultValues<T>)
    });

    const handleSubmit = async (data: T) => {
        try {
            setIsSubmitting(true);
            await onSubmit(data);
            form.reset();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        form.reset();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
             <DialogContent className="max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                        <div className={cn(
                            "space-y-4",
                            fields.length > 3 && "grid grid-cols-2 gap-4 space-y-0"
                        )}>
                            {fields.map((field) => (
                                <FormField
                                    key={field.name.toString()}
                                    control={form.control}
                                    name={field.name}
                                    render={({ field: fieldProps }) => (
                                        <FormItem>
                                            <FormLabel>{field.label}</FormLabel>
                                            <FormControl>
                                            {field.type === 'select' ? (
                                                    <Select
                                                        onValueChange={fieldProps.onChange}
                                                        defaultValue={fieldProps.value}
                                                        disabled={isSubmitting}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder={field.placeholder} />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {field.options?.map(option => (
                                                                <SelectItem 
                                                                    key={option.value} 
                                                                    value={option.value}
                                                                >
                                                                    {option.label}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : (
                                                    <Input 
                                                        {...fieldProps}
                                                        type={field.type || 'text'}
                                                        disabled={isSubmitting}
                                                        placeholder={field.placeholder}
                                                        required={field.required}
                                                    />
                                                )}
                                            </FormControl>
                                        </FormItem>
                                    )}
                                />
                            ))}
                        </div>
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={!form.formState.isValid || isSubmitting}
                                className="w-fit px-8"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {submittingText}
                                    </>
                                ) : (
                                    submitText
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
