"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "../ui/button";

import {
    CardTitle,
    CardDescription,
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    
} from "@/components/ui/card";

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

import { registerUserAction } from "@/app/data/actions/auth-actions";

const INITIAL_STATE = {
    data: null,
}

export function SignupForm() {
    const [formState, formAction] = useActionState(
        registerUserAction as unknown as any,INITIAL_STATE);

    console.log("## will render on client ##");
    console.log(formState);
    console.log("############################");


    return (
        <div className="w-full max-w-md">
            <form action={formAction}>
                <Card>
                    <CardHeader className="space-y-1">
                        <CardTitle className="text-3xl font-bold">Регистрация</CardTitle>
                        <CardDescription>
                            Укажите ваше имя, email и пароль, чтобы зарегистрироваться
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="username">Имя</Label>
                            <Input 
                                id="username"
                                name="username"
                                type="text"
                                placeholder="username"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input 
                                id="email"
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password">Пароль</Label>
                            <Input 
                                id="password"
                                name="password"
                                type="password"
                                placeholder="пароль"
                            />
                        </div>
                    </CardContent>

                    <CardFooter className="flex flex-col">
                        <Button className="w-full">
                            Зарегистрироваться
                        </Button>
                    </CardFooter>
                </Card>
                <div className="mt-4 text-center text-sm">
                    Уже есть аккаунт?
                    <Link className="underline ml-2" href="signin">
                        Войти
                    </Link>
                </div>
            </form>
        </div>
    )
}