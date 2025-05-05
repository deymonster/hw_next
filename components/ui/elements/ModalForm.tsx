import { useState } from "react";
import { useForm, DefaultValues } from "react-hook-form";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../dialog";
import { Form, FormControl, FormField, FormItem, FormLabel } from "../form";
import { Input } from "../input";
import { Button } from "../button";
import { Loader2 } from "lucide-react";
import { Path } from "react-hook-form";

interface ModalFormProps<T extends Record<string, any>> {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    fields: {
        name: Path<T>;
        label: string;
        placeholder?: string;
        type?: string;
        required?: boolean;
    }[];
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
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-6'>
                        {fields.map((field) => (
                            <FormField
                                key={field.name.toString()}
                                control={form.control}
                                name={field.name}
                                render={({ field: fieldProps }) => (
                                    <FormItem>
                                        <FormLabel>{field.label}</FormLabel>
                                        <FormControl>
                                            <Input 
                                                {...fieldProps}
                                                type={field.type || 'text'}
                                                disabled={isSubmitting}
                                                placeholder={field.placeholder}
                                            />
                                        </FormControl>
                                    </FormItem>
                                )}
                            />
                        ))}
                        <DialogFooter>
                            <Button
                                type="submit"
                                disabled={!form.formState.isValid || isSubmitting}
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
